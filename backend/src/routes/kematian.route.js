const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { getFormOptions, generateBeritaAcara } = require('../controllers/kematian.controller');

router.use(authMiddleware);

router.get('/form-options', getFormOptions);
router.post('/goats/:goatId/generate', requireRole('ADMIN', 'SUPERADMIN'), generateBeritaAcara);

module.exports = router;
