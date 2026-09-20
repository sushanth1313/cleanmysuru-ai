const app = require('./app');
const config = require('./config');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

const host = '0.0.0.0';
const server = app.listen(config.port, host, () => {
  logger.info(`CleanMysuru AI Backend running on http://${host}:${config.port}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Upload directory: ${config.upload.dir}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${config.port} is already in use. Please terminate the conflicting process.`);
  } else {
    logger.error('Backend server error:', err);
  }
});

// Connect to MongoDB
connectDB()
  .then(() => {
    logger.info('Database connection established successfully.');
  })
  .catch((err) => {
    logger.error('Database connection failed during startup:', err.message);
    if (process.env.NODE_ENV !== 'production') {
      logger.error('Exiting local dev because persistent local MongoDB is required.');
      process.exit(1);
    } else {
      logger.warn('Production server remaining alive for health checks. Please check MONGODB_URI in Render dashboard.');
    }
  });

// Graceful shutdown handling
const shutdown = async () => {
  logger.info('Shutting down CleanMysuru AI backend gracefully...');
  server.close(async () => {
    try {
      const mongoose = require('mongoose');
      await mongoose.connection.close();
      logger.info('MongoDB connection closed.');
      process.exit(0);
    } catch (err) {
      logger.error('Error closing database connection', err);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
});


