#!/bin/sh
# Database restore script for VRSS
# Restores database from a backup file

set -e

# Configuration
BACKUP_DIR="/backup"
DB_HOST="${POSTGRES_HOST:-db}"
DB_NAME="${POSTGRES_DB:-vrss}"
DB_USER="${POSTGRES_USER:-vrss_user}"

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file>"
    echo ""
    echo "Available backups:"
    ls -lh "${BACKUP_DIR}"/*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "${BACKUP_FILE}" ]; then
    echo "ERROR: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

echo "WARNING: This will overwrite the current database!"
echo "Database: ${DB_NAME}"
echo "Host: ${DB_HOST}"
echo "Backup file: ${BACKUP_FILE}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

echo "Starting database restore..."

# Decompress if needed
if [ "${BACKUP_FILE##*.}" = "gz" ]; then
    echo "Decompressing backup..."
    gunzip -c "${BACKUP_FILE}" | psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}"
else
    psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -f "${BACKUP_FILE}"
fi

echo "Database restored successfully"
