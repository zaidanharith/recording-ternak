const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses untuk melakukan aksi ini.',
      });
    }
    return next();
  };
};

module.exports = { requireRole };
