const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');
const AuditLog = require('../models/AuditLog');
const config = require('../config');

const generateToken = (id) => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: '30d',
  });
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);
  const isProd = process.env.NODE_ENV === 'production';
  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  };
  const userData = {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    role: user.role,
  };
  res.status(statusCode).cookie('jwt', token, options).json({
    success: true,
    token,
    data: userData,
    user: userData,
  });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    if (!name || !email || !password) {
      return sendError(res, 'VALIDATION_ERROR', 'Name, email, and password are required', 400);
    }

    if (password.length < 6) {
      return sendError(res, 'VALIDATION_ERROR', 'Password must be at least 6 characters', 400);
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return sendError(res, 'USER_EXISTS', 'An account with this email already exists', 409);
    }
    
    // Strict Citizen registration
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone: phone || '',
      role: 'CITIZEN',
    });

    await AuditLog.create({
      actor: user._id,
      role: user.role,
      action: 'USER_REGISTER',
      target: user._id,
      targetModel: 'User',
      isDemo: false,
    });
    
    sendTokenResponse(user, 201, res);
  } catch (error) {
    logger.error('Register error', error);
    sendError(res, 'SERVER_ERROR', 'Registration failed', 500);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendError(res, 'VALIDATION_ERROR', 'Please provide email and password', 400);
    }
    
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return sendError(res, 'AUTH_ERROR', 'Invalid email or password', 401);
    }
    
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return sendError(res, 'AUTH_ERROR', 'Invalid email or password', 401);
    }
    
    if (user.status === 'INACTIVE') {
      return sendError(res, 'AUTH_ERROR', 'Account is deactivated', 403);
    }

    await AuditLog.create({
      actor: user._id,
      role: user.role,
      action: 'USER_LOGIN',
      target: user._id,
      targetModel: 'User',
      isDemo: false,
    });
    
    sendTokenResponse(user, 200, res);
  } catch (error) {
    logger.error('Login error', error);
    sendError(res, 'SERVER_ERROR', 'Login failed', 500);
  }
};

exports.logout = async (req, res) => {
  try {
    if (req.user) {
      await AuditLog.create({
        actor: req.user._id,
        role: req.user.role,
        action: 'USER_LOGOUT',
        target: req.user._id,
        targetModel: 'User',
        isDemo: false,
      });
    }

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('jwt', 'none', {
      expires: new Date(Date.now() + 5 * 1000),
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
    });
    sendSuccess(res, {}, 'Logged out successfully');
  } catch (error) {
    logger.error('Logout error', error);
    sendError(res, 'SERVER_ERROR', 'Logout failed', 500);
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return sendError(res, 'AUTH_ERROR', 'User not found', 404);
    }
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
    };
    return res.status(200).json({
      success: true,
      data: userData,
      user: userData,
    });
  } catch (error) {
    logger.error('GetMe error', error);
    sendError(res, 'SERVER_ERROR', 'Could not fetch user', 500);
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return sendError(res, 'AUTH_ERROR', 'User not found', 404);
    }
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    await user.save();

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
    };
    sendSuccess(res, userData, 'Profile updated successfully');
  } catch (error) {
    logger.error('UpdateProfile error', error);
    sendError(res, 'SERVER_ERROR', 'Profile update failed', 500);
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return sendError(res, 'VALIDATION_ERROR', 'Current and new password are required', 400);
    }
    if (newPassword.length < 6) {
      return sendError(res, 'VALIDATION_ERROR', 'New password must be at least 6 characters', 400);
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return sendError(res, 'AUTH_ERROR', 'User not found', 404);
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return sendError(res, 'AUTH_ERROR', 'Current password does not match', 400);
    }

    user.password = newPassword;
    await user.save();

    await AuditLog.create({
      actor: user._id,
      role: user.role,
      action: 'PASSWORD_CHANGE',
      target: user._id,
      targetModel: 'User',
      isDemo: false,
    });

    sendSuccess(res, {}, 'Password updated successfully');
  } catch (error) {
    logger.error('UpdatePassword error', error);
    sendError(res, 'SERVER_ERROR', 'Password update failed', 500);
  }
};
