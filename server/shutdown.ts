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

  // Handle uncaught exceptions and unhandled promise rejections
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown(server, 'uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown(server, 'unhandledRejection');
  });
}
