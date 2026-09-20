const sharp = require('sharp');
const fs = require('fs');
const exifr = require('exifr');
const logger = require('../utils/logger');

class ImageService {
  /**
   * Extracts EXIF GPS data if available
   */
  async extractExifGps(filePath) {
    try {
      if (!fs.existsSync(filePath)) return null;
      const gps = await exifr.gps(filePath);
      if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
        logger.info(`Extracted EXIF GPS: lat=${gps.latitude}, lng=${gps.longitude}`);
        return {
          latitude: gps.latitude,
          longitude: gps.longitude,
        };
      }
      return null;
    } catch (err) {
      logger.debug('No EXIF GPS found or could not read EXIF', { error: err.message });
      return null;
    }
  }

  /**
   * Evaluates image quality (dimensions, brightness, blur/sharpness, overexposure)
   */
  async assessQuality(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return {
          imageQuality: 'POOR',
          verificationRequired: true,
          metrics: {},
          reason: 'Evidence file not accessible on disk.',
        };
      }

      const image = sharp(filePath);
      const metadata = await image.metadata();
      const stats = await image.stats();

      const { width = 0, height = 0 } = metadata;
      const channelMeans = stats.channels.map((c) => c.mean);
      const brightness = channelMeans.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(channelMeans.length, 3);
      const luminanceStdDev = stats.channels[0]?.stdev || 0;

      const isExtremelySmall = width < 300 || height < 300;
      const isSmall = width < 600 || height < 600;
      const isVeryDark = brightness < 45;
      const isDim = brightness < 80;
      const isOverexposed = brightness > 235;
      const isVeryBlurry = luminanceStdDev < 18;
      const isSlightlyBlurry = luminanceStdDev < 30;

      const metrics = {
        width,
        height,
        brightness: Math.round(brightness),
        contrast: Math.round(luminanceStdDev),
        format: metadata.format,
      };

      if (isExtremelySmall || isVeryDark || isVeryBlurry || isOverexposed) {
        let reason = 'Low image quality reduces analytical certainty.';
        if (isVeryDark) reason = 'Evidence is too dark / low-light for clear municipal assessment.';
        else if (isOverexposed) reason = 'Evidence is severely overexposed/washed out.';
        else if (isVeryBlurry) reason = 'Blurry evidence obscures debris and container features.';
        else if (isExtremelySmall) reason = 'Resolution is below the analytical minimum (300x300).';

        return {
          imageQuality: 'POOR',
          metrics,
          verificationRequired: true,
          reason,
        };
      }

      if (isSmall || isDim || isSlightlyBlurry) {
        return {
          imageQuality: 'FAIR',
          metrics,
          verificationRequired: false,
          reason: isDim ? 'Sub-optimal lighting detected.' : 'Moderate sharpness detected.',
        };
      }

      return {
        imageQuality: 'GOOD',
        metrics,
        verificationRequired: false,
      };
    } catch (error) {
      logger.warn('Failed to assess image quality with Sharp', { error: error.message });
      return {
        imageQuality: 'FAIR',
        metrics: {},
        verificationRequired: false,
        reason: 'Image quality assessed via fallback.',
      };
    }
  }

  /**
   * Computes a 64-bit difference hash (dHash) for perceptual similarity comparison
   */
  async computePerceptualHash(filePath) {
    try {
      const buffer = await sharp(filePath)
        .grayscale()
        .resize(9, 8, { fit: 'fill' })
        .raw()
        .toBuffer();

      let hash = '';
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const leftPixel = buffer[row * 9 + col];
          const rightPixel = buffer[row * 9 + col + 1];
          hash += leftPixel > rightPixel ? '1' : '0';
        }
      }
      return hash;
    } catch (error) {
      logger.warn('Failed to compute perceptual hash', { error: error.message });
      return '0'.repeat(64);
    }
  }

  /**
   * Compares two 64-bit binary hashes and returns similarity percentage (0 - 100)
   */
  compareHashes(hash1, hash2) {
    if (!hash1 || !hash2 || hash1.length !== hash2.length) return 0;
    let matchingBits = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] === hash2[i]) matchingBits++;
    }
    return Math.round((matchingBits / hash1.length) * 100);
  }
}

module.exports = new ImageService();
