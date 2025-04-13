export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const wtWebhookURL = process.env.WT_WEBHOOK_URL || "https://wtalerts.com/bot/custom";
  const defaultQuantity = parseFloat(process.env.TRADE_QTY || "0.01");

  try {
    // Step 1: 打印原始 payload
    console.log("📥 Raw Payload:", JSON.stringify(req.body, null, 2));

    let payload = req.body;

    // 如果是字符串，尝试解析 JSON
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        console.error("❌ Failed to parse raw string payload:", payload);
        return res.status(400).json({ error: "Invalid JSON payload string" });
      }
    }

    // 如果嵌套在 payload.message 里，再解析一次
    if (payload.message) {
      try {
        payload = JSON.parse(payload.message);
      } catch (e) {
        console.error("❌ Failed to parse payload.message:", payload.message);
        return res.status(400).json({ error: "Invalid message field" });
      }
    }

    // Step 2: 校验是否有 code 字段
    if (!payload.code) {
      console.error("❌ Missing 'code' in payload:", payload);
      return res.status(400).json({ error: "Missing 'code' in payload" });
    }

    // Step 3: 映射到 WunderTrading 格式
    const exchange = (payload.exchange || "BINANCE").toLowerCase();
    const symbol = payload.symbol || "BTCUSDT";
    const qty = parseFloat(payload.quantity || defaultQuantity);

    let mappedPayload = null;

    switch (payload.code) {
      case "ENTER-LONG":
        mappedPayload = {
          action: "buy",
          symbol: symbol,
          exchange: exchange,
          quantity: qty,
        };
        break;

      case "ENTER-SHORT":
        mappedPayload = {
          action: "sell",
          symbol: symbol,
          exchange: exchange,
          quantity: qty,
        };
        break;

      case "EXIT-LONG":
      case "EXIT-SHORT":
        mappedPayload = {
          action: "close",
          symbol: symbol,
          exchange: exchange,
        };
        break;

      default:
        console.error("❌ Unsupported code:", payload.code);
        return res.status(400).json({ error: `Unsupported code: ${payload.code}` });
    }

    // Step 4: 打印即将发送的 payload
    console.log("🚀 Mapped Payload to WT:", JSON.stringify(mappedPayload, null, 2));

    // Step 5: 发送给 WunderTrading
    const response = await fetch(wtWebhookURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mappedPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ WunderTrading Error:", response.status, errorText);
      return res.status(502).json({ error: "WunderTrading rejected request", status: response.status, response: errorText });
    }

    const result = await response.json();
    console.log("✅ Success Response from WT:", result);
    res.status(200).json({
      status: "✅ Forwarded to WunderTrading",
      response: result,
    });

  } catch (err) {
    console.error("🔥 Unhandled Error:", err.message);
    res.status(500).json({ error: "Webhook forwarding failed", details: err.message });
  }
}
