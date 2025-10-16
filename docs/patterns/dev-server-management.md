# Dev Server Management Pattern

## Overview

This document describes the development server management pattern for the VRSS Turborepo monorepo. The monorepo runs two persistent development servers in parallel that must be carefully coordinated to avoid port conflicts and duplicate processes.

## Architecture

### Services

| Service | Command | Port | Watch Mode | Framework |
|---------|---------|------|------------|-----------|
| API Server | `bun run --watch src/index.ts` | 3000 | Bun native | Hono + Bun |
| Web Server | `vite` | 5173 | Vite HMR | React + Vite |

### Turborepo Configuration

**Location**: `/turbo.json`

```json
{
  "dev": {
    "cache": false,
    "persistent": true
  }
}
```

- **`cache: false`**: Dev servers never cached (always run fresh)
- **`persistent: true`**: Turborepo keeps processes alive indefinitely

### Starting All Services

**Root command**:
```bash
turbo run dev --parallel
```

**What happens**:
1. Turborepo scans for packages with `dev` script
2. Finds `@vrss/api` and `@vrss/web`
3. Starts both in parallel (no dependency order)
4. Multiplexes console output with workspace prefixes
5. Runs until Ctrl+C terminates both

## Port Configuration

### API Server

**Environment variable**: `PORT` (default: 3001)
**Actual configuration**: Port 3000 (set in `apps/api/.env`)
**Code location**: `apps/api/src/index.ts:42`

```typescript
const port = parseInt(process.env.PORT || '3001', 10);
```

### Web Server

**Configuration**: Hardcoded in Vite config
**Location**: `apps/web/vite.config.ts:37`

```typescript
server: {
  port: 5173,
  host: true  // Accessible on all network interfaces
}
```

## Risk: Duplicate Process Spawning

### HIGH RISK Scenarios

#### Scenario 1: Multiple Turbo Invocations
```bash
# Terminal 1
turbo run dev --parallel  # Starts API:3000, Web:5173

# Terminal 2
turbo run dev --parallel  # FAILS: EADDRINUSE on both ports
```

#### Scenario 2: Turbo + Individual Commands
```bash
# Terminal 1 (from root)
turbo run dev --parallel  # Starts API:3000, Web:5173

# Terminal 2
cd apps/api && bun run dev  # FAILS: Port 3000 already in use
```

#### Scenario 3: Docker Compose + Turbo
**Docker Compose** (`docker-compose.yml`) also defines:
- Backend service on port 3000
- Frontend service on port 5173

**Result**: Running both Docker and Turbo simultaneously causes conflicts!

**Rule**: Use ONE method at a time:
- Either `turbo run dev --parallel` (native)
- OR `docker-compose up` (containerized)
- **NEVER both simultaneously**

### Detection

**Check for running processes**:
```bash
# Check API port
lsof -i :3000

# Check web port
lsof -i :5173

# Check all node/bun processes
ps aux | grep -E "(bun|node|vite)"
```

### Cleanup

**Graceful shutdown**:
```bash
# From Turborepo (Ctrl+C terminates all child processes)
# Sends SIGTERM to both dev servers
```

**Force cleanup** (if orphaned):
```bash
# Kill processes by port
kill $(lsof -ti :3000)
kill $(lsof -ti :5173)

# Or by process name
pkill -f "bun run --watch"
pkill -f "vite"
```

**Warning**: Avoid `kill -9` which may orphan child processes!

## Claude Code Agent Coordination

### Critical Rules for Agents

**RULE 1: Check Before Start**
```bash
# Always verify port is free before starting dev server
if lsof -i :3000 > /dev/null 2>&1; then
  echo "Port 3000 already in use - skipping dev server start"
  exit 0
fi
```

**RULE 2: Use Absolute Paths**
```bash
# GOOD: Explicit context, works from anywhere
cd /Users/dylan/Workspace/projects/vrss && turbo run dev --parallel

# BAD: Relative path, depends on current directory
cd apps/api && bun run dev
```

**RULE 3: Start From Root Only**
```bash
# ALWAYS start dev servers from monorepo root
cd /Users/dylan/Workspace/projects/vrss
turbo run dev --parallel
```

**RULE 4: Never Start from Subdirectories**
```bash
# FORBIDDEN when main dev server is running
cd apps/api && bun run dev      # ❌ WILL CONFLICT
cd apps/web && bun run dev      # ❌ WILL CONFLICT
```

**RULE 5: One Session, One Dev Server**
- If main Bash session starts `turbo run dev --parallel`, no other session should start dev servers
- Subagents must NEVER start new dev server instances
- Use `BashOutput()` to monitor existing dev server, not spawn new ones

### Pattern: Starting Dev Environment

