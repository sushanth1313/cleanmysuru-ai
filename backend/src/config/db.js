const mongoose = require('mongoose');
const logger = require('../utils/logger');

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
  let uri = (process.env.MONGODB_URI || '').trim().replace(/^["']|["']$/g, '');
  const isLocal = !uri || uri.includes('127.0.0.1') || uri.includes('localhost');

  if (!uri) {
    uri = 'mongodb://127.0.0.1:27017/cleanmysuru_ai';
  } else if (uri.startsWith('mongodb+srv://') || uri.startsWith('mongodb://')) {
    // Ensure default database name exists if omitted from Atlas connection string
    if (/\.mongodb\.net\/\?/.test(uri)) {
      uri = uri.replace(/\.mongodb\.net\/\?/, '.mongodb.net/cleanmysuru_ai?');
    } else if (/\.mongodb\.net\/?$/.test(uri)) {
      uri = uri.replace(/\.mongodb\.net\/?$/, '.mongodb.net/cleanmysuru_ai');
    }
  }

  // If in production and MONGODB_URI is not provided or points to localhost, log clear instructions
  if (process.env.NODE_ENV === 'production' && (!process.env.MONGODB_URI || isLocal)) {
    logger.error('CRITICAL DATABASE CONFIGURATION: MONGODB_URI is not configured for cloud hosting!');
    logger.error('Please configure MONGODB_URI in your Render Environment Variables with your MongoDB Atlas connection string:');
    logger.error('Example: mongodb+srv://<username>:<password>@<cluster>.mongodb.net/cleanmysuru_ai?retryWrites=true&w=majority');
    throw new Error('MONGODB_URI missing or set to localhost in production environment');
  }

  // Only spawn local mongod on local development environment
  if (isLocal && process.env.NODE_ENV !== 'production') {
    try {
      const { ensureMongod } = require('../../scripts/start-mongod');
      await ensureMongod();
    } catch (err) {
      logger.warn(`Local mongod check notice: ${err.message}`);
    }
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`Persistent MongoDB Connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    await seedDefaultUsers();
  } catch (error) {
    logger.error(`FATAL: MongoDB connection failed: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      logger.error('Please verify your MongoDB Atlas Network Access whitelist (ensure 0.0.0.0/0 is allowed) and credentials.');
    }
    throw error;
  }
};

module.exports = connectDB;
