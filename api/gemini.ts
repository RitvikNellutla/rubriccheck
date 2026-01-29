import type { VercelRequest, VercelResponse } from "@vercel/node";

type AnyJson = Record<string, any>;

function buildPromptAnalyze(body: AnyJson) {
  const rubric = body.rubric || "";
  const essay = body.essay || "";
  const essayExplanation = body.essayExplanation || "";
  const isStrict = Boolean(body.isStrict);
  const workType = body.workType || "General";

  const strictPrompt = isStrict
    ? "STRICT EVALUATION: Zero tolerance for missing requirements. If a rule is not 100% met with evidence, it is 'missing' or 'weak'."
    : "BALANCED EVALUATION: Focus on intent and overall success.";

  return `
TASK: Provide a mathematical evaluation for a ${workType}.
1. BREAKDOWN: Extract every single unique requirement from the provided rules.
2. CHECKLIST: For each requirement, look for verbatim evidence in the student work.
3. SCORING:
   - If evidence exists: status = 'met' (100% value)
   - If evidence is vague/partial: status = 'weak' (50% value)
   - If no evidence: status = 'missing' (0% value)
4. MATH: The final 'score' MUST be the weighted average of these statuses.
5. SETTING: ${strictPrompt}
6. AI DETECTION: Perform forensic analysis for AI markers.

OUTPUT: Valid JSON only.
RUBRIC:
${rubric}

STUDENT WORK:
${essayExplanation ? `EXPLANATION:\n${essayExplanation}\n\n` : ""}${essay}
`.trim();
}

function cleanJson(text: string) {
  return text.replace(/```json|```/g, "").trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS (safe default)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY env var" });
    }

    const body = (req.body ?? {}) as AnyJson;
    const task = body.task;

    let prompt = "";

    if (task === "analyze") {
      prompt = buildPromptAnalyze(body);
    } else if (task === "rewrite") {
      const c = body.criterion?.criterion || "";
      const evidence = body.criterion?.evidence || "";
      prompt = `WORK:\n${body.essay || ""}\n\nRULES:\n${body.rubric || ""}\n\nFIXING: ${c}\nEVIDENCE: "${evidence}"\nTask: 3 natural rewrites. Return JSON array of strings only.`;
    } else if (task === "chat") {
      const msgs = Array.isArray(body.messages) ? body.messages : [];
      const context = `RUBRIC:\n${body.rubric || ""}\n\nWORK:\n${body.essay || ""}\n`;
      prompt =
        context +
        "\nConversation:\n" +
        msgs.map((m: AnyJson) => `${String(m.role || "").toUpperCase()}: ${m.text || ""}`).join("\n") +
        "\n\nReply concisely.";
    } else {
      return res.status(400).json({ error: "Invalid task" });
    }

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await resp.json();

    if (!resp.ok) {
      return res.status(resp.status).json({
        error: data?.error?.message || "Gemini request failed",
        data,
      });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (task === "analyze" || task === "rewrite") {
      return res.status(200).send(cleanJson(text));
    }

    // chat
    return res.status(200).json({ text });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Server error" });
  }
}