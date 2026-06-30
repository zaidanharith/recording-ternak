require('dotenv').config();
const http = require('http');
const url = require('url');
const webhookHandler = require('../api/webhook');

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  req.query = Object.fromEntries(parsedUrl.searchParams);

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      if (body) {
        req.body = JSON.parse(body);
      }
    } catch (e) {
      req.body = {};
    }

    res.status = (statusCode) => {
      res.statusCode = statusCode;
      return res;
    };

    res.send = (data) => {
      res.end(data);
      return res;
    };

    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return res;
    };

    await webhookHandler(req, res);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Local test server running on port ${PORT}`);
  console.log(`👉 Webhook URL: http://localhost:${PORT}/api/webhook`);
});
