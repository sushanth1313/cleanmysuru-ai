const { z } = require('zod');

const incidentTypeEnum = z.enum([
  'C_AND_D',
  'GARBAGE_PILE',
  'OVERFLOWING_BIN',
  'MIXED_WASTE',
  'NO_RELEVANT_WASTE_DETECTED',
  'INSUFFICIENT_EVIDENCE',
]);
const severityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'NONE']);
const sourceTypeEnum = z.enum(['CITIZEN', 'DEMO']);
const imageQualityEnum = z.enum(['GOOD', 'FAIR', 'POOR', 'UNKNOWN']);
const verificationStatusEnum = z.enum(['PENDING', 'VERIFIED', 'REJECTED', 'NEEDS_REVIEW']);

const createIncidentSchema = z.object({
  id: z.string().optional(),
  incidentType: incidentTypeEnum,
  confidence: z.coerce.number().min(0).max(100),
  severity: severityEnum,
  description: z.string().optional().default('AI detected civic waste incident requiring municipal verification.'),
  imagePath: z.string().min(1, 'Image path is required'),
  sourceType: sourceTypeEnum.default('CITIZEN'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  locationName: z.string().min(1, 'Location name is required'),
  imageQuality: imageQualityEnum.default('GOOD'),
  duplicateProbability: z.coerce.number().min(0).max(100).default(0),
  verificationStatus: verificationStatusEnum.default('PENDING'),
  recommendedAction: z.string().optional().default('Municipal verification and appropriate civic waste clearance recommended.'),
  isDemo: z.union([z.boolean(), z.string()]).optional(),
  
  // Optional detection result metadata
  detectedObjects: z.array(z.object({
    label: z.string(),
    confidence: z.coerce.number(),
  })).optional(),
  reasoning: z.string().optional(),
  modelName: z.string().optional(),

  // Optional duplicate match metadata
  matchedIncidentId: z.string().optional(),
  similarityScore: z.coerce.number().optional(),
  distanceMeters: z.coerce.number().optional(),
  duplicateReason: z.string().optional(),
}).passthrough();

const verifyIncidentSchema = z.object({
  status: verificationStatusEnum,
  reviewerName: z.string().min(1, 'Reviewer name is required'),
  notes: z.string().optional(),
});

const updateIncidentSchema = z.object({
  severity: severityEnum.optional(),
  verificationStatus: verificationStatusEnum.optional(),
  recommendedAction: z.string().optional(),
  description: z.string().optional(),
  locationName: z.string().optional(),
});

const filterIncidentsSchema = z.object({
  type: z.string().optional(),
  severity: z.string().optional(),
  verificationStatus: z.string().optional(),
  sourceType: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

module.exports = {
  createIncidentSchema,
  verifyIncidentSchema,
  updateIncidentSchema,
  filterIncidentsSchema,
  incidentTypeEnum,
  severityEnum,
  sourceTypeEnum,
  imageQualityEnum,
  verificationStatusEnum,
};
