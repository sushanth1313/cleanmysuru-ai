const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Who did it
  },
  role: {
    type: String, // 'CITIZEN', 'MUNICIPALITY', 'ADMIN', 'SYSTEM'
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  target: {
    type: mongoose.Schema.Types.ObjectId, // ID of the modified record (e.g. Complaint ID)
  },
  targetModel: {
    type: String, // e.g., 'Complaint', 'User', 'SystemSetting'
  },
  previousStatus: String,
  newStatus: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed, // Any additional JSON data
  },
  reason: String,
  isDemo: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true,
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;
