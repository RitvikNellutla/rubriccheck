import { AnalysisResult, ChatMessage, UploadedFile, CriterionResult } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

const getApiKey = () => {
  const key = import.meta.env.VITE_OPENAI_API_KEY;
  if (!key) throw new Error("OpenAI API Key not found.");
  return key;
};

async function generateFingerprint(data: any): Promise<string> {
  const msgUint8 = new TextEncoder().encode(JSON.stringify(data));
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function openaiRequest(messages: any[], temperature = 0) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature,
      messages
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI Error:", errorText);
    throw new Error("OpenAI request failed");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

const cleanJson = (text: string) =>
  text.replace(/```json|```/g, "").trim();

export const analyzeEssay = async (
  rubric: string,
  rubricFiles: UploadedFile[],
  essay: string,
  essayFiles: UploadedFile[],
  essayExplanation: string,
  isStrict: boolean,
  workType: string = "General"
): Promise<AnalysisResult> => {

  const MIN_DELAY = 5000;
  const startAt = Date.now();

  const fingerprint = await generateFingerprint({
    rubric,
    rubricFiles,
    essay,
    essayFiles,
    essayExplanation,
    isStrict,
    workType
  });

  const cached = localStorage.getItem(`analysis_${fingerprint}`);
  if (cached) {
    await new Promise(res => setTimeout(res, MIN_DELAY));
    return JSON.parse(cached);
  }

  const strictPrompt = isStrict
    ? "STRICT grading. If not fully proven, mark weak or missing."
    : "Balanced grading.";

  const prompt = `
You are grading a ${workType}.

${strictPrompt}

RUBRIC:
${rubric}

ESSAY:
${essay}

Return STRICT JSON:
{
  "summary": {...},
  "criteria": [...]
}
`;

  const content = await openaiRequest([
    { role: "system", content: SYSTEM_INSTRUCTION },
    { role: "user", content: prompt }
  ], 0.1);

  if (!content) throw new Error("No response");

  const parsed = JSON.parse(cleanJson(content)) as AnalysisResult;

  localStorage.setItem(`analysis_${fingerprint}`, JSON.stringify(parsed));

  const elapsed = Date.now() - startAt;
  if (elapsed < MIN_DELAY) {
    await new Promise(res => setTimeout(res, MIN_DELAY - elapsed));
  }

  return parsed;
};

export const getRewriteSuggestion = async (
  criterion: CriterionResult,
  essay: string,
  rubric: string
): Promise<string[]> => {

  const fingerprint = await generateFingerprint({ criterion, essay, rubric });
  const cached = localStorage.getItem(`rewrite_${fingerprint}`);
  if (cached) return JSON.parse(cached);

  const prompt = `
Essay:
${essay}

Fix this criterion:
${criterion.criterion}

Evidence:
"${criterion.evidence}"

Give 3 natural rewrites.
Return JSON array.
`;

  const content = await openaiRequest([
    { role: "system", content: "Humanize writing. Avoid robotic tone." },
    { role: "user", content: prompt }
  ], 0.7);

  if (!content) return [];

  const parsed = JSON.parse(cleanJson(content));
  localStorage.setItem(`rewrite_${fingerprint}`, JSON.stringify(parsed));

  return parsed;
};

export const getChatResponse = async (
  messages: ChatMessage[],
  rubric: string,
  rubricFiles: UploadedFile[],
  essay: string,
  essayFiles: UploadedFile[],
  essayExplanation: string,
  analysisResult: AnalysisResult | null
): Promise<string> => {

  const contextBlock = `
You are helping with a graded assignment.

RUBRIC:
${rubric || "None provided"}

ESSAY:
${essay || "None provided"}

EXPLANATION:
${essayExplanation || "None provided"}

ANALYSIS SUMMARY:
${analysisResult ? JSON.stringify(analysisResult.summary, null, 2) : "No prior analysis"}

Only answer questions related to this assignment.
Keep responses concise and helpful.
`;

  const formattedMessages = [
    {
      role: "system",
      content: contextBlock
    },
    ...messages.map((m) => {
      const safeRole =
        m.role === "model" ? "assistant" : m.role;

      return {
        role: safeRole as "user" | "assistant",
        content: m.text
      };
    })
  ];

  try {
    const content = await openaiRequest(formattedMessages, 0);
    return content || "Try rephrasing.";
  } catch (error) {
    console.error(error);
    return "Connection error.";
  }
};