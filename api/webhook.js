async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    let rawBody = "";

    await new Promise((resolve, reject) => {
      req.on("data", chunk => rawBody += chunk);
      req.on("end", resolve);
      req.on("error", reject);
    });

    let payload = rawBody;

    try {
      const parsed = JSON.parse(rawBody);
      if (typeof parsed === "object" && parsed.code) {
        payload = parsed.code;
      } else if (typeof parsed.message === "string") {
        const parsedMessage = JSON.parse(parsed.message);
        if (parsedMessage.code) {
          payload = parsedMessage.code;
        }
      }
    } catch (e) {
      // 忽略错误，使用原始 body
    }

    const isValid = typeof payload === "string" &&
      (payload.startsWith("ENTER-") || payload.startsWith("EXIT-")) &&
      payload.includes("_");

    if (!isValid) {
      return res.status(400).json({ error: "Invalid payload", received: payload });
    }

    const response = await fetch("https://wtalerts.com/bot/custom", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: payload.trim()
    });

    const result = await response.text();

    if (!response.ok) {
      return res.status(502).json({
        error: "WunderTrading rejected request",
        status: response.status,
        detail: result
      });
    }

    return res.status(200).json({
      status: "✅ Forwarded to WunderTrading",
      forward: payload,
      response: result
    });

  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error", detail: err.message });
  }
}

// 导出 handler 给 Express 用
module.exports = handler;
