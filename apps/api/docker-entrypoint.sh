#!/bin/sh
set -e

echo "🚀 VRSS Backend - Development Entrypoint"

# Navigate to workspace root
cd /app

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  bun install --ignore-scripts
  cd /app/packages/api-contracts && bun run build
  cd /app
fi

# Navigate to API directory
cd /app/apps/api

# Always generate Prisma client to pick up schema changes
echo "⚙️  Generating Prisma client..."
bunx prisma generate > /dev/null 2>&1 || echo "⚠️  Prisma generation failed"

echo "✅ Ready!"

# Execute the main command
exec "$@"
