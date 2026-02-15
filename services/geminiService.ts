import { AnalysisResult, ChatMessage, UploadedFile, CriterionResult } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

/* ----------------------- helpers ----------------------- */

async function generateFingerprint(data: any): Promise<string> {
  const msgUint8 = new TextEncoder().encode(JSON.stringify(data));
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function openaiRequest(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  temperature = 0
): Promise<string> {
  const res = await fetch("/api/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, temperature })
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("API error:", text);
    throw new Error("OpenAI request failed");
  }

  const data = await res.json();
  return data.content;
}

const cleanJson = (text: string) =>
  text.replace(/```json|```/g, "").trim();

/* -------------------- analyze essay -------------------- */

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

Return STRICT JSON with:
summary + criteria.
`;

  const content = await openaiRequest(
    [
      { role: "system", content: SYSTEM_INSTRUCTION },
      { role: "user", content: prompt }
    ],
    0.1
  );

  const parsed = JSON.parse(cleanJson(content)) as AnalysisResult;

  localStorage.setItem(`analysis_${fingerprint}`, JSON.stringify(parsed));

  const elapsed = Date.now() - startAt;
  if (elapsed < MIN_DELAY) {
    await new Promise(res => setTimeout(res, MIN_DELAY - elapsed));
  }

  return parsed;
};

/* ---------------- rewrite suggestion ---------------- */

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

  const content = await openaiRequest(
    [
      { role: "system", content: "Humanize writing. Avoid robotic tone." },
      { role: "user", content: prompt }
    ],
    0.7
  );

  const parsed = JSON.parse(cleanJson(content));
  localStorage.setItem(`rewrite_${fingerprint}`, JSON.stringify(parsed));
  return parsed;
};

/* ---------------------- chat ---------------------- */

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

  const formattedMessages: {
    role: "system" | "user" | "assistant";
    content: string;
  }[] = [
    {
      role: "system",
      content: contextBlock
    },
    ...messages.map((m) => ({
      role: (m.role === "model" ? "assistant" : m.role) as
        | "user"
        | "assistant",
      content: m.text
    }))
  ];

  try {
    return await openaiRequest(formattedMessages, 0);
  } catch {
    return "Connection error.";
  }
};