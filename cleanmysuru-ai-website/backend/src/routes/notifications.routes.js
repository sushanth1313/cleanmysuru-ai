const { Router } = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const notificationsController = require('../controllers/notifications.controller');

const router = Router();

router.use(requireAuth);

router.get('/', notificationsController.getNotifications);
router.patch('/:id/read', notificationsController.markAsRead);
router.patch('/read-all', notificationsController.markAllAsRead);

module.exports = router;
