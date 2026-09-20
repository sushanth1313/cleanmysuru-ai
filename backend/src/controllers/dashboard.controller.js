const Complaint = require('../models/Complaint');
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/response');

class DashboardController {
  /**
   * GET /api/dashboard/citizen
   * Live statistics for logged-in citizen
   */
  async getCitizenDashboard(req, res, next) {
    try {
      const citizenId = req.user ? req.user._id : null;
      if (!citizenId) {
        return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
      }

      const [total, active, resolved, reopened, needsConfirmation, recent] = await Promise.all([
        Complaint.countDocuments({ citizenId, isDemo: false }),
        Complaint.countDocuments({
          citizenId,
          status: { $in: ['SUBMITTED', 'AI_ANALYZED', 'NEEDS_REVIEW', 'ACCEPTED', 'IN_PROGRESS'] },
          isDemo: false,
        }),
        Complaint.countDocuments({ citizenId, status: 'RESOLVED', isDemo: false }),
        Complaint.countDocuments({ citizenId, status: 'REOPENED', isDemo: false }),
        Complaint.countDocuments({
          citizenId,
          status: { $in: ['WORK_DONE', 'CITIZEN_CONFIRMATION'] },
          isDemo: false,
        }),
        Complaint.find({ citizenId, isDemo: false })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
      ]);

      const stats = {
        total,
        active,
        resolved,
        reopened,
        needsConfirmation,
        recent,
      };

      return res.status(200).json({
        success: true,
        data: stats,
        stats,
      });
    } catch (error) {
      logger.error('Error fetching citizen dashboard', error);
      return sendError(res, 'SERVER_ERROR', 'Failed to fetch citizen dashboard stats', 500);
    }
  }

  /**
   * GET /api/dashboard/admin
   * Comprehensive operational analytics from persistent MongoDB
   */
  async getAdminDashboard(req, res, next) {
    try {
      const query = { isDemo: false };

      const [
        total,
        open,
        resolved,
        reopened,
        needsReview,
        aiFailures,
        resolvedComplaints,
        byTypeAgg,
        bySeverityAgg,
        byLocalityAgg,
        recent,
      ] = await Promise.all([
        Complaint.countDocuments(query),
        Complaint.countDocuments({
          ...query,
          status: { $in: ['SUBMITTED', 'AI_ANALYZED', 'NEEDS_REVIEW', 'ACCEPTED', 'IN_PROGRESS', 'WORK_DONE'] },
        }),
        Complaint.countDocuments({ ...query, status: 'RESOLVED' }),
        Complaint.countDocuments({ ...query, status: 'REOPENED' }),
        Complaint.countDocuments({ ...query, status: 'NEEDS_REVIEW' }),
        Complaint.countDocuments({
          ...query,
          incidentType: { $in: ['AI_ANALYSIS_FAILED', 'VIDEO_ANALYSIS_FAILED'] },
        }),
        Complaint.find({ ...query, status: 'RESOLVED', resolvedAt: { $exists: true } })
          .select('createdAt resolvedAt')
          .lean(),
        Complaint.aggregate([
          { $match: query },
          { $group: { _id: '$incidentType', count: { $sum: 1 } } },
        ]),
        Complaint.aggregate([
          { $match: query },
          { $group: { _id: '$severity', count: { $sum: 1 } } },
        ]),
        Complaint.aggregate([
          { $match: query },
          { $group: { _id: '$locality', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        Complaint.find(query)
          .sort({ createdAt: -1 })
          .limit(8)
          .populate('citizenId', 'name email')
          .lean(),
      ]);

      // Calculate real average resolution time in hours
      let totalResolutionHours = 0;
      let resolvedCountWithDates = 0;
      for (const comp of resolvedComplaints) {
        if (comp.resolvedAt && comp.createdAt) {
          const diffMs = new Date(comp.resolvedAt).getTime() - new Date(comp.createdAt).getTime();
          if (diffMs > 0) {
            totalResolutionHours += diffMs / (1000 * 60 * 60);
            resolvedCountWithDates++;
          }
        }
      }

      const avgResolutionTimeHours =
        resolvedCountWithDates > 0
          ? Math.round((totalResolutionHours / resolvedCountWithDates) * 10) / 10
          : 0;

      const byType = {};
      byTypeAgg.forEach((item) => {
        byType[item._id] = item.count;
      });

      const bySeverity = {};
      bySeverityAgg.forEach((item) => {
        bySeverity[item._id] = item.count;
      });

      const byLocality = byLocalityAgg.map((item) => ({
        locality: item._id || 'Mysuru',
        count: item.count,
      }));

      return res.status(200).json({
        success: true,
        stats: {
          total,
          open,
          resolved,
          reopened,
          active: open,
          needsReview,
          aiFailures,
          avgResolutionTimeHours,
        },
        categoryBreakdown: byType,
        data: {
          metrics: {
            total,
            open,
            resolved,
            reopened,
            needsReview,
            aiFailures,
            avgResolutionTimeHours,
          },
          byType,
          bySeverity,
          byLocality,
          recent,
        },
      });
    } catch (error) {
      logger.error('Error fetching admin dashboard', error);
      return sendError(res, 'SERVER_ERROR', 'Failed to fetch admin dashboard analytics', 500);
    }
  }

  /**
   * Compatibility method
   */
  async getDashboardStats(req, res, next) {
    return this.getAdminDashboard(req, res, next);
  }
}

module.exports = new DashboardController();
