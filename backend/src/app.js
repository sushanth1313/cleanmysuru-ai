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

// Enable CORS with credentials
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin === config.frontendUrl ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

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
