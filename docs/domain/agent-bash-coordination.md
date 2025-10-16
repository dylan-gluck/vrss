# Agent Bash Coordination Rules

## Overview

This document defines rules for Claude Code agents managing multiple Bash sessions in the VRSS monorepo. The critical requirement is **NEVER starting duplicate dev servers**, especially when navigating monorepo subdirectories.

## Environment Context

**Monorepo structure**:
```
/Users/dylan/Workspace/projects/vrss/
├── apps/
│   ├── api/       # Backend API (port 3000)
│   └── web/       # Frontend web app (port 5173)
├── packages/
│   ├── api-contracts/
│   ├── eslint-config/
│   └── typescript-config/
└── e2e/           # E2E tests
```

**Dev servers**:
- **API**: `bun run --watch src/index.ts` on port **3000**
- **Web**: `vite` on port **5173**
- **Start command**: `turbo run dev --parallel` from root

## Core Rules

### RULE 1: One Session, One Dev Server

**Principle**: If the main Bash session starts `turbo run dev --parallel`, NO other session should start dev servers.

**Bad pattern** ❌:
```typescript
// Main orchestrator
const devBashId = await Bash({
  command: "cd /Users/dylan/Workspace/projects/vrss && turbo run dev --parallel",
  run_in_background: true
});

// Subagent (different session)
const apiBashId = await Bash({
  command: "cd /Users/dylan/Workspace/projects/vrss/apps/api && bun run dev",  // ❌ CONFLICT
  run_in_background: true
});
```

**Good pattern** ✅:
```typescript
// Main orchestrator starts dev server ONCE
const devBashId = await Bash({
  command: "cd /Users/dylan/Workspace/projects/vrss && turbo run dev --parallel",
  run_in_background: true,
  description: "Start dev servers (API + Web)"
});

// Subagent monitors existing server (doesn't start new one)
const output = await BashOutput({
  bash_id: devBashId,
  filter: "Listening on|error|fatal"
});
```

### RULE 2: Check Before Start

**Always verify ports are free before spawning dev servers.**

**Pre-spawn checklist**:
```bash
# 1. Check API port
if lsof -i :3000 > /dev/null 2>&1; then
  echo "Port 3000 already in use"
  exit 1
fi

# 2. Check web port
if lsof -i :5173 > /dev/null 2>&1; then
  echo "Port 5173 already in use"
  exit 1
fi

# 3. Now safe to start
turbo run dev --parallel
```

**Agent implementation**:
```typescript
// Check if servers already running
const apiCheck = await Bash({
  command: "lsof -i :3000 > /dev/null 2>&1 && echo 'occupied' || echo 'free'",
  description: "Check API port 3000"
});

const webCheck = await Bash({
  command: "lsof -i :5173 > /dev/null 2>&1 && echo 'occupied' || echo 'free'",
  description: "Check web port 5173"
});

if (apiCheck.includes('occupied') || webCheck.includes('occupied')) {
  console.log("Dev servers already running - skipping spawn");
  // Find existing bash_id from registry
  const existingBashId = readProcessRegistry().devServer.bash_id;
  return existingBashId;
}

// Ports free - safe to start
const devBashId = await Bash({
  command: "cd /Users/dylan/Workspace/projects/vrss && turbo run dev --parallel",
  run_in_background: true,
  description: "Start dev servers"
});

// Register bash_id for future reference
updateProcessRegistry({ devServer: { bash_id: devBashId, ports: [3000, 5173] } });
```

### RULE 3: Always Use Absolute Paths

**Avoid directory context issues by using full paths.**

**Bad pattern** ❌:
```typescript
// Relative path - depends on current directory
await Bash("cd apps/api && bun run dev");
```

**Good pattern** ✅:
```typescript
// Absolute path - works from anywhere
await Bash("cd /Users/dylan/Workspace/projects/vrss && turbo run dev --parallel");
```

**Why this matters**: Subagents may be spawned from different directories. Absolute paths eliminate ambiguity.

### RULE 4: Maintain Process Registry

**Keep a single source of truth for active processes.**

**Registry file**: `.claude/ACTIVE_PROCESSES.md`

```markdown
# Active Claude Code Processes

Last updated: 2025-10-16 10:30:00

## Dev Servers
- **Status**: Running
- **Bash ID**: `bash_abc123`
- **Command**: `turbo run dev --parallel`
- **Ports**: 3000 (API), 5173 (Web)
- **Started**: 2025-10-16 10:15:00

## Type-Check Watcher
- **Status**: Running
- **Bash ID**: `bash_def456`
- **Command**: `tsc --noEmit --watch`
- **Directory**: `/Users/dylan/Workspace/projects/vrss/apps/api`
- **Started**: 2025-10-16 10:16:00

## Test Watcher
- **Status**: Stopped
- **Bash ID**: None
- **Last run**: 2025-10-16 09:45:00
```

