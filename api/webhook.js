export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const wtWebhookURL = process.env.WT_WEBHOOK_URL || "https://wtalerts.com/bot/custom";
  const defaultQuantity = parseFloat(process.env.TRADE_QTY || "0.01");

  try {
    console.log("📥 Raw Payload:", JSON.stringify(req.body));

    let payload = req.body;

    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        return res.status(400).json({ error: "Invalid JSON payload" });
      }
    }

    // 如果有 message 字段，进一步解析
    if (payload.message) {
      try {
        payload = JSON.parse(payload.message);
      } catch (e) {
        return res.status(400).json({ error: "Invalid message format in 'message' field" });
      }
    }

    if (!payload.code) {
      return res.status(400).json({ error: "Missing 'code' in payload" });
    }

    // 🔁 映射 TradingView code → WunderTrading 请求格式
    let mappedPayload = null;

    const exchange = (payload.exchange || "BINANCE").toLowerCase();
    const symbol = payload.symbol || "BTCUSDT";
    const qty = parseFloat(payload.quantity || defaultQuantity);

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
        return res.status(400).json({ error: `Unsupported code: ${payload.code}` });
    }

    console.log("📤 Mapped Payload to WT:", JSON.stringify(mappedPayload));

    const response = await fetch(wtWebhookURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mappedPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ WT error:", response.status, errorText);
      throw new Error(`WunderTrading responded with status ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log("✅ Forwarded to WT:", result);

    res.status(200).json({
      status: "✅ Forwarded to WunderTrading",
      response: result,
    });
  } catch (err) {
    console.error("❌ Webhook forwarding error:", err.message);
    res.status(500).json({ error: "Webhook forwarding failed", details: err.message });
  }
}
