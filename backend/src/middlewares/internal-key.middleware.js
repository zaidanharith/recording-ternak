const config = require('../config');

module.exports = (req, res, next) => {
  const key = req.headers['x-internal-key'];

  if (!config.dashboard.internalApiKey || key !== config.dashboard.internalApiKey) {
    return res.status(401).json({
      success: false,
      message: 'Internal API key tidak valid.',
    });
  }

  return next();
};
