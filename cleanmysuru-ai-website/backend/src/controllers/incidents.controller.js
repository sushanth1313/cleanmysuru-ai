const Complaint = require('../models/Complaint');
const DuplicateMatch = require('../models/DuplicateMatch');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const AIAnalysis = require('../models/AIAnalysis');
const Verification = require('../models/Verification');
const User = require('../models/User');
const { generateIncidentId } = require('../utils/id.generator');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Normalize imageQuality from frontend display values ('Good','Fair','Night') to DB enum ('GOOD','FAIR','POOR')
 */
function normalizeImageQuality(raw) {
  const map = { GOOD: 'GOOD', FAIR: 'FAIR', POOR: 'POOR', NIGHT: 'POOR', BLURRY: 'POOR', UNKNOWN: 'UNKNOWN' };
  return map[(raw || '').toUpperCase()] || 'UNKNOWN';
}

/**
 * Normalize locationSource from frontend values to DB enum
 */
function normalizeLocationSource(raw) {
  const map = {
    BROWSER_GPS: 'BROWSER_GPS', GPS: 'BROWSER_GPS',
    EXIF_GPS: 'EXIF_GPS', EXIF: 'EXIF_GPS',
    MANUAL_MAP: 'MANUAL_MAP', MANUAL: 'MANUAL_MAP',
    LOCATION_UNAVAILABLE: 'UNKNOWN',
  };
  return map[(raw || '').toUpperCase()] || 'UNKNOWN';
}

class IncidentsController {
  /**
   * Helper to create a notification for all admin users
   */
  async notifyAdmins({ type, title, message, complaintId }) {
    try {
      const admins = await User.find({ role: 'ADMIN' });
      for (const admin of admins) {
        await Notification.create({
          userId: admin._id,
          type,
          title,
          message,
          complaintId,
        });
      }
    } catch (err) {
      logger.error('Failed to notify admins', err);
    }
  }

  /**
   * Helper to notify a specific citizen
   */
  async notifyCitizen({ citizenId, type, title, message, complaintId }) {
    try {
      if (!citizenId) return;
      await Notification.create({
        userId: citizenId,
        type,
        title,
        message,
        complaintId,
      });
    } catch (err) {
      logger.error('Failed to notify citizen', err);
    }
  }

