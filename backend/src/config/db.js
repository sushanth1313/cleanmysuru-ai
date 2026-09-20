const mongoose = require('mongoose');
const dns = require('dns');
const logger = require('../utils/logger');

// Prefer IPv4 in Node.js DNS resolution to prevent cloud container IPv6 stalls
if (typeof dns.setDefaultResultOrder === 'function') {
  try {
    dns.setDefaultResultOrder('ipv4first');
  } catch (_) {}
}

// In-memory diagnostic tracker (NEVER stores passwords, tokens, or credentials)
const dbDiagnostics = {
  attemptCount: 0,
  lastAttemptTime: null,
  connected: false,
  connecting: false,
  sourceEnv: null,
  sanitizedHost: null,
  databaseName: null,
  dnsDiagnostics: null,
  lastError: null,
  failureClass: null,
  rawScheme: null,
};

function resolveMongoUri() {
  const sources = [
    { name: 'MONGODB_URI', val: process.env.MONGODB_URI },
    { name: 'DATABASE_URL', val: process.env.DATABASE_URL },
    { name: 'MONGO_URI', val: process.env.MONGO_URI },
    { name: 'MONGODB_URL', val: process.env.MONGODB_URL },
  ];

  for (const src of sources) {
    if (src.val && typeof src.val === 'string') {
      const trimmed = src.val.trim().replace(/^["']|["']$/g, '');
      if (trimmed.startsWith('mongodb://') || trimmed.startsWith('mongodb+srv://')) {
        return { sourceEnv: src.name, uri: trimmed };
      }
    }
  }

  // If MONGODB_URI exists but doesn't start with mongodb://
  if (process.env.MONGODB_URI) {
    return {
      sourceEnv: 'MONGODB_URI',
      uri: process.env.MONGODB_URI.trim().replace(/^["']|["']$/g, ''),
    };
  }

  return { sourceEnv: null, uri: null };
}

function parseSanitizedUri(rawUri) {
  if (!rawUri || typeof rawUri !== 'string') {
    return { exists: false, scheme: null, host: null, database: null, error: 'Empty URI' };
  }

  const schemeMatch = rawUri.match(/^(mongodb(?:\+srv)?):\/\//i);
  if (!schemeMatch) {
    return { exists: true, scheme: 'invalid', host: null, database: null, error: 'Scheme must be mongodb:// or mongodb+srv://' };
  }

  const scheme = schemeMatch[1].toLowerCase();
  const withoutScheme = rawUri.slice(schemeMatch[0].length);

  let hostAndPath = withoutScheme;
  const atIndex = withoutScheme.lastIndexOf('@');
  if (atIndex !== -1) {
    hostAndPath = withoutScheme.slice(atIndex + 1);
  }

  let host = hostAndPath;
  let database = null;

  const slashIndex = hostAndPath.indexOf('/');
  const questionIndex = hostAndPath.indexOf('?');

  if (slashIndex !== -1) {
    host = hostAndPath.slice(0, slashIndex);
    const afterSlash = hostAndPath.slice(slashIndex + 1);
    const qIndex = afterSlash.indexOf('?');
    database = qIndex !== -1 ? afterSlash.slice(0, qIndex) : afterSlash;
  } else if (questionIndex !== -1) {
    host = hostAndPath.slice(0, questionIndex);
  }

  return {
    exists: true,
    scheme,
    host: host || null,
    database: database || null,
  };
}

async function checkDns(host) {
  if (!host) return null;
  const results = { host, isSrv: host.includes('mongodb.net'), srvResolved: false, records: [], error: null };
  if (!results.isSrv) return results;

  try {
    const srvHost = `_mongodb._tcp.${host}`;
    const srv = await dns.promises.resolveSrv(srvHost);
    results.srvResolved = true;
    results.records = srv.map(s => `${s.name}:${s.port}`);
  } catch (err) {
    results.error = { code: err.code, message: err.message };
  }
  return results;
}

function classifyError(err, dnsResult) {
  if (!err) return null;
  const name = err.name || '';
  const message = err.message || '';
  const code = err.code || null;

  if (dnsResult && dnsResult.isSrv && !dnsResult.srvResolved && dnsResult.error) {
    return {
      class: 'A_DNS_SRV_RESOLUTION_FAILURE',
      reason: `DNS failed to resolve SRV record for ${dnsResult.host}: ${dnsResult.error.code} (${dnsResult.error.message})`,
    };
  }
  if (name === 'MongoServerError' && (code === 18 || message.includes('auth') || message.includes('Authentication failed'))) {
    return {
      class: 'C_AUTHENTICATION_FAILURE',
      reason: 'Authentication failed. Check username and password in Render MONGODB_URI.',
    };
  }
  if (name === 'MongoParseError') {
    return {
      class: 'E_MALFORMED_URI',
      reason: 'MongoDB URI is malformed: ' + message,
    };
  }
  if (message.includes('SSL') || message.includes('TLS') || message.includes('certificate') || message.includes('cert')) {
    return {
      class: 'D_TLS_CERTIFICATE_FAILURE',
      reason: 'TLS / SSL handshake failure: ' + message,
    };
  }
  if (name === 'MongooseServerSelectionError' || name === 'MongoServerSelectionError') {
    return {
      class: 'B_OR_H_ATLAS_NETWORK_ACCESS_OR_TIMEOUT',
      reason: 'Server selection timed out. The cluster was resolved via DNS, but replica set nodes did not respond in time (check Atlas Network Access 0.0.0.0/0 or cluster paused status).',
    };
  }
  return {
    class: 'UNKNOWN_FAILURE',
    reason: `${name}: ${message}`,
  };
}

const connectDB = async () => {
  dbDiagnostics.attemptCount++;
  dbDiagnostics.lastAttemptTime = new Date().toISOString();
  dbDiagnostics.connecting = true;

  const { sourceEnv, uri } = resolveMongoUri();
  dbDiagnostics.sourceEnv = sourceEnv;

  const isProd = process.env.NODE_ENV === 'production';

  // Rule 5: Do not use hardcoded localhost in production. Fail clearly if missing.
  if (isProd && (!uri || uri.includes('127.0.0.1') || uri.includes('localhost'))) {
    const errorMsg = 'No cloud MongoDB URI configured in production environment! Set MONGODB_URI in Render dashboard.';
    logger.error(`[DB-CONFIG-ERROR] ${errorMsg}`);
    dbDiagnostics.failureClass = {
      class: 'G_ENVIRONMENT_VARIABLE_NOT_LOADED',
      reason: errorMsg,
    };
    dbDiagnostics.connecting = false;
    throw new Error(errorMsg);
  }

  // Local dev fallback only
  const connectionUri = uri || 'mongodb://127.0.0.1:27017/cleanmysuru_ai';
  const parsed = parseSanitizedUri(connectionUri);
  dbDiagnostics.rawScheme = parsed.scheme;
  dbDiagnostics.sanitizedHost = parsed.host;
  dbDiagnostics.databaseName = parsed.database || 'cleanmysuru_ai';

  logger.info(`[DB-DIAGNOSTIC] Attempt #${dbDiagnostics.attemptCount} connecting to host: ${parsed.host || 'unknown'}, database: ${dbDiagnostics.databaseName}, envSource: ${sourceEnv || 'fallback-local'}, scheme: ${parsed.scheme}`);

  // Safe DNS check
  dbDiagnostics.dnsDiagnostics = await checkDns(parsed.host);

  try {
    const conn = await mongoose.connect(connectionUri, {
      serverSelectionTimeoutMS: 5000,
      dbName: dbDiagnostics.databaseName,
    });

    dbDiagnostics.connected = true;
    dbDiagnostics.connecting = false;
    dbDiagnostics.lastError = null;
    dbDiagnostics.failureClass = null;

    logger.info(`[DB-SUCCESS] MongoDB Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    return conn;
  } catch (err) {
    dbDiagnostics.connected = false;
    dbDiagnostics.connecting = false;
    dbDiagnostics.lastError = {
      name: err.name,
      message: err.message,
      code: err.code || null,
    };
    dbDiagnostics.failureClass = classifyError(err, dbDiagnostics.dnsDiagnostics);

    logger.error(`[DB-ERROR] Connection attempt #${dbDiagnostics.attemptCount} failed [${dbDiagnostics.failureClass?.class}]: ${err.name} - ${err.message}`);
    throw err;
  }
};

module.exports = { connectDB, dbDiagnostics };
