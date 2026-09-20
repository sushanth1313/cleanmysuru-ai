const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');

class NotificationService {
  /**
   * Notify Citizen on complaint lifecycle change
   */
  async notifyCitizen(citizenId, type, title, message, complaintId) {
    try {
      if (!citizenId) return;
      const notif = await Notification.create({
        userId: citizenId,
        type,
        title,
        message,
        complaintId,
        read: false,
        isDemo: false,
      });
      logger.info(`Notification created for citizen ${citizenId}: ${title}`);
      return notif;
    } catch (err) {
      logger.error('Failed to create citizen notification', err);
    }
  }

  /**
   * Notify all Admins on new complaint or citizen reopen
   */
  async notifyAdmins(type, title, message, complaintId) {
    try {
      const admins = await User.find({ role: 'ADMIN' });
      const created = [];
      for (const admin of admins) {
        const notif = await Notification.create({
          userId: admin._id,
          type,
          title,
          message,
          complaintId,
          read: false,
          isDemo: false,
        });
        created.push(notif);
      }
      logger.info(`Admin notification sent to ${admins.length} admins: ${title}`);
      return created;
    } catch (err) {
      logger.error('Failed to create admin notification', err);
    }
  }
}

module.exports = new NotificationService();
