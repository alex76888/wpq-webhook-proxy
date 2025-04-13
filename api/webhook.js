export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    let body = "";

    await new Promise((resolve, reject) => {
      req.on("data", chunk => body += chunk);
      req.on("end", resolve);
      req.on("error", reject);
    });

    body = body.trim();

    // 校验格式是否为 ENTER-... 或 EXIT-...
    const isValid = body.startsWith("ENTER-") || body.startsWith("EXIT-");
    if (!isValid) {
      return res.status(400).json({ error: "Invalid alert message", received: body });
    }

    // 转发到 WunderTrading
    const forwardResponse = await fetch("https://wtalerts.com/bot/custom", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: body
    });

    const result = await forwardResponse.text();

    if (!forwardResponse.ok) {
      return res.status(502).json({
        error: "WunderTrading rejected",
        status: forwardResponse.status,
        detail: result
      });
    }

    return res.status(200).json({
      status: "✅ Forwarded successfully",
      sent: body,
      response: result
    });

  } catch (err) {
    return res.status(500).json({ error: "Server Error", detail: err.message });
  }
}
