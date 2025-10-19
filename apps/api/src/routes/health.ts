/**
 * Health Check Endpoint with Metrics
 * Provides detailed health status for monitoring and observability
 */

import { Hono } from 'hono';

const health = new Hono();

// Database health check helper
async function checkDatabase(): Promise<boolean> {
  try {
    // TODO: Import prisma client when available
    // const { prisma } = await import('../lib/prisma');
    // await prisma.$queryRaw`SELECT 1`;

    // Placeholder - assume healthy for now
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Basic health check endpoint
 * Returns 200 if service is healthy, 503 if unhealthy
 */
health.get('/health', async (c) => {
  const dbHealthy = await checkDatabase();
  const memoryUsage = process.memoryUsage();

  const healthStatus = {
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memoryUsage.external / 1024 / 1024), // MB
    },
    database: {
      connected: dbHealthy,
    },
  };

  return c.json(healthStatus, dbHealthy ? 200 : 503);
});

/**
 * Readiness probe endpoint
 * Checks if service is ready to accept traffic
 */
health.get('/ready', async (c) => {
  const dbHealthy = await checkDatabase();

  if (!dbHealthy) {
    return c.json(
      {
        ready: false,
        reason: 'Database connection not available',
      },
      503
    );
  }

  return c.json({
    ready: true,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Liveness probe endpoint
 * Simple check that the service is running
 */
health.get('/live', (c) => {
  return c.json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});

export default health;
