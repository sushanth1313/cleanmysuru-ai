






const Complaint = require('../models/Complaint');
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/response');

class MapController {
  /**
   * GET /api/map/complaints
   * Real MongoDB complaint markers with coordinates
   */
  async getMapComplaints(req, res, next) {
    try {
      const { status, severity, incidentType, hours, jurisdiction } = req.query;
      const query = {
        isDemo: false,
        'location.coordinates': { $exists: true, $ne: [] },
      };

      if (status && status !== 'All' && status !== 'All Statuses') {
        query.status = status;
      }
      if (severity && severity !== 'All') {
        query.severity = severity.toUpperCase();
      }
      if (incidentType && incidentType !== 'All') {
        query.incidentType = incidentType;
      }
      if (jurisdiction && jurisdiction !== 'All') {
        query.jurisdictionStatus = jurisdiction;
      }
      if (hours && !isNaN(parseInt(hours))) {
        const since = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);
        query.createdAt = { $gte: since };
      }

      const complaints = await Complaint.find(query)
        .sort({ createdAt: -1 })
        .select(
          '_id complaintNumber complaintId location incidentType severity status locality confidence sourceType evidence jurisdictionStatus createdAt'
        )
        .lean();

      const pins = complaints.map((comp) => {
        let lat = 0, lng = 0;
        if (comp.location && comp.location.coordinates && comp.location.coordinates.length >= 2) {
          lng = comp.location.coordinates[0];
          lat = comp.location.coordinates[1];
        }

        return {
          id: comp.complaintNumber || comp.complaintId || comp._id.toString(),
          _id: comp._id.toString(),
          latitude: lat,
          longitude: lng,
          coords: [lat, lng],
          type: comp.incidentType,
          severity: comp.severity,
          status: comp.status,
          locationName: comp.locality,
          locality: comp.locality,
          confidence: comp.confidence,
          evidence: comp.evidence,
          jurisdiction: comp.jurisdictionStatus,
          createdAt: comp.createdAt,
        };
      });

      return res.status(200).json({
        success: true,
        count: pins.length,
        pins,
        markers: pins,
        data: pins,
      });
    } catch (error) {
      logger.error('Error fetching map complaints', error);
      return sendError(res, 'SERVER_ERROR', 'Failed to fetch map complaints', 500);
    }
  }

  /**
   * GET /api/map/search?q=...
   * Real geocoding mechanism with Greater Mysuru geographic bounds
   */
  async searchLocations(req, res) {
    try {
      const q = req.query.q ? req.query.q.trim() : '';
      if (!q || q.length < 2) {
        return res.json({ success: true, results: [] });
      }

      // Query normalization for common phonetic/transliteration variations
      let normalizedQuery = q
        .replace(/sathgalli/gi, 'Sathagalli')
        .replace(/vv\s*mohalla/gi, 'Vani Vilas Mohalla')
        .replace(/krs\s*road/gi, 'Krishnaraja Sagara Road')
        .replace(/krs/gi, 'Krishna Raja Sagara');

      const queriesToTry = [
        `${normalizedQuery}, Mysuru`,
        `${q}, Mysuru`,
        normalizedQuery,
      ];

      // Remove duplicate queries
      const uniqueQueries = Array.from(new Set(queriesToTry));
      let allResults = [];

      for (const queryStr of uniqueQueries) {
        if (allResults.length >= 8) break;
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&viewbox=76.45,12.45,76.82,12.15&q=${encodeURIComponent(queryStr)}&limit=6&addressdetails=1`;
          const resp = await fetch(url, {
            headers: { 'User-Agent': 'CleanMysuru-AI/1.0' },
          });
          if (resp.ok) {
            const data = await resp.json();
            if (Array.isArray(data)) {
              for (const item of data) {
                const lat = parseFloat(item.lat);
                const lon = parseFloat(item.lon);
                // Verify coordinates fall within Greater Mysuru region
                if (lat >= 12.15 && lat <= 12.45 && lon >= 76.45 && lon <= 76.82) {
                  const isDup = allResults.some(r => Math.abs(r.lat - lat) < 0.001 && Math.abs(r.lng - lon) < 0.001);
                  if (!isDup) {
                    allResults.push({
                      display_name: item.display_name,
                      lat,
                      lng: lon,
                      locality: item.name || item.address?.suburb || item.address?.neighbourhood || item.display_name.split(',')[0].trim(),
                      city: item.address?.city || item.address?.town || 'Mysuru',
                      state: item.address?.state || 'Karnataka',
                    });
                  }
                }
              }
            }
          }
        } catch (fetchErr) {
          logger.warn('Geocoding search query failed:', queryStr, fetchErr.message);
        }
      }

      return res.json({
        success: true,
        count: allResults.length,
        results: allResults,
      });
    } catch (err) {
      logger.error('Error in location search:', err);
      return res.status(500).json({ success: false, error: 'Location search error', results: [] });
    }
  }

  /**
   * GET /api/map/reverse?lat=...&lng=...
   * Real reverse geocoding
   */
  async reverseGeocode(req, res) {
    try {
      const lat = parseFloat(req.query.lat);
      const lng = parseFloat(req.query.lng || req.query.lon);
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ success: false, error: 'Invalid coordinates' });
      }

      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'CleanMysuru-AI/1.0' },
      });

      if (resp.ok) {
        const data = await resp.json();
        const addr = data.address || {};
        let locality = addr.residential || addr.neighbourhood || addr.village || addr.suburb || addr.road || data.name || 'Mysuru Location';
        if (locality.toLowerCase() === 'satagalli' || locality.toLowerCase() === 'kyathamaranahalli') {
            locality = 'Sathagalli';
        }
        const city = addr.city || addr.town || addr.village || 'Mysuru';
        const state = addr.state || 'Karnataka';

        return res.json({
          success: true,
          display_name: data.display_name,
          locality,
          city,
          state,
          lat,
          lng,
        });
      }

      return res.json({
        success: true,
        display_name: `${lat.toFixed(4)}, ${lng.toFixed(4)}, Mysuru`,
        locality: 'Mysuru',
        city: 'Mysuru',
        state: 'Karnataka',
        lat,
        lng,
      });
    } catch (err) {
      logger.error('Reverse geocode error:', err);
      return res.json({
        success: true,
        display_name: `${req.query.lat}, ${req.query.lng}, Mysuru`,
        locality: 'Mysuru',
        city: 'Mysuru',
        state: 'Karnataka',
        lat: parseFloat(req.query.lat),
        lng: parseFloat(req.query.lng),
      });
    }
  }

  // Compatibility alias
  async getMapIncidents(req, res, next) {
    return this.getMapComplaints(req, res, next);
  }
}

module.exports = new MapController();
