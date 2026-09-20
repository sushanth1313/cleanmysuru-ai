const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  complaintNumber: {
    type: String,
    sparse: true,
    index: true,
  },
  complaintId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  citizenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  description: {
    type: String,
    default: '',
  },
  evidence: {
    type: String, // Original evidence path
    required: true,
  },
  originalFileName: {
    type: String,
    default: '',
  },
  storedFileName: {
    type: String,
    default: '',
  },
  fileHash: {
    type: String, // SHA-256 hash of original evidence
    index: true,
  },
  mimeType: {
    type: String,
    default: 'image/jpeg',
  },
  fileSize: {
    type: Number,
    default: 0,
  },
  sourceType: {
    type: String,
    enum: ['CITIZEN', 'MANUAL'],
    default: 'CITIZEN',
  },
  latitude: {
    type: Number,
  },
  longitude: {
    type: Number,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
    },
  },
  locationSource: {
    type: String,
    enum: ['BROWSER_GPS', 'EXIF_GPS', 'MANUAL'],
    default: 'MANUAL',
  },
  locationAccuracy: {
    type: Number,
  },
  locality: {
    type: String,
    default: 'Mysuru',
  },
  city: {
    type: String,
    default: 'Mysuru',
  },
  state: {
    type: String,
    default: 'Karnataka',
  },
  jurisdictionStatus: {
    type: String,
    enum: [
      'LOCATION_VALID',
      'LOCATION_OUTSIDE_MYSURU',
      'LOCATION_UNAVAILABLE',
      'JURISDICTION_VERIFICATION_REQUIRED',
      'LOCATION_MISMATCH',
    ],
    default: 'LOCATION_VALID',
  },
  status: {
    type: String,
    enum: [
      'SUBMITTED',
      'AI_ANALYZING',
      'AI_ANALYZED',
      'NEEDS_REVIEW',
      'ACCEPTED',
      'IN_PROGRESS',
      'WORK_DONE',
      'CITIZEN_CONFIRMATION',
      'RESOLVED',
      'REJECTED',
      'REOPENED',
      'AI_ANALYSIS_FAILED',
      'VIDEO_ANALYSIS_FAILED',
    ],
    default: 'SUBMITTED',
    index: true,
  },
  incidentType: {
    type: String,
    enum: [
      'GARBAGE_PILE',
      'OVERFLOWING_BIN',
      'MIXED_WASTE',
      'C_AND_D',
      'NO_RELEVANT_WASTE_DETECTED',
      'INSUFFICIENT_EVIDENCE',
      'AI_ANALYSIS_FAILED',
      'VIDEO_ANALYSIS_FAILED',
      'PENDING_ANALYSIS',
    ],
    default: 'PENDING_ANALYSIS',
    index: true,
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'NONE'],
    default: 'NONE',
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
  },
  detectedObjects: [
    {
      label: String,
      confidence: Number,
    },
  ],
  reasoning: {
    type: String,
    default: '',
  },
  recommendedAction: {
    type: String,
    default: '',
  },
  framesAnalyzed: [String],
  imageQuality: {
    type: String,
    enum: ['GOOD', 'FAIR', 'POOR', 'UNKNOWN'],
    default: 'GOOD',
  },
  qualityMetrics: {
    type: mongoose.Schema.Types.Mixed,
  },
  qualityReason: {
    type: String,
    default: '',
  },
  nightDetected: {
    type: Boolean,
    default: false,
  },
  lowLightScore: {
    type: Number,
    default: 0,
  },
  verificationRequired: {
    type: Boolean,
    default: false,
  },
  duplicateStatus: {
    type: String,
    enum: ['NONE', 'POSSIBLE_DUPLICATE', 'CONFIRMED_DUPLICATE', 'NOT_DUPLICATE'],
    default: 'NONE',
  },
  duplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
  },
  similarityScore: {
    type: Number,
    default: 0,
  },
  aiAnalysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AIAnalysis',
  },
  aiResult: {
    type: mongoose.Schema.Types.Mixed,
  },
  assignedTo: {
    type: String,
    default: 'MCC Solid Waste Management Wing',
  },
  citizenConfirmation: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'PROBLEM_STILL_EXISTS'],
    default: 'PENDING',
  },
  citizenConfirmationNote: {
    type: String,
    default: '',
  },
  municipalityResponse: {
    type: String, // Admin response note
    default: '',
  },
  completionEvidence: {
    type: String, // Path to Admin completion photo/video
  },
  resolvedAt: {
    type: Date,
  },
  reopenedAt: {
    type: Date,
  },
  isDemo: {
    type: Boolean,
    default: false,
    index: true,
  },
}, {
  timestamps: true,
});

complaintSchema.index({ location: '2dsphere' });

complaintSchema.pre('save', function () {
  if (!this.complaintNumber && this.complaintId) {
    this.complaintNumber = this.complaintId;
  }
  if (!this.complaintId && this.complaintNumber) {
    this.complaintId = this.complaintNumber;
  }
  if (this.latitude !== undefined && this.longitude !== undefined) {
    this.location = {
      type: 'Point',
      coordinates: [this.longitude, this.latitude],
    };
  } else {
    this.location = undefined;
  }
});

const Complaint = mongoose.model('Complaint', complaintSchema);
module.exports = Complaint;
