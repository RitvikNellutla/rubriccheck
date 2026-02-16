import OpenAI from "openai";

export const config = {
  runtime: "nodejs",
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // ✅ SAFELY PARSE BODY (this fixes the 500)
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const { messages, temperature = 0 } = body || {};

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages payload" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature,
    });

    return res.status(200).json({
      content: completion.choices[0].message.content ?? "",
    });
  } catch (err: any) {
    console.error("CHAT API ERROR:", err);
    return res.status(500).json({
      error: "Chat failed",
      detail: err?.message ?? "unknown",
    });
  }
}