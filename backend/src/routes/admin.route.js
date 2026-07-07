const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { listAdmins, createAdmin, updateAdmin, deleteAdmin } = require('../controllers/admin.controller');

router.use(authMiddleware, requireRole('SUPERADMIN'));

router.get('/', listAdmins);
router.post('/', createAdmin);
router.patch('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);

module.exports = router;
