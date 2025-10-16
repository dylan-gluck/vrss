# VRSS RPC API Architecture Diagrams

## System Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        PWA[PWA Frontend<br/>React + TypeScript]
        Mobile[Mobile App<br/>Future]
    end

    subgraph "API Client Layer"
        Client[RPCClient<br/>Type-safe SDK]
        Contracts[API Contracts<br/>Shared Types]
    end

    subgraph "Backend Layer"
        API[Hono Server<br/>Bun Runtime]
        Router[RPC Router]

        subgraph "Routers"
            AuthR[Auth Router]
            UserR[User Router]
            PostR[Post Router]
            FeedR[Feed Router]
            SocialR[Social Router]
            MediaR[Media Router]
        end

        subgraph "Middleware"
            AuthM[Auth Middleware]
            RateM[Rate Limit]
            CacheM[Cache]
        end
    end

    subgraph "Data Layer"
        DB[(PostgreSQL<br/>Prisma)]
        Redis[(Redis<br/>Cache)]
        S3[(S3<br/>Media Storage)]
    end

    subgraph "Auth Layer"
        BetterAuth[Better-auth<br/>Session Management]
    end

    PWA --> Client
    Mobile -.-> Client
    Client --> Contracts
    Contracts --> Router

    Client --> API
    API --> AuthM
    API --> RateM
    API --> CacheM

    AuthM --> Router
    RateM --> Router
    CacheM --> Router

    Router --> AuthR
    Router --> UserR
    Router --> PostR
    Router --> FeedR
    Router --> SocialR
    Router --> MediaR

    AuthR --> BetterAuth
    UserR --> DB
    PostR --> DB
    FeedR --> DB
    SocialR --> DB
    MediaR --> S3
    MediaR --> DB

    BetterAuth --> DB
    CacheM --> Redis
    RateM --> Redis

    style PWA fill:#61dafb
    style Client fill:#3178c6
    style Contracts fill:#3178c6
    style API fill:#e34c26
    style DB fill:#336791
    style Redis fill:#dc382d
    style S3 fill:#569a31
```

---

## RPC Request Flow

```mermaid
sequenceDiagram
    participant C as Client (PWA)
    participant SDK as RPC Client
    participant MW as Middleware
    participant R as RPC Router
    participant H as Procedure Handler
    participant DB as Database
    participant Auth as Better-auth

    C->>SDK: call('user.updateProfile', data)
    SDK->>SDK: Serialize request

    Note over SDK: POST /api/rpc<br/>{procedure, input, context}

    SDK->>MW: HTTP Request
    MW->>Auth: Validate session token
    Auth-->>MW: User session
    MW->>MW: Check rate limits
    MW->>MW: Check cache (if applicable)

    MW->>R: Forward request
    R->>R: Parse procedure name
    R->>H: Route to handler

    H->>H: Validate input schema
    H->>DB: Query/Update data
    DB-->>H: Result

    H->>H: Format response
    H-->>R: Return data
    R-->>MW: RPCResponse
    MW-->>SDK: HTTP Response

    SDK->>SDK: Parse response
    SDK-->>C: Typed result or error
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant API as RPC API
    participant Auth as Better-auth
    participant DB as Database

    rect rgb(200, 220, 240)
        Note over U,DB: Registration Flow
        U->>C: Fill registration form
        C->>API: call('auth.register', {username, email, password})
        API->>Auth: signUp.email()
        Auth->>DB: Create user record
        DB-->>Auth: User created
        Auth->>Auth: Generate session token
        Auth-->>API: {user, sessionToken}
        API-->>C: Success response
        C->>C: Store session token
        C-->>U: Redirect to home
    end

    rect rgb(220, 240, 220)
        Note over U,DB: Login Flow
        U->>C: Fill login form
        C->>API: call('auth.login', {email, password})
        API->>Auth: signIn.email()
        Auth->>DB: Verify credentials
        DB-->>Auth: User found
        Auth->>Auth: Generate session token
        Auth-->>API: {user, sessionToken}
        API-->>C: Success response
        C->>C: Store session token
        C-->>U: Redirect to home
    end

    rect rgb(240, 220, 220)
        Note over U,DB: Authenticated Request
        U->>C: Create post
        C->>API: call('post.create', data)<br/>Authorization: Bearer token
        API->>Auth: Validate session
        Auth->>DB: Check session validity
        DB-->>Auth: Valid session
        Auth-->>API: User context
        API->>API: Execute procedure
        API-->>C: Success response
    end