**Agent operations**:
```typescript
// Read registry
function readProcessRegistry() {
  const content = readFile(".claude/ACTIVE_PROCESSES.md");
  return parseRegistry(content);
}

// Update registry
function updateProcessRegistry(update) {
  const registry = readProcessRegistry();
  Object.assign(registry, update);
  writeFile(".claude/ACTIVE_PROCESSES.md", formatRegistry(registry));
}

// Check if dev server running
function isDevServerRunning() {
  const registry = readProcessRegistry();
  return registry.devServer?.status === "Running";
}
```

### RULE 5: Never Start from Subdirectories

**The "Subdirectory Trap": Agents navigating into apps/api/ or apps/web/ can forget about root processes.**

**Forbidden patterns** ❌:
```bash
# From apps/api/
cd /Users/dylan/Workspace/projects/vrss/apps/api
bun run dev  # ❌ Conflicts with root dev server

# From apps/web/
cd /Users/dylan/Workspace/projects/vrss/apps/web
bun run dev  # ❌ Conflicts with root dev server
```

**Allowed patterns** ✅:
```bash
# From root only
cd /Users/dylan/Workspace/projects/vrss
turbo run dev --parallel  # ✅ Starts both API and Web

# From subdirectory (non-dev commands)
cd /Users/dylan/Workspace/projects/vrss/apps/api
bun run type-check  # ✅ No conflict
bun run test        # ✅ No conflict
bun run lint        # ✅ No conflict
```

**Agent rule**:
```typescript
// Before any command that might spawn dev server
const currentDir = process.cwd();
const isInSubdir = currentDir.includes("/apps/api") || currentDir.includes("/apps/web");

if (isInSubdir && commandStartsDevServer(command)) {
  throw new Error("Cannot start dev server from subdirectory - use root command");
}
```

## Bash Tool Usage Patterns

### Pattern: Starting Background Process

**Start dev server once at session start**:
```typescript
const devBashId = await Bash({
  command: "cd /Users/dylan/Workspace/projects/vrss && turbo run dev --parallel",
  run_in_background: true,
  timeout: 600000,  // 10 minutes (won't timeout - persistent process)
  description: "Start dev servers (API + Web)"
});

// Store bash_id for later monitoring
sessionState.devServerBashId = devBashId;
```

**Start type-check watcher in separate session**:
```typescript
const typecheckBashId = await Bash({
  command: "cd /Users/dylan/Workspace/projects/vrss/apps/api && tsc --noEmit --watch",
  run_in_background: true,
  description: "Watch TypeScript types in API"
});

// Store bash_id
sessionState.typecheckBashId = typecheckBashId;
```

### Pattern: Monitoring Background Process

**Use BashOutput() to monitor long-running processes**:
```typescript
// Check dev server output (only new lines since last check)
const output = await BashOutput({
  bash_id: sessionState.devServerBashId,
  filter: "error|fatal|warning|Listening on"  // Regex filter
});

// Parse output
if (output.includes("error")) {
  // Handle error
} else if (output.includes("Listening on")) {
  console.log("Dev servers ready!");
}
```

**Smart filtering reduces noise**:
```typescript
// Only show critical messages
await BashOutput({
  bash_id: devBashId,
  filter: "error|fatal|EADDRINUSE|Port.*already in use"
});

// Only show startup messages
await BashOutput({
  bash_id: devBashId,
  filter: "Listening|ready|started"
});
```

**BashOutput optimization**:
- **Returns only NEW output** since last check (built-in deduplication)
- Use regex filters aggressively to reduce token usage
- Check critical processes every 10-30 seconds, not continuously

### Pattern: Health Monitoring

**Periodic health checks**:
```typescript
// Every 30 seconds, check if dev server still running
setInterval(async () => {
  const output = await BashOutput({
    bash_id: sessionState.devServerBashId,
    filter: "error|fatal"
  });

  if (output.includes("error")) {
    // Dev server crashed - alert and restart
    console.log("🚨 Dev server error detected!");
    await handleDevServerFailure();
  }

  // Verify processes still listening on ports
  const apiHealth = await Bash("curl -s http://localhost:3000/health");
  const webHealth = await Bash("curl -s http://localhost:5173");

  if (!apiHealth.includes("ok") || !webHealth.includes("200")) {
    // Health check failed - investigate
    await investigateHealthFailure();
  }
}, 30000);
```

