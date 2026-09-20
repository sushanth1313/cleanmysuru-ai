const multer = require('multer');
const logger = require('../utils/logger');
const { sendError } = require('../utils/response');

function notFoundHandler(req, res, next) {
  return sendError(res, 'NOT_FOUND', `Cannot ${req.method} ${req.originalUrl}`, 404);
}

function errorHandler(err, req, res, next) {
  logger.error('Unhandled application error', err);

  // Multer-specific errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, 'FILE_TOO_LARGE', 'File size exceeds the 50MB limit.', 400);
    }
    return sendError(res, 'UPLOAD_ERROR', `File upload error: ${err.message}`, 400);
  }

  // Custom file validation error from upload filter
  if (err.code === 'INVALID_FILE_TYPE') {
    return sendError(res, 'INVALID_FILE', err.message, 400);
  }

  // JSON parse error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 'INVALID_JSON', 'Malformed JSON payload in request body.', 400);
  }

  // Prisma unique constraint or error
  if (err.code && err.code.startsWith('P')) {
    return sendError(res, 'DATABASE_ERROR', 'Database operation failed.', 500);
  }

  // AI analysis failure in live mode
  if (err.message && (err.message.startsWith('AI_ANALYSIS_FAILED') || err.message.includes('AI_ANALYSIS_FAILED'))) {
    return sendError(
      res,
      'AI_ANALYSIS_FAILED',
      err.message,
      503
    );
  }

  // Default internal server error
  return sendError(
    res,
    'INTERNAL_SERVER_ERROR',
    process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred.' : err.message,
    500
  );
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
