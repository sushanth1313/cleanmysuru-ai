const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user ? req.user._id : null;
    if (!userId) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required to view notifications.', 401);
    }

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('complaintId', 'complaintNumber complaintId _id');

    const unreadCount = await Notification.countDocuments({ userId, read: false });

    // Normalize: attach complaintNumber at top level for easy frontend routing
    const normalized = notifications.map(n => {
      const obj = n.toJSON();
      if (obj.complaintId && typeof obj.complaintId === 'object') {
        obj.complaintNumber = obj.complaintId.complaintNumber || obj.complaintId.complaintId;
        obj.complaintObjectId = obj.complaintId._id;
        obj.complaintId = obj.complaintNumber || obj.complaintId._id;
      }
      return obj;
    });

    return res.status(200).json({
      success: true,
      notifications: normalized,
      data: normalized,
      unreadCount,
    });
  } catch (error) {
    logger.error('Error fetching notifications', error);
    next(error);
  }
};


exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user._id : null;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return sendError(res, 'NOT_FOUND', 'Notification not found.', 404);
    }

    return res.status(200).json(notification);
  } catch (error) {
    logger.error('Error marking notification as read', error);
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user ? req.user._id : null;
    if (!userId) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required.', 401);
    }

    await Notification.updateMany({ userId, read: false }, { read: true });
    return sendSuccess(res, { message: 'All notifications marked as read.' });
  } catch (error) {
    logger.error('Error marking all notifications as read', error);
    next(error);
  }
};
