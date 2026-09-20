const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', optionalAuth, authController.logout);
router.get('/me', requireAuth, authController.getMe);
router.patch('/profile', requireAuth, authController.updateProfile);
router.patch('/password', requireAuth, authController.updatePassword);

module.exports = router;
