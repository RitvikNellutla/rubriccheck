import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, temperature } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: temperature ?? 0,
      messages,
    });

    return res.status(200).json({
      content: completion.choices[0].message.content,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Chat failed" });
  }
}