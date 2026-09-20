/**
 * Persistent MongoDB Process Manager
 * Starts standalone mongod.exe on port 27017 using disk-backed dbpath: backend/data/db
 * This is a true persistent database service, NOT an in-memory server.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');

const DB_PORT = 27017;
const DB_PATH = path.resolve(__dirname, '../data/db');
const MONGOD_BIN = path.resolve(
  __dirname,
  '../node_modules/.cache/mongodb-memory-server/mongod-x64-win32-8.2.6.exe'
);

function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function ensureMongod() {
  const isOpen = await isPortOpen(DB_PORT);
  if (isOpen) {
    console.log(`[MONGOD] MongoDB is already running on port ${DB_PORT}`);
    return;
  }

  if (!fs.existsSync(MONGOD_BIN)) {
    console.error(`[MONGOD] Error: mongod binary not found at ${MONGOD_BIN}`);
    process.exit(1);
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DB_PATH, { recursive: true });
  }

  console.log(`[MONGOD] Starting persistent mongod on port ${DB_PORT}...`);
  console.log(`[MONGOD] Data directory: ${DB_PATH}`);

  const mongodProc = spawn(
    MONGOD_BIN,
    ['--dbpath', DB_PATH, '--port', String(DB_PORT), '--bind_ip', '127.0.0.1'],
    {
      detached: true,
      stdio: 'ignore',
    }
  );

  mongodProc.unref();

  // Wait up to 10 seconds for mongod to accept connections
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await isPortOpen(DB_PORT)) {
      console.log(`[MONGOD] Persistent MongoDB started successfully on 127.0.0.1:${DB_PORT}`);
      return;
    }
  }

  console.error('[MONGOD] Timed out waiting for mongod to listen on port 27017');
  process.exit(1);
}

if (require.main === module) {
  ensureMongod().then(() => {
    process.exit(0);
  });
}

module.exports = { ensureMongod, isPortOpen, DB_PORT, DB_PATH };
