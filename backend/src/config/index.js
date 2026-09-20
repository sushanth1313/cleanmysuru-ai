const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'cleanmysuru_jwt_secret_dev_key_2025',
  ai: {
    provider: process.env.AI_PROVIDER || 'gemini',
    apiKey: process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '',
    model: process.env.AI_MODEL || 'gemini-3.5-flash-lite',
  },
  upload: {
    dir: path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || './uploads'),
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
    allowedVideoTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
  },
};

module.exports = config;
