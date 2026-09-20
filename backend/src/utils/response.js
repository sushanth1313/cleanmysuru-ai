/**
 * Standardized API response utilities
 */
function sendSuccess(res, data, statusCode = 200, message = null) {
  let status = 200;
  let msg = message;

  if (typeof statusCode === 'number') {
    status = statusCode;
  } else if (typeof statusCode === 'string') {
    msg = statusCode;
  }

  const responseBody = {
    success: true,
    data,
  };

  if (msg) {
    responseBody.message = msg;
  }

  return res.status(status).json(responseBody);
}

function sendError(res, code, message, statusCode = 400, details = null) {
  const errorObj = {
    code: code || 'ERROR',
    message: message || 'An unexpected error occurred.',
  };

  if (details && process.env.NODE_ENV !== 'production') {
    errorObj.details = details;
  }

  return res.status(statusCode).json({
    success: false,
    error: errorObj,
  });
}

module.exports = {
  sendSuccess,
  sendError,
};
