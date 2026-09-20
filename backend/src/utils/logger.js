const logger = {
  info: (msg, meta = {}) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${msg}`, Object.keys(meta).length ? meta : '');
  },
  warn: (msg, meta = {}) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${msg}`, Object.keys(meta).length ? meta : '');
  },
  error: (msg, err = {}) => {
    const errorDetails = err instanceof Error ? { message: err.message, stack: err.stack } : err;
    console.error(`[ERROR] [${new Date().toISOString()}] ${msg}`, errorDetails);
  },
  debug: (msg, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] [${new Date().toISOString()}] ${msg}`, meta);
    }
  },
};

module.exports = logger;
