export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const wtWebhookURL = process.env.WT_WEBHOOK_URL || "https://wtalerts.com/bot/custom";

  try {
    // 打印原始Payload
    console.log("Received payload from TradingView:", JSON.stringify(req.body, null, 2));

    let payload = req.body;

    // 如果是字符串，尝试解析为JSON
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        console.error("Failed to parse payload as JSON:", payload, e);
        return res.status(400).json({ error: "Invalid JSON payload" });
      }
    }

    // 打印解析前的Payload
    console.log("Payload after string parsing:", JSON.stringify(payload, null, 2));

    // 处理嵌套的message字段
    if (payload.message) {
      let messageContent = payload.message;
      if (typeof messageContent === "string") {
        messageContent = messageContent.replace(/^"|"$/g, "");
        try {
          payload = JSON.parse(messageContent);
        } catch (e) {
          console.error("Failed to parse message field after cleaning:", messageContent, e);
          return res.status(400).json({ error: "Invalid message format in 'message' field" });
        }
      } else {
        payload = messageContent;
      }
    }

    // 打印解析后的Payload
    console.log("Parsed payload:", JSON.stringify(payload, null, 2));

    // 验证code字段
    if (!payload.code) {
      console.error("Missing 'code' in parsed payload:", payload);
      return res.status(400).json({ error: "Missing 'code' in payload" });
    }

    // 转发到WunderTrading
    console.log("Forwarding to WunderTrading:", wtWebhookURL);
    const response = await fetch(wtWebhookURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text(); // 获取详细错误信息
      console.error("WunderTrading response error:", response.status, errorText);
      throw new Error(`WunderTrading responded with status ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log("WunderTrading response:", result);
    res.status(200).json({
      status: "✅ Forwarded to WunderTrading",
      response: result,
    });
  } catch (err) {
    console.error("Webhook forwarding error:", err.message);
    res.status(500).json({ error: "Webhook forwarding failed", details: err.message });
  }
}
