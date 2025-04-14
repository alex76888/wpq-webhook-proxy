export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    let rawBody = "";

    // 收集原始请求体
    await new Promise((resolve, reject) => {
      req.on("data", chunk => rawBody += chunk);
      req.on("end", resolve);
      req.on("error", reject);
    });

    let payload = rawBody;

    // 尝试解析为 JSON
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
      // 不是 JSON，直接用原始文本
    }

    // 检查是否为合法快捷命令
    const isValid = typeof payload === "string" &&
      (payload.startsWith("ENTER-") || payload.startsWith("EXIT-")) &&
      payload.includes("_");

    if (!isValid) {
      return res.status(400).json({ error: "Invalid payload", received: payload });
    }

    // 正式转发给 WunderTrading
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
