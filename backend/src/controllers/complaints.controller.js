const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Complaint = require('../models/Complaint');
const AIAnalysis = require('../models/AIAnalysis');
const AuditLog = require('../models/AuditLog');
const aiService = require('../services/ai.service');
const imageService = require('../services/image.service');
const videoService = require('../services/video.service');
const locationService = require('../services/location.service');
const duplicateService = require('../services/duplicate.service');
const notificationService = require('../services/notification.service');
const { generateComplaintId } = require('../utils/id.generator');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config');

class ComplaintsController {
  /**
   * Helper: Calculate SHA-256 hash of file
   */
  calculateFileHash(filePath) {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * POST /api/complaints
   * Submit and analyze real complaint evidence
   */
  async createComplaint(req, res, next) {
    try {
      if (!req.file) {
        return sendError(res, 'NO_FILE', 'Evidence file (image or MP4 video) is required', 400);
      }

      const file = req.file;
      const isVideo = file.mimetype.includes('video') || file.originalname.toLowerCase().endsWith('.mp4');
      const fileHash = this.calculateFileHash(file.path);
      const originalFileName = file.originalname;
      const storedFileName = path.basename(file.path);
      const evidencePath = `/uploads/${storedFileName}`;

      const {
        description = '',
        latitude: rawLat,
        longitude: rawLng,
        locationSource: rawLocationSource = 'MANUAL',
        locationAccuracy,
        locality: rawLocality,
        city = 'Mysuru',
        state = 'Karnataka',
      } = req.body;

      const latitude = (rawLat !== undefined && rawLat !== null && rawLat !== '' && !isNaN(parseFloat(rawLat))) ? parseFloat(rawLat) : undefined;
      const longitude = (rawLng !== undefined && rawLng !== null && rawLng !== '' && !isNaN(parseFloat(rawLng))) ? parseFloat(rawLng) : undefined;
      const validSources = ['BROWSER_GPS', 'EXIF_GPS', 'MANUAL'];
      const locationSource = validSources.includes(rawLocationSource) ? rawLocationSource : 'MANUAL';

      // Determine Citizen ID
      let citizenId = req.user ? req.user._id : null;
      if (!citizenId) {
        const User = require('../models/User');
        const defaultCitizen = await User.findOne({ role: 'CITIZEN' });
        citizenId = defaultCitizen ? defaultCitizen._id : null;
      }

      let exifGps = null;
      let qualityResult = { imageQuality: 'GOOD', verificationRequired: false };

      if (!isVideo) {
        // Extract EXIF GPS and assess image quality
        exifGps = await imageService.extractExifGps(file.path);
        qualityResult = await imageService.assessQuality(file.path);
      }

      // Check Location validity and location mismatch
      const locationEval = await locationService.evaluateLocation(latitude, longitude, exifGps);
      const effectiveLocality = rawLocality || locationEval.locality || 'Mysuru';

      // Real AI Analysis using Gemini 2.5 Flash
      let aiResult;
      let framesAnalyzed = [];

      try {
        if (isVideo) {
          const framesDir = path.join(config.upload.dir, 'frames');
          const frameExtraction = await videoService.extractRepresentativeFrames(file.path, framesDir, 4);
          
          if (!frameExtraction.success || frameExtraction.frames.length === 0) {
            aiResult = {
              incidentType: 'VIDEO_ANALYSIS_FAILED',
              confidence: 0,
              severity: 'NONE',
              description: `Video analysis could not extract valid frames: ${frameExtraction.reason || 'FFmpeg extraction failure'}`,
              detectedObjects: [],
              reasoning: 'Video processing failed during frame extraction.',
              recommendedAction: 'Citizen may resubmit clear MP4 video evidence.',
              imageQuality: 'POOR',
              nightDetected: false,
              lowLightScore: 0,
              verificationRequired: true,
            };
          } else {
            framesAnalyzed = frameExtraction.frames.map((f) => `/uploads/frames/${path.basename(f)}`);
            aiResult = await aiService.analyzeVideoFrames(frameExtraction.frames);
          }
        } else {
          aiResult = await aiService.analyzeEvidence(file.path, file.mimetype);
        }
      } catch (aiErr) {
        logger.error('Gemini vision analysis encountered an error', aiErr);
        aiResult = {
          incidentType: 'AI_ANALYSIS_FAILED',
          confidence: 0,
          severity: 'NONE',
          description: `AI Analysis failed: ${aiErr.message}. Preliminary evidence queued for manual verification.`,
          detectedObjects: [],
          reasoning: 'Automated vision model failed to produce response.',
          recommendedAction: 'Municipal administrative review required.',
          imageQuality: qualityResult.imageQuality || 'POOR',
          nightDetected: false,
          lowLightScore: 0,
          verificationRequired: true,
        };
      }

      // Real Duplicate Detection against persistent MongoDB
      const duplicateCheck = await duplicateService.checkDuplicate({
        filePath: file.path,
        latitude,
        longitude,
        incidentType: aiResult.incidentType,
      });

      // Generate sequential complaint number
      const complaintNumber = await generateComplaintId();

      // Determine initial status
      let initialStatus = 'SUBMITTED';
      if (
        aiResult.verificationRequired ||
        qualityResult.verificationRequired ||
        locationEval.jurisdictionStatus === 'LOCATION_MISMATCH' ||
        duplicateCheck.isPossibleDuplicate ||
        aiResult.incidentType === 'AI_ANALYSIS_FAILED' ||
        aiResult.incidentType === 'VIDEO_ANALYSIS_FAILED' ||
        aiResult.incidentType === 'INSUFFICIENT_EVIDENCE'
      ) {
        initialStatus = 'NEEDS_REVIEW';
      } else {
        initialStatus = 'AI_ANALYZED';
      }

      // Create Complaint in MongoDB
      const complaint = new Complaint({
        complaintNumber,
        complaintId: complaintNumber,
        citizenId,
        description,
        evidence: evidencePath,
        originalFileName,
        storedFileName,
        fileHash,
        mimeType: file.mimetype,
        fileSize: file.size,
        sourceType: 'CITIZEN',
        latitude,
        longitude,
        locationSource,
        locationAccuracy: locationAccuracy ? parseFloat(locationAccuracy) : undefined,
        locality: effectiveLocality,
        city,
        state,
        jurisdictionStatus: locationEval.jurisdictionStatus,
        status: initialStatus,
        incidentType: aiResult.incidentType,
        severity: aiResult.severity,
        confidence: aiResult.confidence,
        detectedObjects: aiResult.detectedObjects || [],
        reasoning: aiResult.reasoning || '',
        recommendedAction: aiResult.recommendedAction || '',
        framesAnalyzed,
        imageQuality: qualityResult.imageQuality || aiResult.imageQuality || 'GOOD',
        qualityMetrics: qualityResult.metrics || {},
        qualityReason: qualityResult.reason || '',
        nightDetected: aiResult.nightDetected || false,
        lowLightScore: aiResult.lowLightScore || 0,
        verificationRequired: initialStatus === 'NEEDS_REVIEW',
        duplicateStatus: duplicateCheck.isPossibleDuplicate ? 'POSSIBLE_DUPLICATE' : 'NONE',
        duplicateOf: duplicateCheck.matchedIncidentId || undefined,
        similarityScore: duplicateCheck.similarityScore || 0,
        isDemo: false,
      });

      await complaint.save();

      // Create and associate AIAnalysis record
      const aiAnalysisRecord = await AIAnalysis.create({
        complaintId: complaint._id,
        incidentType: aiResult.incidentType,
        confidence: aiResult.confidence,
        severity: aiResult.severity,
        description: aiResult.description,
        detectedObjects: aiResult.detectedObjects,
        reasoning: aiResult.reasoning,
        recommendedAction: aiResult.recommendedAction,
        imageQuality: aiResult.imageQuality,
        nightDetected: aiResult.nightDetected,
        lowLightScore: aiResult.lowLightScore,
        verificationRequired: complaint.verificationRequired,
        modelName: aiResult.modelName || 'gemini-2.5-flash',
        modelVersion: aiResult.modelVersion || '2.5-flash',
        rawResponse: aiResult.rawResponse || {},
      });

      complaint.aiAnalysisId = aiAnalysisRecord._id;
      complaint.aiResult = aiResult;
      await complaint.save();

      // Notify Admins in Database
      await notificationService.notifyAdmins(
        'NEW_COMPLAINT',
        `New Complaint: ${complaintNumber}`,
        `New ${aiResult.incidentType.replace(/_/g, ' ')} complaint logged at ${effectiveLocality}.`,
        complaint._id
      );

      // Audit Log
      await AuditLog.create({
        actor: citizenId,
        role: 'CITIZEN',
        action: 'COMPLAINT_CREATED',
        target: complaint._id,
        targetModel: 'Complaint',
        newStatus: initialStatus,
        metadata: {
          complaintNumber,
          incidentType: aiResult.incidentType,
          confidence: aiResult.confidence,
          fileHash,
        },
        isDemo: false,
      });

      logger.info(`Complaint ${complaintNumber} created successfully with status ${initialStatus}`);
      return res.status(201).json({
        success: true,
        data: complaint,
        complaint,
      });
    } catch (error) {
      logger.error('Create complaint error', error);
      return sendError(res, 'SERVER_ERROR', `Failed to create complaint: ${error.message}`, 500);
    }
  }

  /**
   * GET /api/complaints
   * Query complaints with live database filtering
   */
  async getComplaints(req, res, next) {
    try {
      const {
        status,
        severity,
        incidentType,
        locality,
        search,
        jurisdictionStatus,
        citizenOnly,
        page = 1,
        limit = 50,
      } = req.query;

      const query = { isDemo: false };

      // RBAC: If citizen requests citizenOnly or citizen role without explicit admin override
      if (citizenOnly === 'true' && req.user) {
        query.citizenId = req.user._id;
      } else if (req.user && req.user.role === 'CITIZEN' && !req.query.all) {
        query.citizenId = req.user._id;
      }

      if (status && status !== 'All Statuses' && status !== 'All') {
        query.status = status;
      }
      if (severity && severity !== 'All') {
        query.severity = severity.toUpperCase();
      }
      if (incidentType && incidentType !== 'All') {
        query.incidentType = incidentType;
      }
      if (jurisdictionStatus && jurisdictionStatus !== 'All') {
        query.jurisdictionStatus = jurisdictionStatus;
      }
      if (locality) {
        query.locality = new RegExp(locality, 'i');
      }
      if (search) {
        query.$or = [
          { complaintNumber: new RegExp(search, 'i') },
          { description: new RegExp(search, 'i') },
          { locality: new RegExp(search, 'i') },
          { incidentType: new RegExp(search, 'i') },
        ];
      }

      const total = await Complaint.countDocuments(query);
      const complaints = await Complaint.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('citizenId', 'name email phone');

      return res.status(200).json({
        success: true,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        data: complaints,
        complaints,
        incidents: complaints, // backward compatibility
      });
    } catch (error) {
      logger.error('Get complaints error', error);
      return sendError(res, 'SERVER_ERROR', 'Failed to retrieve complaints', 500);
    }
  }

  /**
   * GET /api/complaints/:id
   */
  async getComplaintById(req, res, next) {
    try {
      const { id } = req.params;
      let complaint;

      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        complaint = await Complaint.findById(id).populate('citizenId', 'name email phone').populate('aiAnalysisId');
      } else {
        complaint = await Complaint.findOne({
          $or: [{ complaintNumber: id }, { complaintId: id }],
        }).populate('citizenId', 'name email phone').populate('aiAnalysisId');
      }

      if (!complaint) {
        return sendError(res, 'NOT_FOUND', 'Complaint not found', 404);
      }

      // RBAC Check: Citizen can only view own complaint
      if (req.user && req.user.role === 'CITIZEN') {
        const ownerId = complaint.citizenId?._id || complaint.citizenId;
        if (ownerId && ownerId.toString() !== req.user._id.toString()) {
          return sendError(res, 'FORBIDDEN', 'You do not have permission to view this complaint', 403);
        }
      }

      const complaintObj = complaint.toObject();
      if (complaintObj.aiAnalysisId) {
        complaintObj.aiAnalysis = {
          category: complaintObj.incidentType,
          confidence: complaintObj.confidence,
          volumeEstimate: complaintObj.aiAnalysisId.volumeEstimate || '1-3 m3',
          severity: complaintObj.severity,
          materials: complaintObj.detectedObjects || ['Mixed municipal waste', 'Plastics'],
          actionRecommendation: complaintObj.recommendedAction || 'Clear waste with municipal team',
          legalDisclaimer: 'AI output is preliminary evidence for municipal screening and does not constitute statutory proof of liability.',
          modelVersion: 'gemini-2.5-flash',
          ...complaintObj.aiAnalysisId,
        };
      }

      return res.status(200).json({
        success: true,
        data: complaintObj,
        complaint: complaintObj,
        incident: complaintObj, // backward compatibility
      });
    } catch (error) {
      logger.error('Get complaint by ID error', error);
      return sendError(res, 'SERVER_ERROR', 'Failed to retrieve complaint', 500);
    }
  }

