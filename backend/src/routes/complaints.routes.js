const { Router } = require('express');
const complaintsController = require('../controllers/complaints.controller');
const upload = require('../middleware/upload.middleware');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/authMiddleware');

const router = Router();

// Handle file field normalization
const normalizeUpload = (req, res, next) => {
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    req.file =
      req.files.find((f) => ['evidence', 'image', 'video', 'file', 'completionEvidence', 'completionFile'].includes(f.fieldname)) ||
      req.files[0];
  }
  next();
};

// Canonical Complaint endpoints
router.post('/', optionalAuth, upload.any(), normalizeUpload, (req, res, next) => {
  complaintsController.createComplaint(req, res, next);
});

router.get('/', optionalAuth, (req, res, next) => complaintsController.getComplaints(req, res, next));
router.get('/:id', optionalAuth, (req, res, next) => complaintsController.getComplaintById(req, res, next));

// Admin status update
router.patch('/:id/status', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  complaintsController.updateStatus(req, res, next)
);

// Admin marks work done with mandatory completion evidence
router.post(
  '/:id/work-done',
  requireAuth,
  requireRole('ADMIN'),
  upload.any(),
  normalizeUpload,
  (req, res, next) => complaintsController.markWorkDone(req, res, next)
);

// Citizen confirmation & reopen
router.post('/:id/confirm', requireAuth, (req, res, next) =>
  complaintsController.confirmResolution(req, res, next)
);
router.post('/:id/reopen', requireAuth, (req, res, next) =>
  complaintsController.reopenComplaint(req, res, next)
);

// Admin delete
router.delete('/:id', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  complaintsController.deleteComplaint(req, res, next)
);

module.exports = router;
