const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const {
  listGoats, getGoat, createGoat, updateGoat, deleteGoat, getNextEarTagNumber,
} = require('../controllers/goat.controller');

router.use(authMiddleware);

router.get('/', listGoats);
router.get('/next-ear-tag', getNextEarTagNumber);
router.get('/:id', getGoat);
router.post('/', requireRole('ADMIN', 'SUPERADMIN'), createGoat);
router.patch('/:id', requireRole('ADMIN', 'SUPERADMIN'), updateGoat);
router.delete('/:id', requireRole('ADMIN', 'SUPERADMIN'), deleteGoat);

module.exports = router;
