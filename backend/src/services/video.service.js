const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

class VideoService {
  getFFmpegPath() {
    try {
      const installer = require('@ffmpeg-installer/ffmpeg');
      if (installer && installer.path && fs.existsSync(installer.path)) {
        return installer.path;
      }
    } catch {}
    return 'ffmpeg';
  }

  /**
   * Checks if ffmpeg is available on the host
   */
  async isFFmpegAvailable() {
    const ffmpegPath = this.getFFmpegPath();
    return new Promise((resolve) => {
      const proc = spawn(ffmpegPath, ['-version']);
      proc.on('error', () => resolve(false));
      proc.on('close', (code) => resolve(code === 0));
    });
  }

  /**
   * Extracts approximately 4-5 representative frames from an MP4 video file
   */
  async extractRepresentativeFrames(videoPath, outputDir, frameCount = 4) {
    const ffmpegAvailable = await this.isFFmpegAvailable();

    if (!ffmpegAvailable) {
      logger.error('FFmpeg is not installed or accessible on the host.');
      return {
        success: false,
        frames: [],
        reason: 'FFmpeg unavailable on host environment. Video processing failed.',
      };
    }

    if (!fs.existsSync(videoPath)) {
      return {
        success: false,
        frames: [],
        reason: 'Source video file does not exist on disk.',
      };
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
      const baseName = path.basename(videoPath, path.extname(videoPath));
      const extractedFrames = [];
      const framePattern = path.join(outputDir, `${baseName}_frame_%03d.jpg`);
      const ffmpegPath = this.getFFmpegPath();

      return new Promise((resolve) => {
        const proc = spawn(ffmpegPath, [
          '-i', videoPath,
          '-vf', 'fps=1,scale=640:-1',
          '-vframes', String(frameCount),
          '-q:v', '2',
          framePattern,
          '-y',
        ]);

        proc.on('error', (err) => {
          logger.error('FFmpeg execution error', { error: err.message });
          resolve({
            success: false,
            frames: [],
            reason: `FFmpeg execution failed: ${err.message}`,
          });
        });

        proc.on('close', (code) => {
          if (code === 0) {
            for (let i = 1; i <= frameCount; i++) {
              const frameFile = path.join(outputDir, `${baseName}_frame_${String(i).padStart(3, '0')}.jpg`);
              if (fs.existsSync(frameFile)) {
                extractedFrames.push(frameFile);
              }
            }

            if (extractedFrames.length === 0) {
              resolve({
                success: false,
                frames: [],
                reason: 'No frames were extracted from video file.',
              });
              return;
            }

            logger.info(`Extracted ${extractedFrames.length} representative frames from ${videoPath}`);
            resolve({
              success: true,
              frames: extractedFrames,
            });
          } else {
            resolve({
              success: false,
              frames: [],
              reason: `FFmpeg exited with non-zero exit code ${code}`,
            });
          }
        });
      });
    } catch (error) {
      logger.error('Unexpected error during video frame extraction', { error: error.message });
      return {
        success: false,
        frames: [],
        reason: `Video frame extraction failed: ${error.message}`,
      };
    }
  }
}

module.exports = new VideoService();
