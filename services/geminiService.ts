import {
  AnalysisResult,
  ChatMessage,
  UploadedFile,
  CriterionResult,
} from "../types";
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
    body: JSON.stringify({ messages, temperature }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Chat API failed");
  }

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
  workType = "General"
): Promise<AnalysisResult> => {
  const fingerprint = await generateFingerprint({
    rubric,
    essay,
    essayExplanation,
    isStrict,
    workType,
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

Return ONLY valid JSON in this shape:

{
  "criteria": {
    "<criterion_name>": {
      "score": "Met | Weak | Missing",
      "why": "<short explanation>",
      "evidence": "<quoted or referenced text>",
      "exact_fix": "<specific fix>"
    }
  }
}
`;

  const content = await callChatAPI(
    [
      { role: "system", content: SYSTEM_INSTRUCTION },
      { role: "user", content: prompt },
    ],
    0.1
  );

  const raw = JSON.parse(cleanJson(content));

  const criteria: CriterionResult[] = Object.entries(raw.criteria || {}).map(
    ([key, value]: any) => {
      const status =
        value.score?.toLowerCase() === "met"
          ? "met"
          : value.score?.toLowerCase() === "weak"
          ? "weak"
          : "missing";

      return {
        criterion: key.replace(/_/g, " "),
        status,
        why: value.why || "",
        evidence: value.evidence || "",
        exact_fix: value.exact_fix || "",
      };
    }
  );

  const met = criteria.filter(c => c.status === "met").length;
  const weak = criteria.filter(c => c.status === "weak").length;
  const missing = criteria.filter(c => c.status === "missing").length;
  const total = criteria.length || 1;

  const score = Math.round(((met + weak * 0.5) / total) * 100);
  const aiScore = Math.max(0, Math.min(100, 100 - score + 10));

  const parsed: AnalysisResult = {
    summary: {
      score,
      ai_score: aiScore,
      ai_analysis: {
        risk_level: aiScore > 70 ? "high" : aiScore > 40 ? "moderate" : "low",
        verdict_summary:
          aiScore > 70
            ? "High likelihood of AI involvement."
            : aiScore > 40
            ? "Moderate AI patterns detected."
            : "Low AI likelihood.",
        indicators: [],
      },
      met,
      weak,
      missing,
      top_fixes: criteria
        .filter(c => c.status !== "met")
        .slice(0, 3)
        .map(c => ({
          fix: c.criterion,
          reason: c.exact_fix || c.why,
        })),
    },
    criteria,
  };

  localStorage.setItem(
    `analysis_${fingerprint}`,
    JSON.stringify(parsed)
  );

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

Fix this criterion:
${criterion.criterion}

Evidence:
${criterion.evidence}

Give 3 natural rewrites.
Return JSON array only.
`;

  const content = await callChatAPI(
    [
      { role: "system", content: "Write like a human. No AI tone." },
      { role: "user", content: prompt },
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
You are helping with a graded assignment.

RUBRIC:
${rubric || "None"}

ESSAY:
${essay || "None"}

SUMMARY:
${analysisResult ? JSON.stringify(analysisResult.summary) : "None"}

Stay concise and helpful.
`;

  const formatted: { role: "system" | "user" | "assistant"; content: string }[] =
    [
      { role: "system", content: systemContext },
      ...messages.map(m => ({
  role: (m.role === "model" ? "assistant" : "user") as "assistant" | "user",
  content: m.text,
})),
    ];

  return callChatAPI(formatted, 0);
};