### Pattern: Cleanup and Shutdown

**Graceful shutdown**:
```typescript
// Kill background bash sessions
await KillShell(sessionState.devServerBashId);
await KillShell(sessionState.typecheckBashId);

// Verify ports released
const apiCheck = await Bash("lsof -i :3000 || echo 'port free'");
const webCheck = await Bash("lsof -i :5173 || echo 'port free'");

if (!apiCheck.includes("port free")) {
  // Force kill processes on port
  await Bash("kill $(lsof -ti :3000)");
}

if (!webCheck.includes("port free")) {
  await Bash("kill $(lsof -ti :5173)");
}

// Update registry
updateProcessRegistry({
  devServer: { status: "Stopped", bash_id: null }
});
```

## Coordination Across Multiple Agents

### Scenario: Main Agent + Subagent

**Main orchestrator**:
```typescript
// 1. Start dev server from root (ONCE)
const devBashId = await Bash({
  command: "cd /Users/dylan/Workspace/projects/vrss && turbo run dev --parallel",
  run_in_background: true
});

// 2. Store in registry
updateProcessRegistry({
  devServer: { status: "Running", bash_id: devBashId, ports: [3000, 5173] }
});

// 3. Delegate task to subagent
const subagent = await Task({
  subagent_type: "software-engineer",
  prompt: `
    CONTEXT: Dev servers already running at bash_id: ${devBashId}
    API on port 3000, Web on port 5173

    EXCLUDE: Do NOT start new dev server instances

    FOCUS: Monitor dev server output and fix any errors
  `
});
```

**Subagent**:
```typescript
// Read from context (provided by orchestrator)
const devBashId = extractFromPrompt("bash_id: (\\w+)");

// Monitor existing server (don't start new one!)
const output = await BashOutput({
  bash_id: devBashId,
  filter: "error|warning"
});

// NEVER do this:
// await Bash("cd apps/api && bun run dev");  // ❌ CONFLICT
```

### Scenario: Parallel Testing + Dev Server

**Safe pattern**:
```typescript
// 1. Start dev server (background)
const devBashId = await Bash({
  command: "cd /Users/dylan/Workspace/projects/vrss && turbo run dev --parallel",
  run_in_background: true
});

// 2. Wait for servers to be ready
await waitForServer("http://localhost:3000/health");
await waitForServer("http://localhost:5173");

// 3. Start test watcher in DIFFERENT session
const testBashId = await Bash({
  command: "cd /Users/dylan/Workspace/projects/vrss/apps/web && npx vitest --watch",
  run_in_background: true
});

// 4. Monitor both independently
// Dev server: check for errors
// Tests: check for failures
```

**Critical**: Test watcher runs `vitest --watch`, NOT `bun run dev`!

### Scenario: E2E Tests (Special Case)

**E2E tests start their own servers** (configured in `playwright.config.ts`).

**Pattern 1: Stop dev server before E2E**:
```typescript
// 1. Kill dev server
await KillShell(sessionState.devServerBashId);

// 2. Wait for ports to be released
await waitForPortFree(3000);
await waitForPortFree(5173);

// 3. Run E2E tests (Playwright starts its own servers)
await Bash("cd /Users/dylan/Workspace/projects/vrss/e2e && bun run test:e2e");
```

**Pattern 2: Use reuseExistingServer** (already configured):
```typescript
// Playwright config has: reuseExistingServer: !process.env.CI

// 1. Start dev server
const devBashId = await Bash({
  command: "cd /Users/dylan/Workspace/projects/vrss && turbo run dev --parallel",
  run_in_background: true
});

// 2. Wait for servers ready
await waitForServer("http://localhost:3000/health");
await waitForServer("http://localhost:5173");

// 3. Run E2E (reuses existing servers)
await Bash("cd /Users/dylan/Workspace/projects/vrss/e2e && bun run test:e2e");
```

## Common Scenarios & Solutions

### Scenario: Agent Session Start

**When agent session starts**:
```typescript
async function onSessionStart() {
  // 1. Check if dev servers already running
  const registry = readProcessRegistry();

  if (registry.devServer?.status === "Running") {
    // Verify process still alive
    const isAlive = await verifyBashAlive(registry.devServer.bash_id);

    if (isAlive) {
      console.log("Dev servers already running - resuming monitoring");
      sessionState.devServerBashId = registry.devServer.bash_id;
      return;
    } else {
      console.log("Stale dev server entry - cleaning up");
      await cleanup();
    }
  }

  // 2. Ports free - start dev servers
  console.log("Starting dev servers...");
  const devBashId = await Bash({
    command: "cd /Users/dylan/Workspace/projects/vrss && turbo run dev --parallel",
    run_in_background: true
  });

  // 3. Update registry
  updateProcessRegistry({
    devServer: { status: "Running", bash_id: devBashId, ports: [3000, 5173] }
  });

  sessionState.devServerBashId = devBashId;
}
```

