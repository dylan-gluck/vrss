# TypeScript Type-Check Patterns

## Overview

This document describes TypeScript type-checking patterns in the VRSS Turborepo monorepo. The monorepo uses TypeScript 5.7.0+ with incremental compilation, shared configurations, and Turborepo orchestration with caching.

## Command Definitions

### Root Level

**File**: `package.json:19`

```json
{
  "scripts": {
    "type-check": "turbo run type-check"
  }
}
```

**Usage**:
```bash
bun run type-check
```

Orchestrates type-checking across all workspaces via Turborepo.

### Package Level Commands

**API App** (`apps/api/package.json:15`):
```json
{
  "scripts": {
    "type-check": "tsc --noEmit"
  }
}
```

**Web App** (`apps/web/package.json:15`):
```json
{
  "scripts": {
    "type-check": "tsc --noEmit"
  }
}
```

**API Contracts** (`packages/api-contracts/package.json:12`):
```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "build": "tsc",
    "dev": "tsc --watch"
  }
}
```

**Key difference**: Shared library (`api-contracts`) has watch mode via `dev` script.

## TypeScript Configuration Structure

### Shared Configuration Package

**Location**: `packages/typescript-config/`

#### Base Configuration

**File**: `packages/typescript-config/base.json`

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "VRSS Base TypeScript Config",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": false,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "incremental": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noEmit": false,
    "types": ["bun-types"]
  },
  "exclude": ["node_modules", "dist", "build", ".turbo"]
}
```

**Key features**:
- **`incremental: true`**: Enables incremental compilation via `.tsbuildinfo` files
- **`declaration: true`**: Generates `.d.ts` declaration files
- **`declarationMap: true`**: Enables jump-to-definition across packages
- **`noEmit: false`**: Default allows emission (overridden by `--noEmit` flag in type-check)

#### React Configuration

**File**: `packages/typescript-config/react.json`

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "VRSS React TypeScript Config",
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["vite/client"]
  }
}
```

### Package-Specific Configurations

#### API App

**File**: `apps/api/tsconfig.json`

```json
{
  "extends": "@vrss/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

#### Web App

**File**: `apps/web/tsconfig.json`

```json
{
  "extends": "@vrss/typescript-config/react.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Note**: Uses project references for Vite config separation.

#### Web App - Vite Config

**File**: `apps/web/tsconfig.node.json`

```json
{
  "extends": "@vrss/typescript-config/base.json",
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["node"]
  },
  "include": ["vite.config.ts"]
}
```

**Purpose**: Separate type-checking for Vite config from application code.

#### API Contracts

**File**: `packages/api-contracts/tsconfig.json`

```json
{
  "extends": "@vrss/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "composite": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Note**: `composite: true` enables project references (not yet used by other packages).

## Turborepo Orchestration

### Turbo.json Configuration

**File**: `turbo.json:26-30`

```json
{
  "tasks": {
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": [],
      "cache": true
    }
  }
}
```

### Execution Flow

```
1. turbo run type-check
   │
   ├─→ 2. Checks cache (hash of source files)
   │     │
   │     ├─ Cache hit? → Return cached result (exit code)
   │     │
   │     └─ Cache miss:
   │           │
   │           └─→ 3. Resolve dependencies: ^build
   │                 │
   │                 └─→ 4. Run build in dependency packages first
   │                       (api-contracts builds, emits .d.ts files)
   │                       │
   │                       └─→ 5. Run type-check in parallel across packages
   │                             │
   │                             ├─ apps/api: tsc --noEmit
   │                             ├─ apps/web: tsc --noEmit
   │                             └─ packages/api-contracts: tsc --noEmit
   │                                   │
   │                                   └─→ 6. Cache results for next run
