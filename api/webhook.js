export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    let rawBody = "";

    // 读取 body 内容（兼容所有来源）
    await new Promise((resolve, reject) => {
      req.on("data", chunk => rawBody += chunk);
      req.on("end", resolve);
      req.on("error", reject);
    });

    rawBody = rawBody.trim();
    let code = "";

    try {
      const parsed = JSON.parse(rawBody);

      // 处理嵌套 message JSON：{ "message": "{\"code\":\"...\"}" }
      if (parsed.message) {
        const messageJson = JSON.parse(parsed.message);
        if (typeof messageJson.code === "string") {
          code = messageJson.code;
        }
      }

      // 或者直接是 { "code": "..." }
      if (typeof parsed.code === "string") {
        code = parsed.code;
      }
    } catch (err) {
      // 非 JSON，则看作是直接字符串
      code = rawBody;
    }

    // 验证格式
    const isValid = typeof code === "string" &&
                    (code.startsWith("ENTER-") || code.startsWith("EXIT-")) &&
                    code.includes("_");

    if (!isValid) {
      return res.status(400).json({ error: "Invalid code format", received: code });
    }

    // ✅ 正式转发给 WunderTrading
    const response = await fetch("https://wtalerts.com/bot/custom", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: code.trim()
    });

    const result = await response.text();

    if (!response.ok) {
      return res.status(502).json({ error: "WunderTrading rejected", detail: result });
    }

    return res.status(200).json({
      status: "✅ Forwarded to WunderTrading",
      code: code,
      response: result
    });

  } catch (err) {
    return res.status(500).json({ error: "Server Error", detail: err.message });
  }
}
