const { hashPassword, comparePassword, generateToken } = require('../auth.service');
const jwt = require('jsonwebtoken');
const config = require('../../config');

describe('hashPassword and comparePassword', () => {
  it('produces a hash that comparePassword verifies as matching', async () => {
    const hash = await hashPassword('rahasia123');

    const isMatch = await comparePassword('rahasia123', hash);

    expect(isMatch).toBe(true);
  });

  it('rejects a wrong password against the hash', async () => {
    const hash = await hashPassword('rahasia123');

    const isMatch = await comparePassword('salah', hash);

    expect(isMatch).toBe(false);
  });
});

describe('generateToken', () => {
  it('signs a JWT containing id, email, and role', () => {
    const admin = { id: 'admin-1', username: 'budi', email: 'budi@example.com', name: 'Budi', role: 'ADMIN' };

    const token = generateToken(admin);
    const decoded = jwt.verify(token, config.auth.jwtSecret);

    expect(decoded).toMatchObject({
      id: 'admin-1',
      email: 'budi@example.com',
      role: 'ADMIN',
    });
  });
});
