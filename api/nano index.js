const express = require('express');
const bodyParser = require('body-parser');
const handler = require('./api/webhook');

const app = express();
const port = 3000;

app.use(bodyParser.text({ type: "*/*" }));

app.post("/api/webhook", (req, res) => handler(req, res));

app.get("/", (req, res) => {
  res.send("✅ Webhook proxy is running.");
});

app.listen(port, () => {
  console.log(`🚀 Webhook proxy listening on port ${port}`);
});
