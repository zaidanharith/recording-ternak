require('dotenv').config();
const express = require('express');
const webhookRoutes = require('./routes/webhook.route');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware untuk memproses JSON request body
app.use(express.json());

// Mount router webhook
app.use('/api/webhook', webhookRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Recording Ternak Backend is healthy' });
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`🚀 Recording Ternak Backend running on port ${PORT}`);
  console.log(`👉 Webhook URL: http://localhost:${PORT}/api/webhook`);
});
