# VRSS Monolith Architecture Design

**Document Version**: 1.0
**Date**: 2025-10-16
**Status**: Design Proposal

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Monolith Structure](#monolith-structure)
4. [Containerization Strategy](#containerization-strategy)
5. [Backend Architecture](#backend-architecture)
6. [Frontend Architecture](#frontend-architecture)
7. [Database Management](#database-management)
8. [Development Workflow](#development-workflow)
9. [Environment Configuration](#environment-configuration)
10. [Testing Strategy](#testing-strategy)
11. [Scalability Path](#scalability-path)
12. [Deployment Strategy](#deployment-strategy)

---

## Executive Summary

### Design Philosophy

This architecture follows an **MVP-first, scale-ready** approach:

- **Monolith pattern** for simplicity and rapid iteration
- **Clean separation** between backend and frontend
- **Containerized** from day one for consistent environments
- **Test-driven** foundation for quality and confidence
- **Evolutionary design** that supports future service extraction

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Repository Structure** | Monorepo with workspaces | Single source of truth, shared tooling, atomic commits |
| **Container Strategy** | Multi-container with docker-compose | Separation of concerns, independent scaling paths |
| **API Pattern** | Bun + Hono RPC-style API | Type-safe, fast, minimal boilerplate |
| **Database** | PostgreSQL with migrations | Battle-tested, ACID compliance, JSON support for flexibility |
| **Authentication** | Better-auth library | Modern, secure, extensible |
| **Build System** | Turborepo | Fast, cached builds across workspace |

### Architecture Principles

1. **Separation of Concerns**: Backend and frontend are independently deployable units
2. **Contract-First**: TypeScript types shared between backend/frontend via RPC
3. **Infrastructure as Code**: All environment config in version control
4. **Test at All Levels**: Unit, integration, E2E tests from the start
5. **Observability Built-In**: Logging, metrics, health checks from day one

---

## Architecture Overview

### High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        PWA[PWA Frontend<br/>Vite + React]
        Mobile[Mobile Browser]
    end

    subgraph "Application Layer - Docker Compose"
        NGINX[NGINX<br/>Reverse Proxy]
        API[Backend API<br/>Bun + Hono RPC]

        NGINX --> API
    end

    subgraph "Data Layer - Docker Compose"
        PG[(PostgreSQL<br/>Primary Database)]
        S3[S3-Compatible Storage<br/>MinIO local / S3 prod]
    end

    PWA --> NGINX
    Mobile --> NGINX
    API --> PG
    API --> S3

    subgraph "Auth Layer"
        BAUTH[Better-auth<br/>Sessions + JWT]
    end

    API --> BAUTH
    BAUTH --> PG

    style PWA fill:#e1f5ff
    style API fill:#fff4e1
    style PG fill:#f0f0f0
    style NGINX fill:#e8f5e9
```

### Technology Stack

#### Backend
- **Runtime**: Bun (fast JavaScript/TypeScript runtime)
- **Framework**: Hono (lightweight web framework)
- **API Style**: RPC with type-safe client generation
- **Authentication**: Better-auth
- **ORM**: Drizzle ORM (lightweight, type-safe)
- **Validation**: Zod schemas
- **Testing**: Bun test + Vitest

#### Frontend
- **Framework**: React 18+
- **Build Tool**: Vite
- **UI Components**: Shadcn-ui
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router v6
- **PWA**: Vite PWA plugin + Workbox
- **Styling**: Tailwind CSS
- **Testing**: Vitest + Testing Library + Playwright

#### Infrastructure
- **Database**: PostgreSQL 16
- **Migrations**: Drizzle Kit
- **Storage**: S3-compatible (MinIO local, S3 production)
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: NGINX
- **Build Cache**: Turborepo

---

## Monolith Structure

### Recommended: Monorepo with Workspaces

**Structure**: Single repository with multiple packages managed by npm/bun workspaces and Turborepo.

```
vrss/
├── .github/                    # CI/CD workflows
├── .husky/                     # Git hooks
├── apps/
│   ├── api/                    # Backend application
│   │   ├── src/
│   │   │   ├── modules/        # Feature modules
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── posts/
│   │   │   │   ├── feeds/
│   │   │   │   ├── profiles/
│   │   │   │   └── messages/
│   │   │   ├── lib/            # Shared backend utilities
│   │   │   ├── db/             # Database config and schemas
│   │   │   └── main.ts         # Application entry point
│   │   ├── drizzle/            # Migration files
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   │
│   └── web/                    # Frontend PWA
│       ├── src/
│       │   ├── features/       # Feature-based organization
│       │   │   ├── auth/
│       │   │   ├── profile/
│       │   │   ├── feed/
│       │   │   ├── posts/
│       │   │   ├── discover/
│       │   │   └── settings/
│       │   ├── components/     # Shared components
│       │   │   ├── ui/         # Shadcn-ui components
│       │   │   └── common/
│       │   ├── lib/            # Shared utilities
│       │   ├── hooks/          # Custom React hooks
│       │   ├── api/            # RPC client (generated)
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── public/
│       ├── tests/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── Dockerfile
│
├── packages/
│   ├── shared-types/           # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── api/            # API contracts
│   │   │   ├── domain/         # Domain models
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── config/                 # Shared configuration
│       ├── eslint-config/
│       ├── typescript-config/
│       └── tailwind-config/
│
├── docker/                     # Docker configuration
│   ├── nginx/
│   │   └── nginx.conf
│   ├── postgres/
│   │   └── init.sql
│   └── minio/
│       └── init.sh
│
├── scripts/                    # Development scripts
│   ├── setup.sh
│   ├── seed-db.sh
│   └── generate-types.sh
│
├── docs/                       # Documentation
├── docker-compose.yml          # Local development
├── docker-compose.prod.yml     # Production setup
├── turbo.json                  # Turborepo configuration
├── package.json                # Root package
├── bun.lockb                   # Bun lockfile
└── .env.example                # Environment template
```

### Rationale for Monorepo

**Advantages**:
1. **Atomic Changes**: Update API and frontend in single commit
2. **Type Safety**: Share TypeScript types between backend/frontend
3. **Simplified Tooling**: Single set of dev dependencies, linting, formatting
4. **Easy Refactoring**: Rename/move code across boundaries confidently
5. **Unified CI/CD**: Single pipeline, consistent testing
6. **Fast Builds**: Turborepo caches and parallelizes builds

**Trade-offs**:
- Slightly more complex initial setup (mitigated by good tooling)
- All developers need access to full codebase (fine for small team)
- Build tooling overhead (Turborepo handles this well)

### Alternative: Multi-Repo (NOT RECOMMENDED for MVP)

Would require separate repos for `vrss-api` and `vrss-web`, with shared types as npm package. This adds complexity for MVP with minimal benefit.

---

## Containerization Strategy

### Multi-Container Architecture with Docker Compose

**Approach**: Separate containers for each service, orchestrated by Docker Compose.

#### Container Breakdown

```mermaid
graph TB
    subgraph "Docker Compose"
        NGINX[nginx<br/>:8080 → :80]
        API[api<br/>:3000]
        WEB[web<br/>:5173 dev / static prod]
        DB[(postgres<br/>:5432)]
        STORAGE[minio<br/>:9000, :9001]

        NGINX --> API
        NGINX --> WEB
        API --> DB
        API --> STORAGE
    end

    USER([User]) --> NGINX

    style NGINX fill:#e8f5e9
    style API fill:#fff4e1
    style WEB fill:#e1f5ff
    style DB fill:#f0f0f0
    style STORAGE fill:#fce4ec
```

#### Container Definitions

**1. NGINX (Reverse Proxy)**
- Routes `/api/*` to backend
- Routes `/` to frontend
- Handles SSL termination (production)
- Serves static assets efficiently
- Health check endpoints

**2. API (Backend)**
- Bun runtime with Hono framework
- Exposes RPC endpoints on port 3000
- Connects to PostgreSQL
- Connects to S3/MinIO
- Hot reload in development

**3. Web (Frontend)**
- Development: Vite dev server with HMR
- Production: Static files served by NGINX
- PWA service worker
- Client-side routing

**4. PostgreSQL**
- Primary data store
- Persistent volume for data
- Automated backups (production)
- Connection pooling

**5. MinIO (Local S3)**
- S3-compatible object storage
- Local development only
- Production uses real S3

### Docker Compose Configuration

#### docker-compose.yml (Development)

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
      - web
    networks:
      - vrss-network

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
      target: development
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://vrss:vrss_dev_password@postgres:5432/vrss_dev
      - S3_ENDPOINT=http://minio:9000
      - S3_ACCESS_KEY=minioadmin
      - S3_SECRET_KEY=minioadmin
      - S3_BUCKET=vrss-media
      - NODE_ENV=development
    volumes:
      - ./apps/api/src:/app/apps/api/src
      - ./packages:/app/packages
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_started
    networks:
      - vrss-network
    command: bun run dev

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      target: development
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:8080/api
    volumes:
      - ./apps/web/src:/app/apps/web/src
      - ./packages:/app/packages
    networks:
      - vrss-network
    command: bun run dev

  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=vrss
      - POSTGRES_PASSWORD=vrss_dev_password
      - POSTGRES_DB=vrss_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vrss"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - vrss-network

  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    networks:
      - vrss-network

volumes:
  postgres_data:
  minio_data:

networks:
  vrss-network:
    driver: bridge
```

#### docker-compose.prod.yml (Production)

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
      - web_static:/usr/share/nginx/html
    depends_on:
      - api
    networks:
      - vrss-network
    restart: unless-stopped

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
      target: production
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - S3_ENDPOINT=${S3_ENDPOINT}
      - S3_ACCESS_KEY=${S3_ACCESS_KEY}
      - S3_SECRET_KEY=${S3_SECRET_KEY}
      - S3_BUCKET=${S3_BUCKET}
      - NODE_ENV=production
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - BETTER_AUTH_URL=${BETTER_AUTH_URL}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - vrss-network
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2'
          memory: 1G

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - vrss-network
    restart: unless-stopped

volumes:
  postgres_data:
  web_static:

networks:
  vrss-network:
    driver: bridge
```

### Dockerfile Structure

#### apps/api/Dockerfile

```dockerfile
# Base stage
FROM oven/bun:1 AS base
WORKDIR /app

# Dependencies stage
FROM base AS dependencies
COPY package.json bun.lockb ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN bun install --frozen-lockfile

# Development stage
FROM base AS development
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["bun", "run", "--cwd", "apps/api", "dev"]

# Build stage
FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN bun run --cwd apps/api build

# Production stage
FROM base AS production
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages ./packages
EXPOSE 3000
CMD ["bun", "run", "apps/api/dist/main.js"]
```

#### apps/web/Dockerfile

```dockerfile
# Base stage
FROM oven/bun:1 AS base
WORKDIR /app

# Dependencies stage
FROM base AS dependencies
COPY package.json bun.lockb ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN bun install --frozen-lockfile

# Development stage
FROM base AS development
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
CMD ["bun", "run", "--cwd", "apps/web", "dev", "--host"]

# Build stage
FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN bun run --cwd apps/web build

# Production stage (static files)
FROM nginx:alpine AS production
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY docker/nginx/web.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### Rationale for Multi-Container

**Advantages**:
1. **Separation of Concerns**: Each service isolated
2. **Independent Scaling**: Scale API without scaling frontend
3. **Clear Boundaries**: Network isolation between services
4. **Easy Testing**: Test services independently
5. **Production-Ready**: Same structure in dev and prod
6. **Service Extraction**: Easy to move container to separate host later

**Trade-offs**:
- More containers to manage (mitigated by docker-compose)
- Slight overhead vs single container (negligible for MVP)

---

## Backend Architecture

### Module Structure (Feature-Based)

```
apps/api/src/
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts        # RPC routes
│   │   ├── auth.service.ts       # Business logic
│   │   ├── auth.schemas.ts       # Zod validation
│   │   └── auth.test.ts          # Unit tests
│   │
│   ├── users/
│   │   ├── users.routes.ts
│   │   ├── users.service.ts
│   │   ├── users.repository.ts   # Database access
│   │   ├── users.schemas.ts
│   │   └── users.test.ts
│   │
│   ├── posts/
│   │   ├── posts.routes.ts
│   │   ├── posts.service.ts
│   │   ├── posts.repository.ts
│   │   ├── posts.schemas.ts
│   │   └── posts.test.ts
│   │
│   ├── feeds/
│   │   ├── feeds.routes.ts
│   │   ├── feeds.service.ts
│   │   ├── feeds.repository.ts
│   │   ├── feed-algorithm.service.ts   # Custom feed logic
│   │   ├── feeds.schemas.ts
│   │   └── feeds.test.ts
│   │
│   ├── profiles/
│   │   ├── profiles.routes.ts
│   │   ├── profiles.service.ts
│   │   ├── profiles.repository.ts
│   │   ├── profiles.schemas.ts
│   │   └── profiles.test.ts
│   │
│   └── messages/
│       ├── messages.routes.ts
│       ├── messages.service.ts
│       ├── messages.repository.ts
│       ├── messages.schemas.ts
│       └── messages.test.ts
│
├── lib/
│   ├── db.ts                     # Database client
│   ├── s3.ts                     # S3 client
│   ├── logger.ts                 # Structured logging
│   ├── errors.ts                 # Error handling
│   └── validation.ts             # Common validators
│
├── db/
│   ├── schema.ts                 # Drizzle schema
│   └── migrations/               # Generated migrations
│
├── middleware/
│   ├── auth.middleware.ts        # Better-auth integration
│   ├── error.middleware.ts       # Global error handler
│   └── logger.middleware.ts      # Request logging
│
├── types/
│   └── index.ts                  # Local types
│
└── main.ts                       # App bootstrapping
```

### RPC API Pattern with Hono

**Example: User Module**

```typescript
// apps/api/src/modules/users/users.routes.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createUserSchema, updateUserSchema } from './users.schemas';
import { UserService } from './users.service';

const userRoutes = new Hono();
const userService = new UserService();

// RPC-style endpoints
userRoutes
  .post(
    '/users.create',
    zValidator('json', createUserSchema),
    async (c) => {
      const data = c.req.valid('json');
      const user = await userService.create(data);
      return c.json({ success: true, data: user });
    }
  )
  .post(
    '/users.getById',
    zValidator('json', z.object({ id: z.string() })),
    async (c) => {
      const { id } = c.req.valid('json');
      const user = await userService.getById(id);
      return c.json({ success: true, data: user });
    }
  )
  .post(
    '/users.update',
    zValidator('json', updateUserSchema),
    async (c) => {
      const data = c.req.valid('json');
      const user = await userService.update(data);
      return c.json({ success: true, data: user });
    }
  );

export default userRoutes;
```

```typescript
// apps/api/src/modules/users/users.service.ts
import { UserRepository } from './users.repository';
import { CreateUserInput, UpdateUserInput } from '@vrss/shared-types';

export class UserService {
  private repo = new UserRepository();

  async create(input: CreateUserInput) {
    // Business logic
    // Validation
    // Call repository
    return this.repo.create(input);
  }

  async getById(id: string) {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async update(input: UpdateUserInput) {
    // Business logic
    return this.repo.update(input);
  }
}
```

```typescript
// apps/api/src/main.ts
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/users.routes';
import postRoutes from './modules/posts/posts.routes';
// ... other routes

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({ origin: process.env.FRONTEND_URL }));

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// API routes
app.route('/api', authRoutes);
app.route('/api', userRoutes);
app.route('/api', postRoutes);
// ... other routes

// Start server
const port = process.env.PORT || 3000;
console.log(`🚀 API server running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
```

### Type-Safe RPC Client Generation

Use code generation to create type-safe client from server routes.

```typescript
// packages/shared-types/src/api/users.ts
export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
}

export interface UpdateUserInput {
  id: string;
  username?: string;
  bio?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  bio: string | null;
  createdAt: Date;
}
```

---

## Frontend Architecture

### Feature-Based Organization

```
apps/web/src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── AuthLayout.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useSession.ts
│   │   ├── api/
│   │   │   └── auth-client.ts        # RPC client wrapper
│   │   ├── stores/
│   │   │   └── auth-store.ts         # Global auth state
│   │   └── pages/
│   │       ├── LoginPage.tsx
│   │       └── RegisterPage.tsx
│   │
│   ├── profile/
│   │   ├── components/
│   │   │   ├── ProfileHeader.tsx
│   │   │   ├── ProfileSection.tsx
│   │   │   ├── ProfileCustomizer.tsx
│   │   │   └── SectionBuilder.tsx
│   │   ├── hooks/
│   │   │   ├── useProfile.ts
│   │   │   └── useProfileCustomization.ts
│   │   ├── api/
│   │   │   └── profile-client.ts
│   │   └── pages/
│   │       ├── ProfilePage.tsx
│   │       └── EditProfilePage.tsx
│   │
│   ├── feed/
│   │   ├── components/
│   │   │   ├── FeedContainer.tsx
│   │   │   ├── PostCard.tsx
│   │   │   ├── FeedTabs.tsx
│   │   │   └── AlgorithmBuilder.tsx   # Visual feed builder
│   │   ├── hooks/
│   │   │   ├── useFeed.ts
│   │   │   └── useAlgorithm.ts
│   │   ├── api/
│   │   │   └── feed-client.ts
│   │   └── pages/
│   │       ├── HomePage.tsx
│   │       └── CreateFeedPage.tsx
│   │
│   ├── posts/
│   │   ├── components/
│   │   │   ├── CreatePost.tsx
│   │   │   ├── PostDetail.tsx
│   │   │   └── CommentThread.tsx
│   │   ├── hooks/
│   │   │   ├── usePost.ts
│   │   │   └── useComments.ts
│   │   ├── api/
│   │   │   └── posts-client.ts
│   │   └── pages/
│   │       └── PostPage.tsx
│   │
│   ├── discover/
│   │   ├── components/
│   │   │   ├── DiscoverFeed.tsx
│   │   │   └── SearchBar.tsx
│   │   ├── hooks/
│   │   │   └── useDiscover.ts
│   │   └── pages/
│   │       └── DiscoverPage.tsx
│   │
│   └── settings/
│       ├── components/
│       │   ├── AccountSettings.tsx
│       │   └── StorageManager.tsx
│       ├── hooks/
│       │   └── useSettings.ts
│       └── pages/
│           └── SettingsPage.tsx
│
├── components/
│   ├── ui/                           # Shadcn components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── ...
│   └── common/                       # Shared components
│       ├── Layout.tsx
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── ErrorBoundary.tsx
│
├── lib/
│   ├── api-client.ts                 # Base RPC client
│   ├── query-client.ts               # React Query config
│   ├── utils.ts                      # Utility functions
│   └── pwa.ts                        # PWA utilities
│
├── hooks/
│   ├── useMediaQuery.ts
│   ├── useDebounce.ts
│   └── useInfiniteScroll.ts
│
├── routes/
│   └── index.tsx                     # Route configuration
│
├── App.tsx
└── main.tsx
```

### RPC Client Usage

```typescript
// apps/web/src/lib/api-client.ts
import { hc } from 'hono/client';
import type { AppType } from '../../../api/src/main'; // Type import from backend

export const apiClient = hc<AppType>(import.meta.env.VITE_API_URL);

// Type-safe RPC calls
export const api = {
  users: {
    create: (data) => apiClient.api.users.create.$post({ json: data }),
    getById: (id) => apiClient.api.users.getById.$post({ json: { id } }),
    update: (data) => apiClient.api.users.update.$post({ json: data }),
  },
  // ... other modules
};
```

```typescript
// apps/web/src/features/profile/hooks/useProfile.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useProfile(userId: string) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const response = await api.users.getById(userId);
      const data = await response.json();
      return data.data;
    },
  });
}
```

### PWA Configuration

```typescript
// apps/web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Vrss Social',
        short_name: 'Vrss',
        description: 'Customizable social platform',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.vrss\.app\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
});
```

---

## Database Management

### Schema Design with Drizzle ORM

```typescript
// apps/api/src/db/schema.ts
import { pgTable, text, timestamp, boolean, integer, jsonb, uuid } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').unique().notNull(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  bio: text('bio'),
  profileImageUrl: text('profile_image_url'),
  backgroundType: text('background_type'), // 'color' | 'image'
  backgroundValue: text('background_value'),
  customStyles: jsonb('custom_styles'), // JSON for fonts, colors
  storageUsedBytes: integer('storage_used_bytes').default(0),
  storageLimit: integer('storage_limit').default(52428800), // 50MB
  isPaid: boolean('is_paid').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Profile sections table
export const profileSections = pgTable('profile_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: text('type').notNull(), // 'feed' | 'gallery' | 'links' | etc
  title: text('title').notNull(),
  config: jsonb('config').notNull(), // Section-specific config
  order: integer('order').notNull(),
  isVisible: boolean('is_visible').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Posts table
export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  type: text('type').notNull(), // 'text' | 'image' | 'video' | 'song'
  content: text('content'),
  mediaUrls: jsonb('media_urls'), // Array of media URLs
  metadata: jsonb('metadata'), // Type-specific metadata
  isPublic: boolean('is_public').default(true),
  likeCount: integer('like_count').default(0),
  commentCount: integer('comment_count').default(0),
  repostCount: integer('repost_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Custom feeds table
export const customFeeds = pgTable('custom_feeds', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  algorithm: jsonb('algorithm').notNull(), // Visual algorithm blocks
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Follows table
export const follows = pgTable('follows', {
  id: uuid('id').primaryKey().defaultRandom(),
  followerId: uuid('follower_id').references(() => users.id).notNull(),
  followingId: uuid('following_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Likes table
export const likes = pgTable('likes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  postId: uuid('post_id').references(() => posts.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Comments table
export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').references(() => posts.id).notNull(),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  parentId: uuid('parent_id'), // For nested comments
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Messages table
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  senderId: uuid('sender_id').references(() => users.id).notNull(),
  recipientId: uuid('recipient_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Notifications table
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: text('type').notNull(), // 'follow' | 'like' | 'comment' | 'mention'
  actorId: uuid('actor_id').references(() => users.id),
  targetId: uuid('target_id'), // Post/comment ID
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### Migration Strategy

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './apps/api/src/db/schema.ts',
  out: './apps/api/drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

**Migration Workflow**:

```bash
# Generate migration from schema changes
bun drizzle-kit generate:pg

# Apply migrations to database
bun drizzle-kit push:pg

# Seed database for development
bun run seed
```

### Database Connection

```typescript
// apps/api/src/lib/db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema';

const connectionString = process.env.DATABASE_URL!;

// Connection pool
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
```

### Repository Pattern

```typescript
// apps/api/src/modules/users/users.repository.ts
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export class UserRepository {
  async create(data: CreateUserInput) {
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

  async update(id: string, data: UpdateUserInput) {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async delete(id: string) {
    await db.delete(users).where(eq(users.id, id));
  }
}
```

---

## Development Workflow

### Local Development Setup

```bash
# Clone repository
git clone https://github.com/your-org/vrss.git
cd vrss

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env

# Start all services
docker-compose up -d

# Run migrations
bun run db:migrate

# Seed database (optional)
bun run db:seed

# Start development servers
bun run dev

# Access services:
# - Frontend: http://localhost:8080
# - API: http://localhost:8080/api
# - API direct: http://localhost:3000
# - PostgreSQL: localhost:5432
# - MinIO Console: http://localhost:9001
```

### Development Commands

```json
// package.json (root)
{
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "test": "turbo run test",
    "test:e2e": "turbo run test:e2e",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,md}\"",
    "type-check": "turbo run type-check",
    "db:migrate": "bun run --cwd apps/api db:migrate",
    "db:seed": "bun run --cwd apps/api db:seed",
    "db:studio": "drizzle-kit studio",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f",
    "generate:types": "bun run --cwd apps/api generate:types"
  }
}
```

```json
// apps/api/package.json
{
  "scripts": {
    "dev": "bun --watch src/main.ts",
    "build": "bun build src/main.ts --outdir dist --target bun",
    "start": "bun dist/main.js",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "lint": "eslint . --ext .ts",
    "type-check": "tsc --noEmit",
    "db:migrate": "drizzle-kit push:pg",
    "db:generate": "drizzle-kit generate:pg",
    "db:seed": "bun run scripts/seed.ts"
  }
}
```

```json
// apps/web/package.json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext .ts,.tsx",
    "type-check": "tsc --noEmit"
  }
}
```

### Hot Reload Configuration

- **Backend**: Bun's `--watch` flag for file watching
- **Frontend**: Vite's HMR (Hot Module Replacement)
- **Database**: Volume mount for persistent data
- **Shared Types**: Turborepo watches for changes and rebuilds

### Turborepo Configuration

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
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
```

---

## Environment Configuration

### Environment Variables

```bash
# .env.example
# Database
DATABASE_URL=postgresql://vrss:vrss_dev_password@localhost:5432/vrss_dev

# S3 Storage
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=vrss-media
S3_REGION=us-east-1

# Better-auth
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:3000

# API
API_PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Frontend
VITE_API_URL=http://localhost:8080/api
```

### Production Environment

```bash
# .env.production (example - use secrets management in production)
# Database
DATABASE_URL=postgresql://user:pass@db-host:5432/vrss_prod

# S3 Storage (AWS S3)
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY=<aws-access-key>
S3_SECRET_KEY=<aws-secret-key>
S3_BUCKET=vrss-production-media
S3_REGION=us-west-2

# Better-auth
BETTER_AUTH_SECRET=<strong-random-secret>
BETTER_AUTH_URL=https://api.vrss.app

# API
API_PORT=3000
NODE_ENV=production
FRONTEND_URL=https://vrss.app

# Frontend
VITE_API_URL=https://api.vrss.app
```

### Configuration Loading

```typescript
// apps/api/src/lib/config.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  S3_ENDPOINT: z.string().url(),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_BUCKET: z.string(),
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  FRONTEND_URL: z.string().url(),
});

export const config = envSchema.parse(process.env);
```

---

## Testing Strategy

### Test Pyramid

```
        /\
       /  \          E2E Tests (Playwright)
      /____\         - Critical user journeys
     /      \        - Cross-browser testing
    /        \
   /  Integ.  \      Integration Tests (Vitest)
  /____________\     - API endpoints
 /              \    - Database operations
/   Unit Tests   \   - Business logic
/________________\   - Utilities
```

### Unit Tests

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
    const input = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    };

    const user = await service.create(input);

    expect(user.username).toBe('testuser');
    expect(user.email).toBe('test@example.com');
    expect(user.passwordHash).toBeDefined();
    expect(user.passwordHash).not.toBe('password123'); // Should be hashed
  });

  it('should throw error for duplicate username', async () => {
    const input = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    };

    await service.create(input);

    await expect(service.create(input)).rejects.toThrow('Username already exists');
  });
});
```

### Integration Tests

```typescript
// apps/api/src/modules/users/users.routes.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { testClient } from 'hono/testing';
import app from '../../main';
import { db } from '@/lib/db';
import { users } from '@/db/schema';

describe('User Routes', () => {
  const client = testClient(app);

  afterAll(async () => {
    // Cleanup test data
    await db.delete(users).where(eq(users.username, 'testuser'));
  });

  it('POST /api/users.create should create user', async () => {
    const response = await client.api.users.create.$post({
      json: {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.username).toBe('testuser');
  });

  it('POST /api/users.getById should return user', async () => {
    // Assume user created in previous test
    const response = await client.api.users.getById.$post({
      json: { id: 'user-id' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.username).toBeDefined();
  });
});
```

### E2E Tests

```typescript
// apps/web/tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should register new user', async ({ page }) => {
    await page.goto('http://localhost:8080/register');

    await page.fill('input[name="username"]', 'newuser');
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('http://localhost:8080/home');
    await expect(page.locator('text=Welcome, newuser')).toBeVisible();
  });

  test('should login existing user', async ({ page }) => {
    await page.goto('http://localhost:8080/login');

    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('http://localhost:8080/home');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:8080/login');

    await page.fill('input[name="username"]', 'wronguser');
    await page.fill('input[name="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });
});
```

### Test Database Setup

```typescript
// apps/api/src/lib/test-db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema';

// Use separate test database
const testConnectionString = process.env.TEST_DATABASE_URL ||
  'postgresql://vrss:vrss_test@localhost:5432/vrss_test';

const client = postgres(testConnectionString, { max: 1 });
export const testDb = drizzle(client, { schema });

// Reset database between tests
export async function resetTestDb() {
  // Truncate all tables
  await testDb.execute('TRUNCATE TABLE users, posts, comments, ... CASCADE');
}
```

---

## Scalability Path

### Phase 1: Monolith (MVP - 0-10K users)

**Current Architecture**:
- Single API server (can run multiple instances behind NGINX)
- Single PostgreSQL database
- S3 for media storage
- All features in one codebase

**Scaling Levers**:
- Vertical scaling (larger VM/container)
- Horizontal API scaling (multiple API containers)
- Database connection pooling
- Redis cache layer (add when needed)
- CDN for static assets

### Phase 2: Optimized Monolith (10K-100K users)

**Enhancements**:

```mermaid
graph TB
    LB[Load Balancer]

    subgraph "API Tier - Horizontal Scale"
        API1[API Instance 1]
        API2[API Instance 2]
        API3[API Instance 3]
    end

    CACHE[(Redis Cache)]
    DB[(PostgreSQL<br/>Primary)]
    REPLICA[(PostgreSQL<br/>Read Replica)]
    S3[S3 Storage]
    CDN[CDN]

    LB --> API1
    LB --> API2
    LB --> API3

    API1 --> CACHE
    API2 --> CACHE
    API3 --> CACHE

    API1 --> DB
    API2 --> DB
    API3 --> DB

    API1 --> REPLICA
    API2 --> REPLICA
    API3 --> REPLICA

    API1 --> S3
    S3 --> CDN
```

**Changes**:
- Add Redis for caching (sessions, feed data, discovery algorithms)
- PostgreSQL read replicas for read-heavy operations
- CDN for media delivery
- Load balancer for API instances
- Background job queue (BullMQ) for async tasks

**Code Changes**:
- Extract background jobs to separate module
- Add caching layer in repositories
- Database query optimization

### Phase 3: Service Extraction (100K-1M users)

**Candidates for Extraction** (in order of priority):

1. **Media Service** (First to extract)
   - Handles uploads, processing, storage
   - Resource-intensive operations
   - Clear boundaries

2. **Feed Algorithm Engine**
   - Complex computation for custom feeds
   - Can be scaled independently
   - Stateless processing

3. **Notification Service**
   - High-throughput writes
   - Real-time delivery
   - Independent scaling needs

4. **Messaging Service**
   - Real-time communication
   - WebSocket connections
   - Separate infrastructure needs

```mermaid
graph TB
    LB[Load Balancer]

    subgraph "Core API - Monolith"
        API[Core API<br/>Users, Posts, Profiles]
    end

    subgraph "Extracted Services"
        MEDIA[Media Service<br/>Upload, Process, Store]
        FEED[Feed Engine<br/>Algorithm Execution]
        NOTIF[Notification Service<br/>Real-time Alerts]
        MSG[Messaging Service<br/>WebSocket + Chat]
    end

    DB[(PostgreSQL)]
    CACHE[(Redis)]
    S3[S3 Storage]
    QUEUE[Message Queue]

    LB --> API
    LB --> MEDIA
    LB --> FEED
    LB --> NOTIF
    LB --> MSG

    API --> DB
    API --> CACHE
    API --> QUEUE

    MEDIA --> S3
    MEDIA --> QUEUE

    FEED --> DB
    FEED --> CACHE

    NOTIF --> QUEUE
    MSG --> DB
```

**Migration Strategy**:

1. **Identify Service Boundary**
   - Clear domain separation
   - Minimal dependencies
   - Well-defined API contract

2. **Create Service Package**
   ```
   apps/
   ├── api/              # Core monolith
   ├── media-service/    # New extracted service
   ├── feed-engine/      # New extracted service
   └── web/
   ```

3. **Implement API Contract**
   - Define RPC or REST interface
   - Share types via `packages/shared-types`
   - Add service discovery

4. **Gradual Migration**
   - Strangler pattern: Route new requests to new service
   - Keep old code as fallback
   - Migrate data incrementally
   - Remove old code after validation

5. **Deploy Independently**
   - Separate Dockerfile for each service
   - Independent CI/CD pipeline
   - Service-specific scaling

### Phase 4: Full Microservices (1M+ users)

**Only if needed**:
- Complete service decomposition
- Event-driven architecture
- Service mesh (Istio, Linkerd)
- Distributed tracing (Jaeger, OpenTelemetry)
- API gateway with rate limiting
- Separate databases per service

**Trade-offs**:
- Much higher operational complexity
- Distributed transaction challenges
- Network latency between services
- More complex testing and debugging

**Recommendation**: Stay in Phase 2-3 as long as possible. Most applications never need full microservices.

---

## Deployment Strategy

### Development Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Restart service after changes
docker-compose restart api

# Stop all services
docker-compose down

# Clean up volumes (reset data)
docker-compose down -v
```

### Production Deployment Options

#### Option 1: Docker Compose on VPS (Simplest)

**Suitable for**: MVP, small user base (0-10K users)

**Setup**:
- Single VPS (DigitalOcean, Linode, Hetzner)
- Docker + Docker Compose
- NGINX for SSL termination
- Managed PostgreSQL (optional)
- S3 for media

**Deployment**:
```bash
# On server
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build

# Zero-downtime with scale
docker-compose -f docker-compose.prod.yml up -d --scale api=2 --no-recreate
```

#### Option 2: Cloud Platform (Recommended)

**Suitable for**: Growth phase (10K+ users)

**Options**:
- **Railway**: Simple, auto-scaling, built-in CI/CD
- **Fly.io**: Global edge deployment, simple configuration
- **Render**: Easy setup, managed databases
- **DigitalOcean App Platform**: Managed containers

**Configuration Example (Fly.io)**:
```toml
# fly.toml
app = "vrss-api"

[build]
  dockerfile = "apps/api/Dockerfile"

[[services]]
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

[env]
  NODE_ENV = "production"
```

#### Option 3: Kubernetes (Advanced)

**Only when**: Multiple services, high scale, dedicated DevOps team

**Not recommended for MVP**.

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test
      - run: bun run lint
      - run: bun run type-check

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker images
        run: |
          docker build -f apps/api/Dockerfile -t vrss-api:${{ github.sha }} .
          docker build -f apps/web/Dockerfile -t vrss-web:${{ github.sha }} .

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          # Deploy via platform CLI (Railway, Fly.io, etc.)
          # Or SSH to VPS and run docker-compose
```

---

## Summary

### What We Built

✅ **Monorepo structure** with clear separation between backend and frontend
✅ **Multi-container Docker setup** for development and production
✅ **Type-safe RPC API** using Bun + Hono with shared types
✅ **Modern frontend** with React, Vite, PWA capabilities
✅ **PostgreSQL** with Drizzle ORM for type-safe database access
✅ **Testing strategy** covering unit, integration, and E2E tests
✅ **Clear scalability path** from monolith to services

### Key Principles

1. **MVP-First**: Start simple, add complexity when needed
2. **Separation of Concerns**: Clear boundaries between components
3. **Type Safety**: TypeScript everywhere, shared types
4. **Containerized**: Consistent environments from dev to prod
5. **Testable**: Test-driven from day one
6. **Scalable**: Architecture supports growth without rewrites

### Next Steps

1. **Setup monorepo structure** with workspaces
2. **Configure Docker Compose** for local development
3. **Implement core backend modules** (auth, users, posts)
4. **Build frontend features** with PWA support
5. **Write tests** for critical paths
6. **Deploy to staging environment**
7. **Launch MVP** 🚀

### Decision Summary

| Decision | Choice | Why |
|----------|--------|-----|
| Repo Structure | Monorepo | Type sharing, atomic commits, unified tooling |
| Backend Runtime | Bun | Fast, modern, TypeScript-native |
| Backend Framework | Hono | Lightweight, RPC-style, type-safe |
| Frontend Build | Vite | Fast HMR, modern, PWA support |
| Database | PostgreSQL | Reliable, ACID, JSON support |
| ORM | Drizzle | Type-safe, lightweight, migrations |
| Containerization | Multi-container | Clear boundaries, independent scaling |
| Testing | Vitest + Playwright | Fast, modern, comprehensive |
| Build Cache | Turborepo | Fast incremental builds |

---

**Questions or Clarifications?** This document provides the foundation. Let's discuss any adjustments before implementation.
