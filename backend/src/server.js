require('dotenv').config();
const dns = require('dns');
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Recording Ternak Backend is active' });
});

app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Recording Ternak Backend is healthy' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Recording Ternak Backend running on port ${PORT}`);
    console.log(`👉 Webhook URL: http://localhost:${PORT}/api/webhook`);
  });
}

module.exports = app;