  /**
   * POST /api/incidents
   * Create a complaint with real evidence and AI metadata
   */
  async createIncident(req, res, next) {
    try {
      const data = req.body;
      const incidentId = data.id || (await generateIncidentId());
      const isDemo = data.isDemo === 'true' || data.isDemo === true;

      // Find or assign citizen
      let citizenId = req.user ? req.user._id : null;
      if (!citizenId) {
        // Fall back to default seeded citizen user if guest intake
        const citizenUser = await User.findOne({ role: 'CITIZEN' });
        citizenId = citizenUser ? citizenUser._id : null;
      }

      if (!citizenId) {
        return sendError(res, 'AUTH_ERROR', 'Citizen profile required to submit complaint.', 401);
      }

      const rawConfidence = typeof data.confidence === 'number' ? data.confidence : parseFloat(data.confidence) || 85;
      const initialStatus = rawConfidence < 75 || data.imageQuality === 'POOR' ? 'NEEDS_REVIEW' : 'AI_ANALYZED';

      const complaint = await Complaint.create({
        complaintNumber: incidentId,
        complaintId: incidentId,
        citizenId,
        incidentType: data.incidentType || 'GARBAGE_PILE',
        confidence: rawConfidence,
        severity: data.severity || 'MEDIUM',
        evidence: data.imagePath || data.evidence,
        description: data.description || 'Suspected civic waste reported for municipal verification.',
        mimeType: data.mimeType || 'image/jpeg',
        fileHash: data.fileHash,
        framesAnalyzed: Array.isArray(data.framesAnalyzed) ? data.framesAnalyzed : [],
        sourceType: data.sourceType || 'CITIZEN',
        location: {
          type: 'Point',
          coordinates: [parseFloat(data.longitude) || 76.6394, parseFloat(data.latitude) || 12.2958],
        },
        locationSource: normalizeLocationSource(data.locationSource),
        locationAccuracy: data.locationAccuracy ? parseFloat(data.locationAccuracy) : undefined,
        locality: data.locality || data.locationName || 'Mysuru',
        city: data.city || 'Mysuru',
        state: data.state || 'Karnataka',
        jurisdictionStatus: data.jurisdictionStatus || 'LOCATION_VALID',
        imageQuality: normalizeImageQuality(data.imageQuality),
        nightDetected: data.nightDetected === 'true' || data.nightDetected === true,
        lowLightScore: data.lowLightScore ? parseFloat(data.lowLightScore) : undefined,
        status: initialStatus,
        aiResult: {
          incidentType: data.incidentType || 'GARBAGE_PILE',
          confidence: rawConfidence,
          severity: data.severity || 'MEDIUM',
          description: data.description,
          detectedObjects: data.detectedObjects || [],
          reasoning: data.reasoning,
          imageQuality: data.imageQuality || 'GOOD',
          nightDetected: data.nightDetected === 'true' || data.nightDetected === true,
          lowLightScore: data.lowLightScore ? parseFloat(data.lowLightScore) : undefined,
        },
        isDemo,
      });

      // Create linked AIAnalysis document
      try {
        const aiDoc = await AIAnalysis.create({
          complaintId: complaint._id,
          incidentType: complaint.incidentType,
          confidence: complaint.confidence,
          severity: complaint.severity,
          description: data.description,
          detectedObjects: data.detectedObjects || [],
          reasoning: data.reasoning,
          recommendedAction: data.recommendedAction,
          imageQuality: complaint.imageQuality,
          nightDetected: complaint.nightDetected,
          lowLightScore: complaint.lowLightScore,
          modelName: data.modelName || 'gemini-2.5-flash',
        });
        complaint.aiAnalysisId = aiDoc._id;
        await complaint.save();
      } catch (aiErr) {
        logger.warn('Failed to save AIAnalysis record', { error: aiErr.message });
      }

      // Check duplicate relations
      if (data.matchedIncidentId) {
        try {
          const matchedExists = await Complaint.findById(data.matchedIncidentId);
          if (matchedExists) {
            await DuplicateMatch.create({
              incidentId: complaint._id,
              matchedIncidentId: data.matchedIncidentId,
              similarityScore: data.similarityScore || data.duplicateProbability || 80,
              distanceMeters: data.distanceMeters || 50,
              reason: data.duplicateReason || 'High spatial and visual similarity detected.',
              isDemo,
            });

            complaint.duplicateStatus = 'POSSIBLE_DUPLICATE';
            complaint.status = 'NEEDS_REVIEW';
            await complaint.save();
          }
        } catch (dupErr) {
          logger.warn('Could not record duplicate relation', { error: dupErr.message });
        }
      }

      // Audit Log
      await AuditLog.create({
        actor: citizenId,
        role: 'CITIZEN',
        action: 'COMPLAINT_SUBMITTED',
        target: complaint._id,
        targetModel: 'Complaint',
        newStatus: complaint.status,
        isDemo,
      });

      // Notify Admins
      await this.notifyAdmins({
        type: 'NEW_COMPLAINT',
        title: 'New Complaint Reported',
        message: `Complaint ${complaint.complaintNumber || complaint.complaintId} (${complaint.incidentType}) reported at ${complaint.locality}.`,
        complaintId: complaint._id,
      });

      // Notify reporting Citizen
      await this.notifyCitizen({
        citizenId: complaint.citizenId,
        type: 'COMPLAINT_SUBMITTED',
        title: 'Complaint Submitted',
        message: `Your complaint ${complaint.complaintNumber || complaint.complaintId} has been submitted and registered for municipal review.`,
        complaintId: complaint._id,
      });

      logger.info(`Complaint created: ${complaint.complaintId}`);
      return res.status(201).json(complaint);
    } catch (error) {
      logger.error('Error creating complaint', error);
      next(error);
    }
  }

