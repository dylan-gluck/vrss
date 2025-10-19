import { dirname, join } from "node:path";
/**
 * PostCSS Configuration for Bun Workspace Monorepo
 *
 * This config explicitly imports plugins from workspace root to handle
 * Bun's dependency hoisting. In a Bun workspace, dependencies are hoisted
 * to /app/node_modules but PostCSS tries to resolve from the app directory.
 *
 * Alternative approaches if this breaks:
 * 1. Use NODE_PATH=/app/node_modules environment variable
 * 2. Install dependencies directly in web package (non-hoisted)
 * 3. Create symlinks in node_modules/ (less portable)
 */
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = join(__dirname, "../..");

// Import plugins from hoisted workspace node_modules
const tailwindcss = await import(join(workspaceRoot, "node_modules/tailwindcss/lib/index.js"));
const autoprefixer = await import(
  join(workspaceRoot, "node_modules/autoprefixer/lib/autoprefixer.js")
);

export default {
  plugins: [tailwindcss.default, autoprefixer.default],
};
