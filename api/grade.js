  const token = (req.headers.authorization || "").replace("Bearer ", "");
  const u = await fetch(process.env.SUPABASE_URL + "/auth/v1/user", {
    headers: { Authorization: "Bearer " + token, apikey: process.env.SUPABASE_ANON_KEY },
  });
  if (!u.ok) return res.status(401).json({ error: "Avval tizimga kiring" });

