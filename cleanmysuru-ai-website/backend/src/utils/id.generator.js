const Complaint = require('../models/Complaint');

/**
 * Generates human-readable incident IDs like CM-2026-0001
 */
async function generateIncidentId() {
  const currentYear = new Date().getFullYear();
  const prefix = `CM-${currentYear}-`;

  try {
    const lastIncident = await Complaint.findOne({
      complaintId: { $regex: `^${prefix}` }
    })
    .sort({ complaintId: -1 })
    .select('complaintId');

    if (!lastIncident || !lastIncident.complaintId) {
      return `${prefix}0001`;
    }

    const lastNumberStr = lastIncident.complaintId.replace(prefix, '');
    const lastNumber = parseInt(lastNumberStr, 10);
    const nextNumber = isNaN(lastNumber) ? 1 : lastNumber + 1;

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  } catch (error) {
    // Fallback if DB query fails
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${randomSuffix}`;
  }
}

module.exports = {
  generateComplaintId: generateIncidentId,
  generateIncidentId,
};
