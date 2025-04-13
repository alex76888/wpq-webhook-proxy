export default async function handler(req, res) {
  // 检查请求方法
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 从环境变量获取Webhook URL
  const wtWebhookURL = process.env.WT_WEBHOOK_URL || "https://wtalerts.com/bot/custom";

  try {
    // 验证req.body是否为有效JSON对象
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ error: "Invalid request body" });
    }

    // 转发请求到WunderTrading
    const response = await fetch(wtWebhookURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    // 检查响应状态
    if (!response.ok) {
      throw new Error(`WunderTrading responded with status ${response.status}`);
    }

    // 假设WunderTrading返回JSON，解析响应
    const result = await response.json();

    // 返回成功响应
    res.status(200).json({
      status: "✅ Forwarded to WunderTrading",
      response: result,
    });
  } catch (err) {
    // 记录详细错误（在生产环境中建议使用日志库，如Winston）
    console.error("Webhook forwarding error:", err);

    // 返回通用错误信息，避免泄露敏感细节
    res.status(500).json({ error: "Webhook forwarding failed" });
  }
}
