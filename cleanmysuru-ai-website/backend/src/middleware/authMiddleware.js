const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendError } = require('../utils/response');
const config = require('../config');

const requireAuth = async (req, res, next) => {
  let token;
  
  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return sendError(res, 'UNAUTHORIZED', 'Not authorized to access this route', 401);
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return sendError(res, 'UNAUTHORIZED', 'User not found', 401);
    }
    next();
  } catch (error) {
    return sendError(res, 'UNAUTHORIZED', 'Not authorized to access this route', 401);
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(res, 'FORBIDDEN', `User role ${req.user?.role} is not authorized to access this route`, 403);
    }
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  let token;
  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = await User.findById(decoded.id).select('-password');
  } catch (err) {}
  next();
};

module.exports = { requireAuth, requireRole, optionalAuth };
