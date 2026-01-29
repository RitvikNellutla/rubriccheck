// services/geminiService.ts
// Frontend-only: calls your serverless API at /api/gemini (Vercel).
// NO API KEYS IN HERE.

import {
  AnalysisResult,
  ChatMessage,
  UploadedFile,
  CriterionResult,
} from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

// =====================
// Helpers
// =====================

const API_ENDPOINT = "/api/gemini";

async function generateFingerprint(data: any): Promise<string> {
  const msgUint8 = new TextEncoder().encode(JSON.stringify(data));
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const msg = (error?.message || "").toLowerCase();

      // Treat these as transient
      const isTransient =
        msg.includes("timeout") ||
        msg.includes("network") ||
        msg.includes("429") ||
        msg.includes("500") ||
        msg.includes("502") ||
        msg.includes("503") ||
        msg.includes("504");

      if (!isTransient || i === maxRetries - 1) throw error;

      const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

const cleanJson = (text: string) => text.replace(/```json|```/g, "").trim();

async function callGeminiAPI<T>(payload: any): Promise<T> {
  return withRetry(async () => {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const raw = await res.text();
    if (!res.ok) {
      // keep the response body for debugging
      throw new Error(`API ${res.status}: ${raw}`);
    }

    // most of your tasks return JSON text
    try {
      return JSON.parse(cleanJson(raw)) as T;
    } catch {
      // fallback if API returns {text:"..."} shape
      try {
        const parsed = JSON.parse(raw);
        return parsed as T;
      } catch {
        // last resort
        return raw as unknown as T;
      }
    }
  });
}

const buildBaseContent = (
  rubric: string,
  rubricFiles: UploadedFile[],
  essay: string,
  essayFiles: UploadedFile[],
  essayExplanation: string = "",
  workType: string = "General"
) => {
  // Deterministic ordering (helps caching)
  const sortedRubricFiles = [...rubricFiles].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const sortedEssayFiles = [...essayFiles].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return {
    rubric: rubric || "",
    rubricFiles: sortedRubricFiles,
    essay: essay || "",
    essayFiles: sortedEssayFiles,
    essayExplanation: essayExplanation || "",
    workType: workType || "General",
  };
};

// =====================
// Public API
// =====================

export const analyzeEssay = async (
  rubric: string,
  rubricFiles: UploadedFile[],
  essay: string,
  essayFiles: UploadedFile[],
  essayExplanation: string,
  isStrict: boolean,
  workType: string = "General"
): Promise<AnalysisResult> => {
  const rawData = buildBaseContent(
    rubric,
    rubricFiles,
    essay,
    essayFiles,
    essayExplanation,
    workType
  );

  // Minimum delay (labor illusion)
  const MIN_DELAY = 5000;
  const startAt = Date.now();

  const fingerprint = await generateFingerprint({ ...rawData, isStrict, task: "analyze" });
  const cached = localStorage.getItem(`analysis_${fingerprint}`);
  if (cached) {
    await new Promise((r) => setTimeout(r, MIN_DELAY));
    return JSON.parse(cached) as AnalysisResult;
  }

  const result = await callGeminiAPI<AnalysisResult>({
    task: "analyze",
    ...rawData,
    isStrict,
    // send system instruction to server if you want server to use it
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  localStorage.setItem(`analysis_${fingerprint}`, JSON.stringify(result));

  const elapsed = Date.now() - startAt;
  if (elapsed < MIN_DELAY) {
    await new Promise((r) => setTimeout(r, MIN_DELAY - elapsed));
  }

  return result;
};

export const formatContent = async (
  text: string,
  mode: "rubric" | "essay"
): Promise<string> => {
  if (!text || !text.trim()) return text;

  if (mode === "rubric") {
    const rawLines = text
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const result: string[] = [];
    let count = 0;

    rawLines.forEach((line) => {
      const cleaned = line.replace(/^[\d\.\)\-\*\•\s]+/, "").trim();
      if (!cleaned) return;

      if (
        cleaned.endsWith(":") ||
        /\d+\s*pts/i.test(cleaned) ||
        (cleaned.length < 45 && !cleaned.endsWith("."))
      ) {
        count++;
        result.push(`${count}. ${cleaned}`);
      } else {
        result.push(`   • ${cleaned}`);
      }
    });

    return result.join("\n\n");
  }

  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .join("\n\n");
};

export const getRewriteSuggestion = async (
  criterion: CriterionResult,
  essay: string,
  rubric: string
): Promise<string[]> => {
  const fingerprint = await generateFingerprint({
    task: "rewrite",
    criterion,
    essay,
    rubric,
  });

  const cached = localStorage.getItem(`rewrite_${fingerprint}`);
  if (cached) return JSON.parse(cached) as string[];

  const res = await callGeminiAPI<string[] | { text: string } | any>({
    task: "rewrite",
    criterion,
    essay,
    rubric,
  });

  const suggestions = Array.isArray(res)
    ? res
    : Array.isArray(res?.suggestions)
    ? res.suggestions
    : [];

  localStorage.setItem(`rewrite_${fingerprint}`, JSON.stringify(suggestions));
  return suggestions;
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
  const rawData = buildBaseContent(
    rubric,
    rubricFiles,
    essay,
    essayFiles,
    essayExplanation,
    "General"
  );

  const res = await callGeminiAPI<{ text?: string } | string>({
    task: "chat",
    ...rawData,
    messages,
    analysisSummary: analysisResult ? analysisResult.summary : null,
  });

  if (typeof res === "string") return res;
  return res?.text || "Connection error. Please try again.";
};