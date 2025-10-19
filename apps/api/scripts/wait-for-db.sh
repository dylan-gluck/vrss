#!/bin/sh
# ==============================================================================
# Database Connection Health Check Script
# ==============================================================================
# Waits for PostgreSQL database to be ready before proceeding.
# Used by test runners and deployment scripts to ensure database is available.
#
# Usage:
#   ./wait-for-db.sh [max_retries] [retry_interval]
#
# Arguments:
#   max_retries     - Maximum number of connection attempts (default: 30)
#   retry_interval  - Seconds to wait between attempts (default: 2)
#
# Environment Variables:
#   DATABASE_URL    - Full PostgreSQL connection string (priority)
#   DB_HOST         - Database host (default: localhost)
#   DB_PORT         - Database port (default: 5432)
#   DB_NAME         - Database name (default: vrss)
#   DB_USER         - Database user (default: vrss_user)
#   DB_PASSWORD     - Database password (default: vrss_dev_password)
#
# Exit Codes:
#   0 - Database connection successful
#   1 - Connection failed after max retries
# ==============================================================================

set -e

# Configuration
MAX_RETRIES="${1:-30}"
RETRY_INTERVAL="${2:-2}"

echo "⏳ Waiting for database to be ready..."
echo "   Max retries: $MAX_RETRIES"
echo "   Retry interval: ${RETRY_INTERVAL}s"

# Build connection test command
CONNECTION_TEST="import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); await prisma.\$connect(); await prisma.\$disconnect(); console.log('✅ Database connected');"

# Retry loop
retry_count=0

until bun run -e "$CONNECTION_TEST" 2>/dev/null || [ $retry_count -eq $MAX_RETRIES ]; do
  retry_count=$((retry_count + 1))
  echo "⏳ Waiting for database... (attempt $retry_count/$MAX_RETRIES)"
  sleep $RETRY_INTERVAL
done

# Check if we exceeded max retries
if [ $retry_count -eq $MAX_RETRIES ]; then
  echo "❌ Failed to connect to database after $MAX_RETRIES attempts"
  echo ""
  echo "Troubleshooting:"
  echo "  1. Verify database container is running: docker ps"
  echo "  2. Check database logs: docker-compose logs db"
  echo "  3. Verify DATABASE_URL or DB_* environment variables"
  echo "  4. Ensure network connectivity between containers"
  exit 1
fi

echo "✅ Database ready (connected after $retry_count attempt(s))"
exit 0