  /**
   * GET /api/incidents
   * Role-based complaint query: Citizens view only their own, Admins view all
   */
  async getIncidents(req, res, next) {
    try {
      const {
        type,
        severity,
        status,
        search,
        citizenId,
        page = 1,
        limit = 50,
        isDemo = false,
      } = req.query;

      const query = { isDemo: isDemo === 'true' };

      // RBAC: Citizens can strictly view only their own complaints
      if (req.user && req.user.role === 'CITIZEN') {
        query.citizenId = req.user._id;
      } else if (citizenId) {
        query.citizenId = citizenId;
      }

      if (type && type !== 'All' && type !== 'All incident types') {
        query.incidentType = type;
      }
      if (severity && severity !== 'All severities') {
        query.severity = severity;
      }
      if (status && status !== 'All Statuses') {
        if (status === 'Active') {
          query.status = { $nin: ['RESOLVED', 'REJECTED', 'AI_ANALYSIS_FAILED'] };
        } else if (status === 'Pending') {
          query.status = { $in: ['SUBMITTED', 'AI_ANALYZING', 'AI_ANALYZED', 'NEEDS_REVIEW'] };
        } else if (status === 'Resolved') {
          query.status = 'RESOLVED';
        } else {
          query.status = status;
        }
      }

      if (search) {
        query.$or = [
          { complaintId: { $regex: search, $options: 'i' } },
          { locality: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const skip = (Math.max(1, parseInt(page, 10) || 1) - 1) * take;

      const [total, incidents] = await Promise.all([
        Complaint.countDocuments(query),
        Complaint.find(query)
          .skip(skip)
          .limit(take)
          .sort({ createdAt: -1 })
          .populate('citizenId', 'name email'),
      ]);

      return res.status(200).json({
        incidents,
        pagination: {
          total,
          page: parseInt(page, 10) || 1,
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      logger.error('Error fetching complaints', error);
      next(error);
    }
  }

  /**
   * GET /api/incidents/:id
   * Detail view with RBAC enforcement
   */
  async getIncidentById(req, res, next) {
    try {
      const { id } = req.params;

      let query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { complaintId: id };

      const incident = await Complaint.findOne(query)
        .populate('citizenId', 'name email')
        .populate('aiAnalysisId');

      if (!incident) {
        return sendError(res, 'INCIDENT_NOT_FOUND', `Incident with ID ${id} not found.`, 404);
      }

      // RBAC check: Citizen can ONLY access their own complaint
      if (req.user && req.user.role === 'CITIZEN') {
        const ownerId = incident.citizenId?._id ? incident.citizenId._id.toString() : incident.citizenId?.toString();
        if (ownerId && ownerId !== req.user._id.toString()) {
          return sendError(res, 'FORBIDDEN', 'Access denied to complaints filed by other citizens.', 403);
        }
      }

      return res.status(200).json(incident);
    } catch (error) {
      logger.error(`Error fetching incident ${req.params.id}`, error);
      next(error);
    }
  }

  /**
   * PATCH /api/incidents/:id/review
   * Admin review: ACCEPT or REJECT complaint
   */
  async reviewComplaint(req, res, next) {
    try {
      const { id } = req.params;
      const { action, notes } = req.body;

      let query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { complaintId: id };
      const complaint = await Complaint.findOne(query);

      if (!complaint) {
        return sendError(res, 'INCIDENT_NOT_FOUND', `Complaint ${id} not found.`, 404);
      }

      if (!['SUBMITTED', 'AI_ANALYZED', 'NEEDS_REVIEW', 'REOPENED', 'ACCEPTED'].includes(complaint.status)) {
        return sendError(res, 'INVALID_TRANSITION', `Complaint cannot be reviewed from status ${complaint.status}`, 400);
      }

      const previousStatus = complaint.status;
      if (action === 'ACCEPT') {
        complaint.status = 'IN_PROGRESS';
      } else if (action === 'REJECT') {
        complaint.status = 'REJECTED';
      } else {
        return sendError(res, 'VALIDATION_ERROR', 'Action must be ACCEPT or REJECT', 400);
      }

      complaint.municipalityResponse = notes || complaint.municipalityResponse;
      await complaint.save();

      // Record Verification log
      await Verification.create({
        complaintId: complaint._id,
        reviewerId: req.user ? req.user._id : null,
        reviewerName: req.user ? req.user.name : 'MCC Administrator',
        action: complaint.status,
        notes: notes || `Complaint ${action.toLowerCase()}ed by admin.`,
      });

      // Audit Log
      await AuditLog.create({
        actor: req.user ? req.user._id : null,
        role: req.user ? req.user.role : 'ADMIN',
        action: action === 'ACCEPT' ? 'ADMIN_ACCEPTED' : 'ADMIN_REJECTED',
        target: complaint._id,
        targetModel: 'Complaint',
        previousStatus,
        newStatus: complaint.status,
        reason: notes,
        isDemo: complaint.isDemo,
      });

      // Notify citizen
      await this.notifyCitizen({
        citizenId: complaint.citizenId,
        type: action === 'ACCEPT' ? 'COMPLAINT_ACCEPTED' : 'COMPLAINT_REJECTED',
        title: action === 'ACCEPT' ? 'Complaint Accepted' : 'Complaint Rejected',
        message:
          action === 'ACCEPT'
            ? `Your complaint ${complaint.complaintId} has been accepted. Cleaning is now scheduled.`
            : `Your complaint ${complaint.complaintId} was reviewed and rejected. Notes: ${notes || 'Does not qualify.'}`,
        complaintId: complaint._id,
      });

      return res.status(200).json(complaint);
    } catch (error) {
      logger.error('Error in reviewComplaint', error);
      next(error);
    }
  }

  /**
   * POST /api/incidents/:id/clean
   * Admin uploads completion evidence and notes; marks status WORK_DONE
   */
  async markCleaned(req, res, next) {
    try {
      const { id } = req.params;
      const { responseNote, completionEvidence } = req.body;

      let query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { complaintId: id };
      const complaint = await Complaint.findOne(query);

      if (!complaint) {
        return sendError(res, 'INCIDENT_NOT_FOUND', `Complaint ${id} not found.`, 404);
      }

      if (!['IN_PROGRESS', 'ACCEPTED', 'REOPENED'].includes(complaint.status)) {
        return sendError(res, 'INVALID_TRANSITION', `Complaint cannot be marked as cleaned from status ${complaint.status}. It must be in progress.`, 400);
      }

      const uploadedPath = req.file ? `/uploads/${req.file.filename}` : completionEvidence;
      if (!uploadedPath) {
        return sendError(res, 'VALIDATION_ERROR', 'Completion evidence photo or video is required.', 400);
      }

      const previousStatus = complaint.status;
      complaint.status = 'WORK_DONE';
      complaint.completionEvidence = uploadedPath;
      complaint.municipalityResponse = responseNote || 'Garbage cleared from the roadside and area cleaned.';
      complaint.citizenConfirmation = 'PENDING';
      await complaint.save();

      // Record Verification
      await Verification.create({
        complaintId: complaint._id,
        reviewerId: req.user ? req.user._id : null,
        reviewerName: req.user ? req.user.name : 'MCC Administrator',
        action: 'WORK_DONE',
        notes: complaint.municipalityResponse,
        completionEvidence: uploadedPath,
      });

      // Audit Log
      await AuditLog.create({
        actor: req.user ? req.user._id : null,
        role: req.user ? req.user.role : 'ADMIN',
        action: 'WORK_COMPLETED',
        target: complaint._id,
        targetModel: 'Complaint',
        previousStatus,
        newStatus: 'WORK_DONE',
        reason: complaint.municipalityResponse,
        isDemo: complaint.isDemo,
      });

      // Notify citizen for confirmation
      await this.notifyCitizen({
        citizenId: complaint.citizenId,
        type: 'CONFIRMATION_REQUIRED',
        title: 'Problem Cleaned — Verification Required',
        message: `Your complaint ${complaint.complaintId} has been cleaned. Please verify the resolution.`,
        complaintId: complaint._id,
      });

      return res.status(200).json(complaint);
    } catch (error) {
      logger.error('Error in markCleaned', error);
      next(error);
    }
  }

  /**
   * PATCH /api/incidents/:id/confirm
   * Citizen confirms resolution: CONFIRMED -> RESOLVED, or PROBLEM_STILL_EXISTS -> REOPENED
   */
  async confirmResolution(req, res, next) {
    try {
      const { id } = req.params;
      const { confirmation, notes } = req.body;

      if (!['CONFIRMED', 'PROBLEM_STILL_EXISTS'].includes(confirmation)) {
        return sendError(res, 'VALIDATION_ERROR', 'Confirmation must be CONFIRMED or PROBLEM_STILL_EXISTS', 400);
      }

      let query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { complaintId: id };
      const complaint = await Complaint.findOne(query);

      if (!complaint) {
        return sendError(res, 'INCIDENT_NOT_FOUND', `Complaint ${id} not found.`, 404);
      }

      if (complaint.status !== 'WORK_DONE') {
        return sendError(res, 'INVALID_TRANSITION', `Only complaints with WORK_DONE status can be confirmed or reopened. Current status: ${complaint.status}`, 400);
      }

      // Check ownership
      if (req.user && req.user.role === 'CITIZEN') {
        const ownerId = complaint.citizenId?._id ? complaint.citizenId._id.toString() : complaint.citizenId?.toString();
        if (ownerId && ownerId !== req.user._id.toString()) {
          return sendError(res, 'FORBIDDEN', 'Only the citizen who reported this complaint can confirm its resolution.', 403);
        }
      }

      const previousStatus = complaint.status;
      if (confirmation === 'CONFIRMED') {
        complaint.status = 'RESOLVED';
        complaint.citizenConfirmation = 'CONFIRMED';
        complaint.resolvedAt = new Date();
      } else {
        complaint.status = 'REOPENED';
        complaint.citizenConfirmation = 'PROBLEM_STILL_EXISTS';
      }
      await complaint.save();

      // Audit Log
      await AuditLog.create({
        actor: req.user ? req.user._id : complaint.citizenId,
        role: 'CITIZEN',
        action: confirmation === 'CONFIRMED' ? 'CITIZEN_CONFIRMED' : 'CITIZEN_REOPENED',
        target: complaint._id,
        targetModel: 'Complaint',
        previousStatus,
        newStatus: complaint.status,
        reason: notes || (confirmation === 'CONFIRMED' ? 'Citizen confirmed resolution.' : 'Citizen flagged problem still exists.'),
        isDemo: complaint.isDemo,
      });

      // Notify Admins
      await this.notifyAdmins({
        type: confirmation === 'CONFIRMED' ? 'COMPLAINT_RESOLVED' : 'COMPLAINT_REOPENED',
        title: confirmation === 'CONFIRMED' ? 'Complaint Resolved' : 'Complaint Reopened',
        message:
          confirmation === 'CONFIRMED'
            ? `Citizen confirmed resolution for complaint ${complaint.complaintId}.`
            : `Citizen reported problem still exists for ${complaint.complaintId}. Complaint reopened for follow-up.`,
        complaintId: complaint._id,
      });

      return res.status(200).json(complaint);
    } catch (error) {
      logger.error('Error in confirmResolution', error);
      next(error);
    }
  }

  /**
   * GET /api/incidents/stats/summary
   * Admin stats: Real counts directly from MongoDB
   */
  async getStatsSummary(req, res, next) {
    try {
      const isDemo = req.query.isDemo === 'true';
      const baseQuery = { isDemo };

      const [newComplaints, pendingReview, inProgress, cleaned, reopened, resolved, total] = await Promise.all([
        Complaint.countDocuments({ ...baseQuery, status: { $in: ['SUBMITTED', 'AI_ANALYZED'] } }),
        Complaint.countDocuments({ ...baseQuery, status: 'NEEDS_REVIEW' }),
        Complaint.countDocuments({ ...baseQuery, status: { $in: ['ACCEPTED', 'IN_PROGRESS'] } }),
        Complaint.countDocuments({ ...baseQuery, status: 'WORK_DONE' }),
        Complaint.countDocuments({ ...baseQuery, status: 'REOPENED' }),
        Complaint.countDocuments({ ...baseQuery, status: 'RESOLVED' }),
        Complaint.countDocuments(baseQuery),
      ]);

      return res.status(200).json({
        newComplaints,
        pendingReview,
        inProgress,
        cleaned,
        reopened,
        resolved,
        total,
        active: newComplaints + pendingReview + inProgress + reopened,
      });
    } catch (error) {
      logger.error('Error calculating stats summary', error);
      next(error);
    }
  }
}

module.exports = new IncidentsController();
