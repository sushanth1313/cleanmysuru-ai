const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { ensureMongod } = require('../../scripts/start-mongod');

const seedDefaultUsers = async () => {
  try {
    const User = require('../models/User');
    const defaultUsers = [
      {
        name: 'Farhan Akhtar',
        email: 'citizen@example.com',
        password: 'CitizenPass123!',
        role: 'CITIZEN',
      },
      {
        name: 'MCC Administrator',
        email: 'admin@mysuru.gov.in',
        password: 'AdminPass123!',
        role: 'ADMIN',
      },
    ];

    for (const u of defaultUsers) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        await User.create(u);
        logger.info(`Seeded verified user account: ${u.email} (${u.role})`);
      }
    }
  } catch (err) {
    logger.error('Error verifying default user accounts:', err);
  }
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cleanmysuru_ai';
  const isLocal = uri.includes('127.0.0.1') || uri.includes('localhost');

  // Only spawn local mongod on local development environment
  if (isLocal && process.env.NODE_ENV !== 'production') {
    try {
      await ensureMongod();
    } catch (err) {
      logger.warn(`Local mongod check notice: ${err.message}`);
    }
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    logger.info(`Persistent MongoDB Connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    await seedDefaultUsers();
  } catch (error) {
    logger.error(`FATAL: Persistent MongoDB connection failed: ${error.message}`);
    logger.error('Live mode strictly requires persistent MongoDB on port 27017. Failing clearly without in-memory fallback.');
    process.exit(1);
  }
};

module.exports = connectDB;