**For main orchestrator agent**:
```typescript
// 1. Check if servers already running
const apiRunning = await Bash("lsof -i :3000 > /dev/null && echo 'running' || echo 'free'");
const webRunning = await Bash("lsof -i :5173 > /dev/null && echo 'running' || echo 'free'");

// 2. Only start if not running
if (apiRunning.includes('free') && webRunning.includes('free')) {
  const devBashId = await Bash({
    command: "cd /Users/dylan/Workspace/projects/vrss && turbo run dev --parallel",
    run_in_background: true,
    description: "Start dev servers (API + Web)"
  });

  // 3. Store bash_id for later monitoring
  // Save devBashId to process registry
}
```

**For monitoring agent**:
```typescript
// Monitor existing dev server (don't start new one!)
const output = await BashOutput({
  bash_id: devBashId,
  filter: "Listening on|error|fatal|warning"  // Only show important lines
});
```

## Watch Modes and Hot Reload

### API Server (Bun Watch)
- **Mechanism**: Bun's `--watch` flag
- **Behavior**: Full process restart on file change
- **Files watched**: All `.ts` files in `src/`
- **Startup time**: ~1-2 seconds per restart

### Web Server (Vite HMR)
- **Mechanism**: Vite's Hot Module Replacement
- **Behavior**: Instant in-browser updates (no full reload)
- **Files watched**: `src/`, `public/`, `index.html`
- **Startup time**: <100ms for most changes

## Environment Variables

### API Server
**Source**: `apps/api/.env`

```env
PORT=3000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
APP_URL=http://localhost:3000
WEB_URL=http://localhost:5173
```

### Web Server
**Source**: Root `.env` (Vite only exposes `VITE_*` variables)

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true
```

## Cross-Service Dependencies

### Runtime Dependencies (Not Enforced at Startup)

**Web depends on API**:
- Web expects API at `VITE_API_URL=http://localhost:3000`
- If API fails to start, web will run but API calls will fail

**API expects Web**:
- CORS configured for `FRONTEND_URL=http://localhost:5173`
- API will reject requests from other origins

**Database Dependency**:
- API requires PostgreSQL at `DATABASE_URL`
- No automatic startup coordination (must start manually or via Docker)

### Health Check Endpoints

**API Health Check**:
```bash
curl http://localhost:3000/health
# Expected: 200 OK with {"status":"ok"}
```

**Web Health Check**:
```bash
curl http://localhost:5173/
# Expected: 200 OK with HTML
```

## Process Lifecycle

### Startup Sequence (Recommended)

```bash
# 1. Start infrastructure (if using Docker for DB)
docker-compose up -d postgres

# 2. Wait for PostgreSQL to be ready
until pg_isready -h localhost -p 5432; do sleep 1; done

# 3. Start dev servers
turbo run dev --parallel

# 4. Wait for services to be ready
until curl -s http://localhost:3000/health > /dev/null; do sleep 1; done
until curl -s http://localhost:5173 > /dev/null; do sleep 1; done

# 5. Services ready!
echo "✅ All services running"
```

### Shutdown Sequence

```bash
# 1. Graceful shutdown (Ctrl+C from Turbo)
# Sends SIGTERM to both dev servers

# 2. Verify processes stopped
lsof -i :3000  # Should return nothing
lsof -i :5173  # Should return nothing

# 3. Stop infrastructure
docker-compose down
```

## Troubleshooting

### Issue: Port Already in Use

**Symptoms**:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution**:
```bash
# Find process using port
lsof -i :3000

# Kill process
kill $(lsof -ti :3000)

# Or use fuser (alternative)
fuser -k 3000/tcp
```

### Issue: Orphaned Processes

**Symptoms**: Dev server won't start, no obvious process in `lsof`

**Solution**:
```bash
# Find all related processes
ps aux | grep -E "(bun|node|vite)" | grep -v grep

# Kill by process group
pkill -f "turbo run dev"
pkill -f "bun run --watch"
pkill -f "vite"
```

### Issue: Environment Variables Not Loaded

**Symptoms**: API fails to connect to database, CORS errors

**Solution**:
```bash
# Verify .env files exist
ls -la apps/api/.env
ls -la .env

# Restart dev servers to reload environment
# (Ctrl+C then turbo run dev --parallel)
```

## Best Practices

1. **Single Entry Point**: Always start dev servers via `turbo run dev --parallel` from root
2. **Check Before Start**: Verify ports are free before spawning processes
3. **Absolute Paths**: Use full paths in automation to avoid context issues
4. **Process Registry**: Maintain a record of active bash sessions with their IDs
5. **Graceful Shutdown**: Use Ctrl+C, not `kill -9`
6. **Health Monitoring**: Periodically check service health, not just port occupation
7. **Isolated Testing**: Use different ports for tests to avoid conflicts

## Related Documentation

- [TypeScript Type-Check Patterns](./typescript-typecheck-patterns.md)
- [Test & Lint Workflows](./test-lint-workflows.md)
- [Agent Bash Coordination](../domain/agent-bash-coordination.md)
