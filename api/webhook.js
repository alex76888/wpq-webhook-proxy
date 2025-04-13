export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const wtWebhookURL = "https://wtalerts.com/bot/custom";

  try {
    const response = await fetch(wtWebhookURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });

    const result = await response.text();
    res.status(200).json({ status: "✅ Forwarded to WunderTrading", response: result });
  } catch (err) {
    res.status(500).json({ error: "❌ Forwarding Failed", detail: err.message });
  }
}
