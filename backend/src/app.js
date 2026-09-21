const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const config = require('./config');
const healthRoutes = require('./routes/health.routes');
const analyzeRoutes = require('./routes/analyze.routes');
const complaintsRoutes = require('./routes/complaints.routes');
const incidentsRoutes = require('./routes/incidents.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const mapRoutes = require('./routes/map.routes');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const notificationRoutes = require('./routes/notifications.routes');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

const app = express();

// Robust CORS options supporting Vercel production, preview deployments, and local development
const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'https://cleanmysuru-ai-rfcj.vercel.app',
      'https://cleanmysuruai.vercel.app',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ];

    if (config.frontendUrl) {
      config.frontendUrl.split(',').forEach((u) => {
        const cleanUrl = u.trim().replace(/\/+$/, '');
        if (cleanUrl && !allowedOrigins.includes(cleanUrl)) {
          allowedOrigins.push(cleanUrl);
        }
      });
    }

    const isExplicitAllowed = allowedOrigins.includes(origin);
    const isLocalhost = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
    const isVercel = origin.endsWith('.vercel.app');

    if (isExplicitAllowed || isLocalhost || isVercel) {
      return callback(null, true);
    }

    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Minimal non-sensitive request logger for observability
app.use((req, res, next) => {
  const origin = req.headers.origin || 'no-origin';
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} | Origin: ${origin}`);
  next();
});

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Serve uploaded files statically
app.use('/uploads', express.static(config.upload.dir));

// Canonical API Routes
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintsRoutes); // Canonical complaint route
app.use('/api/incidents', incidentsRoutes);   // Compatibility alias
app.use('/api/analyze', analyzeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/admin', adminRoutes);

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
