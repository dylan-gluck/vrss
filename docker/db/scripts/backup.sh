#!/bin/sh
# Database backup script for VRSS
# Creates timestamped backups and manages retention

set -e

# Configuration
BACKUP_DIR="/backup"
RETENTION_DAYS=7
DB_HOST="${POSTGRES_HOST:-db}"
DB_NAME="${POSTGRES_DB:-vrss}"
DB_USER="${POSTGRES_USER:-vrss_user}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/vrss_${TIMESTAMP}.sql"

echo "Starting database backup..."
echo "Database: ${DB_NAME}"
echo "Host: ${DB_HOST}"
echo "Timestamp: ${TIMESTAMP}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Create backup
pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -F p -f "${BACKUP_FILE}"

# Compress backup
gzip "${BACKUP_FILE}"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Verify backup was created
if [ -f "${BACKUP_FILE}" ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "Backup created successfully: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
    echo "ERROR: Backup file was not created"
    exit 1
fi

# Clean up old backups
echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "vrss_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
REMAINING_BACKUPS=$(find "${BACKUP_DIR}" -name "vrss_*.sql.gz" | wc -l)
echo "Remaining backups: ${REMAINING_BACKUPS}"

echo "Backup completed successfully"
