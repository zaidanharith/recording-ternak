const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const config = require('./config');

const getChromePath = () => {
  if (config.whatsapp.chromePath && fs.existsSync(config.whatsapp.chromePath)) {
    return config.whatsapp.chromePath;
  }
  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
};

const createClient = () => {
  const chromePath = getChromePath();
  const puppeteerOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  };
  if (chromePath) {
    puppeteerOptions.executablePath = chromePath;
  }
  return new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: puppeteerOptions,
  });
};

const initWhatsApp = (onMessageHandler) => {
  const client = createClient();

  client.on('qr', (qr) => {
    console.log('\n📱 Scan QR Code berikut dengan WhatsApp di HP Anda:\n');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    console.log('✅ WhatsApp Bot siap menerima laporan ternak!\n');
  });

  client.on('authenticated', () => {
    console.log('🔐 Autentikasi WhatsApp berhasil. Sesi disimpan.\n');
  });

  client.on('auth_failure', (msg) => {
    console.error('❌ Autentikasi gagal:', msg);
    process.exit(1);
  });

  client.on('disconnected', (reason) => {
    console.warn('⚠️  Bot terputus:', reason);
    console.log('🔄 Mencoba menghubungkan kembali...');
    client.initialize();
  });

  client.on('message', onMessageHandler);

  client.initialize();

  return client;
};

module.exports = { initWhatsApp };