```

---

## File Upload Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant API as RPC API
    participant S3 as AWS S3
    participant DB as Database

    rect rgb(240, 240, 220)
        Note over U,DB: Phase 1: Initiate Upload
        U->>C: Select file
        C->>C: Validate file (type, size)
        C->>API: call('media.initiateUpload',<br/>{filename, contentType, size})
        API->>API: Check storage quota
        API->>API: Generate uploadId & mediaId
        API->>S3: Create pre-signed URL
        S3-->>API: Pre-signed URL (1 hour TTL)
        API->>DB: Create pending media record
        DB-->>API: Record created
        API-->>C: {uploadId, uploadUrl, mediaId}
    end

    rect rgb(220, 240, 240)
        Note over U,DB: Phase 2: Direct Upload to S3
        C->>C: Track upload progress
        C->>S3: PUT file to uploadUrl<br/>(Direct upload)
        S3-->>C: Upload complete (200 OK)
        C->>C: Update progress: 100%
    end

    rect rgb(240, 220, 240)
        Note over U,DB: Phase 3: Complete Upload
        C->>API: call('media.completeUpload',<br/>{uploadId, mediaId})
        API->>DB: Update media status to 'completed'
        DB-->>API: Media updated
        API-->>C: {media}
        C-->>U: Show success message
    end

    rect rgb(220, 240, 220)
        Note over U,DB: Phase 4: Use Media
        U->>C: Create post with media
        C->>API: call('post.create',<br/>{content, mediaIds: [mediaId]})
        API->>DB: Create post with media reference
        DB-->>API: Post created
        API-->>C: {post}
        C-->>U: Show new post
    end
```

---

## Custom Feed Algorithm Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant API as RPC API
    participant FB as FeedBuilder
    participant DB as Database

    rect rgb(240, 220, 220)
        Note over U,DB: Create Custom Feed
        U->>C: Build feed algorithm<br/>(filters, rules)
        C->>API: call('feed.createFeed',<br/>{name, filters[]})
        API->>DB: Save custom feed
        DB-->>API: Feed created
        API-->>C: {feed}
    end

    rect rgb(220, 240, 240)
        Note over U,DB: Fetch Feed with Algorithm
        U->>C: View custom feed
        C->>API: call('feed.getFeed',<br/>{feedId, limit, cursor})
        API->>DB: Load feed configuration
        DB-->>API: Feed with filters
        API->>FB: Build feed query

        FB->>FB: Parse filters
        FB->>FB: author filter → WHERE authorId IN [...]
        FB->>FB: postType filter → WHERE type IN [...]
        FB->>FB: visibility rules → WHERE visibility...
        FB->>FB: Build Prisma query

        FB->>DB: Execute complex query
        DB-->>FB: Posts matching filters
        FB->>FB: Apply pagination
        FB->>FB: Generate nextCursor
        FB-->>API: {posts[], nextCursor}
        API-->>C: Feed response
        C-->>U: Display personalized feed
    end
