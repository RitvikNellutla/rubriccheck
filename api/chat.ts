import OpenAI from "openai";

export const config = { runtime: "nodejs" };

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const { messages, temperature = 0 } = body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature,
    });

    res.status(200).json({
      content: completion.choices[0].message.content ?? "",
    });
  } catch (err: any) {
    console.error("CHAT API ERROR:", err);
    res.status(500).json({ error: "Chat failed" });
  }
}