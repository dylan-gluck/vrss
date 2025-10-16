# Vrss Social Platform

A social media platform with a focus on personalization.

### Branding

(u)vrss
u.vrss.social
u.vrss.app

### Domains (owned)

vrss.app

vrss.social

### Profiles

Users can customize their profile styles (background, color, music) and layout (sections, feeds, blocks).

For example a music producer/artist may make their profile a feed of songs or album releases.
A restaurant may have their menu and specials in a gallery followed by a public comment wall of customer testimonials.

### Feeds

Users can create custom feeds using filters like post type, post author or group.

The home page displays one feed at a time. The user can swipe/tab between their saved feeds or create a new one.

Editing a feed algorithm should feel like using Apple Shortcuts. Easy to use logical blocks that combine to make a filter.

### Discovery

Discover page algorithms are also customizable and transparent. Create multiple versions of your ForYou page.

Default search/for-you page algorithm should be simple, popular posts within ^2 friend network as example.

---

## Subscription Model

Free storage: 50mb

Paid: 1gb +

## Profile Settings

- Username, Name, Age, Bio...
- Background color, image, music
- Font, colors
- Profile visibility
- Sections

## Post Types

- Text (short / long)
- Image (single / gallery / gif)
- Video (short / long)
- Song (single / album)

## Profile Sections

- Feed (posts by type etc)
- Gallery
- Links
- Static text
- Image
- Video (external)
- Reposts
- Friends
- Followers / Following
- Lists

---

## MVP Requirements

Web App

- Mobile first
- PWA (Offline and local-first)

Backend

- API: RPC-style (tRPC/JSON-RPC inspired) - See `/docs/api-architecture.md`
- Runtime: Bun
- Framework: Hono
- Auth: Better-auth
- DB: Postgres (with Prisma ORM)

Infrastructure

- Monolith, (containerized apps)
- Media uploads/buckets -> (s3)

### Pages

Register / Login

- Username, email, passwords

Home (Feeds)

- Primary feed (all posts from following)
- Filters & Custom feeds
- Single post + comments

Profile

- Default profile (Standard social header + feed of posts)
- Customize profile style, layout & feeds

Settings

- Change username, email, pw
- Profile visibility
- Delete account
- Manage media (show % used)
- Get more storage

Messages

- Inbox
- Message thread

Notifications

- Alerts for post / profile interaction (likes, comments, follow)

Search / Discover

- Basic algo by default
- Custom algo builder (think apple shortcuts)

---

## Documentation

### API Documentation

Located in `/docs/`:

- **api-architecture.md**: Complete RPC API architecture design with type contracts, error handling, authentication integration, and file upload strategy
- **api-implementation-guide.md**: Practical implementation examples, testing strategies, common patterns, and deployment configuration
- **api-quick-reference.md**: Quick reference guide with endpoint overview, error codes, RPC vs REST comparison, and client SDK cheatsheet

### Security Documentation

Located in `/docs/`:

- **SECURITY_DESIGN.md**: Comprehensive security architecture using Better-auth, including authentication flows, session management, authorization patterns, API security, media upload security, data protection, privacy controls, and security headers
- **SECURITY_IMPLEMENTATION_GUIDE.md**: Quick-start guide with installation steps, code examples, frontend integration, common patterns, and troubleshooting
- **AUTH_FLOWS.md**: Visual diagrams of all authentication flows including registration, login, password reset, file upload, and authorization
- **SECURITY_TESTING.md**: Complete testing guide with test cases, attack scenarios, automated testing tools, penetration testing methodology, and security monitoring

### Frontend Documentation

Located in `/docs/`:

- **frontend-README.md**: Overview of all frontend documentation with quick reference
- **frontend-architecture.md**: Complete PWA architecture with React/TypeScript, state management (Zustand + TanStack Query), component patterns, routing, PWA configuration, offline strategy, and performance optimization
- **component-specifications.md**: Detailed specifications for all major components including Feed Builder (visual algorithm editor), Profile Editor (styles/layout customization), Post Components, Navigation, and Forms with accessibility guidelines
- **frontend-implementation-guide.md**: Step-by-step implementation guide with 7 phases from project setup to deployment, including code examples, configuration files, and best practices
- **frontend-api-integration.md**: RPC client implementation, feature-specific API modules, two-phase S3 file upload, real-time polling, error handling, caching strategies, and optimistic updates

### Key Features

- End-to-end type safety between frontend and backend
- Single RPC endpoint pattern (`/api/rpc`)
- Procedure-based routing (e.g., `user.getProfile`, `post.create`)
- Standardized error codes and handling
- Two-phase file upload with S3
- Rate limiting and caching strategies
- Cursor-based pagination
- Better-auth integration
- Comprehensive security with authentication, authorization, and data protection
- Session-based authentication with secure cookies
- Profile visibility controls (PUBLIC, PRIVATE, UNLISTED)
- Storage quota enforcement
- XSS, CSRF, and SQL injection prevention
- Secure file upload with type and size validation
