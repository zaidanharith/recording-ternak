const farmerRepository = require('../repositories/farmer.repository');
const { sendTextMessage } = require('../services/whatsapp.service');

const REMINDER_MESSAGE = 'Halo Pak/Bu, kami belum menerima laporan ternak dari Anda dalam beberapa waktu terakhir. Mohon kirim laporan terbaru kondisi kambing Anda ya. Terima kasih 🙏';

exports.listNotReported = async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const farmers = await farmerRepository.listFarmersNotReported(days);

    return res.status(200).json({
      success: true,
      data: { farmers, days },
    });
  } catch (error) {
    console.error('List Follow-up Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil daftar peternak belum lapor.',
      error: error.message,
    });
  }
};

exports.sendBulkReminder = async (req, res) => {
  try {
    const days = parseInt(req.body.days, 10) || 30;
    const farmers = await farmerRepository.listFarmersNotReported(days);

    const results = await Promise.allSettled(
      farmers.map((farmer) => sendTextMessage(farmer.whatsappPhone, REMINDER_MESSAGE))
    );

    const sentCount = results.filter((r) => r.status === 'fulfilled').length;
    const failedCount = results.length - sentCount;

    return res.status(200).json({
      success: true,
      message: `Reminder terkirim ke ${sentCount} peternak${failedCount > 0 ? `, ${failedCount} gagal` : ''}.`,
      data: { sentCount, failedCount },
    });
  } catch (error) {
    console.error('Bulk Reminder Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengirim reminder massal.',
      error: error.message,
    });
  }
};
