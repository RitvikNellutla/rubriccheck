import { AnalysisResult, ChatMessage, UploadedFile, CriterionResult } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

/* ---------- helpers ---------- */

async function generateFingerprint(data: any): Promise<string> {
  const msgUint8 = new TextEncoder().encode(JSON.stringify(data));
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function callChatAPI(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  temperature = 0
): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, temperature })
  });

  if (!res.ok) throw new Error("Chat API failed");

  const data = await res.json();
  return data.content;
}

const cleanJson = (text: string) =>
  text.replace(/```json|```/g, "").trim();

/* ---------- analysis ---------- */

export const analyzeEssay = async (
  rubric: string,
  rubricFiles: UploadedFile[],
  essay: string,
  essayFiles: UploadedFile[],
  essayExplanation: string,
  isStrict: boolean,
  workType: string = "General"
): Promise<AnalysisResult> => {
  const fingerprint = await generateFingerprint({
    rubric,
    essay,
    essayExplanation,
    isStrict,
    workType
  });

  const cached = localStorage.getItem(`analysis_${fingerprint}`);
  if (cached) return JSON.parse(cached);

  const prompt = `
${SYSTEM_INSTRUCTION}

You are grading a ${workType}.
STRICT MODE: ${isStrict}

RUBRIC:
${rubric}

ESSAY:
${essay}

Return valid JSON only.
`;

  const content = await callChatAPI(
    [
      { role: "system", content: SYSTEM_INSTRUCTION },
      { role: "user", content: prompt }
    ],
    0.1
  );

  const parsed = JSON.parse(cleanJson(content)) as AnalysisResult;
  localStorage.setItem(`analysis_${fingerprint}`, JSON.stringify(parsed));
  return parsed;
};

/* ---------- rewrite ---------- */

export const getRewriteSuggestion = async (
  criterion: CriterionResult,
  essay: string,
  rubric: string
): Promise<string[]> => {
  const prompt = `
Essay:
${essay}

Fix:
${criterion.criterion}

Evidence:
${criterion.evidence}

Return JSON array of 3 rewrites.
`;

  const content = await callChatAPI(
    [
      { role: "system", content: "Humanize writing. Avoid AI tone." },
      { role: "user", content: prompt }
    ],
    0.7
  );

  return JSON.parse(cleanJson(content));
};

/* ---------- chat ---------- */

export const getChatResponse = async (
  messages: ChatMessage[],
  rubric: string,
  rubricFiles: UploadedFile[],
  essay: string,
  essayFiles: UploadedFile[],
  essayExplanation: string,
  analysisResult: AnalysisResult | null
): Promise<string> => {
  const systemContext = `
You are an assistant helping with a graded assignment.

RUBRIC:
${rubric}

ESSAY:
${essay}

ANALYSIS:
${analysisResult ? JSON.stringify(analysisResult.summary) : "None"}

Stay concise and relevant.
`;

  const formatted = [
    { role: "system", content: systemContext },
    ...messages.map(m => ({
      role: m.role === "model" ? "assistant" : "user",
      content: m.text
    }))
  ] as { role: "system" | "user" | "assistant"; content: string }[];

  return callChatAPI(formatted, 0);
};