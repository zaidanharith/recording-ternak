const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const {
  generateAktaKelahiran,
  listLaporan,
  getLaporan,
  updateLaporan,
  deleteLaporan,
  downloadAkta,
} = require('../controllers/kelahiran.controller');

router.use(authMiddleware);

router.post('/goats/:goatId/generate', requireRole('ADMIN', 'SUPERADMIN'), generateAktaKelahiran);

router.get('/', listLaporan);
router.get('/:id', getLaporan);
router.get('/:id/download', downloadAkta);
router.patch('/:id', requireRole('ADMIN', 'SUPERADMIN'), updateLaporan);
router.delete('/:id', requireRole('ADMIN', 'SUPERADMIN'), deleteLaporan);

module.exports = router;
