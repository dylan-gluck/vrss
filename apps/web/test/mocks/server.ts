import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * Mock Service Worker server for Node environment (tests)
 * Intercepts API calls and returns mock responses
 */
export const server = setupServer(...handlers);