### Scenario: Port Conflict Detected

**When port already in use**:
```typescript
async function handlePortConflict(port) {
  // 1. Find process using port
  const result = await Bash(`lsof -ti :${port}`);
  const pid = result.trim();

  if (!pid) {
    console.log(`Port ${port} reported in use but no process found`);
    return;
  }

  // 2. Check if it's our process
  const registry = readProcessRegistry();
  const ourBashId = registry.devServer?.bash_id;

  if (ourBashId) {
    // Our process - probably just slow startup
    console.log(`Port ${port} in use by our dev server`);
    return;
  }

  // 3. External process - ask user
  console.log(`Port ${port} in use by PID ${pid} (not our process)`);
  console.log("Options:");
  console.log("1. Kill process and restart dev server");
  console.log("2. Use different ports");
  console.log("3. Investigate further");

  // Wait for user decision
}
```

### Scenario: Dev Server Crashed

**When dev server exits unexpectedly**:
```typescript
async function handleDevServerCrash() {
  // 1. Check exit code
  const output = await BashOutput({
    bash_id: sessionState.devServerBashId,
    filter: ".*"  // Get all recent output
  });

  console.log("Dev server crashed! Last output:", output);

  // 2. Parse error
  if (output.includes("EADDRINUSE")) {
    console.log("Port conflict - cleaning up...");
    await Bash("kill $(lsof -ti :3000)");
    await Bash("kill $(lsof -ti :5173)");
  } else if (output.includes("Cannot find module")) {
    console.log("Dependency issue - running npm install...");
    await Bash("cd /Users/dylan/Workspace/projects/vrss && bun install");
  }

  // 3. Restart dev server
  console.log("Restarting dev server...");
  const newBashId = await Bash({
    command: "cd /Users/dylan/Workspace/projects/vrss && turbo run dev --parallel",
    run_in_background: true
  });

  // 4. Update registry
  updateProcessRegistry({
    devServer: { status: "Running", bash_id: newBashId, restartCount: 1 }
  });
}
```

### Scenario: Multiple Agents Want Dev Server

**When multiple agents need dev server access**:
```typescript
// Agent A (orchestrator)
async function agentA() {
  const devBashId = await getOrStartDevServer();

  // Delegate to Agent B with bash_id
  await Task({
    subagent_type: "software-engineer",
    prompt: `
      CONTEXT: Dev server running at bash_id: ${devBashId}

      EXCLUDE: Do NOT start new dev server

      FOCUS: Monitor server and fix errors
    `
  });
}

// Agent B (subagent)
async function agentB(prompt) {
  // Extract bash_id from prompt
  const devBashId = extractBashId(prompt);

  // Use existing server
  const output = await BashOutput({ bash_id: devBashId });

  // NEVER start new server
  // await Bash("turbo run dev");  // ❌ FORBIDDEN
}

// Shared utility
async function getOrStartDevServer() {
  const registry = readProcessRegistry();

  if (registry.devServer?.status === "Running") {
    return registry.devServer.bash_id;
  }

  // Start new dev server
  const bashId = await Bash({
    command: "cd /Users/dylan/Workspace/projects/vrss && turbo run dev --parallel",
    run_in_background: true
  });

  updateProcessRegistry({
    devServer: { status: "Running", bash_id: bashId }
  });

  return bashId;
}
```

## Best Practices Summary

1. **One Dev Server Instance**: Start `turbo run dev --parallel` ONCE per session
2. **Check Before Start**: Always verify ports free before spawning
3. **Absolute Paths**: Use full paths to avoid context confusion
4. **Process Registry**: Maintain single source of truth for active processes
5. **Monitor Don't Spawn**: Use `BashOutput()` to monitor existing servers
6. **Smart Filtering**: Use regex filters to reduce token usage
7. **Graceful Shutdown**: Use `KillShell()` for cleanup
8. **Never from Subdirectories**: Always start dev servers from root
9. **Coordinate Across Agents**: Pass bash_id in CONTEXT to subagents
10. **Health Checks**: Periodically verify servers still running

## Related Documentation

- [Dev Server Management Pattern](../patterns/dev-server-management.md)
- [TypeScript Type-Check Patterns](../patterns/typescript-typecheck-patterns.md)
- [Test & Lint Workflows](../patterns/test-lint-workflows.md)
