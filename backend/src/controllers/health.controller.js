const mongoose = require('mongoose');

/**
 * Health check controller with database connectivity diagnostics
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
      status: readyStates[readyState] || 'unknown',
      connected: isConnected,
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null,
    },
    environment: process.env.NODE_ENV || 'development',
  });
}

module.exports = {
  getHealth,
};
