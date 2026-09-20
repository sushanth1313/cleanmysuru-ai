/**
 * Civic Waste Severity Calculation Engine
 * 
 * Rules:
 * - Severity is NOT equal to confidence.
 * - Factors: waste category, visible extent/volume, road obstruction, drain proximity, public impact.
 * - Outputs: LOW, MEDIUM, HIGH, CRITICAL with explainable reasoning.
 */
class SeverityService {
  /**
   * Calculates civic severity
   * @param {object} params
   * @param {'C_AND_D' | 'GARBAGE_PILE' | 'OVERFLOWING_BIN' | 'MIXED_WASTE'} params.incidentType
   * @param {number} params.confidence
   * @param {Array<{ label: string, confidence: number }>} [params.detectedObjects]
   * @param {string} [params.locationName]
   * @param {object} [params.environmentalFlags]
   * @returns {{ severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', reasoning: string, factors: string[] }}
   */
  calculateSeverity({ incidentType, confidence, detectedObjects = [], locationName = '', environmentalFlags = {} }) {
    let score = 0;
    const factors = [];

    // 1. Base waste type score (0 - 40)
    switch (incidentType) {
      case 'C_AND_D':
        score += 35;
        factors.push('C&D waste presents structural and vehicular obstruction hazards');
        break;
      case 'MIXED_WASTE':
        score += 30;
        factors.push('Mixed unsegregated waste presents sanitation and leachate risks');
        break;
      case 'GARBAGE_PILE':
        score += 25;
        factors.push('Surface garbage accumulation affects public sanitation');
        break;
      case 'OVERFLOWING_BIN':
        score += 20;
        factors.push('Overflowing civic bin requires scheduled collection clearance');
        break;
      default:
        score += 15;
    }

    // 2. Object detection cues & volume indicators (0 - 35)
    const labels = detectedObjects.map((o) => (o.label || '').toLowerCase());

    const hasHeavyDebris = labels.some((l) => l.includes('concrete') || l.includes('slab') || l.includes('brick') || l.includes('rubble'));
    const hasDrainProximity = environmentalFlags.drainProximity || labels.some((l) => l.includes('drain') || l.includes('gutter') || l.includes('waterway') || l.includes('culvert'));
    const hasRoadObstruction = environmentalFlags.roadObstruction || labels.some((l) => l.includes('road') || l.includes('traffic') || l.includes('curb') || l.includes('median') || l.includes('pavement'));
    const hasHazardous = labels.some((l) => l.includes('chemical') || l.includes('biomedical') || l.includes('asbestos') || l.includes('sharp'));

    if (hasHeavyDebris) {
      score += 15;
      factors.push('Heavy masonry or concrete fragments identified');
    }

    if (hasDrainProximity) {
      score += 25;
      factors.push('Proximity to municipal drainage / storm channel risks water clogging');
    }

    if (hasRoadObstruction) {
      score += 20;
      factors.push('Encroachment on roadway or pedestrian corridor detected');
    }

    if (hasHazardous) {
      score += 30;
      factors.push('Potential hazardous or sharps material present');
    }

    // 3. Location criticality (e.g. Ring Road, hospital zones, arterial roads) (0 - 15)
    const locLower = (locationName || '').toLowerCase();
    if (locLower.includes('main road') || locLower.includes('ring road') || locLower.includes('highway') || locLower.includes('industrial')) {
      score += 15;
      factors.push('High-traffic arterial roadway corridor');
    }

    // 4. Map total score to severity tier
    // Low: 0 - 35, Medium: 36 - 65, High: 66 - 85, Critical: 86+
    let severity = 'MEDIUM';
    if (score >= 80) {
      severity = 'CRITICAL';
    } else if (score >= 55) {
      severity = 'HIGH';
    } else if (score >= 30) {
      severity = 'MEDIUM';
    } else {
      severity = 'LOW';
    }

    // Formulate clean, explainable civic reasoning
    const reasoning = `Assigned ${severity} severity based on: ${factors.join('; ')}.`;

    return {
      severity,
      reasoning,
      factors,
    };
  }
}

module.exports = new SeverityService();
