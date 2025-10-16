/**
 * Volume Persistence Tests
 * Tests that database data survives container restarts
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { execSync } from 'child_process';

const TIMEOUT = 120000; // 120 seconds for Docker operations

describe('Volume Persistence', () => {
  const testTableName = `test_persistence_${Date.now()}`;

  beforeAll(() => {
    // Ensure database is running
    try {
      execSync('docker-compose up -d db', { timeout: 30000 });
      // Wait for database to be ready
      let retries = 10;
      while (retries > 0) {
        try {
          execSync('docker-compose exec -T db pg_isready -U vrss_user -d vrss', {
            timeout: 5000,
          });
          break;
        } catch {
          retries--;
          if (retries === 0) throw new Error('Database did not become ready');
          execSync('sleep 2');
        }
      }
    } catch (error) {
      console.error('Failed to start database:', error);
      throw error;
    }
  });

  it('should persist database data across container restarts', async () => {
    // Step 1: Create a test table with data
    try {
      execSync(
        `docker-compose exec -T db psql -U vrss_user -d vrss -c "CREATE TABLE IF NOT EXISTS ${testTableName} (id SERIAL PRIMARY KEY, data TEXT);"`,
        { timeout: 10000 }
      );

      execSync(
        `docker-compose exec -T db psql -U vrss_user -d vrss -c "INSERT INTO ${testTableName} (data) VALUES ('test_data_persistence');"`,
        { timeout: 10000 }
      );
    } catch (error) {
      throw new Error(`Failed to create test data: ${error}`);
    }

    // Step 2: Restart the database container
    try {
      console.log('Restarting database container...');
      execSync('docker-compose restart db', { timeout: 30000 });

      // Wait for database to be ready again
      let retries = 10;
      while (retries > 0) {
        try {
          execSync('docker-compose exec -T db pg_isready -U vrss_user -d vrss', {
            timeout: 5000,
          });
          break;
        } catch {
          retries--;
          if (retries === 0) throw new Error('Database did not restart properly');
          execSync('sleep 2');
        }
      }
    } catch (error) {
      throw new Error(`Failed to restart database: ${error}`);
    }

    // Step 3: Verify data still exists
    try {
      const output = execSync(
        `docker-compose exec -T db psql -U vrss_user -d vrss -c "SELECT data FROM ${testTableName} WHERE data = 'test_data_persistence';"`,
        { timeout: 10000 }
      ).toString();

      expect(output).toContain('test_data_persistence');
    } catch (error) {
      throw new Error(`Failed to verify data persistence: ${error}`);
    }

    // Cleanup: Drop test table
    try {
      execSync(
        `docker-compose exec -T db psql -U vrss_user -d vrss -c "DROP TABLE IF EXISTS ${testTableName};"`,
        { timeout: 10000 }
      );
    } catch (error) {
      console.warn('Failed to cleanup test table:', error);
    }
  }, TIMEOUT);

  it('should have persistent volume mounted', () => {
    const volumeOutput = execSync('docker volume ls').toString();
    expect(volumeOutput).toContain('vrss_postgres_data');
  }, TIMEOUT);

  it('should have media storage volume mounted', () => {
    const volumeOutput = execSync('docker volume ls').toString();
    expect(volumeOutput).toContain('vrss_media_storage');
  }, TIMEOUT);

  it('should have backend logs volume mounted', () => {
    const volumeOutput = execSync('docker volume ls').toString();
    expect(volumeOutput).toContain('vrss_backend_logs');
  }, TIMEOUT);

  it('should have frontend node_modules volume mounted', () => {
    const volumeOutput = execSync('docker volume ls').toString();
    expect(volumeOutput).toContain('vrss_frontend_node_modules');
  }, TIMEOUT);
});