```

### Caching Behavior

**Cache key based on**:
- All TypeScript source files (hashed)
- `tsconfig.json` files
- Dependency package outputs (via `dependsOn: ["^build"]`)
- Environment variables (none specified for type-check)

**Cache storage**:
- Location: `.turbo/` directory (gitignored)
- **Outputs**: `[]` (empty - no files cached, only exit code)
- **Why empty**: `--noEmit` produces no output files

**Cache hit behavior**:
- Returns previous exit code immediately
- Skips TypeScript compilation entirely
- Logs: `>>> FULL TURBO` in console

**Cache invalidation**:
- Any `.ts` or `.tsx` file changes
- `tsconfig.json` modifications
- Dependency package changes (via `^build`)

## Incremental Compilation

### How It Works

TypeScript creates `.tsbuildinfo` files containing:
- File hashes for changed detection
- Type information for quick re-validation
- Dependency graph for affected files

### Current State

**Files exist** (should be gitignored):
```
apps/api/tsconfig.tsbuildinfo
apps/web/tsconfig.tsbuildinfo
packages/api-contracts/tsconfig.tsbuildinfo
```

**Recommendation**: Add to `.gitignore`:
```gitignore
# TypeScript incremental compilation
*.tsbuildinfo
tsconfig.tsbuildinfo
```

### Performance Impact

**First run** (no `.tsbuildinfo`):
```bash
bun run type-check
# ~5-10 seconds across all packages
```

**Subsequent run** (with `.tsbuildinfo`, no changes):
```bash
bun run type-check
# ~1-2 seconds (Turborepo cache hit)
# OR ~2-3 seconds (incremental compile)
```

**Changed files** (with `.tsbuildinfo`):
```bash
# Edit single file in apps/api/src/
bun run type-check
# ~2-3 seconds (only checks affected files)
```

## Project References Pattern

### Current Implementation

**Web App → Vite Config**:

**File**: `apps/web/tsconfig.json:12`
```json
{
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Purpose**: Separate type-checking for build config from application code.

### Potential Expansion (Not Implemented)

**Recommended structure** for cross-package references:

**API App** (`apps/api/tsconfig.json`):
```json
{
  "extends": "@vrss/typescript-config/base.json",
  "references": [
    { "path": "../../packages/api-contracts" }
  ]
}
```

**Web App** (`apps/web/tsconfig.json`):
```json
{
  "extends": "@vrss/typescript-config/react.json",
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "../../packages/api-contracts" }
  ]
}
```

**Benefits**:
- TypeScript rebuilds only changed projects
- Better IDE performance (faster go-to-definition)
- Enforces package boundaries
- Parallel type-checking of independent projects

## Watch Mode Patterns

### No Dedicated Type-Check Watch Mode

**Current state**: No `type-check:watch` command exists.

### Workaround Options

#### Option 1: Manual Watch Command

**Add to individual packages**:
```json
{
  "scripts": {
    "type-check:watch": "tsc --noEmit --watch"
  }
}
```

**Usage**:
```bash
cd apps/api
bun run type-check:watch
```

#### Option 2: Turborepo Watch (Turbo 2.0+)

**Add to root**:
```json
{
  "scripts": {
    "type-check:watch": "turbo watch type-check"
  }
}
```

**Behavior**: Re-runs type-check on file changes across all packages.

#### Option 3: Use Existing Watch Modes

**API Contracts** (`packages/api-contracts`):
```bash
bun run dev
# Runs: tsc --watch (includes type-checking as side effect)
```

**Dev Servers** (implicit type-checking):
- Bun's `--watch` catches type errors at runtime
- Vite shows type errors in browser console

## Claude Code Agent Integration

### Pattern: On-Demand Type-Checking

**When to run**:
- After making code changes
- Before committing
- After merging branches
- Before creating pull requests

**Agent command**:
```typescript
const result = await Bash({
  command: "cd /Users/dylan/Workspace/projects/vrss && bun run type-check",
  timeout: 60000,  // 60 seconds
  description: "Run TypeScript type checking"
});

// Check for errors
if (result.includes("error TS")) {
  // Parse errors and fix
}
```

### Pattern: Continuous Type-Checking (Watch Mode)

**For long-running agent sessions**:

```typescript
// Start type-check watcher in background
const typecheckBashId = await Bash({
  command: "cd /Users/dylan/Workspace/projects/vrss/apps/api && tsc --noEmit --watch",
  run_in_background: true,
  description: "Watch TypeScript types"
});

// Monitor for errors periodically
setInterval(async () => {
  const output = await BashOutput({
    bash_id: typecheckBashId,
    filter: "error TS|Found \\d+ error"  // Only show errors
  });

  if (output.includes("error TS")) {
    // Alert and halt operations
  }
}, 30000);  // Check every 30 seconds
```

### Pattern: Parallel Type-Check + Dev Server

**Safe approach**:

```typescript
// 1. Start dev server from root (in background)
const devBashId = await Bash({
  command: "cd /Users/dylan/Workspace/projects/vrss && turbo run dev --parallel",
  run_in_background: true,
  description: "Start dev servers"
});

// 2. Start type-check watcher in DIFFERENT subdirectory session
const typecheckBashId = await Bash({
  command: "cd /Users/dylan/Workspace/projects/vrss/apps/api && tsc --noEmit --watch",
  run_in_background: true,
  description: "Watch types in API"
});

// 3. Monitor both independently
// Dev server: check for startup messages
// Type-check: check for errors
```

**Critical rule**: Type-check watcher runs `tsc --noEmit --watch`, NOT `bun run dev`, to avoid duplicate dev servers!

## Troubleshooting

### Issue: Type Errors Not Caught by Dev Server

**Symptoms**: Code with type errors runs successfully in dev mode.

**Cause**: Bun's `--watch` and Vite don't perform full type-checking.

**Solution**:
```bash
# Run explicit type-check
bun run type-check

# Or add type-check to pre-commit hook
```

### Issue: Slow Type-Checking

**Symptoms**: `bun run type-check` takes >10 seconds.

**Diagnosis**:
```bash
# Check if incremental compilation is working
ls -la apps/*/tsconfig.tsbuildinfo

# Check cache status
turbo run type-check --summarize
```

**Solutions**:
1. Ensure `.tsbuildinfo` files exist (incremental compilation)
2. Run `turbo run type-check --force` to rebuild cache
3. Consider implementing project references for parallelization

### Issue: Import Errors from Shared Packages

**Symptoms**: `Cannot find module '@vrss/api-contracts'`

**Cause**: Shared package not built yet (missing `.d.ts` files).

**Solution**:
```bash
# Build dependencies first
turbo run build

# Then type-check
turbo run type-check
```

**Why this works**: `turbo.json` has `"dependsOn": ["^build"]` which should handle this automatically.

## Configuration Hierarchy

```
packages/typescript-config/base.json
  ├── incremental: true
  ├── strict: true
  ├── target: ES2022
  └── types: ["bun-types"]
       │
       ├─→ packages/typescript-config/react.json
       │     ├── extends: base.json
       │     ├── jsx: react-jsx
       │     └── types: ["vite/client"]
       │          │
       │          └─→ apps/web/tsconfig.json
       │                ├── extends: @vrss/typescript-config/react.json
       │                └── references: [tsconfig.node.json]
       │
       ├─→ apps/api/tsconfig.json
       │     ├── extends: @vrss/typescript-config/base.json
       │     └── paths: {"@/*": ["./src/*"]}
       │
       └─→ packages/api-contracts/tsconfig.json
             ├── extends: @vrss/typescript-config/base.json
             └── composite: true
```

## Best Practices

1. **Run Before Commit**: Always run `bun run type-check` before committing
2. **Cache Awareness**: Trust Turborepo's cache for unchanged code
3. **Incremental Files**: Keep `.tsbuildinfo` local (add to `.gitignore`)
4. **Shared Configs**: Extend from workspace configs, don't duplicate
5. **Watch Mode**: Use for continuous feedback during development
6. **Project References**: Consider implementing for large monorepos
7. **Path Aliases**: Use `@/*` consistently across packages

## Related Documentation

- [Dev Server Management](./dev-server-management.md)
- [Test & Lint Workflows](./test-lint-workflows.md)
- [Agent Bash Coordination](../domain/agent-bash-coordination.md)
