import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * MSW server for intercepting HTTP requests in tests
 * Configured with handlers for all RPC endpoints
 */
export const server = setupServer(...handlers);
