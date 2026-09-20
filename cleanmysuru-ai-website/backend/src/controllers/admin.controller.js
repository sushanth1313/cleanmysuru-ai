const AuditLog = require('../models/AuditLog');
const Complaint = require('../models/Complaint');
const mongoose = require('mongoose');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

class AdminController {
  /**
   * GET /api/admin/audit-logs
   */
  async getAuditLogs(req, res, next) {
    try {
      const { page = 1, limit = 50, action, role } = req.query;
      const query = { isDemo: false };

      if (action) query.action = action;
      if (role) query.role = role;

      const total = await AuditLog.countDocuments(query);
      const logs = await AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('actor', 'name email role');

      return res.status(200).json({
        success: true,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        data: logs,
        logs,
      });
    } catch (error) {
      logger.error('Get audit logs error', error);
      return sendError(res, 'SERVER_ERROR', 'Failed to retrieve audit logs', 500);
    }
  }

  /**
   * GET /api/admin/system-health
   */
  async getSystemHealth(req, res, next) {
    try {
      const dbState = mongoose.connection.readyState;
      const dbStateMap = {
        0: 'DISCONNECTED',
        1: 'CONNECTED',
        2: 'CONNECTING',
        3: 'DISCONNECTING',
      };

      const complaintCount = await Complaint.countDocuments({ isDemo: false });
      const uptimeSeconds = process.uptime();

      return res.status(200).json({
        success: true,
        status: dbState === 1 ? 'HEALTHY' : 'DEGRADED',
        database: {
          status: dbStateMap[dbState] || 'UNKNOWN',
          host: mongoose.connection.host,
          port: mongoose.connection.port,
          name: mongoose.connection.name,
        },
        ai: {
          provider: 'Google Gemini',
          model: 'gemini-2.5-flash',
          status: 'ACTIVE',
        },
        metrics: {
          totalComplaints: complaintCount,
          uptimeSeconds: Math.round(uptimeSeconds),
          memoryUsage: process.memoryUsage(),
        },
      });
    } catch (error) {
      logger.error('System health error', error);
      return sendError(res, 'SERVER_ERROR', 'Failed to fetch system health', 500);
    }
  }
}

module.exports = new AdminController();
