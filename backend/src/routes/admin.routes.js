const { Router } = require('express');
const adminController = require('../controllers/admin.controller');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = Router();

router.get('/audit-logs', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  adminController.getAuditLogs(req, res, next)
);

router.get('/system-health', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  adminController.getSystemHealth(req, res, next)
);

module.exports = router;
