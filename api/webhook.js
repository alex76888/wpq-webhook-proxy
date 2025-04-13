export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    let rawBody = "";

    // 收集请求体内容
    await new Promise((resolve, reject) => {
      req.on("data", chunk => rawBody += chunk);
      req.on("end", resolve);
      req.on("error", reject);
    });

    rawBody = rawBody.trim();
    let code = "";

    // 尝试解析为 JSON
    try {
      const parsed = JSON.parse(rawBody);

      // 如果包含嵌套 message 字段
      if (parsed.message) {
        const nested = JSON.parse(parsed.message);
        if (typeof nested.code === "string") {
          code = nested.code;
        }
      } else if (typeof parsed.code === "string") {
        code = parsed.code;
      }
    } catch (e) {
      // 不是 JSON，可能是纯文本
      code = rawBody;
    }

    // 最终校验 code 格式
    if (!code || !(code.startsWith("ENTER-") || code.startsWith("EXIT-"))) {
      return res.status(400).json({
        error: "Invalid or missing 'code'",
        received: rawBody
      });
    }

    // 发给 WunderTrading
    const wtRes = await fetch("https://wtalerts.com/bot/trading_view", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: code
    });

    const result = await wtRes.text();

    if (!wtRes.ok) {
      return res.status(502).json({
        error: "WunderTrading rejected",
        status: wtRes.status,
        detail: result
      });
    }

    return res.status(200).json({
      status: "✅ Forwarded to WunderTrading",
      forward: code,
      response: result
    });

  } catch (err) {
    console.error("🚨 Internal Error:", err);
    return res.status(500).json({ error: "Server error", detail: err.message });
  }
}
