/**
 * Location and Civic Jurisdiction Service for Mysuru
 */

const { calculateDistanceMeters } = require('../utils/distance');
const logger = require('../utils/logger');

// Bounding box for Greater Mysuru Region
const MYSURU_BOUNDS = {
  minLat: 12.18,
  maxLat: 12.44,
  minLng: 76.48,
  maxLng: 76.78,
};

class LocationService {
  /**
   * Validates coordinates, checks EXIF mismatch, and determines jurisdiction
   */
  async evaluateLocation(latitude, longitude, exifGps = null) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return {
        jurisdictionStatus: 'LOCATION_UNAVAILABLE',
        locality: 'Mysuru',
        city: 'Mysuru',
        state: 'Karnataka',
        isWithinMysuru: false,
      };
    }

    // Check for Location Mismatch between submitted GPS and embedded EXIF GPS
    if (exifGps && typeof exifGps.latitude === 'number' && typeof exifGps.longitude === 'number') {
      const distance = calculateDistanceMeters(lat, lng, exifGps.latitude, exifGps.longitude);
      if (distance > 500) {
        logger.warn(`Location Mismatch detected: Submitted (${lat}, ${lng}) vs EXIF (${exifGps.latitude}, ${exifGps.longitude}) delta=${Math.round(distance)}m`);
        return {
          jurisdictionStatus: 'LOCATION_MISMATCH',
          locality: 'Mysuru',
          city: 'Mysuru',
          state: 'Karnataka',
          isWithinMysuru: true,
          mismatchDistance: Math.round(distance),
        };
      }
    }

    // Check if within Mysuru bounding box
    const isWithinBounds =
      lat >= MYSURU_BOUNDS.minLat &&
      lat <= MYSURU_BOUNDS.maxLat &&
      lng >= MYSURU_BOUNDS.minLng &&
      lng <= MYSURU_BOUNDS.maxLng;

    if (!isWithinBounds) {
      return {
        jurisdictionStatus: 'LOCATION_OUTSIDE_MYSURU',
        locality: 'Outside Mysuru',
        city: 'Outside Mysuru',
        state: 'Karnataka',
        isWithinMysuru: false,
      };
    }

    // Try reverse geocoding with Nominatim (with fallback to bounds)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2`,
        {
          headers: { 'User-Agent': 'CleanMysuru-AI/1.0' },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && data.address) {
          const address = data.address;
          const city = address.city || address.town || address.village || address.county || 'Mysuru';
          const state = address.state || 'Karnataka';
          const locality = address.suburb || address.neighbourhood || address.residential || address.road || 'Mysuru';
          const isWithinMysuru = city.toLowerCase().includes('mysuru') || city.toLowerCase().includes('mysore');

          return {
            jurisdictionStatus: isWithinMysuru ? 'LOCATION_VALID' : 'LOCATION_OUTSIDE_MYSURU',
            locality,
            city,
            state,
            isWithinMysuru,
          };
        }
      }
    } catch (err) {
      logger.debug('Reverse geocoding timed out or failed, using bounding box validation');
    }

    return {
      jurisdictionStatus: 'LOCATION_VALID',
      locality: 'Mysuru',
      city: 'Mysuru',
      state: 'Karnataka',
      isWithinMysuru: true,
    };
  }
}

module.exports = new LocationService();
