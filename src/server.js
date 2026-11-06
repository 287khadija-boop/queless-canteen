import { app } from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.PORT, () => {
  console.log('='.repeat(65));
  console.log(`🚀 Quesless Campus — Canteen Pre-Order & Queue Management`);
  console.log(`🏫 Institution : ${env.CAMPUS_NAME}`);
  console.log(`🌐 Server URL  : http://localhost:${env.PORT}`);
  console.log(`⏰ Canteen Hrs : ${env.CANTEEN_OPEN_TIME} to ${env.CANTEEN_CLOSE_TIME} (${env.CANTEEN_TIMEZONE})`);
  console.log(`⚙️  Environment : ${env.NODE_ENV}`);
  console.log('='.repeat(65));
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${env.PORT} is already in use by another process.`);
    console.error(`   The website is likely already running! Check http://localhost:${env.PORT} in your browser.`);
    console.error(`   To restart, close the running terminal window or kill the existing process on port ${env.PORT}.\n`);
    process.exit(1);
  } else {
    throw err;
  }
});

// Graceful shutdown handling
function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Gracefully closing server...`);
  server.close(() => {
    console.log('HTTP server closed cleanly.');
    process.exit(0);
  });

  // Force shutdown after timeout if pending connections hang
  setTimeout(() => {
    console.error('Forcefully terminating process after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
