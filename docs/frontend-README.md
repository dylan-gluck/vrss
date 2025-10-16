# VRSS Frontend Documentation

**VRSS Social Platform - PWA Frontend Architecture**

---

## Overview

This directory contains comprehensive documentation for the VRSS frontend, a Progressive Web App (PWA) built with React, TypeScript, Shadcn-ui, and Tailwind CSS. The frontend emphasizes mobile-first design, offline capabilities, and user customization.

---

## Documentation Index

### Core Architecture

**[frontend-architecture.md](./frontend-architecture.md)**
- Complete architectural overview
- Technology stack and decisions
- Project structure and organization
- State management strategy (Zustand + TanStack Query)
- Component architecture patterns
- Routing structure
- PWA configuration
- Offline storage strategy
- Performance optimization
- API integration patterns

**Key Sections:**
- Multi-layered state management
- Feature-based directory structure
- PWA setup with Vite PWA plugin
- Service worker caching strategies
- Real-time updates via polling
- Accessibility features

---

### Component Specifications

**[component-specifications.md](./component-specifications.md)**
- Detailed component specifications
- Props and interfaces
- UI layouts and behaviors
- Responsive breakpoints
- Touch gestures
- Animation guidelines
- Loading and error states
- Accessibility checklist

**Featured Components:**
- Feed Builder (visual algorithm builder)
- Profile Editor (styles, layout, sections)
- Post Components (text, image, video, song, gallery)
- Navigation (bottom nav, sidebar, mobile header)
- Form Components (auth, search, validation)

---

### Implementation Guide

**[frontend-implementation-guide.md](./frontend-implementation-guide.md)**
- Step-by-step setup instructions
- Phase-by-phase implementation plan
- Code examples and templates
- Configuration files
- Development workflow
- Testing strategy
- Deployment options

**Implementation Phases:**
1. Project Setup (Vite, TypeScript, Tailwind, Shadcn-ui)
2. Core Infrastructure (utilities, hooks, RPC client)
3. Authentication (login, register, auth guard)
4. Feed System (posts, infinite scroll, algorithm builder)
5. Profile System (display, editor, customization)
6. PWA Features (offline support, install prompt)
7. Polish & Optimization

---

### API Integration

**[frontend-api-integration.md](./frontend-api-integration.md)**
- RPC client implementation
- Feature-specific API modules
- File upload integration (two-phase S3 upload)
- Real-time updates (polling strategies)
- Error handling patterns
- Caching strategies
- Optimistic updates
- Type safety

**API Modules:**
- Feed API (posts, comments, algorithms)
- Profile API (styles, layout, followers)
- Messages API (threads, conversations)
- Notifications API (alerts, unread counts)
- Search API (users, posts, hashtags)
- Upload API (S3 integration)

---

## Quick Start

### Prerequisites

```bash
Node.js 20+
npm or pnpm
```

### Installation

```bash
# Clone repository
git clone <repository-url>
cd vrss/frontend

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local

# Start development server
npm run dev
```

### Project Structure

```
frontend/
├── src/
│   ├── app/              # App initialization
│   ├── features/         # Feature modules
│   │   ├── auth/
│   │   ├── profile/
│   │   ├── feed/
│   │   ├── messages/
│   │   ├── notifications/
│   │   ├── search/
│   │   └── settings/
│   ├── components/       # Shared components
│   │   ├── ui/          # Shadcn-ui components
│   │   ├── layout/      # Layout components
│   │   └── common/      # Common components
│   ├── lib/             # Core utilities
│   │   ├── api/         # RPC client
│   │   ├── hooks/       # Custom hooks
│   │   ├── utils/       # Utility functions
│   │   └── constants/   # Constants
│   ├── pages/           # Page components
│   └── styles/          # Global styles
└── public/              # Static assets
```

---

## Key Features

### 1. Profile Customization

Users can fully customize their profiles with:
- **Styles**: Background (color/gradient/image), colors, fonts, background music
- **Layout**: Drag-and-drop section management, multi-column layouts
- **Sections**: Feeds, galleries, links, text, images, videos, friends lists

**Implementation**: Visual editor with live preview using Shadcn-ui components

### 2. Visual Feed Builder