```

---

## Error Handling Flow

```mermaid
flowchart TD
    Start[Client calls RPC procedure]

    Start --> Validate[Validate request format]
    Validate -->|Invalid JSON| Error1[Return 400: Malformed request]

    Validate -->|Valid| Auth[Check authentication]
    Auth -->|No token| Error2[Return 401: Unauthorized]
    Auth -->|Invalid token| Error3[Return 401: Invalid credentials]
    Auth -->|Expired| Error4[Return 401: Session expired]

    Auth -->|Valid| RateLimit[Check rate limits]
    RateLimit -->|Exceeded| Error5[Return 429: Rate limit exceeded]

    RateLimit -->|OK| Router[Route to procedure handler]
    Router -->|Not found| Error6[Return 404: Procedure not found]

    Router -->|Found| Handler[Execute handler]
    Handler --> ValidateInput[Validate input schema]
    ValidateInput -->|Invalid| Error7[Return 400: Validation error]

    ValidateInput -->|Valid| CheckAuth[Check authorization]
    CheckAuth -->|Forbidden| Error8[Return 403: Access denied]

    CheckAuth -->|OK| Execute[Execute business logic]
    Execute -->|DB error| Error9[Return 500: Database error]
    Execute -->|External service error| Error10[Return 500: Service error]
    Execute -->|Business rule violation| Error11[Return 400: Business error]

    Execute -->|Success| Response[Format response]
    Response --> Return[Return 200: Success]

    Error1 --> Log[Log error]
    Error2 --> Log
    Error3 --> Log
    Error4 --> Log
    Error5 --> Log
    Error6 --> Log
    Error7 --> Log
    Error8 --> Log
    Error9 --> Log
    Error10 --> Log
    Error11 --> Log

    Log --> Client[Send error to client]
    Return --> Client

    Client --> End[Client handles response]

    style Error1 fill:#ffcccc
    style Error2 fill:#ffcccc
    style Error3 fill:#ffcccc
    style Error4 fill:#ffcccc
    style Error5 fill:#ffffcc
    style Error6 fill:#ffcccc
    style Error7 fill:#ffcccc
    style Error8 fill:#ffcccc
    style Error9 fill:#ffdddd
    style Error10 fill:#ffdddd
    style Error11 fill:#ffcccc
    style Response fill:#ccffcc
    style Return fill:#ccffcc
```

---

## Type Safety Flow

```mermaid
flowchart LR
    subgraph "Development Time"
        Define[Define Type Contract<br/>in api-contracts]
        Backend[Implement Backend Handler<br/>with typed context]
        Frontend[Create Frontend Hook<br/>with typed client]
    end

    subgraph "Compile Time"
        TypeCheck[TypeScript Compiler]
        Validate[Validate types match]
        Error[Show type errors]
    end

    subgraph "Runtime"
        Call[Client calls procedure]
        Serialize[Serialize with types]
        Deserialize[Deserialize with types]
        Execute[Execute with type safety]
    end

    Define --> Backend
    Define --> Frontend

    Backend --> TypeCheck
    Frontend --> TypeCheck

    TypeCheck --> Validate
    Validate -->|Mismatch| Error
    Validate -->|Match| Success[Build succeeds]

    Success --> Call
    Call --> Serialize
    Serialize --> Deserialize
    Deserialize --> Execute
    Execute --> Result[Typed result]

    style Define fill:#3178c6,color:#fff
    style Backend fill:#e34c26,color:#fff
    style Frontend fill:#61dafb
    style Error fill:#ffcccc
    style Success fill:#ccffcc
    style Result fill:#ccffcc
```

---

## Procedure Routing Diagram

```mermaid
flowchart TD
    Request[POST /api/rpc<br/>{procedure: 'user.updateProfile'}]

    Request --> Parse[Parse procedure name]
    Parse --> Split[Split by namespace<br/>namespace: 'user'<br/>operation: 'updateProfile']

    Split --> Router{RPC Router}

    Router -->|auth.*| AuthRouter[Auth Router]
    Router -->|user.*| UserRouter[User Router]
    Router -->|post.*| PostRouter[Post Router]
    Router -->|feed.*| FeedRouter[Feed Router]
    Router -->|social.*| SocialRouter[Social Router]
    Router -->|message.*| MessageRouter[Message Router]
    Router -->|notification.*| NotificationRouter[Notification Router]
    Router -->|media.*| MediaRouter[Media Router]
    Router -->|settings.*| SettingsRouter[Settings Router]
    Router -->|Unknown| NotFound[404: Procedure not found]

    UserRouter --> Handler[user.updateProfile handler]
    Handler --> Context[ProcedureContext<br/>{input, user, requestId}]
    Context --> Execute[Execute handler logic]
    Execute --> Response[Return typed response]

    style Request fill:#61dafb
    style Router fill:#e34c26,color:#fff
    style Handler fill:#3178c6,color:#fff
    style Response fill:#ccffcc
    style NotFound fill:#ffcccc
