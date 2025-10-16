# VRSS MVP Implementation Guide

**Quick Start**: How to set up and implement the VRSS monolith architecture

**Last Updated**: 2025-10-16

---

## Phase 0: Project Setup (Day 1)

### Step 1: Initialize Monorepo

```bash
# Create root package.json with workspaces
cd /Users/dylan/Workspace/projects/vrss

# Initialize root package
cat > package.json <<EOF
{
  "name": "vrss",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "test": "turbo run test",
    "test:e2e": "turbo run test:e2e",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "type-check": "turbo run type-check",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "prettier": "^3.1.0",
    "turbo": "^1.11.0",
    "typescript": "^5.3.0"
  }
}
EOF

# Install dependencies
bun install

# Install Turborepo
bun add -D turbo
```

### Step 2: Configure Turborepo

```bash
# Create turbo.json
cat > turbo.json <<EOF
{
  "\$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
EOF
```

### Step 3: Create Directory Structure

```bash
# Create directory structure
mkdir -p apps/api/src/{modules,lib,db,middleware,types}
mkdir -p apps/web/src/{features,components,lib,hooks,routes}
mkdir -p packages/{shared-types/src,config}
mkdir -p docker/{nginx,postgres,minio}
mkdir -p scripts

# Create placeholder files
touch apps/api/src/main.ts
touch apps/web/src/main.tsx
touch packages/shared-types/src/index.ts
```

---

## Phase 1: Backend Foundation (Days 2-5)

### Step 1: Setup API Package

```bash
cd apps/api

# Create package.json
cat > package.json <<EOF
{
  "name": "@vrss/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/main.ts",
    "build": "bun build src/main.ts --outdir dist --target bun",
    "start": "bun dist/main.js",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "lint": "eslint . --ext .ts",
    "type-check": "tsc --noEmit",
    "db:generate": "drizzle-kit generate:pg",
    "db:migrate": "drizzle-kit push:pg",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "hono": "^3.12.0",
    "@hono/zod-validator": "^0.2.0",
    "drizzle-orm": "^0.29.0",
    "postgres": "^3.4.0",
    "zod": "^3.22.0",
    "better-auth": "^0.5.0",
    "bcrypt": "^5.1.0",
    "@aws-sdk/client-s3": "^3.490.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "drizzle-kit": "^0.20.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0"
  }
}
EOF

bun install
```

### Step 2: Create Database Schema

```typescript
// apps/api/src/db/schema.ts
import { pgTable, text, timestamp, boolean, integer, jsonb, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').unique().notNull(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  bio: text('bio'),
  storageUsedBytes: integer('storage_used_bytes').default(0),
  storageLimit: integer('storage_limit').default(52428800), // 50MB
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  type: text('type').notNull(), // 'text' | 'image' | 'video' | 'song'
  content: text('content'),
  mediaUrls: jsonb('media_urls'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Add more tables as needed
```

### Step 3: Setup Database Client

```typescript
// apps/api/src/lib/db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema';

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
```

### Step 4: Create First Module (Users)

```typescript
// apps/api/src/modules/users/users.repository.ts
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export class UserRepository {
  async create(data: { username: string; email: string; passwordHash: string }) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async findById(id: string) {
    return db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  async findByUsername(username: string) {
    return db.query.users.findFirst({
      where: eq(users.username, username),
    });
  }
}
```

```typescript
// apps/api/src/modules/users/users.service.ts
import { UserRepository } from './users.repository';
import bcrypt from 'bcrypt';

export class UserService {
  private repo = new UserRepository();

  async create(input: { username: string; email: string; password: string }) {
    // Hash password
    const passwordHash = await bcrypt.hash(input.password, 10);

    // Create user
    return this.repo.create({
      username: input.username,
      email: input.email,
      passwordHash,
    });
  }

  async getById(id: string) {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
```

```typescript
// apps/api/src/modules/users/users.routes.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { UserService } from './users.service';

const userRoutes = new Hono();
const userService = new UserService();

const createUserSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(8),
});

userRoutes.post(
  '/users.create',
  zValidator('json', createUserSchema),
  async (c) => {
    const data = c.req.valid('json');
    const user = await userService.create(data);
    return c.json({ success: true, data: user });
  }
);

userRoutes.post(
  '/users.getById',
  zValidator('json', z.object({ id: z.string() })),
  async (c) => {
    const { id } = c.req.valid('json');
    const user = await userService.getById(id);
    return c.json({ success: true, data: user });
  }
);

export default userRoutes;
```

### Step 5: Create Main API Server

```typescript
// apps/api/src/main.ts
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import userRoutes from './modules/users/users.routes';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.route('/api', userRoutes);

// Start server
const port = process.env.PORT || 3000;

export default {
  port,
  fetch: app.fetch,
};

console.log(`🚀 API server running on http://localhost:${port}`);
```

---

## Phase 2: Docker Setup (Days 3-4)

### Step 1: Create Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: vrss
      POSTGRES_PASSWORD: vrss_dev_password
      POSTGRES_DB: vrss_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vrss"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"

volumes:
  postgres_data:
  minio_data:
```

### Step 2: Create Environment File

```bash
# .env.example
DATABASE_URL=postgresql://vrss:vrss_dev_password@localhost:5432/vrss_dev
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=vrss-media
BETTER_AUTH_SECRET=your-secret-key-change-in-production
BETTER_AUTH_URL=http://localhost:3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Copy to .env
cp .env.example .env
```

### Step 3: Start Services

