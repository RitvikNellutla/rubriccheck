import { AnalysisResult, ChatMessage, UploadedFile, CriterionResult } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

/* ---------- types ---------- */

type OpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/* ---------- helpers ---------- */

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

const cleanJson = (text: string) =>
  text.replace(/```json|```/g, "").trim();

/* ---------- OPENAI (DIRECT, FRONTEND) ---------- */

async function callOpenAI(
  messages: OpenAIMessage[],
  temperature = 0
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("OPENAI ERROR:", text);
    throw new Error("OPENAI_FAILED");
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/* ---------- ANALYSIS ---------- */

export const analyzeEssay = async (
  rubric: string,
  rubricFiles: UploadedFile[],
  essay: string,
  essayFiles: UploadedFile[],
  essayExplanation: string,
  isStrict: boolean,
  workType = "General"
): Promise<AnalysisResult> => {
  console.log("🔥 analyzeEssay fired");

  await sleep(500); // keep UX delay

  const prompt = `
${SYSTEM_INSTRUCTION}

You are grading a ${workType}.
STRICT MODE: ${isStrict}

RUBRIC:
${rubric}

ESSAY:
${essay}

OUTPUT FORMAT (MANDATORY JSON):
{
  "criterion_name": {
    "score": "met | weak | missing",
    "why": "...",
    "evidence": "...",
    "exact_fix": "..."
  }
}

Return ONLY valid JSON.
No markdown.
No commentary.
`;

  const rawText = await callOpenAI(
    [
      { role: "system", content: SYSTEM_INSTRUCTION },
      { role: "user", content: prompt },
    ],
    0.1
  );

  console.log("🧠 AI RAW:", rawText);

  let raw: Record<string, any>;
  try {
    raw = JSON.parse(cleanJson(rawText));
  } catch {
    console.error("❌ INVALID JSON FROM AI:", rawText);
    throw new Error("INVALID_AI_JSON");
  }

  const criteria: CriterionResult[] = Object.entries(raw).map(
    ([key, value]: any) => ({
      criterion: key.replace(/_/g, " "),
      status: (value.score || "missing").toLowerCase(),
      why: value.why ?? "",
      evidence: value.evidence ?? "",
      exact_fix: value.exact_fix ?? "",
    })
  );

  return {
    summary: {
      score: criteria.length,
      ai_score: criteria.filter(c => c.status === "met").length,
      ai_analysis: {
        risk_level: "low",
        verdict_summary: "Analysis completed.",
        indicators: [],
      },
      met: criteria.filter(c => c.status === "met").length,
      weak: criteria.filter(c => c.status === "weak").length,
      missing: criteria.filter(c => c.status === "missing").length,
      top_fixes: [],
    },
    criteria,
  };
};

/* ---------- CHAT ---------- */

export const getChatResponse = async (
  messages: ChatMessage[],
  rubric?: string,
  rubricFiles?: any[],
  essay?: string,
  essayFiles?: any[],
  essayExplanation?: string,
  result?: any
): Promise<string> => {
  const systemPrompt = `
You are RubricCheck Assistant.

ROLE:
- You ONLY help explain rubric criteria, scores, and fixes.
- You do NOT write essays.
- You do NOT invent new requirements.
- You ONLY reference the provided rubric, essay, and results.

RULES:
- Be concise.
- Be specific.
- If something is missing, say exactly why.
- If user asks something unrelated, redirect them to the rubric.

RUBRIC:
${rubric || "N/A"}

ESSAY:
${essay || "N/A"}

ANALYSIS RESULT:
${result ? JSON.stringify(result, null, 2) : "N/A"}
`;

  const formatted = [
    { role: "system", content: systemPrompt },
    ...messages.map(m => ({
      role: m.role === "model" ? "assistant" : "user",
      content: m.text
    }))
  ] as { role: "system" | "user" | "assistant"; content: string }[];

  return callOpenAI(formatted, 0.3);
};

/* ---------- REWRITE ---------- */

export const getRewriteSuggestion = async (
  criterion: CriterionResult,
  essay: string,
  rubric: string
): Promise<string[]> => {
  const prompt = `
Essay:
${essay}

Criterion:
${criterion.criterion}

Evidence:
${criterion.evidence}

Provide 3 rewrite suggestions.
Return JSON array only.
`;

  const content = await callOpenAI(
    [
      { role: "system", content: "Rewrite student work clearly and naturally." },
      { role: "user", content: prompt },
    ],
    0.7
  );

  return JSON.parse(cleanJson(content));
};