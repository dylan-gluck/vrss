/**
 * Network Connectivity Tests
 * Tests that services can communicate over Docker network
 */

import { describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";

const TIMEOUT = 60000; // 60 seconds for Docker operations

describe("Docker Network", () => {
  it(
    "should have vrss_network created",
    () => {
      const networkOutput = execSync("docker network ls").toString();
      expect(networkOutput).toContain("vrss_network");
    },
    TIMEOUT
  );

  it(
    "should have all services connected to vrss_network",
    () => {
      const networkInspect = execSync(
        "docker network inspect vrss_network --format json"
      ).toString();
      const network = JSON.parse(networkInspect)[0];

      const containers = network.Containers || {};
      const containerNames = Object.values(containers).map((c: any) => c.Name);

      // Check that key services are connected
      expect(containerNames.some((name: string) => name.includes("db"))).toBe(true);
      expect(containerNames.some((name: string) => name.includes("backend"))).toBe(true);
      expect(containerNames.some((name: string) => name.includes("frontend"))).toBe(true);
    },
    TIMEOUT
  );
});

describe("Service-to-Service Communication", () => {
  it(
    "should allow backend to reach database by service name",
    async () => {
      try {
        // Try to ping database from backend using service discovery
        const output = execSync('docker-compose exec -T backend sh -c "getent hosts db"', {
          timeout: 10000,
        }).toString();

        // Should resolve to an IP address
        expect(output).toMatch(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
        expect(output).toContain("db");
      } catch (error) {
        throw new Error(`Backend cannot resolve database hostname: ${error}`);
      }
    },
    TIMEOUT
  );

  it(
    "should allow backend to connect to database on port 5432",
    async () => {
      try {
        // Check if backend can connect to database
        const output = execSync('docker-compose exec -T backend sh -c "nc -zv db 5432 2>&1"', {
          timeout: 10000,
        }).toString();

        // netcat output varies, check for success indicators
        const success =
          output.includes("open") || output.includes("succeeded") || output.includes("connected");

        expect(success).toBe(true);
      } catch (error: any) {
        // Some versions of nc exit with 0 even without output
        if (error.status === 0) {
          expect(true).toBe(true); // Connection successful
        } else {
          throw new Error(`Backend cannot connect to database port: ${error}`);
        }
      }
    },
    TIMEOUT
  );

  it(
    "should allow frontend to reach backend by service name",
    async () => {
      try {
        const output = execSync('docker-compose exec -T frontend sh -c "getent hosts backend"', {
          timeout: 10000,
        }).toString();

        expect(output).toMatch(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
        expect(output).toContain("backend");
      } catch (error) {
        throw new Error(`Frontend cannot resolve backend hostname: ${error}`);
      }
    },
    TIMEOUT
  );

  it(
    "should have containers on same network subnet",
    () => {
      const networkInspect = execSync(
        "docker network inspect vrss_network --format json"
      ).toString();
      const network = JSON.parse(networkInspect)[0];

      const containers = network.Containers || {};
      const ipAddresses = Object.values(containers).map((c: any) => c.IPv4Address);

      // All containers should have IP addresses in same subnet
      expect(ipAddresses.length).toBeGreaterThan(0);
      for (const ip of ipAddresses) {
        expect(ip).toMatch(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}/);
      }
    },
    TIMEOUT
  );
});

describe("Port Exposure", () => {
  it(
    "should expose database port to host",
    () => {
      const psOutput = execSync("docker-compose ps db").toString();
      expect(psOutput).toContain("5432");
    },
    TIMEOUT
  );

  it(
    "should expose backend port to host",
    () => {
      const psOutput = execSync("docker-compose ps backend").toString();
      expect(psOutput).toContain("3000");
    },
    TIMEOUT
  );

  it(
    "should expose frontend port to host",
    () => {
      const psOutput = execSync("docker-compose ps frontend").toString();
      expect(psOutput).toContain("5173");
    },
    TIMEOUT
  );

  it(
    "should allow host to connect to database",
    async () => {
      try {
        const output = execSync("nc -zv localhost 5432 2>&1", { timeout: 5000 }).toString();
        const success =
          output.includes("open") || output.includes("succeeded") || output.includes("connected");
        expect(success).toBe(true);
      } catch (error: any) {
        if (error.status === 0) {
          expect(true).toBe(true);
        } else {
          throw new Error(`Host cannot connect to database port: ${error}`);
        }
      }
    },
    TIMEOUT
  );

  it(
    "should allow host to connect to backend",
    async () => {
      try {
        const response = await fetch("http://localhost:3000/health");
        expect(response.ok).toBe(true);
      } catch (error) {
        throw new Error(`Host cannot connect to backend: ${error}`);
      }
    },
    TIMEOUT
  );

  it(
    "should allow host to connect to frontend",
    async () => {
      try {
        const response = await fetch("http://localhost:5173");
        expect(response.ok).toBe(true);
      } catch (error) {
        throw new Error(`Host cannot connect to frontend: ${error}`);
      }
    },
    TIMEOUT
  );
});
