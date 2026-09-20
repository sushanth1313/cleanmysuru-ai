const mongoose = require('mongoose');

const aiAnalysisSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
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
      ],
      required: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'NONE'],
      default: 'NONE',
    },
    description: {
      type: String,
      default: '',
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
    imageQuality: {
      type: String,
      enum: ['GOOD', 'FAIR', 'POOR', 'UNKNOWN'],
      default: 'GOOD',
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
    modelName: {
      type: String,
      default: 'gemini-2.5-flash',
    },
    modelVersion: {
      type: String,
      default: '2.5-flash',
    },
    rawResponse: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

const AIAnalysis = mongoose.model('AIAnalysis', aiAnalysisSchema);
module.exports = AIAnalysis;
