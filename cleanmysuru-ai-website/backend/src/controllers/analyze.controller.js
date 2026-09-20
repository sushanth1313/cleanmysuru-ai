const path = require('path');
const fs = require('fs');
const aiService = require('../services/ai.service');
const imageService = require('../services/image.service');
const videoService = require('../services/video.service');
const severityService = require('../services/severity.service');
const duplicateService = require('../services/duplicate.service');
const locationService = require('../services/location.service');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

const crypto = require('crypto');

/**
 * Normalize locationSource from frontend-sent value to Complaint schema enum
 */
function normalizeLocationSource(raw) {
  const map = {
    BROWSER_GPS: 'BROWSER_GPS',
    GPS: 'BROWSER_GPS',
    EXIF_GPS: 'EXIF_GPS',
    EXIF: 'EXIF_GPS',
    MANUAL_MAP: 'MANUAL_MAP',
    MANUAL: 'MANUAL_MAP',       // frontend sends 'MANUAL', schema requires 'MANUAL_MAP'
    LOCATION_UNAVAILABLE: 'UNKNOWN',
  };
  return map[(raw || '').toUpperCase()] || 'UNKNOWN';
}

/**
 * Normalize imageQuality to schema enum ('GOOD'|'FAIR'|'POOR'|'UNKNOWN')
 */
function normalizeImageQuality(raw) {
  const map = { GOOD: 'GOOD', FAIR: 'FAIR', POOR: 'POOR', NIGHT: 'POOR', BLURRY: 'POOR', UNKNOWN: 'UNKNOWN' };
  return map[(raw || '').toUpperCase()] || 'UNKNOWN';
}

/**
 * Controller for POST /api/analyze
 */
async function analyzeEvidence(req, res, next) {
  try {
    if (!req.file) {
      return sendError(res, 'MISSING_FILE', 'No evidence file uploaded in request.', 400);
    }

    const rawLocationSource = req.body.locationSource || 'UNKNOWN';
    const { sourceType = 'CITIZEN', latitude, longitude, locationName = 'Mysuru' } = req.body;
    const locationSource = normalizeLocationSource(rawLocationSource);

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    const isVideo = mimeType.startsWith('video/');

    // Calculate SHA-256 fileHash
    let fileHash = '';
    try {
      const fileBuffer = fs.readFileSync(filePath);
      fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (hashErr) {
      logger.warn('Could not compute file hash', { error: hashErr.message });
    }

    let targetAnalysisImage = filePath;
    let targetRelativePath = `/uploads/${req.file.filename}`;
    let framesAnalyzed = [];
    let isVideoFallback = false;

    // 1. If video, extract representative frames (4-5 frames)
    if (isVideo) {
      const outputDir = path.dirname(filePath);
      const videoResult = await videoService.extractRepresentativeFrames(filePath, outputDir, 4);

      if (videoResult.success && videoResult.frames.length > 0) {
        framesAnalyzed = videoResult.frames.map((f) => `/uploads/${path.basename(f)}`);
        targetAnalysisImage = videoResult.frames[0];
        targetRelativePath = `/uploads/${path.basename(videoResult.frames[0])}`;
      } else {
        return sendError(res, 'VIDEO_ANALYSIS_FAILED', videoResult.reason || 'Failed to process video frames', 500);
      }
    }

    // 2. Run AI Detection
    const isDemo = req.body.isDemo === 'true' || req.body.isDemo === true;
    const aiResult = await aiService.analyzeEvidence(targetAnalysisImage, isVideo ? 'image/jpeg' : mimeType, isDemo);

    // 3. Image Quality Assessment (using Sharp)
    let qualityResult = {
      imageQuality: 'GOOD',
      verificationRequired: false,
      reason: undefined,
    };

    if (!isVideo || (isVideo && !isVideoFallback)) {
      qualityResult = await imageService.assessQuality(targetAnalysisImage);
    }

    // 4. Severity Assessment
    const severityResult = severityService.calculateSeverity({
      incidentType: aiResult.incidentType,
      confidence: aiResult.confidence,
      detectedObjects: aiResult.detectedObjects,
      locationName,
    });

    // 5. Duplicate Check
    const lat = latitude !== undefined && latitude !== '' ? parseFloat(latitude) : 12.2958;
    const lng = longitude !== undefined && longitude !== '' ? parseFloat(longitude) : 76.6394;

    const duplicateResult = await duplicateService.checkDuplicate({
      filePath: targetAnalysisImage,
      latitude: lat,
      longitude: lng,
      incidentType: aiResult.incidentType,
    });

    // 6. Location & Jurisdiction Check
    const locResult = await locationService.evaluateLocation(lat, lng);

    // 7. Verification requirement determination
    let verificationRequired =
      aiResult.incidentType === 'NO_RELEVANT_WASTE_DETECTED' ||
      aiResult.incidentType === 'INSUFFICIENT_EVIDENCE' ||
      aiResult.confidence < 75 ||
      qualityResult.imageQuality === 'POOR' ||
      duplicateResult.isPossibleDuplicate ||
      locResult.jurisdictionStatus !== 'LOCATION_VALID';

    // Formulate final response object
    const finalResponse = {
      incidentType: aiResult.incidentType,
      confidence: aiResult.confidence,
      severity: severityResult.severity,
      description: aiResult.description,
      imageQuality: qualityResult.imageQuality,
      detectedObjects: aiResult.detectedObjects,
      reasoning: qualityResult.reason
        ? `${aiResult.reasoning} Note: ${qualityResult.reason}`
        : aiResult.reasoning,
      recommendedAction: aiResult.recommendedAction,
      duplicateProbability: duplicateResult.similarityScore,
      verificationRequired,
      isPossibleDuplicate: duplicateResult.isPossibleDuplicate,
      matchedIncidentId: duplicateResult.matchedIncidentId,
      duplicateReason: duplicateResult.reason,
      locationMismatch: locResult.jurisdictionStatus !== 'LOCATION_VALID',
      jurisdictionStatus: locResult.jurisdictionStatus,
      locality: locResult.locality,
      city: locResult.city,
      state: locResult.state,
      latitude: lat,
      longitude: lng,
      sourceType,
      imagePath: targetRelativePath,
      analysisMode: aiResult.analysisMode,
      nightDetected: qualityResult.imageQuality === 'POOR' && qualityResult.reason?.includes('Low-light'),
      lowLightScore: qualityResult.metrics?.brightness,
      fileHash,
      mimeType,
      framesAnalyzed,
    };

    return res.status(200).json(finalResponse);
  } catch (error) {
    logger.error('Analyze controller error', error);
    next(error);
  }
}

module.exports = {
  analyzeEvidence,
};
