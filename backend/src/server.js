require('dotenv').config();
const dns = require('dns');
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const express = require('express');
const webhookRoutes = require('./routes/webhook.route');
const { runFullSync } = require('./services/sync.service');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Recording Ternak Backend is active' });
});

app.use('/api/webhook', webhookRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Recording Ternak Backend is healthy' });
});

// Admin: full sync DB → Sheets secara manual
app.post('/admin/sync', async (req, res) => {
  try {
    await runFullSync();
    res.status(200).json({ status: 'OK', message: 'Full sync selesai' });
  } catch (err) {
    console.error('❌ Admin sync error:', err);
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Recording Ternak Backend running on port ${PORT}`);
    console.log(`👉 Webhook URL: http://localhost:${PORT}/api/webhook`);
  });
}

module.exports = app;
