// Vercel serverless funksiya: foydalanuvchini tekshiradi, ovozni Gemini'ga yuboradi.
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Faqat POST" });

  const token = (req.headers.authorization || "").replace("Bearer ", "");
  const u = await fetch(process.env.SUPABASE_URL + "/auth/v1/user", {
    headers: { Authorization: "Bearer " + token, apikey: process.env.SUPABASE_ANON_KEY },
  });
  if (!u.ok) return res.status(401).json({ error: "Avval tizimga kiring" });

  const { audio, part, question, seconds } = req.body || {};
  if (!audio || !question) return res.status(400).json({ error: "Ma’lumot yetarli emas" });

  const prompt = `You are a strict but fair CEFR speaking examiner for the Uzbekistan National Certificate exam.
Part: ${part}. Question: "${question}". The candidate spoke for ${seconds} seconds (audio attached).
First transcribe what the candidate said in English. Then judge task response, fluency and coherence, vocabulary range, grammar accuracy and pronunciation.
If the audio is silent or not English, give "Below A2" and score 0.
Return ONLY JSON: {"transcript":"...","level":"Below A2|A2|B1|B2|C1","score":<integer 0-75>,"fluency":<0-10>,"vocabulary":<0-10>,"grammar":<0-10>,"pronunciation":<0-10>,"summary":"2-3 sentences in Uzbek","tips":["tip in Uzbek","tip in Uzbek","tip in Uzbek"]}`;

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "audio/wav", data: audio } }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
    }),
  });
  if (!r.ok) return res.status(502).json({ error: "Gemini xatosi", detail: (await r.text()).slice(0, 300) });

  const j = await r.json();
  const text = j.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  try { res.status(200).json(JSON.parse(text)); }
  catch { res.status(502).json({ error: "Javobni o‘qib bo‘lmadi" }); }
};
