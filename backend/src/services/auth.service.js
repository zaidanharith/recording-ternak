const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');

const hashPassword = async (plainPassword) => {
  return await bcrypt.hash(plainPassword, 10);
};

const comparePassword = async (plainPassword, hash) => {
  return await bcrypt.compare(plainPassword, hash);
};

const generateToken = (admin) => {
  return jwt.sign(
    {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
    config.auth.jwtSecret,
    { expiresIn: config.auth.jwtExpiresIn }
  );
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
};
