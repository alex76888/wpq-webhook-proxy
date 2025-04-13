export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const wtWebhookURL = process.env.WT_WEBHOOK_URL || "https://wtalerts.com/bot/custom";

  try {
    // 打印收到的 Payload，方便调试
    console.log("Received payload from TradingView:", req.body);

    // TradingView 可能发送字符串或嵌套的 JSON，尝试解析
    let payload = req.body;

    // 如果是字符串，尝试解析为 JSON
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        return res.status(400).json({ error: "Invalid JSON payload" });
      }
    }

    // 如果是 {"message": "..."} 格式，提取 message 字段
    if (payload.message) {
      try {
        payload = JSON.parse(payload.message);
      } catch (e) {
        return res.status(400).json({ error: "Invalid message format" });
      }
    }

    // 验证 Payload 是否包含 code 字段
    if (!payload.code) {
      return res.status(400).json({ error: "Missing 'code' in payload" });
    }

    // 转发到 WunderTrading
    const response = await fetch(wtWebhookURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`WunderTrading responded with status ${response.status}`);
    }

    const result = await response.json();
    res.status(200).json({
      status: "✅ Forwarded to WunderTrading",
      response: result,
    });
  } catch (err) {
    console.error("Webhook forwarding error:", err);
    res.status(500).json({ error: "Webhook forwarding failed" });
  }
}