```bash
# Start PostgreSQL and MinIO
docker-compose up -d

# Run migrations
cd apps/api
bun run db:migrate

# Start API
bun run dev
```

---

## Phase 3: Frontend Foundation (Days 5-7)

### Step 1: Setup Web Package

```bash
cd apps/web

# Create package.json
cat > package.json <<EOF
{
  "name": "@vrss/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext .ts,.tsx",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.14.0",
    "hono": "^3.12.0",
    "@radix-ui/react-slot": "^1.0.2",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.1.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.7",
    "vite-plugin-pwa": "^0.17.4",
    "vitest": "^1.0.4",
    "@playwright/test": "^1.40.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6",
    "typescript": "^5.3.0"
  }
}
EOF

bun install
```

### Step 2: Configure Vite

```typescript
// apps/web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Vrss Social',
        short_name: 'Vrss',
        description: 'Customizable social platform',
        theme_color: '#ffffff',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

### Step 3: Setup Tailwind

```bash
# Initialize Tailwind
bunx tailwindcss init -p

# Configure tailwind.config.js
cat > tailwind.config.js <<EOF
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF
```

```css
/* apps/web/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Step 4: Create API Client

```typescript
// apps/web/src/lib/api-client.ts
import { hc } from 'hono/client';
import type { AppType } from '../../../api/src/main';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiClient = hc<AppType>(apiUrl);

// Type-safe API wrapper
export const api = {
  users: {
    create: async (data: { username: string; email: string; password: string }) => {
      const response = await apiClient.api['users.create'].$post({ json: data });
      return response.json();
    },
    getById: async (id: string) => {
      const response = await apiClient.api['users.getById'].$post({ json: { id } });
      return response.json();
    },
  },
};
```

### Step 5: Setup React Query

```typescript
// apps/web/src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
    },
  },
});
```

```tsx
// apps/web/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
```

---

## Phase 4: First Feature - Authentication (Days 8-12)

### Backend: Auth Module

```typescript
// apps/api/src/modules/auth/auth.service.ts
import { UserRepository } from '../users/users.repository';
import bcrypt from 'bcrypt';

export class AuthService {
  private userRepo = new UserRepository();

  async login(username: string, password: string) {
    const user = await this.userRepo.findByUsername(username);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Create session (using better-auth or manual JWT)
    // Return user without password
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async register(data: { username: string; email: string; password: string }) {
    // Check if user exists
    const existing = await this.userRepo.findByUsername(data.username);
    if (existing) {
      throw new Error('Username already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await this.userRepo.create({
      username: data.username,
      email: data.email,
      passwordHash,
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
```

### Frontend: Auth Feature

```tsx
// apps/web/src/features/auth/hooks/useAuth.ts
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useLogin() {
  return useMutation({
    mutationFn: (data: { username: string; password: string }) =>
      api.auth.login(data),
    onSuccess: (user) => {
      // Store user in session
      localStorage.setItem('user', JSON.stringify(user));
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: { username: string; email: string; password: string }) =>
      api.users.create(data),
  });
}
```

```tsx
// apps/web/src/features/auth/components/LoginForm.tsx
import { useState } from 'react';
import { useLogin } from '../hooks/useAuth';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ username, password });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={login.isPending}
        className="w-full bg-blue-600 text-white py-2 rounded"
      >
        {login.isPending ? 'Logging in...' : 'Login'}
      </button>
      {login.isError && (
        <p className="text-red-600">Invalid credentials</p>
      )}
    </form>
  );
}
```

---

## Phase 5: Testing Setup (Days 10-12)

### Backend Tests

```typescript
// apps/api/src/modules/users/users.service.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { UserService } from './users.service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
  });

  it('should create a user', async () => {
    const user = await service.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    });

    expect(user.username).toBe('testuser');
    expect(user.email).toBe('test@example.com');
  });
});
```

### Frontend E2E Tests

```typescript
// apps/web/tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('should register and login', async ({ page }) => {
  // Navigate to register page
  await page.goto('http://localhost:5173/register');

  // Fill form
  await page.fill('input[name="username"]', 'newuser');
  await page.fill('input[name="email"]', 'new@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Should redirect to home
  await expect(page).toHaveURL('http://localhost:5173/home');
});
```

---

## Quick Command Reference

```bash
# Development
bun run dev                # Start all services
bun run docker:up          # Start Docker services
bun run docker:logs        # View Docker logs

# Database
bun run db:migrate         # Run migrations
bun run db:studio          # Open Drizzle Studio

# Testing
bun run test               # Run all tests
bun run test:e2e           # Run E2E tests

# Building
bun run build              # Build all packages
bun run type-check         # Check TypeScript

# Linting
bun run lint               # Lint all packages
bun run format             # Format code
```

---

## Next Steps After Foundation

1. **Complete Auth Module** with Better-auth integration
2. **Build Profile Module** with customization
3. **Implement Posts Module** with media upload
4. **Create Feed Module** with algorithm builder
5. **Add Notifications** and messaging
6. **Deploy to Staging** environment

---

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# View PostgreSQL logs
docker logs vrss-postgres-1

# Reset database
docker-compose down -v
docker-compose up -d postgres
```

### Type Issues
```bash
# Rebuild shared types
cd packages/shared-types
bun run build

# Clear Turborepo cache
rm -rf .turbo
bun run build
```

### Port Conflicts
```bash
# Check what's using port
lsof -i :3000
lsof -i :5173

# Kill process
kill -9 <PID>
```

---

**Ready to start?** Follow phases in order for smooth MVP development. 🚀
