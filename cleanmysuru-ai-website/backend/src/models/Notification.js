const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String, // 'COMPLAINT_ACCEPTED', 'WORK_STARTED', 'WORK_DONE', 'COMPLAINT_REOPENED', 'COMPLAINT_RESOLVED', 'NEW_COMPLAINT'
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  complaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
  },
  read: {
    type: Boolean,
    default: false,
    index: true,
  },
  isDemo: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true,
});

notificationSchema.virtual('isRead').get(function () {
  return this.read;
});
notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
