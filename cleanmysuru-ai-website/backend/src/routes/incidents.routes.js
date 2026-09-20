// Compatibility alias forwarding /api/incidents to /api/complaints
const { Router } = require('express');
const complaintsController = require('../controllers/complaints.controller');
const upload = require('../middleware/upload.middleware');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/authMiddleware');

const router = Router();

const normalizeCompletionUpload = (req, res, next) => {
  if (req.files && Array.isArray(req.files)) {
    req.file =
      req.files.find((f) => ['completionEvidence', 'completionFile', 'file', 'image'].includes(f.fieldname)) ||
      req.files[0];
  }
  next();
};

router.post('/', optionalAuth, upload.any(), (req, res, next) => {
  if (req.files && req.files[0]) {
    req.file = req.files[0];
  }
  complaintsController.createComplaint(req, res, next);
});

router.get('/', optionalAuth, (req, res, next) => complaintsController.getComplaints(req, res, next));
router.get('/:id', optionalAuth, (req, res, next) => complaintsController.getComplaintById(req, res, next));

router.patch('/:id/status', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  complaintsController.updateStatus(req, res, next)
);
router.patch('/:id/review', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  complaintsController.updateStatus(req, res, next)
);

router.post(
  '/:id/work-done',
  requireAuth,
  requireRole('ADMIN'),
  upload.any(),
  normalizeCompletionUpload,
  (req, res, next) => complaintsController.markWorkDone(req, res, next)
);
router.post(
  '/:id/clean',
  requireAuth,
  requireRole('ADMIN'),
  upload.any(),
  normalizeCompletionUpload,
  (req, res, next) => complaintsController.markWorkDone(req, res, next)
);

router.post('/:id/confirm', requireAuth, (req, res, next) =>
  complaintsController.confirmResolution(req, res, next)
);
router.patch('/:id/confirm', requireAuth, (req, res, next) =>
  complaintsController.confirmResolution(req, res, next)
);

router.post('/:id/reopen', requireAuth, (req, res, next) =>
  complaintsController.reopenComplaint(req, res, next)
);

router.delete('/:id', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  complaintsController.deleteComplaint(req, res, next)
);

module.exports = router;
