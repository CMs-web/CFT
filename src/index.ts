import { createApp } from './app';
import { config } from './config';
import { SHUTDOWN_TIMEOUT_MS } from './constants';
import { db } from './db';
import { logger } from './logger';

const server = createApp().listen(config.port, (): void => {
  logger.info(`Server listening on http://localhost:${config.port}`);
});

let isShuttingDown = false;

function shutdown(signal: NodeJS.Signals): void {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info(`${signal} received, shutting down`);

  server.closeIdleConnections();

  const forceExitTimer = setTimeout((): void => {
    logger.error('Shutdown timed out', new Error('Shutdown timeout'));
    server.closeAllConnections();
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref();

  server.close((error?: Error): void => {
    clearTimeout(forceExitTimer);

    if (error !== undefined) {
      logger.error('Failed to close the HTTP server:', error);
      process.exit(1);
    }

    void closeDatabase();
  });
}

async function closeDatabase(): Promise<void> {
  try {
    await db.end();
    process.exit(0);
  } catch (error: unknown) {
    logger.error('Failed to close the database pool:', error);
    process.exit(1);
  }
}

process.on('SIGINT', (): void => {
  shutdown('SIGINT');
});

process.on('SIGTERM', (): void => {
  shutdown('SIGTERM');
});
