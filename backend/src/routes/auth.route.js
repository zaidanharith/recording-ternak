const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { login, googleLogin, me, updateMe } = require('../controllers/auth.controller');

router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', authMiddleware, me);
router.patch('/me', authMiddleware, updateMe);

module.exports = router;
