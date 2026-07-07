const dashboardService = require('../services/dashboard.service');

exports.getSummary = async (req, res) => {
  try {
    const summary = await dashboardService.getSummary();
    return res.status(200).json({ success: true, data: { summary } });
  } catch (error) {
    console.error('Dashboard Summary Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil ringkasan dashboard.',
      error: error.message,
    });
  }
};

exports.getCharts = async (req, res) => {
  try {
    const charts = await dashboardService.getCharts();
    return res.status(200).json({ success: true, data: { charts } });
  } catch (error) {
    console.error('Dashboard Charts Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data visualisasi.',
      error: error.message,
    });
  }
};

exports.getAlerts = async (req, res) => {
  try {
    const alerts = await dashboardService.getAlerts();
    return res.status(200).json({ success: true, data: { alerts } });
  } catch (error) {
    console.error('Dashboard Alerts Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil alert kambing.',
      error: error.message,
    });
  }
};
