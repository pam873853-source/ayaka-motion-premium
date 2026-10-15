/* =========================================================
   VERCEL PROXY — Catch-all route untuk mail.tm (via CORS Proxy)
   Route: /api/proxy/*
   ========================================================= */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Ambil path segments dari catch-all
  const pathParts = req.query.path || [];
  const pathStr   = Array.isArray(pathParts) ? pathParts.join("/") : pathParts;
  const query     = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  
  // URL asli mail.tm
  const mailTmUrl = "https://api.mail.tm/" + pathStr + query;
  
  // Bungkus dengan CORS Proxy (Ganti dengan proxy favorit Anda jika perlu)
  // Contoh menggunakan corsproxy.io
  const targetUrl = "https://corsproxy.io/?" + encodeURIComponent(mailTmUrl);

  try {
    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json"
    };

    if (req.headers.authorization) {
      headers["Authorization"] = req.headers.authorization;
    }

    const fetchOptions = {
      method: req.method,
      headers: headers
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      if (req.body) {
        fetchOptions.body = typeof req.body === "string"
          ? req.body
          : JSON.stringify(req.body);
      }
    }

    // Tambahkan timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 detik
    fetchOptions.signal = controller.signal;

    const response = await fetch(targetUrl, fetchOptions);
    clearTimeout(timeoutId);
    
    const text = await response.text();

    // Log error jika ada
    if (!response.ok) {
      console.error(`[PROXY ERROR] Status ${response.status}: ${text}`);
    }

    res.setHeader("Content-Type", "application/json");
    res.status(response.status).send(text);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: error.message });
  }
}