  async findComplaint(id) {
    if (!id) return null;
    if (typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) {
      return await Complaint.findById(id);
    }
    return await Complaint.findOne({
      $or: [{ complaintNumber: id }, { complaintId: id }],
    });
  }

  /**
   * PATCH /api/complaints/:id/status
   * Admin updates status (ACCEPTED, IN_PROGRESS, REJECTED)
   */
  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, notes, assignedTo } = req.body;

      const complaint = await this.findComplaint(id);
      if (!complaint) {
        return sendError(res, 'NOT_FOUND', 'Complaint not found', 404);
      }

      const prevStatus = complaint.status;
      complaint.status = status;
      if (assignedTo) complaint.assignedTo = assignedTo;
      if (notes) complaint.municipalityResponse = notes;
      await complaint.save();

      // Notify citizen on status changes
      if (status === 'ACCEPTED') {
        await notificationService.notifyCitizen(
          complaint.citizenId,
          'COMPLAINT_ACCEPTED',
          `Complaint ${complaint.complaintNumber} Accepted`,
          `MCC has officially verified and accepted your complaint. Work will be initiated shortly.`,
          complaint._id
        );
      } else if (status === 'IN_PROGRESS') {
        await notificationService.notifyCitizen(
          complaint.citizenId,
          'WORK_STARTED',
          `Work In Progress: ${complaint.complaintNumber}`,
          `Municipal sanitation crew has been dispatched to ${complaint.locality}.`,
          complaint._id
        );
      } else if (status === 'REJECTED') {
        await notificationService.notifyCitizen(
          complaint.citizenId,
          'COMPLAINT_REJECTED',
          `Complaint ${complaint.complaintNumber} Rejected`,
          notes || 'Complaint was evaluated and could not be verified for municipal action.',
          complaint._id
        );
      }

      await AuditLog.create({
        actor: req.user ? req.user._id : null,
        role: 'ADMIN',
        action: 'STATUS_UPDATE',
        target: complaint._id,
        targetModel: 'Complaint',
        previousStatus: prevStatus,
        newStatus: status,
        reason: notes,
        isDemo: false,
      });

      return sendSuccess(res, complaint, `Complaint status updated to ${status}`);
    } catch (error) {
      logger.error('Update status error', error);
      return sendError(res, 'SERVER_ERROR', 'Failed to update complaint status', 500);
    }
  }

  /**
   * POST /api/complaints/:id/work-done
   * Admin marks work done. MUST require completion evidence photo/video + note.
   */
  async markWorkDone(req, res, next) {
    try {
      const { id } = req.params;
      const { note: directNote, notes, responseNote, municipalityResponse, description } = req.body || {};
      const note = directNote || responseNote || notes || municipalityResponse || description || 'Sanitation work completed successfully';

      if (!req.file) {
        return sendError(res, 'COMPLETION_EVIDENCE_REQUIRED', 'Real completion photo or video evidence is required', 400);
      }

      if (!note || note.trim().length === 0) {
        return sendError(res, 'NOTE_REQUIRED', 'Admin response note describing the work done is required', 400);
      }

      const complaint = await this.findComplaint(id);
      if (!complaint) {
        return sendError(res, 'NOT_FOUND', 'Complaint not found', 404);
      }

      const storedFileName = path.basename(req.file.path);
      const completionEvidencePath = `/uploads/${storedFileName}`;

      const prevStatus = complaint.status;
      complaint.status = 'WORK_DONE';
      complaint.completionEvidence = completionEvidencePath;
      complaint.municipalityResponse = note.trim();
      complaint.citizenConfirmation = 'PENDING';
      await complaint.save();

      // Notify citizen to inspect and confirm
      await notificationService.notifyCitizen(
        complaint.citizenId,
        'WORK_DONE',
        `Sanitation Work Completed: ${complaint.complaintNumber}`,
        `MCC has finished sanitation work at ${complaint.locality}. Please review the completion photo and confirm resolution.`,
        complaint._id
      );

      await AuditLog.create({
        actor: req.user ? req.user._id : null,
        role: 'ADMIN',
        action: 'WORK_DONE',
        target: complaint._id,
        targetModel: 'Complaint',
        previousStatus: prevStatus,
        newStatus: 'WORK_DONE',
        metadata: {
          completionEvidence: completionEvidencePath,
          responseNote: note.trim(),
        },
        isDemo: false,
      });

      logger.info(`Complaint ${complaint.complaintNumber} marked WORK_DONE with completion evidence`);
      return sendSuccess(res, complaint, 'Work marked as completed. Awaiting citizen confirmation.');
    } catch (error) {
      logger.error('Mark work done error', error);
      return sendError(res, 'SERVER_ERROR', 'Failed to submit work done confirmation', 500);
    }
  }

  /**
   * POST /api/complaints/:id/confirm
   * Citizen confirms resolution -> Transitions to RESOLVED
   */
  async confirmResolution(req, res, next) {
    try {
      const { id } = req.params;
      const complaint = await this.findComplaint(id);

      if (!complaint) {
        return sendError(res, 'NOT_FOUND', 'Complaint not found', 404);
      }

      // Verify complaint is in WORK_DONE or CITIZEN_CONFIRMATION
      if (complaint.status !== 'WORK_DONE' && complaint.status !== 'CITIZEN_CONFIRMATION') {
        return sendError(res, 'INVALID_STATE', 'Complaint is not in a state awaiting confirmation', 400);
      }

      // RBAC: Verify citizen ownership
      if (req.user && req.user.role === 'CITIZEN') {
        const ownerId = complaint.citizenId?._id || complaint.citizenId;
        if (ownerId && ownerId.toString() !== req.user._id.toString()) {
          return sendError(res, 'FORBIDDEN', 'Only the submitting citizen can confirm resolution', 403);
        }
      }

      const prevStatus = complaint.status;
      complaint.status = 'RESOLVED';
      complaint.citizenConfirmation = 'CONFIRMED';
      complaint.resolvedAt = new Date();
      await complaint.save();

      // Notifications
      await notificationService.notifyCitizen(
        complaint.citizenId,
        'COMPLAINT_RESOLVED',
        `Complaint ${complaint.complaintNumber} Resolved`,
        `Thank you for confirming resolution. CleanMysuru AI records have been closed.`,
        complaint._id
      );

      await AuditLog.create({
        actor: req.user ? req.user._id : complaint.citizenId,
        role: 'CITIZEN',
        action: 'CONFIRM_RESOLVED',
        target: complaint._id,
        targetModel: 'Complaint',
        previousStatus: prevStatus,
        newStatus: 'RESOLVED',
        isDemo: false,
      });

      logger.info(`Complaint ${complaint.complaintNumber} confirmed RESOLVED by citizen`);
      return sendSuccess(res, complaint, 'Complaint successfully resolved and closed.');
    } catch (error) {
      logger.error('Confirm resolution error', error);
      return sendError(res, 'SERVER_ERROR', 'Failed to confirm resolution', 500);
    }
  }

  /**
   * POST /api/complaints/:id/reopen
   * Citizen reports "Problem Still Exists" -> Transitions to REOPENED -> Admin notification
   */
  async reopenComplaint(req, res, next) {
    try {
      const { id } = req.params;
      const { reason, note } = req.body;
      const feedback = note || reason || 'Citizen reports problem still exists after municipal work.';

      const complaint = await this.findComplaint(id);
      if (!complaint) {
        return sendError(res, 'NOT_FOUND', 'Complaint not found', 404);
      }

      // Verify citizen ownership
      if (req.user && req.user.role === 'CITIZEN') {
        const ownerId = complaint.citizenId?._id || complaint.citizenId;
        if (ownerId && ownerId.toString() !== req.user._id.toString()) {
          return sendError(res, 'FORBIDDEN', 'Only the submitting citizen can reopen this complaint', 403);
        }
      }

      const prevStatus = complaint.status;
      complaint.status = 'REOPENED';
      complaint.citizenConfirmation = 'PROBLEM_STILL_EXISTS';
      complaint.citizenConfirmationNote = feedback;
      complaint.reopenedAt = new Date();
      await complaint.save();

      // Notify Admins
      await notificationService.notifyAdmins(
        'COMPLAINT_REOPENED',
        `Urgent: Complaint Reopened ${complaint.complaintNumber}`,
        `Citizen reported problem still exists at ${complaint.locality}: "${feedback}"`,
        complaint._id
      );

      // Notify Citizen
      await notificationService.notifyCitizen(
        complaint.citizenId,
        'COMPLAINT_REOPENED',
        `Complaint ${complaint.complaintNumber} Reopened`,
        `Your reopen request has been sent to MCC supervisors for escalation.`,
        complaint._id
      );

      await AuditLog.create({
        actor: req.user ? req.user._id : complaint.citizenId,
        role: 'CITIZEN',
        action: 'COMPLAINT_REOPENED',
        target: complaint._id,
        targetModel: 'Complaint',
        previousStatus: prevStatus,
        newStatus: 'REOPENED',
        reason: feedback,
        isDemo: false,
      });

      logger.info(`Complaint ${complaint.complaintNumber} REOPENED by citizen`);
      return sendSuccess(res, complaint, 'Complaint successfully reopened. MCC supervisors notified.');
    } catch (error) {
      logger.error('Reopen complaint error', error);
      return sendError(res, 'SERVER_ERROR', 'Failed to reopen complaint', 500);
    }
  }

  /**
   * DELETE /api/complaints/:id (Admin only)
   */
  async deleteComplaint(req, res, next) {
    try {
      const { id } = req.params;
      let complaint;
      if (typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) {
        complaint = await Complaint.findByIdAndDelete(id);
      } else {
        complaint = await Complaint.findOneAndDelete({
          $or: [{ complaintNumber: id }, { complaintId: id }],
        });
      }
      if (!complaint) {
        return sendError(res, 'NOT_FOUND', 'Complaint not found', 404);
      }
      return sendSuccess(res, {}, 'Complaint deleted successfully');
    } catch (error) {
      logger.error('Delete complaint error', error);
      return sendError(res, 'SERVER_ERROR', 'Failed to delete complaint', 500);
    }
  }
}

module.exports = new ComplaintsController();
