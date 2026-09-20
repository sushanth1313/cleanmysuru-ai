const mongoose = require('mongoose');

const duplicateMatchSchema = new mongoose.Schema({
  incidentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    required: true,
  },
  matchedIncidentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    required: true,
  },
  similarityScore: {
    type: Number,
    required: true,
  },
  distanceMeters: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
  },
  status: {
    type: String,
    enum: ['PENDING_REVIEW', 'CONFIRMED_DUPLICATE', 'REJECTED_AS_DUPLICATE'],
    default: 'PENDING_REVIEW'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isDemo: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true,
});

duplicateMatchSchema.index({ incidentId: 1, matchedIncidentId: 1 }, { unique: true });

const DuplicateMatch = mongoose.model('DuplicateMatch', duplicateMatchSchema);
module.exports = DuplicateMatch;
