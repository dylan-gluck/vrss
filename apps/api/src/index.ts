/**
 * VRSS API Server Entry Point
 * Bun + Hono RPC-style API
 */

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { createRPCRouter } from './rpc';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'vrss-api'
  });
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'VRSS API',
    version: '0.1.0',
    description: 'RPC-style API for VRSS Social Platform'
  });
});

// Mount RPC router
app.route('/api/rpc', createRPCRouter());

// Start server
const port = parseInt(process.env.PORT || '3001', 10);

export default {
  port,
  fetch: app.fetch,
};

console.log(`🚀 VRSS API running on port ${port}`);
