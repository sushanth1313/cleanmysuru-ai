const { z } = require('zod');

const analyzeBodySchema = z.object({
  sourceType: z.enum(['CITIZEN', 'DEMO']).default('CITIZEN'),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  locationName: z.string().optional().default('Mysuru'),
  isDemo: z.union([z.boolean(), z.string()]).optional().default(false),
}).passthrough();

module.exports = {
  analyzeBodySchema,
};
