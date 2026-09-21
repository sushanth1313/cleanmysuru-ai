const mongoose = require('mongoose');
const { dbDiagnostics } = require('../config/db');

/**
 * Health check controller with safe, credential-free database diagnostics
 */
function getHealth(req, res) {
  const readyStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const readyState = mongoose.connection.readyState;
  const isConnected = readyState === 1;

  return res.status(200).json({
    status: isConnected ? 'ok' : 'database_disconnected',
    service: 'CleanMysuru AI Backend',
    database: {
      connected: isConnected,
      readyState,
      status: readyStates[readyState] || 'unknown',
      host: mongoose.connection.host || dbDiagnostics.sanitizedHost || null,
      database: mongoose.connection.name || dbDiagnostics.databaseName || null,
      username: dbDiagnostics.username || null,
      recoveredWithFallback: dbDiagnostics.recoveredWithFallback || false,
      sourceEnv: dbDiagnostics.sourceEnv || null,
      errorType: dbDiagnostics.lastError?.name || null,
      errorCode: dbDiagnostics.lastError?.code || null,
      errorMessage: dbDiagnostics.lastError?.message || null,
      failureClassification: dbDiagnostics.failureClass?.class || null,
      failureReason: dbDiagnostics.failureClass?.reason || null,
      attemptCount: dbDiagnostics.attemptCount,
      lastAttempt: dbDiagnostics.lastAttemptTime,
      dns: dbDiagnostics.dnsDiagnostics || null,
    },
    environment: process.env.NODE_ENV || 'development',
  });
}

module.exports = {
  getHealth,
};
