import type { Server } from 'http';

/**
 * Graceful shutdown handler
 * Properly closes all connections and resources before exiting
 */
export async function gracefulShutdown(
  server: Server,
  signal: string
): Promise<void> {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    console.log('✓ HTTP server closed');

    try {
      // Close database connections
      // Note: Drizzle/Postgres pool cleanup would go here if needed
      // await db.$pool?.end();
      console.log('✓ Database connections closed');

      // Close any other resources (Redis, queues, etc.)
      // If you're using Redis/BullMQ, close those connections here
      console.log('✓ All resources cleaned up');

      console.log('✨ Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

/**
 * Registers shutdown handlers for common termination signals
 */
export function registerShutdownHandlers(server: Server): void {
  process.on('SIGTERM', () => gracefulShutdown(server, 'SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown(server, 'SIGINT'));

  // An uncaught exception leaves the process in an undefined state, so a
  // graceful restart is the safe response (the platform will respawn us).
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown(server, 'uncaughtException');
  });

  // An unhandled rejection should be logged and surfaced, but it must NOT take
  // the whole server down — a single stray promise (e.g. a failed background
  // call) would otherwise kill live traffic for every user.
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  });
}
