/**
 * Infrastructure Health Check Tests
 * Tests that all Docker services are healthy and reachable
 */

import { describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";

const TIMEOUT = 60000; // 60 seconds for Docker operations

describe("Service Health Checks", () => {
  it(
    "should have PostgreSQL database running and healthy",
    async () => {
      // Check if postgres container is running
      const psOutput = execSync("docker-compose ps -q db").toString().trim();
      expect(psOutput).toBeTruthy();

      // Check database health
      try {
        const healthCheck = execSync("docker-compose exec -T db pg_isready -U vrss_user -d vrss", {
          timeout: 10000,
        }).toString();

        expect(healthCheck).toContain("accepting connections");
      } catch (error) {
        throw new Error(`PostgreSQL health check failed: ${error}`);
      }
    },
    TIMEOUT
  );

  it(
    "should have backend API running and healthy",
    async () => {
      // Check if backend container is running
      const psOutput = execSync("docker-compose ps -q backend").toString().trim();
      expect(psOutput).toBeTruthy();

      // Check backend health endpoint
      try {
        const response = await fetch("http://localhost:3000/health");
        expect(response.ok).toBe(true);

        const data = await response.json();
        expect(data).toHaveProperty("status");
        expect(data.status).toBe("healthy");
      } catch (error) {
        throw new Error(`Backend health check failed: ${error}`);
      }
    },
    TIMEOUT
  );

  it(
    "should have frontend running and reachable",
    async () => {
      // Check if frontend container is running
      const psOutput = execSync("docker-compose ps -q frontend").toString().trim();
      expect(psOutput).toBeTruthy();

      // Check frontend is serving content
      try {
        const response = await fetch("http://localhost:5173");
        expect(response.ok).toBe(true);
        expect(response.headers.get("content-type")).toContain("html");
      } catch (error) {
        throw new Error(`Frontend health check failed: ${error}`);
      }
    },
    TIMEOUT
  );

  it(
    "should have all services up according to docker-compose ps",
    () => {
      const output = execSync("docker-compose ps --format json").toString();
      const services = output
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));

      // Check that we have at least 3 services running (db, backend, frontend)
      expect(services.length).toBeGreaterThanOrEqual(3);

      // Check that all services are running
      for (const service of services) {
        expect(service.State).toBe("running");
      }
    },
    TIMEOUT
  );

  it(
    "should respond to health check via Makefile command",
    () => {
      try {
        const output = execSync("make health", { timeout: 10000 }).toString();
        expect(output).toBeTruthy();
      } catch (error) {
        throw new Error(`Make health command failed: ${error}`);
      }
    },
    TIMEOUT
  );
});

describe("Service Connectivity", () => {
  it(
    "should allow backend to connect to database",
    async () => {
      // Check database connection from backend
      try {
        const output = execSync('docker-compose exec -T backend sh -c "nc -zv db 5432"', {
          timeout: 10000,
        }).toString();

        expect(output).toContain("open");
      } catch (error) {
        // Some versions of nc don't output to stdout, check if command succeeded
        if (error.status === 0) {
          // Success
          expect(true).toBe(true);
        } else {
          throw new Error(`Backend cannot connect to database: ${error}`);
        }
      }
    },
    TIMEOUT
  );

  it(
    "should have services on correct ports",
    () => {
      const psOutput = execSync("docker-compose ps").toString();

      // Check port mappings
      expect(psOutput).toContain("5432"); // PostgreSQL
      expect(psOutput).toContain("3000"); // Backend
      expect(psOutput).toContain("5173"); // Frontend
    },
    TIMEOUT
  );
});