```

---

## Database Schema Relationships

```mermaid
erDiagram
    User ||--o{ Post : creates
    User ||--o{ Media : owns
    User ||--o{ CustomFeed : creates
    User ||--o{ Follow : follower
    User ||--o{ Follow : following
    User ||--o{ Message : sends
    User ||--o{ Notification : receives
    User ||--|| ProfileStyle : has
    User ||--o{ ProfileSection : has

    Post ||--o{ Comment : has
    Post }o--o{ Media : contains
    Post }o--o{ Tag : tagged

    CustomFeed ||--o{ FeedFilter : contains

    Conversation ||--o{ Message : contains
    Conversation }o--o{ User : participants

    User {
        string id PK
        string username UK
        string email UK
        string displayName
        string bio
        string avatarUrl
        boolean isPaid
        datetime createdAt
        datetime updatedAt
    }

    Post {
        string id PK
        string authorId FK
        string type
        string content
        string visibility
        array mediaIds
        array tags
        int likes
        int comments
        datetime createdAt
    }

    Media {
        string id PK
        string ownerId FK
        string type
        string url
        int size
        string status
        datetime createdAt
    }

    CustomFeed {
        string id PK
        string userId FK
        string name
        json filters
        datetime createdAt
    }

    Follow {
        string followerId FK
        string followingId FK
        datetime createdAt
    }

    Message {
        string id PK
        string conversationId FK
        string senderId FK
        string content
        array mediaIds
        datetime createdAt
        datetime readAt
    }

    Notification {
        string id PK
        string userId FK
        string type
        string actorId FK
        string targetId
        string content
        boolean read
        datetime createdAt
    }
```

---

## Rate Limiting Architecture

```mermaid
flowchart TB
    Request[Incoming RPC Request]

    Request --> Extract[Extract user ID + procedure]
    Extract --> Key[Generate rate limit key<br/>userId:procedure]

    Key --> Redis{Check Redis}
    Redis -->|Key exists| Get[Get request timestamps]
    Redis -->|Key missing| Create[Create new entry]

    Get --> Filter[Filter old timestamps<br/>within time window]
    Filter --> Count{Count requests}

    Count -->|< Limit| Allow[Allow request]
    Count -->|>= Limit| Block[Block request]

    Create --> Allow

    Allow --> Add[Add current timestamp]
    Add --> Update[Update Redis]
    Update --> Proceed[Proceed to handler]

    Block --> Error[Return 429 error<br/>Rate limit exceeded]

    Proceed --> Response[Execute procedure]

    style Request fill:#61dafb
    style Allow fill:#ccffcc
    style Block fill:#ffcccc
    style Error fill:#ffcccc
    style Response fill:#ccffcc
```

---

## Caching Strategy

```mermaid
flowchart TD
    Request[RPC Request]

    Request --> Check{Is cacheable?}
    Check -->|No| Execute[Execute handler]

    Check -->|Yes| Key[Generate cache key<br/>procedure:input]
    Key --> Cache{Check Redis Cache}

    Cache -->|Hit| Return[Return cached response]
    Cache -->|Miss| Execute

    Execute --> Response[Generate response]
    Response --> Store[Store in cache with TTL]
    Store --> Return

    Return --> Client[Return to client]

    subgraph "Cacheable Procedures"
        C1[user.getProfile: 5 min]
        C2[post.getById: 1 min]
        C3[feed.getFeed: 30 sec]
        C4[discovery.getDiscoverFeed: 1 min]
    end

    style Check fill:#ffffcc
    style Cache fill:#ffffcc
    style Return fill:#ccffcc
    style Store fill:#cce5ff
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "Client"
        Browser[Web Browser<br/>PWA]
        App[Mobile App<br/>Future]
    end

    subgraph "CDN"
        CloudFront[CloudFront<br/>Static Assets]
    end

    subgraph "Load Balancer"
        ALB[Application Load Balancer]
    end

    subgraph "Container Orchestration"
        ECS[ECS / Kubernetes]

        subgraph "API Containers"
            API1[API Instance 1<br/>Bun + Hono]
            API2[API Instance 2<br/>Bun + Hono]
            API3[API Instance 3<br/>Bun + Hono]
        end
    end

    subgraph "Data Layer"
        RDS[(RDS PostgreSQL<br/>Multi-AZ)]
        ElastiCache[(ElastiCache Redis<br/>Cluster)]
        S3Bucket[(S3 Bucket<br/>Media Storage)]
    end

    subgraph "Monitoring"
        CloudWatch[CloudWatch<br/>Logs & Metrics]
        Sentry[Sentry<br/>Error Tracking]
    end

    Browser --> CloudFront
    App -.-> CloudFront
    CloudFront --> ALB

    ALB --> API1
    ALB --> API2
    ALB --> API3

    API1 --> RDS
    API1 --> ElastiCache
    API1 --> S3Bucket

    API2 --> RDS
    API2 --> ElastiCache
    API2 --> S3Bucket

    API3 --> RDS
    API3 --> ElastiCache
    API3 --> S3Bucket

    API1 --> CloudWatch
    API1 --> Sentry
    API2 --> CloudWatch
    API2 --> Sentry
    API3 --> CloudWatch
    API3 --> Sentry

    style Browser fill:#61dafb
    style API1 fill:#e34c26,color:#fff
    style API2 fill:#e34c26,color:#fff
    style API3 fill:#e34c26,color:#fff
    style RDS fill:#336791
    style ElastiCache fill:#dc382d
    style S3Bucket fill:#569a31
```

---

## Monitoring & Observability

```mermaid
flowchart TD
    subgraph "Application"
        API[RPC API]
        Logger[Structured Logger]
        Metrics[Metrics Collector]
    end

    subgraph "Collection"
        Logs[Log Aggregation]
        MetricsDB[Time-Series DB]
        Traces[Distributed Tracing]
    end

    subgraph "Visualization"
        Dashboard[Monitoring Dashboard]
        Alerts[Alert Manager]
        Analytics[Analytics Platform]
    end

    API --> Logger
    API --> Metrics
    API --> Traces

    Logger --> Logs
    Metrics --> MetricsDB

    Logs --> Dashboard
    MetricsDB --> Dashboard
    Traces --> Dashboard

    Dashboard --> Alerts
    Alerts -->|Critical| Email[Email/SMS]
    Alerts -->|Critical| Slack[Slack Notification]

    Logs --> Analytics
    MetricsDB --> Analytics

    Analytics --> Reports[Performance Reports]
    Analytics --> Insights[Usage Insights]

    style API fill:#e34c26,color:#fff
    style Dashboard fill:#ccffcc
    style Alerts fill:#ffffcc
    style Email fill:#ffcccc
    style Slack fill:#ffcccc
```

---

These diagrams provide a visual representation of the VRSS RPC API architecture, covering:

1. **System Architecture**: High-level overview of all components
2. **RPC Request Flow**: Detailed sequence of an RPC call
3. **Authentication Flow**: Complete auth lifecycle
4. **File Upload Flow**: Three-phase upload process
5. **Custom Feed Algorithm**: Feed generation logic
6. **Error Handling**: Comprehensive error flow
7. **Type Safety**: Compile-time and runtime type checking
8. **Procedure Routing**: How procedures are dispatched
9. **Database Schema**: Entity relationships
10. **Rate Limiting**: Request throttling mechanism
11. **Caching Strategy**: Response caching logic
12. **Deployment Architecture**: Production infrastructure
13. **Monitoring**: Observability setup

These diagrams complement the written documentation and provide quick visual references for understanding the system architecture.
