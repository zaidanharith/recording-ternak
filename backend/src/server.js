require('dotenv').config();
const express = require('express');
const webhookRoutes = require('./routes/webhook.route');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use('/api/webhook', webhookRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Recording Ternak Backend is healthy' });
});

app.listen(PORT, () => {
  console.log(`🚀 Recording Ternak Backend running on port ${PORT}`);
  console.log(`👉 Webhook URL: http://localhost:${PORT}/api/webhook`);
});
