const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const {
  getFormOptions,
  generateBeritaAcara,
  listLaporan,
  getLaporan,
  updateLaporan,
  deleteLaporan,
  downloadBeritaAcara,
} = require('../controllers/kematian.controller');

router.use(authMiddleware);

router.get('/form-options', getFormOptions);
router.post('/goats/:goatId/generate', requireRole('ADMIN', 'SUPERADMIN'), generateBeritaAcara);

router.get('/', listLaporan);
router.get('/:id', getLaporan);
router.get('/:id/download', downloadBeritaAcara);
router.patch('/:id', requireRole('ADMIN', 'SUPERADMIN'), updateLaporan);
router.delete('/:id', requireRole('ADMIN', 'SUPERADMIN'), deleteLaporan);

module.exports = router;