Apple Shortcuts-style algorithm builder for creating custom feeds:
- **Filter Blocks**: Author, post type, hashtags, date range
- **Sort Blocks**: Popular, recent, random
- **Limit Block**: Maximum posts
- **Drag-and-drop**: Reorder and connect blocks
- **Visual Flow**: See how data flows through filters

**Implementation**: DnD Kit for drag-and-drop, custom block components

### 3. Progressive Web App

Full PWA capabilities:
- **Offline Support**: Service worker caching, IndexedDB storage
- **Install Prompt**: Add to home screen
- **Background Sync**: Queue actions when offline
- **Push Notifications**: (future enhancement)

**Implementation**: Vite PWA plugin, Workbox caching strategies

### 4. Mobile-First Design

Optimized for mobile with progressive enhancement:
- **Touch Gestures**: Swipe navigation, pull to refresh, pinch to zoom
- **Bottom Navigation**: Easy thumb access
- **Responsive**: Adapts to tablet and desktop
- **Performance**: Virtual scrolling, lazy loading, code splitting

### 5. Real-time Updates

Stay updated without WebSockets (MVP):
- **Polling**: Smart interval adjustment based on view
- **Notifications**: 30-second polls when authenticated
- **Messages**: 5-10 second polls in messages view
- **Optimistic Updates**: Instant UI feedback

---

## Technology Stack

### Core

- **React 18.3+**: Concurrent features, Suspense
- **TypeScript 5.5+**: Full type safety
- **Vite 5+**: Fast build tool
- **React Router 6.23+**: Client-side routing

### UI & Styling

- **Shadcn-ui**: Accessible component library (Radix UI + Tailwind)
- **Tailwind CSS 3.4+**: Utility-first CSS
- **Lucide React**: Icon library
- **class-variance-authority**: Component variants

### State Management

- **Zustand 4.5+**: Global client state
- **TanStack Query 5+**: Server state, caching
- **React Hook Form 7.5+**: Form state

### Features

- **DnD Kit**: Drag-and-drop functionality
- **TanStack Virtual**: Virtual scrolling
- **React Dropzone**: File uploads
- **Zod**: Schema validation
- **date-fns**: Date utilities
- **idb**: IndexedDB wrapper

### PWA

- **Vite PWA Plugin**: Service worker generation
- **Workbox**: Caching strategies

---

## Architecture Highlights

### State Management Strategy

Multi-layered approach:

1. **Server State** (TanStack Query): API data, caching, pagination
2. **Global Client State** (Zustand): Auth, UI state, offline queue
3. **Feature State** (Zustand slices): Profile editing, feed builder
4. **Local State** (useState/useReducer): Form inputs, UI interactions

### Component Design Principles

- **Single Responsibility**: Each component does one thing well
- **Composition**: Build complex UIs from simple components
- **Accessibility First**: WCAG 2.1 AA compliance
- **Mobile-First**: Design for smallest screen, enhance upward
- **Type Safety**: Full TypeScript coverage

### Performance Optimizations

- **Code Splitting**: Lazy load routes and heavy components
- **Virtual Scrolling**: Efficient rendering of long lists
- **Memoization**: Prevent unnecessary re-renders
- **Image Optimization**: Lazy loading, responsive images, WebP
- **Bundle Optimization**: Tree shaking, code splitting, < 500KB initial

### Offline Strategy

- **Service Worker**: Cache static assets and API responses
- **IndexedDB**: Store posts, profiles, drafts
- **Offline Queue**: Queue mutations for sync when online
- **Background Sync**: Process queue when connection restored

---

## Development Workflow

### Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run type-check   # TypeScript validation
npm run lint         # ESLint
npm run format       # Prettier
```

### Adding Shadcn Components

```bash
npx shadcn-ui@latest add <component-name>
```

### Code Organization

- **Feature modules**: Group by domain (auth, feed, profile)
- **Colocation**: Keep related files together
- **Barrel exports**: Clean imports with index.ts files
- **Path aliases**: Use `@/*` for absolute imports

---

## API Integration

### RPC Client Pattern

```typescript
// Call RPC method
const result = await rpcClient.call('post.create', { content: 'Hello' });

// Batch calls
const results = await rpcClient.batch([
  { method: 'user.get', params: { id: '1' } },
  { method: 'user.get', params: { id: '2' } },
]);
```

### TanStack Query Integration

```typescript
// Query
const { data, isLoading } = useQuery({
  queryKey: ['posts'],
  queryFn: () => feedApi.getFeed(),
});

// Mutation with optimistic update
const mutation = useMutation({
  mutationFn: feedApi.likePost,
  onMutate: async (postId) => {
    // Optimistically update UI
  },
  onError: (err, variables, context) => {
    // Rollback on error
  },
});
```

### File Upload Flow

```typescript
// 1. Get signed URL
const signature = await uploadApi.getUploadSignature(file.name, file.size, file.type, 'post');

// 2. Upload to S3
await uploadApi.uploadToS3(file, signature, (progress) => console.log(progress));

// 3. Confirm upload
const uploadedFile = await uploadApi.confirmUpload(signature.uploadId);
```

---

## Accessibility

### Standards

- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- Focus management
- Color contrast 4.5:1

### Implementation

- Semantic HTML
- ARIA labels and roles
- Focus trapping in modals
- Skip to main content
- Reduced motion support
- Live regions for updates

---

## Performance Targets

### Metrics

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Lighthouse Score**: > 90
- **Bundle Size**: < 500KB initial
- **Code Coverage**: > 80% (post-MVP)

### Optimization Techniques

- Route-based code splitting
- Component lazy loading
- Virtual scrolling for feeds
- Image lazy loading
- Debounced search
- Memoized expensive computations
- Service worker caching

---

## Testing Strategy

### Unit Tests (Post-MVP)

- Vitest for unit tests
- Testing Library for component tests
- Mock RPC client for API tests

### E2E Tests (Post-MVP)

- Playwright for E2E tests
- Test critical user flows
- Test offline functionality

### Manual Testing

- Test on real devices
- Test offline scenarios
- Test PWA install flow
- Screen reader testing
- Keyboard navigation testing

---

## Deployment

### Build

```bash
npm run build
# Output: dist/
```

### Environment Variables

```bash
VITE_API_URL=https://api.vrss.app
VITE_APP_NAME=VRSS
VITE_MAX_UPLOAD_SIZE=52428800
VITE_ENABLE_PWA=true
```

### Hosting Options

- **Vercel**: Zero-config deployment
- **Netlify**: Built-in PWA support
- **Cloudflare Pages**: Fast global CDN
- **Docker**: Self-hosted with nginx

---

## Browser Support

- Chrome/Edge 90+
- Firefox 90+
- Safari 14+
- Mobile Safari 14+
- Chrome Android 90+

### Progressive Enhancement

- Core functionality works in all modern browsers
- Enhanced features (PWA, gestures) in supported browsers
- Graceful degradation for older browsers

---

## Contributing

### Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Use Prettier for formatting
- Write descriptive commit messages

### Component Guidelines

- Use functional components with hooks
- Implement accessibility features
- Add TypeScript types/interfaces
- Include error boundaries
- Handle loading states
- Support keyboard navigation

### Pull Request Process

1. Create feature branch
2. Implement feature with tests
3. Update documentation
4. Submit PR with description
5. Address review feedback
6. Merge when approved

---

## Resources

### Documentation

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shadcn-ui](https://ui.shadcn.com)
- [TanStack Query](https://tanstack.com/query)
- [Zustand](https://github.com/pmndrs/zustand)

### Tools

- [Vite](https://vitejs.dev)
- [React Router](https://reactrouter.com)
- [Radix UI](https://www.radix-ui.com)
- [DnD Kit](https://dndkit.com)
- [Workbox](https://developers.google.com/web/tools/workbox)

---

## Support

For questions or issues:
1. Check documentation
2. Search existing issues
3. Create new issue with details
4. Join development Discord (if available)

---

## License

[License Type] - See LICENSE file for details

---

## Changelog

### Version 1.0 (MVP)
- Initial architecture design
- Core features documentation
- Implementation guide
- API integration patterns
- Component specifications

---

**Last Updated**: 2025-10-16
**Maintained By**: VRSS Development Team
