const { Router } = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/authMiddleware');

const router = Router();

router.get('/citizen', requireAuth, (req, res, next) =>
  dashboardController.getCitizenDashboard(req, res, next)
);

router.get('/admin', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  dashboardController.getAdminDashboard(req, res, next)
);

router.get('/stats', optionalAuth, (req, res, next) =>
  dashboardController.getDashboardStats(req, res, next)
);

module.exports = router;
