const Complaint = require('../models/Complaint');
const { calculateDistanceMeters } = require('../utils/distance');
const imageService = require('./image.service');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');
const config = require('../config');

class DuplicateService {
  /**
   * Checks whether incoming evidence matches an existing recent incident
   */
  async checkDuplicate({ filePath, latitude, longitude, incidentType, maxDistanceMeters = 150, maxAgeHours = 72 }) {
    try {
      const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

      // Fetch unresolved active complaints from persistent database
      const candidates = await Complaint.find({
        createdAt: { $gte: cutoffDate },
        status: { $nin: ['RESOLVED', 'REJECTED', 'AI_ANALYSIS_FAILED', 'VIDEO_ANALYSIS_FAILED'] },
        isDemo: false,
      }).select('_id complaintId complaintNumber location incidentType evidence createdAt');

      if (!candidates || candidates.length === 0) {
        return {
          isPossibleDuplicate: false,
          similarityScore: 0,
          matchedIncidentId: null,
          distanceMeters: 0,
          reason: 'No active complaints within geographical or temporal proximity.',
        };
      }

      let candidateHash = null;
      if (filePath && fs.existsSync(filePath)) {
        candidateHash = await imageService.computePerceptualHash(filePath);
      }

      let bestMatch = null;
      let highestScore = 0;
      let bestDistance = Infinity;
      let matchReason = '';

      for (const candidate of candidates) {
        if (!candidate.location || !candidate.location.coordinates) continue;
        const candLng = candidate.location.coordinates[0];
        const candLat = candidate.location.coordinates[1];
        const distance = calculateDistanceMeters(latitude, longitude, candLat, candLng);

        if (distance <= maxDistanceMeters) {
          let score = 0;

          // 1. Distance proximity score (up to 40)
          const distFactor = Math.max(0, 1 - distance / maxDistanceMeters);
          score += distFactor * 40;

          // 2. Category match (up to 25)
          if (candidate.incidentType === incidentType) {
            score += 25;
          }

          // 3. Time recency match (up to 15)
          const ageHours = (Date.now() - new Date(candidate.createdAt).getTime()) / (1000 * 60 * 60);
          const recencyFactor = Math.max(0, 1 - ageHours / maxAgeHours);
          score += recencyFactor * 15;

          // 4. Perceptual image comparison (up to 20)
          if (candidateHash && candidate.evidence && !candidate.evidence.startsWith('http')) {
            try {
              const localCandidatePath = candidate.evidence.startsWith('/uploads/')
                ? path.join(config.upload.dir, candidate.evidence.replace('/uploads/', ''))
                : candidate.evidence;

              if (fs.existsSync(localCandidatePath)) {
                const existingHash = await imageService.computePerceptualHash(localCandidatePath);
                const visualSimilarity = imageService.compareHashes(candidateHash, existingHash);
                score += (visualSimilarity / 100) * 20;
              } else {
                score += distFactor * 15;
              }
            } catch (err) {
              score += distFactor * 15;
            }
          } else {
            score += distFactor * 15;
          }

          const roundedScore = Math.min(99, Math.round(score));

          if (roundedScore > highestScore) {
            highestScore = roundedScore;
            bestMatch = candidate;
            bestDistance = Math.round(distance);
            matchReason = `Similar ${candidate.incidentType} reported ${Math.round(distance)}m away within the last ${Math.round(ageHours)}h.`;
          }
        }
      }

      const isPossibleDuplicate = highestScore >= 70;

      return {
        isPossibleDuplicate,
        similarityScore: highestScore,
        matchedIncidentId: bestMatch ? (bestMatch._id || bestMatch.complaintId) : null,
        distanceMeters: bestDistance === Infinity ? 0 : bestDistance,
        reason: isPossibleDuplicate
          ? `Possible duplicate detected: ${matchReason}`
          : 'Geographical and visual checks indicate a distinct complaint.',
      };
    } catch (error) {
      logger.error('Duplicate check encountered an error', error);
      return {
        isPossibleDuplicate: false,
        similarityScore: 0,
        matchedIncidentId: null,
        distanceMeters: 0,
        reason: 'Duplicate check completed with default fallback.',
      };
    }
  }
}

module.exports = new DuplicateService();
