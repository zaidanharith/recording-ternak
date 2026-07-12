const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const {
  listRecordings, getRecording, createRecording, updateRecording, deleteRecording, exportRecordings,
} = require('../controllers/recording.controller');

router.use(authMiddleware);

router.get('/', listRecordings);
router.get('/export', exportRecordings);
router.get('/:id', getRecording);
router.post('/', requireRole('ADMIN', 'SUPERADMIN'), createRecording);
router.patch('/:id', requireRole('ADMIN', 'SUPERADMIN'), updateRecording);
router.delete('/:id', requireRole('ADMIN', 'SUPERADMIN'), deleteRecording);

module.exports = router;
