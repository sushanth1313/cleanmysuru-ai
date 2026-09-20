const { Router } = require('express');
const upload = require('../middleware/upload.middleware');
const { validate } = require('../middleware/validate.middleware');
const { analyzeBodySchema } = require('../validators/analyze.validator');
const { analyzeEvidence } = require('../controllers/analyze.controller');

const router = Router();

// Handle either "image", "video", "file", or "evidence" field name
const uploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'file', maxCount: 1 },
  { name: 'evidence', maxCount: 1 },
]);

function normalizeUploadedFile(req, res, next) {
  if (req.files) {
    req.file =
      req.files.image?.[0] ||
      req.files.video?.[0] ||
      req.files.file?.[0] ||
      req.files.evidence?.[0] ||
      null;
  }
  next();
}

router.post(
  '/',
  uploadFields,
  normalizeUploadedFile,
  validate(analyzeBodySchema, 'body'),
  analyzeEvidence
);

module.exports = router;
