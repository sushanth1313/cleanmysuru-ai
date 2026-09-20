const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewerName: {
      type: String,
      default: 'MCC Administrator',
    },
    action: {
      type: String,
      enum: ['ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'WORK_DONE', 'RESOLVED', 'REOPENED'],
      required: true,
    },
    notes: String,
    completionEvidence: String,
  },
  {
    timestamps: true,
  }
);

const Verification = mongoose.model('Verification', verificationSchema);
module.exports = Verification;
