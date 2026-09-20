const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const auditLog = (action, getTargetId, getMetadata = () => ({})) => {
  return async (req, res, next) => {
    // Hook into the response finish event to ensure we only log successful actions
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const targetId = typeof getTargetId === 'function' ? getTargetId(req, res) : null;
          const metadata = typeof getMetadata === 'function' ? getMetadata(req, res) : {};
          
          await AuditLog.create({
            actor: req.user?._id,
            role: req.user?.role || 'SYSTEM',
            action,
            target: targetId,
            metadata,
            isDemo: req.body?.isDemo || false
          });
        } catch (error) {
          logger.error('Failed to create audit log', error);
        }
      }
    });
    next();
  };
};

module.exports = { auditLog };
