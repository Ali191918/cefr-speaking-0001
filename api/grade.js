// Vercel serverless funksiya: eng tez bepul Gemini modelidan boshlab sinaydi.
const EXPECTED = { "Part 1.1": 90, "Part 1.2": 105, "Part 2": 120, "Part 3": 120 };

const SCHEMA = {
  type: "OBJECT",
  properties: {
    transcript: { type: "STRING" },
    fluency: { type: "INTEGER" },
    vocabulary: { type: "INTEGER" },
    grammar: { type: "INTEGER" },
    pronunciation: { type: "INTEGER" },
    task: { type: "INTEGER" },
    summary: { type: "STRING" },
    tips: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["transcript", "fluency", "vocabulary", "grammar", "pronunciation", "task", "summary", "tips"],
  propertyOrdering: ["transcript", "fluency", "vocabulary", "grammar", "pronunciation", "task", "summary", "tips"],
};

const clamp = (n) => Math.max(0, Math.min(10, Math.round(+n || 0)));
const levelOf = (s) => (s >= 65 ? "C1" : s >= 51 ? "B2" : s >= 38 ? "B1" : "Below B1");

// Tezdan sekinga: birinchisi ishlamasa (nom yo'q, limit tugagan, server band) keyingisi sinaladi.
const MODELS = [process.env.GEMINI_MODEL, "gemini-3.5-flash-lite", "gemini-2.5-flash-lite", "gemini-2.5-flash"]
  .filter(Boolean)
  .filter((m, i, a) => a.indexOf(m) === i);

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Faqat POST" });

  const token = (req.headers.authorization || "").replace("Bearer ", "");
  const u = await fetch(process.env.SUPABASE_URL + "/auth/v1/user", {
    headers: { Authorization: "Bearer " + token, apikey: process.env.SUPABASE_ANON_KEY },
  });
  if (!u.ok) return res.status(401).json({ error: "Avval tizimga kiring" });

  const { audio, part, question, seconds } = req.body || {};
  if (!audio || !question) return res.status(400).json({ error: "Ma’lumot yetarli emas" });

  const expected = EXPECTED[part] || 90;
  const used = Math.round(+seconds || 0);

  const prompt = `You are an experienced, strict CEFR speaking examiner (Uzbekistan National Certificate / Multilevel). Candidates are usually native Uzbek speakers learning English.
Section: ${part}. Prompts (in order, [..] are descriptions of pictures/tables the candidate saw): ${question}
Available speaking time: ${expected}s. Candidate actually spoke: ${used}s.

Step 1. Transcribe the audio EXACTLY as spoken in English. Keep every grammar mistake and hesitation word. Never correct or improve it.
Step 2. Score 0-10 on each criterion, using the transcript and the audio:
- fluency: speed, pauses, self-correction, coherence of ideas
- vocabulary: range, precision, topic-specific words
- grammar: accuracy and variety of structures
- pronunciation: intelligibility, stress, intonation (accent alone is not penalised)
- task: answered every prompt, enough development, on topic, uses the available time
Scale: 9-10 = C1 (fluent, wide range, rare errors); 7-8 = B2 (clear, detailed, some errors); 5-6 = B1 (simple but understandable, frequent errors); 3-4 = A2 (very basic, many breaks); 0-2 = almost nothing or off-topic.
Rules: be consistent and do not inflate scores. If the candidate used under half of the available time, task must be 5 or lower. Silence, noise or non-English speech gets 0 on all criteria. Memorised or off-topic answers lower task.
Step 3. summary: 1-2 short sentences in Uzbek naming the main strength and weakness. tips: exactly 3 short, concrete tips in Uzbek.`;

  const body = (gen) => JSON.stringify({
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "audio/wav", data: audio } }] }],
    generationConfig: gen,
  });

  let r, lastErr = "";
  for (const model of MODELS) {
    const gen = { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0.2, maxOutputTokens: 1200 };
    if (/2\.5/.test(model)) gen.thinkingConfig = { thinkingBudget: 0 }; // o'ylash o'chiq: tezroq
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: body(gen),
    });
    if (r.ok) break;
    lastErr = model + ": " + (await r.text()).slice(0, 200);
    if (![400, 404, 429, 500, 503].includes(r.status)) break;
  }
  if (!r.ok) return res.status(502).json({ error: "Gemini xatosi", detail: lastErr });

  try {
    const j = await r.json();
    const o = JSON.parse(j.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
    const f = clamp(o.fluency), v = clamp(o.vocabulary), g = clamp(o.grammar), p = clamp(o.pronunciation);
    let t = clamp(o.task);
    if (used < expected / 2) t = Math.min(t, 5);
    const score = Math.round(((f + v + g + p + t) / 5) * 7.5);
    res.status(200).json({
      transcript: o.transcript || "",
      fluency: f, vocabulary: v, grammar: g, pronunciation: p, task: t,
      score, level: levelOf(score),
      summary: o.summary || "",
      tips: (o.tips || []).slice(0, 3),
    });
  } catch {
    res.status(502).json({ error: "Javobni o‘qib bo‘lmadi" });
  }
};

