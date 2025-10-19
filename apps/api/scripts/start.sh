#!/bin/sh
set -e

echo "🚀 Starting VRSS Backend API..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
max_retries=30
retry_count=0

until bun run -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); await prisma.\$connect(); await prisma.\$disconnect(); console.log('✅ Database connected');" 2>/dev/null || [ $retry_count -eq $max_retries ]; do
  retry_count=$((retry_count + 1))
  echo "⏳ Waiting for database... (attempt $retry_count/$max_retries)"
  sleep 2
done

if [ $retry_count -eq $max_retries ]; then
  echo "❌ Failed to connect to database after $max_retries attempts"
  exit 1
fi

# Run database migrations
echo "🔄 Running database migrations..."
bun run db:migrate:deploy

echo "✅ Migrations complete"

# Start the application
echo "🎉 Starting application..."
exec "$@"
