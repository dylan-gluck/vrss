# Product Requirements Document

## Validation Checklist
- [x] Product Overview complete (vision, problem, value proposition)
- [x] User Personas defined (at least primary persona)
- [x] User Journey Maps documented (at least primary journey)
- [x] Feature Requirements specified (must-have, should-have, could-have, won't-have)
- [x] Detailed Feature Specifications for complex features
- [x] Success Metrics defined with KPIs and tracking requirements
- [x] Constraints and Assumptions documented
- [x] Risks and Mitigations identified
- [x] Open Questions captured
- [x] Supporting Research completed (competitive analysis, user research, market data)
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] No technical implementation details included

---

## Product Overview

### Vision
Vrss empowers individuals and organizations to build authentic digital identities through fully customizable social experiences that put users in control of how they present themselves and consume content.

### Problem Statement
Today's social media platforms enforce rigid profile templates and opaque algorithms that treat all users the same, whether they're sharing family photos, promoting a business, or building a creative portfolio. Users feel trapped in one-size-fits-all experiences where they can't control how their content is presented or how they discover others' content, forcing them to choose between platform limitations or abandoning social media entirely. This lack of agency creates frustration for creators, businesses, and individuals who want their online presence to reflect their unique identity and goals rather than conform to platform constraints.

### Value Proposition
Vrss gives users unprecedented control over their social media experience through customizable profiles that adapt to any use case—from personal blogs to business storefronts to creative portfolios—and transparent, user-defined content discovery that replaces black-box algorithms with logical filters you design yourself. Unlike traditional platforms where everyone sees the same interface and algorithmic feed, Vrss treats your profile and feed as a canvas you shape to match your specific needs, whether you're a music producer showcasing your discography, a restaurant displaying daily specials, or someone who simply wants to see content organized their way.

## User Personas

### Primary Persona: Maya Chen - The Independent Creator
- **Demographics:** 25-34 years old, freelance musician/artist, moderate-to-high technical comfort (comfortable with digital tools but not a developer)
- **Goals:**
  - Build a distinctive online presence that reflects her unique artistic brand
  - Showcase work portfolio (albums, singles, visual art) in a cohesive, personalized layout
  - Connect with genuine fans rather than optimizing for generic algorithms
  - Control how her content is discovered without being buried by platform algorithms
  - Monetize creative work through direct audience relationships
- **Pain Points:**
  - Current platforms force cookie-cutter profiles that don't reflect creative identity
  - Algorithm changes unpredictably impact visibility, feels loss of control
  - Can't organize content by project/theme (e.g., separate album releases)
  - Difficulty curating which content appears to different audience segments
  - Platform aesthetics clash with personal brand (limited customization)
  - No transparency into why content performs well or poorly

### Secondary Persona 1: Marcus Rodriguez - The Intentional Consumer
- **Demographics:** 28-42 years old, working professional (marketing, design, education), moderate technical expertise
- **Goals:**
  - Curate a social media experience aligned with personal interests, not algorithm assumptions
  - Discover niche content (indie music, local businesses, specific hobbies) without mainstream noise
  - Support independent creators and small businesses directly
  - Reduce doomscrolling and regain intentionality in content consumption
  - Build feeds around specific contexts (professional inspiration, local community, hobbies)
- **Pain Points:**
  - Algorithmic feeds show irrelevant content based on opaque engagement metrics
  - Can't create separate feeds for different moods/purposes (work vs leisure)
  - Discovery is limited to what the platform wants to promote, not what he seeks
  - No control over content filtering beyond basic mute/block functions
  - Feels manipulated by engagement-maximizing algorithms
  - Difficulty finding authentic, non-viral content in niche areas

### Secondary Persona 2: Jade Patel - The Local Business Owner
- **Demographics:** 32-48 years old, restaurant/cafe/boutique owner, low-to-moderate technical expertise (uses social media for business but not tech-savvy)
- **Goals:**
  - Create a social presence that functions as both marketing and menu/catalog
  - Showcase offerings (menu items, products) with custom organization (categories, seasons)
  - Display customer testimonials and user-generated content prominently
  - Attract local customers through authentic presentation, not paid ads
  - Maintain brand consistency across profile aesthetics and content layout
- **Pain Points:**
  - Current platforms separate business profile from actual product showcase (needs external link to menu)
  - Limited layout options make it hard to highlight specific offerings (daily specials, seasonal items)
  - Algorithm prioritizes viral content over local relevance
  - Can't organize content by product category or customer journey
  - Profile design doesn't match physical business branding
  - Testimonials get lost in chronological feed instead of being featured
  - Paid advertising feels necessary to reach even local audience

## User Journey Maps

### Primary User Journey: Creator Onboarding and Profile Customization (Maya's Journey)
1. **Awareness:** Maya is frustrated that her Instagram profile doesn't reflect her artistic brand. She hears about Vrss from another indie musician who showcases their discography with a custom profile layout. She visits their Vrss profile and sees a beautifully organized collection of album releases, each with its own section, custom colors matching album artwork, and background music playing. She realizes this is what she's been looking for.

2. **Consideration:** Maya evaluates Vrss against continuing with Instagram/Twitter or using Linktree. Key criteria: Can she truly customize her profile? Will her fans find her? Is it easy to use without coding skills? Can she organize content by project/album? She explores example profiles from other musicians and sees the visual algorithm builder—realizes she can control discovery without learning to code.

3. **Adoption:** Maya signs up for Vrss and immediately starts customizing. The onboarding process shows her profile templates for musicians, but she chooses to build from scratch. She sets her profile background to match her latest album artwork, adds custom font/colors, and creates separate feed sections for different projects (singles, albums, collaborations). Within 30 minutes, she has a profile that feels uniquely hers.

4. **Usage:** Maya's daily workflow:
   - Posts new music releases to specific profile sections
   - Customizes how each post appears in her feed
   - Creates custom feeds for fans (e.g., "Latest Releases" vs "Behind the Scenes")
   - Uses the visual algorithm builder to create a discovery algorithm that surfaces similar indie artists
   - Responds to comments and messages from fans
   - Checks analytics to see which content resonates

5. **Retention:** Maya keeps using Vrss because:
   - Her profile truly represents her artistic identity
   - She controls how fans discover and experience her work
   - The platform grows with her (she adds new sections for merchandise, tour dates)
   - She connects with authentic fans who find her through transparent discovery
   - She's not fighting algorithm changes—she owns her algorithm
   - Other artists in her network are also on Vrss, creating a community

### Secondary User Journey: Consumer Feed Curation (Marcus's Journey)
1. **Awareness:** Marcus is tired of TikTok showing him viral content instead of niche indie music and local businesses he actually cares about. A friend mentions Vrss lets you build your own feed algorithms. Marcus is skeptical but intrigued by the idea of "defining what you want to see, not just hiding what you don't."

2. **Consideration:** Marcus compares Vrss to staying on current platforms with better discipline or simply quitting social media. Key criteria: Can he actually control what he sees? Is it overwhelming to build custom feeds? Will he find the niche content he wants? He watches a demo video showing the visual algorithm builder—sees it's like Apple Shortcuts, which he uses.

3. **Adoption:** Marcus creates an account and starts with a template feed ("Following - Chronological"). Then he experiments with the visual algorithm builder: creates a "Morning Inspiration" feed (design content + motivational posts from followed accounts), a "Local Discovery" feed (posts from businesses within 20 miles), and an "Indie Music" feed (music posts from accounts tagged #IndieMusic with >50 likes). He's hooked within the first day.

4. **Usage:** Marcus's daily workflow:
   - Morning: Switches to "Morning Inspiration" feed while having coffee
   - Lunch: Checks "Local Discovery" feed to find new restaurants/shops
   - Evening: Switches to "Indie Music" feed to discover new artists
   - Creates new custom feeds as interests emerge (e.g., "Basketball Content" during playoffs)
   - Follows creators like Maya who he discovers through his custom algorithms
   - Adjusts feed algorithms based on what's working

5. **Retention:** Marcus continues using Vrss because:
   - He finally has social media that serves his interests, not platform engagement goals
   - He discovers genuinely interesting content he'd never find on algorithmic platforms
   - He feels in control and intentional, not manipulated
   - His feeds evolve with his interests without fighting an opaque algorithm
   - He supports creators and local businesses he cares about
   - The transparency reduces social media anxiety—he knows why he's seeing content

## Feature Requirements

### Must Have Features

#### F1: User Authentication and Registration
- **User Story:** As a new user, I want to create an account with username/email/password so that I can build my Vrss profile
- **Acceptance Criteria:**
  - [ ] User can register with unique username, email, and password
  - [ ] Username uniqueness validation
  - [ ] Email format validation and verification
  - [ ] Password strength requirements enforced
  - [ ] User can log in with username/email + password
  - [ ] User can log out securely
  - [ ] Session management with secure tokens

#### F2: Customizable User Profiles
- **User Story:** As a creator, I want to customize my profile style and layout so that it reflects my brand/identity
- **Acceptance Criteria:**
  - [ ] User can set profile background (color, image)
  - [ ] User can select custom fonts and colors
  - [ ] User can add background music to profile
  - [ ] User can add/remove/reorder profile sections
  - [ ] Available section types: Feed, Gallery, Links, Static Text, Image, Video (external), Reposts, Friends, Followers/Following, Lists
  - [ ] Default profile template available (standard social header + feed of posts)
  - [ ] Profile visibility settings (public/private)
  - [ ] Profile customizations render correctly on mobile
  - [ ] Performance guardrails prevent slow-loading profiles

#### F3: Content Creation and Post Types
- **User Story:** As a user, I want to create different types of posts so that I can share varied content
- **Acceptance Criteria:**
  - [ ] User can create text posts (short and long form)
  - [ ] User can create image posts (single image, gallery, GIF)
  - [ ] User can create video posts (short and long form)
  - [ ] User can create song posts (single track or album)
  - [ ] Posts respect storage limits (50MB free tier)
  - [ ] Media uploads stored securely
  - [ ] Posts can be edited after creation
  - [ ] Posts can be deleted by creator

#### F4: Custom Feed Builder (Visual Algorithm)
- **User Story:** As a user, I want to create custom feeds using visual logical blocks so that I see content I actually want
- **Acceptance Criteria:**
  - [ ] Visual algorithm builder interface (Apple Shortcuts-style)
  - [ ] Filter blocks: post type, author, group, tags, date range
  - [ ] Logical operators: AND, OR, NOT
  - [ ] User can create multiple named feeds
  - [ ] User can save and switch between feeds
  - [ ] Default "Following - Chronological" feed provided
  - [ ] Primary feed shows all posts from followed accounts
  - [ ] Feed displays single post view with comments
  - [ ] Feed algorithms apply in real-time

#### F5: Custom Discovery/Search Algorithm
- **User Story:** As a user, I want to customize how I discover new content so that I find relevant creators and posts
- **Acceptance Criteria:**
  - [ ] Default discovery algorithm: popular posts within 2-degree friend network
  - [ ] Visual algorithm builder for discovery (same interface as feeds)
  - [ ] User can create multiple discovery algorithms
  - [ ] Search functionality for users and content
  - [ ] Discovery results update based on custom algorithm
  - [ ] User can switch between different discovery views

#### F6: Social Interactions
- **User Story:** As a user, I want to interact with other users' content so that I can engage with the community
- **Acceptance Criteria:**
  - [ ] User can follow/unfollow other users
  - [ ] User can like posts
  - [ ] User can comment on posts
  - [ ] User can repost content to their profile
  - [ ] Follow/following counts visible on profile
  - [ ] Comments display on single post view

#### F7: Direct Messaging
- **User Story:** As a user, I want to send direct messages so that I can communicate privately with others
- **Acceptance Criteria:**
  - [ ] User can send text messages to other users
  - [ ] Inbox view shows all message threads
  - [ ] Message thread view shows conversation history
  - [ ] Real-time message delivery
  - [ ] Message read status indicators
  - [ ] User can block/unblock other users

#### F8: Notifications
- **User Story:** As a user, I want to receive notifications so that I know when others interact with my content or profile
- **Acceptance Criteria:**
  - [ ] Notifications for new followers
  - [ ] Notifications for post likes
  - [ ] Notifications for post comments
  - [ ] Notifications for mentions
  - [ ] Notification center displays all alerts
  - [ ] Unread notification count badge
  - [ ] User can mark notifications as read

#### F9: Account Settings and Management
- **User Story:** As a user, I want to manage my account settings so that I can control my experience and data
- **Acceptance Criteria:**
  - [ ] User can change username
  - [ ] User can change email address
  - [ ] User can change password
  - [ ] User can set profile visibility (public/private)
  - [ ] User can view media storage usage (percentage used)
  - [ ] User can delete account
  - [ ] Account deletion removes all user data

#### F10: Storage Management and Subscription
- **User Story:** As a user, I want to understand my storage limits so that I can manage my media uploads
- **Acceptance Criteria:**
  - [ ] Free tier: 50MB storage limit
  - [ ] Paid tier: 1GB+ storage
  - [ ] Storage usage displayed in settings
  - [ ] Visual indicator of storage percentage
  - [ ] Option to upgrade storage (link to payment)
  - [ ] Upload blocked when storage limit reached
  - [ ] Warning when approaching storage limit

### Should Have Features

#### S1: Advanced Profile Templates
- Users can choose from pre-built templates (Musician, Restaurant, Portfolio, Business) that configure sections and styles automatically
- Template customization wizard guides users through setup

#### S2: Post Scheduling
- Users can schedule posts for future publication
- Scheduled posts display in draft queue
- Edit/cancel scheduled posts before publication

#### S3: Enhanced Analytics
- Profile view metrics (daily/weekly/monthly)
- Post performance analytics (reach, engagement rate)
- Follower growth tracking
- Best performing content insights

#### S4: Collaborative Posts
- Multiple users can co-author a post
- Tagged collaborators appear on post
- Collaborative posts appear on all authors' profiles

#### S5: Collections and Playlists
- Users can create collections of posts (saved posts, curated lists)
- Music users can create playlists from song posts
- Collections are shareable

#### S6: Advanced Search Filters
- Search by location
- Search by date range
- Search within specific post types
- Save search queries

### Could Have Features

#### C1: Mobile Apps (Native iOS/Android)
- Native mobile applications with offline support
- Push notifications for mobile
- Camera integration for quick posting

#### C2: Verified Accounts
- Verification badge for authentic creators/businesses
- Verification application process
- Enhanced features for verified accounts

#### C3: Monetization Features
- Tip jar for creators
- Paid subscriptions for exclusive content
- Premium profile features

#### C4: Live Streaming
- Live video broadcasting capability
- Live chat during streams
- Stream archive to profile

#### C5: Groups and Communities
- Users can create/join groups
- Group-specific feeds and discussions
- Group customization options

#### C6: Import from Other Platforms
- Import posts from Instagram, Twitter, etc.
- Import followers/following from other platforms
- Automated cross-posting

### Won't Have (This Phase)

#### W1: Advertising Platform
- No ad creation tools
- No ad marketplace
- No promoted posts or sponsored content
- Focus on user experience over ad revenue

#### W2: Algorithmic Content Ranking
- No AI-driven "smart" feed ranking
- No engagement-optimized algorithms
- Users create their own algorithms only

#### W3: Stories/Temporary Content
- No disappearing content features
- All content is permanent unless deleted by user

#### W4: Video Calls
- No voice/video calling functionality
- Focus on asynchronous communication

#### W5: E-commerce Integration
- No built-in shopping cart
- No payment processing for products
- Links to external stores only

#### W6: Third-Party App Integrations
- No Spotify/Apple Music integration
- No external service embeds beyond basic video links
- Focus on core platform features first

## Detailed Feature Specifications

### Feature: Custom Feed Builder (Visual Algorithm) - F4

**Description:**
The Custom Feed Builder is Vrss's core differentiating feature that allows users to create personalized content feeds using a visual, block-based interface similar to Apple Shortcuts. Users construct feed algorithms by combining filter blocks (post type, author, tags, date) with logical operators (AND, OR, NOT) to define exactly what content appears in their feed. Users can create multiple named feeds and switch between them seamlessly, giving them complete control over their content consumption experience.

**User Flow:**

1. **User accesses Feed Builder**
   - User navigates to Home page
   - User taps "Create New Feed" button OR edits existing feed
   - System displays visual algorithm builder interface

2. **User constructs algorithm**
   - User drags/adds filter blocks from palette:
     - Post Type filter (text, image, video, song)
     - Author filter (specific users, groups, tags)
     - Tag/Keyword filter (hashtags, keywords)
     - Date Range filter (last 24 hours, week, month, custom)
     - Engagement filter (minimum likes, comments)
   - User adds logical operator blocks between filters:
     - AND (all conditions must be true)
     - OR (any condition can be true)
     - NOT (exclude matching content)
   - System shows live preview of results as user builds

3. **User saves and names feed**
   - User taps "Save Feed"
   - User enters feed name (e.g., "Morning News", "Indie Music", "Local Businesses")
   - System validates and saves algorithm
   - System adds feed to user's feed list

4. **User switches between feeds**
   - User sees feed tabs/swipe interface on Home page
   - User taps feed name or swipes to switch
   - System loads and applies selected feed algorithm
   - Content updates to show filtered results

5. **User modifies existing feed**
   - User taps "Edit" on any saved feed
   - System loads algorithm in builder interface
   - User adjusts blocks/logic
   - User saves changes
   - System applies updated algorithm immediately

**Business Rules:**

- **Rule 1:** Every user must have at least one feed (default "Following - Chronological" created on signup)
- **Rule 2:** Users can create unlimited custom feeds (no artificial limit)
- **Rule 3:** Feed algorithms execute in real-time when user views the feed
- **Rule 4:** Deleted feeds cannot be recovered (warn user before deletion)
- **Rule 5:** Feed names must be unique per user (case-insensitive)
- **Rule 6:** Empty feeds (no matching content) display helpful message suggesting algorithm adjustments
- **Rule 7:** Algorithm blocks combine using standard boolean logic precedence (NOT > AND > OR)
- **Rule 8:** Visual preview updates within 500ms of algorithm changes
- **Rule 9:** Feed algorithms only access public content or content from users you follow
- **Rule 10:** Saved feeds sync across devices (if user logs in elsewhere)

**Edge Cases:**

- **Scenario 1:** User creates algorithm that matches zero posts
  - Expected: Display empty state with message "No posts match your algorithm. Try adjusting your filters or check back later."

- **Scenario 2:** User creates overly complex algorithm (10+ nested blocks)
  - Expected: System allows it but shows performance warning: "Complex algorithms may load slower. Consider simplifying for better performance."

- **Scenario 3:** User references a deleted account in Author filter
  - Expected: System automatically removes invalid author from filter, shows notification "Author no longer exists - filter updated"

- **Scenario 4:** User tries to save feed with duplicate name
  - Expected: System shows error: "You already have a feed named '[name]'. Choose a different name or edit your existing feed."

- **Scenario 5:** Algorithm matches thousands of posts
  - Expected: System paginates results (load 20 posts initially, infinite scroll for more), maintains performance

- **Scenario 6:** User has unsaved changes in algorithm builder
  - Expected: System shows confirmation dialog when user tries to leave: "Discard unsaved changes to this feed?"

- **Scenario 7:** Filter block uses tag that has no posts
  - Expected: Feed shows empty results, but algorithm is valid and will show posts if matching content is created later

- **Scenario 8:** User switches feeds while scrolling deep in current feed
  - Expected: New feed loads from top, previous scroll position not preserved (intentional - each feed is independent)

- **Scenario 9:** Feed algorithm includes posts from blocked users
  - Expected: Blocked users never appear in any feed, regardless of algorithm (privacy/safety override)

- **Scenario 10:** Network connection lost while editing feed
  - Expected: Changes stored locally, auto-save when connection restored, show "Offline - changes will save when reconnected" indicator

## Success Metrics

### Key Performance Indicators

**Adoption Metrics:**
- **User Signups:** 10,000 registered users within first 3 months post-launch
- **Profile Customization Rate:** 70% of users customize their profile beyond defaults within first week
- **Custom Feed Creation Rate:** 50% of active users create at least one custom feed within first month
- **Discovery Algorithm Usage:** 40% of users modify the default discovery algorithm within first month

**Engagement Metrics:**
- **Daily Active Users (DAU):** Target 30% of registered users active daily
- **Weekly Active Users (WAU):** Target 60% of registered users active weekly
- **Session Duration:** Average 15+ minutes per session
- **Feed Switches Per Session:** Average 3+ feed switches per active user session
- **Posts Created:** Average 5+ posts per user per month
- **Custom Feeds Created:** Average 2.5 custom feeds per active user

**Quality Metrics:**
- **User Retention:** 60% of users return in Week 2, 40% active at Day 30
- **Profile Completion Rate:** 80% of users complete profile setup (add bio, background, at least one section)
- **Feed Builder Success Rate:** 90% of users successfully create and save a custom feed on first attempt
- **Error Rate:** <1% of user actions result in errors
- **Load Time Performance:** 95% of page loads complete within 2 seconds

**Business Impact Metrics:**
- **Paid Conversion Rate:** 5% of users upgrade to paid storage within first 3 months
- **Monthly Recurring Revenue (MRR):** $5,000 MRR by month 6
- **Storage Utilization:** 60% of free users utilize >50% of their 50MB allocation
- **Churn Rate:** <10% monthly churn for paid users
- **Net Promoter Score (NPS):** Target NPS of 50+ (strong recommendation likelihood)

### Tracking Requirements

| Event | Properties | Purpose |
|-------|------------|---------|
| **User Registration** | username, email_domain, signup_source, timestamp | Track user acquisition channels and growth rate |
| **Profile Customization Started** | user_id, customization_type (background/font/sections), timestamp | Measure engagement with core differentiator |
| **Profile Section Added** | user_id, section_type (feed/gallery/links/etc), timestamp | Understand popular profile section types |
| **Profile Background Changed** | user_id, background_type (color/image), timestamp | Track visual customization adoption |
| **Custom Feed Created** | user_id, feed_name, block_count, filter_types_used, timestamp | Measure algorithm builder adoption and complexity |
| **Custom Feed Edited** | user_id, feed_id, changes_made, timestamp | Track iteration and refinement of feeds |
| **Feed Switched** | user_id, from_feed, to_feed, timestamp | Understand feed switching patterns and favorites |
| **Discovery Algorithm Modified** | user_id, algorithm_complexity, filters_used, timestamp | Measure discovery customization engagement |
| **Post Created** | user_id, post_type (text/image/video/song), media_size_mb, timestamp | Track content creation patterns and storage usage |
| **Post Interaction** | user_id, post_id, interaction_type (like/comment/repost), timestamp | Measure social engagement and content quality |
| **Storage Limit Reached** | user_id, storage_used_mb, timestamp | Identify conversion opportunities for paid tier |
| **Upgrade to Paid** | user_id, plan_selected, payment_amount, timestamp | Track revenue and conversion funnel |
| **Message Sent** | sender_id, recipient_id, timestamp | Measure communication feature usage |
| **Notification Received** | user_id, notification_type, timestamp | Track notification effectiveness and engagement |
| **Search Query** | user_id, query_text, results_count, timestamp | Understand user intent and content discovery |
| **Feed Builder Opened** | user_id, feed_id (new or existing), timestamp | Track algorithm builder engagement |
| **Feed Builder Abandoned** | user_id, blocks_added, time_spent_seconds, timestamp | Identify UX friction in feed creation |
| **Error Occurred** | user_id, error_type, page, timestamp | Monitor quality and identify bugs |
| **Session Duration** | user_id, duration_minutes, pages_visited, feeds_viewed, timestamp | Understand engagement depth |
| **Mobile vs Desktop Usage** | user_id, device_type, viewport_size, timestamp | Optimize for primary usage patterns |

## Constraints and Assumptions

### Constraints

**Timeline Constraints:**
- MVP must launch within 6 months for market validation
- Initial feature set limited to essential functionality
- Iterative releases post-MVP for Should Have and Could Have features

**Technical Constraints:**
- Mobile-first development (primary user experience on mobile devices)
- PWA architecture required (offline and local-first capabilities)
- Must maintain sub-2-second page load times with profile customizations
- Storage limits: 50MB free tier, 1GB+ paid tier
- Infrastructure: Monolith architecture initially (simplify MVP development)
- Database: PostgreSQL for relational data, potential ArangoDB for graph relationships
- Media storage: S3-compatible object storage required

**Resource Constraints:**
- Small startup team (focus on core features, no feature bloat)
- Limited marketing budget (growth through word-of-mouth and organic discovery)
- No dedicated mobile app development initially (PWA serves as mobile experience)

**Platform Constraints:**
- Web-only for MVP (no native iOS/Android apps)
- Modern browser support only (Chrome, Firefox, Safari, Edge - latest 2 versions)
- No legacy browser compatibility (IE11, older mobile browsers)

**Legal and Compliance:**
- GDPR compliance required for European users (data privacy, right to deletion)
- CCPA compliance for California users
- User data ownership and portability commitments
- Content moderation policies and tools required (prevent abuse, illegal content)
- DMCA compliance for copyright claims
- Age restriction: 13+ only (COPPA compliance)

**Budget Constraints:**
- Infrastructure costs must scale with revenue (avoid premature scaling)
- Third-party service costs minimized (leverage open source where possible)
- Payment processing fees factored into paid tier pricing

### Assumptions

**User Assumptions:**
- Users are frustrated with current social media platforms' lack of customization and algorithmic opacity
- Users value control over content consumption more than convenience of algorithmic curation
- Non-technical users can successfully use visual algorithm builder (Apple Shortcuts familiarity)
- Creators and businesses will invest time to customize profiles if given proper tools
- Users will pay for additional storage when free tier is exhausted
- Mobile users will accept PWA experience instead of native app initially

**Market Assumptions:**
- Market exists for customizable, transparent social media platform
- Demand for algorithm transparency growing due to regulatory pressure and user awareness
- Competitive landscape won't be flooded with similar offerings during MVP development
- Early adopters will be creators, indie artists, and intentional consumers (personas validated)
- Network effects will drive growth once initial user base established
- Word-of-mouth marketing viable for niche-focused platform launch

**Technical Assumptions:**
- PWA technology mature enough for production social media platform
- Visual algorithm builder UI/UX can be intuitive enough for mass adoption
- Profile customization can be constrained to prevent MySpace-style performance issues
- Real-time feed algorithm execution scalable to thousands of concurrent users
- PostgreSQL sufficient for MVP scale (10K-100K users)
- S3 storage pricing sustainable for media-heavy platform

**Dependency Assumptions:**
- Cloud infrastructure providers (AWS, GCP, or similar) remain stable and affordable
- Modern web browser APIs (Service Workers, IndexedDB) continue to be supported
- No major platform restrictions on PWA capabilities from Apple/Google
- Open source libraries and frameworks remain maintained and secure
- Payment processing partners available for subscription billing (Stripe, etc.)

**Business Model Assumptions:**
- 5-10% conversion rate to paid tier is achievable
- Storage is valuable enough for users to pay ($5-10/month pricing acceptable)
- Free tier limits (50MB) sufficient to demonstrate value without excessive cost
- Operational costs stay below 50% of revenue at scale
- Premium features can be added later to increase average revenue per user (ARPU)

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Visual algorithm builder too complex for average users** | High - Core feature adoption fails | Medium | - Extensive user testing during development<br>- Pre-built template feeds users can start with<br>- Gradual onboarding (simple filters first, advanced later)<br>- Tutorial videos and interactive guides<br>- Simplify to 3-5 core filter types for MVP |
| **Profile customization causes performance issues (MySpace problem)** | High - User experience degraded, churn | Medium | - Hard limits on asset sizes (images compressed, videos restricted)<br>- Render optimization and lazy loading<br>- Performance budgets enforced in development<br>- Automated performance testing on deploy<br>- Block custom code (only visual customization tools) |
| **Empty network at launch (cold start problem)** | High - No content, no value | High | - Seed platform with early creator partners before public launch<br>- Invite-only beta to build initial network<br>- Focus on niche communities (indie music, local businesses) for concentrated network effects<br>- Cross-posting tools to import content from other platforms<br>- Featured creators program to incentivize quality content |
| **Large platforms copy core features (Instagram adds custom feeds)** | Medium - Loses differentiation | Medium | - Build deep integration (customization + feeds + discovery all together)<br>- Establish brand as "transparency and control" platform<br>- Move fast on Should Have features to stay ahead<br>- Focus on community vs feature set<br>- Patent/IP protection for novel UI patterns |
| **Users won't pay for storage upgrades** | High - No revenue, unsustainable | Medium | - Free tier generous enough to demonstrate value but limited enough to encourage upgrades<br>- A/B test pricing tiers ($5, $10, $15/month)<br>- Bundle storage with premium features (analytics, templates, verification)<br>- Usage warnings before hitting limit ("You're 80% full")<br>- Annual plans with discount incentive |
| **Content moderation at scale becomes overwhelming** | High - Platform abuse, legal liability | High | - Automated content filtering (CSAM, spam, hate speech)<br>- User reporting tools easily accessible<br>- Moderator dashboard for review queue<br>- Start with strict policies, ease later<br>- Community moderators for large groups<br>- Rate limiting on new accounts |
| **PWA limitations on iOS (notifications, app store discovery)** | Medium - iOS users underserved | High | - Accept limitation for MVP, plan native iOS app for post-MVP<br>- Optimize PWA experience for iOS Safari<br>- Clear communication that native apps coming later<br>- Alternative distribution (direct install, web bookmarks)<br>- Progressive enhancement (works better on Android, functional on iOS) |
| **Feed algorithm execution too slow at scale** | High - Core feature unusable | Low | - Performance testing with large datasets during development<br>- Database query optimization and indexing<br>- Caching layer for frequently accessed feeds<br>- Algorithm complexity limits (max 10 blocks)<br>- Background pre-computation for popular feeds<br>- Consider Redis for real-time algorithm execution |
| **Viral growth causes infrastructure costs to spike** | High - Financial burden | Low | - Auto-scaling infrastructure with cost alerts<br>- CDN for media delivery to reduce bandwidth costs<br>- Database read replicas for scaling reads<br>- Rate limiting to prevent abuse<br>- Waiting list system if growth exceeds capacity<br>- Cost monitoring dashboard |
| **GDPR/CCPA compliance complexity** | Medium - Legal liability, fines | Medium | - Privacy-first architecture from day one<br>- Data portability tools built into settings<br>- Account deletion completely removes data<br>- Cookie consent and tracking controls<br>- Legal review before launch<br>- Privacy policy and terms of service drafted by attorney |
| **Spam accounts and bots flood platform** | Medium - User experience degraded | High | - Email verification required for signup<br>- Rate limiting on follows, posts, messages<br>- CAPTCHA for suspicious activity<br>- Account age requirements for certain features<br>- Machine learning for spam detection (post-MVP)<br>- Easy reporting and blocking tools |
| **Key team member leaves during development** | Medium - Development delays | Low | - Documentation of all systems and decisions<br>- Pair programming and code reviews<br>- Cross-training on critical systems<br>- Modular architecture reduces single points of failure<br>- Prioritize shipping MVP quickly to reduce exposure window |
| **Market timing wrong (users not ready for this model)** | High - Product-market fit never achieved | Medium | - Extensive user research before and during development<br>- Beta testing with target personas<br>- Iterative releases with user feedback loops<br>- Willingness to pivot based on data<br>- Low-cost MVP to validate hypotheses quickly<br>- Track leading indicators (customization rate, feed creation) |

## Open Questions

- [ ] **Domain Selection:** vrss.app vs vrss.social for primary domain? Both owned, need to decide on branding and user perception
- [ ] **Payment Provider:** Stripe vs. Paddle vs. FastSpring for subscription billing? Need cost analysis and feature comparison
- [ ] **Pricing Tiers:** Should there be multiple paid tiers (1GB, 5GB, 10GB) or single tier with add-on storage? What's optimal pricing ($5, $7, $10/month)?
- [ ] **Beta Launch Strategy:** Invite-only vs open beta? How many users in initial beta cohort? Which creator communities to target first?
- [ ] **Content Moderation Policy:** Need legal review for terms of service, acceptable use policy, content guidelines. What's reportable? What's bannable?
- [ ] **Branding Finalization:** Full brand name "(u)vrss" vs simplified "Vrss"? Logo, colors, typography decisions
- [ ] **Analytics Provider:** Self-hosted analytics vs. third-party (PostHog, Mixpanel, Amplitude)? Privacy considerations
- [ ] **Email Service:** Transactional email provider for verification, notifications? (SendGrid, Mailgun, Postmark)
- [ ] **Hosting Provider:** AWS vs GCP vs DigitalOcean vs Vercel/Netlify? Cost vs features tradeoff
- [ ] **Database Backup Strategy:** Backup frequency, retention policy, disaster recovery plan specifics
- [ ] **Launch Timeline:** Exact MVP completion target date? Public launch date? Beta duration?
- [ ] **Initial Creator Partners:** Which musicians, artists, businesses to onboard as early seeds? Partnership terms?
- [ ] **User Research Validation:** Additional user testing needed before development starts? Target number of interview participants?
- [ ] **Legal Entity Formation:** LLC vs C-corp? State of incorporation? Legal counsel retained?
- [ ] **Mobile App Priority:** When to build native iOS/Android apps post-MVP? Resource allocation plan
- [ ] **International Expansion:** English-only for MVP or multi-language from start? Target markets beyond US?

## Supporting Research

### Competitive Analysis

#### Platform-by-Platform Comparison

**Instagram (3 billion monthly users, 2025)**

*Customization Capabilities:*
- Profile: Limited customization - users can adjust post thumbnail previews, reorder grid posts (testing), and create personalized digital profile cards with QR codes and music
- Feed: Three feed options (algorithmic Home, Following chronological, Favorites priority list of 50 accounts)
- Algorithm transparency: Low - users can reset recommendations and toggle topics (new 2025 feature), but cannot see or modify algorithm logic

*What Users Like:*
- New topic filtering allows removal of unwanted content categories
- "Following" feed provides chronological escape from algorithm
- Profile cards offer limited personalization with music and styling

*What Users Dislike:*
- Minimal profile customization compared to early social media
- Cannot control how algorithmic feed ranks content
- Topic filters are reactive (hide topics) rather than proactive (define what you want)
- Profile layout is standardized with little flexibility

*Gaps Vrss Can Fill:*
- Deep profile layout customization (sections, arrangements, different use cases)
- Proactive feed building with visual logical blocks instead of reactive topic hiding
- Full algorithm transparency with user-created feed logic
- Flexible profile sections for different purposes (artist portfolios, restaurant menus, etc.)

---

**Twitter/X**

*Customization Capabilities:*
- Profile: Standard header/bio format with minimal styling options
- Feed: Three timeline views (algorithmic Home, chronological Latest Tweets, custom feeds in testing)
- Algorithm transparency: Medium - made recommendation algorithm code available on GitHub, exploring custom algorithm controls where users choose their own algorithm

*What Users Like:*
- Code transparency initiative shows algorithm source on GitHub
- Chronological timeline option available
- Experimenting with letting users customize their "interest graph" with explicit signals
- "Show me more like this" feature provides granular control

*What Users Dislike:*
- GitHub code transparency is for technical users only, not accessible to average users
- Custom algorithm features still in experimental phase
- Profile customization extremely limited
- Must understand code to benefit from transparency

*Gaps Vrss Can Fill:*
- Visual, accessible algorithm builder (no coding required)
- Actually customizable profiles beyond header/bio
- Completed implementation of custom feeds, not experimental
- Transparency for all users, not just developers

---

**TikTok**

*Customization Capabilities:*
- Profile: Minimal - standard bio, profile picture, and link
- Feed: Highly personalized For You Page (FYP) with limited user control
- Algorithm transparency: Very low - opaque algorithm with some indirect control through engagement patterns

*What Users Like:*
- Extremely effective personalization that learns quickly
- Simple "not interested" feature to filter content
- Initial category selection helps bootstrap recommendations
- Can reset FYP to start fresh
- Smart keyword filters for topic blocking (2025 feature)

*What Users Dislike:*
- Complete black box - users have no visibility into how algorithm works
- No way to proactively define what you want to see
- Profile pages are purely functional with zero customization
- Only reactive controls (hide content) not proactive (define preferences)
- Filter bubbles and lack of serendipity from opaque algorithm

*Gaps Vrss Can Fill:*
- Transparent discovery algorithm users can understand and modify
- Multiple custom discovery algorithms for different moods/interests
- Rich profile customization for creator identity
- Balance between powerful personalization and user agency

---

**LinkedIn**

*Customization Capabilities:*
- Profile: Structured resume format with preset sections, limited visual customization
- Feed: Algorithmic "Top Updates" by default with political content toggle
- Algorithm transparency: Low - can see why content is shown but cannot modify ranking logic

*What Users Like:*
- Professional structure with clear sections (experience, education, skills)
- Political content toggle for feed filtering
- Post-level "not interested" feedback
- Niche relevance improvements (2025) show content to interested audiences
- Can choose who to follow for some feed control

*What Users Dislike:*
- Rigid profile structure doesn't fit all professional use cases
- Cannot customize profile layout or visual design
- Algorithm prioritizes engagement over chronological or custom preferences
- No chronological feed option
- Limited feed sorting (not available on mobile)

*Gaps Vrss Can Fill:*
- Flexible profile sections that adapt to use case (freelancer portfolio vs. company page)
- Custom feed algorithms beyond simple following/unfollowing
- Visual customization for professional branding
- Full feed control including chronological, custom logic, and multiple feeds

---

**Facebook**

*Customization Capabilities:*
- Profile: Timeline layout is standardized, minimal visual customization
- Feed: Feed filter bar with three options (algorithmic, most recent, favorites)
- Algorithm transparency: Low - AI-powered personalization with some user controls

*What Users Like:*
- Three feed sorting options including chronological
- Favorites feature prioritizes chosen people/pages
- Granular controls introduced in 2025 for feed preferences
- Can see content from followed accounts chronologically

*What Users Dislike:*
- Profile customization essentially non-existent compared to MySpace era
- Algorithm still pushes content from accounts users don't follow
- Controls don't bypass the algorithm entirely
- Heavy AI curation based on inferred interests, not user-defined preferences
- Standardized profile format for all use cases

*Gaps Vrss Can Fill:*
- Return to customizable profiles with modern capabilities
- User-defined feed logic instead of AI inference
- Profile layouts for different purposes beyond personal timeline
- True algorithm transparency with visual builder

---

**BeReal (16-40 million users, 2025)**

*Customization Capabilities:*
- Profile: Minimal - photo, username, friend list
- Feed: No algorithm - chronological posts from friends only
- Algorithm transparency: Complete - there is no algorithm

*What Users Like:*
- Authenticity-first approach with no curation or ads
- Complete absence of algorithmic manipulation
- Simple, clean interface focused on real moments
- Time-bound posting creates urgency and spontaneity
- 68% of users open app within 3 minutes of notification

*What Users Dislike:*
- Zero customization of any kind
- No discovery mechanism beyond friend-of-friend
- Cannot filter or organize content
- One notification per day limits engagement
- Declining user base (25M+ to 16M) suggests model limitations

*Gaps Vrss Can Fill:*
- Balance authenticity with customization options
- Discovery that users control rather than no discovery at all
- Flexible posting/consumption rather than rigid schedule
- Profile personalization while maintaining authenticity

---

**Linktree**

*Customization Capabilities:*
- Profile: Link aggregator with basic styling (colors, fonts, buttons, backgrounds)
- Feed: N/A - static link list, not a social feed
- Algorithm transparency: N/A - no algorithm

*What Users Like:*
- Solves Instagram's single-link problem
- Easy to set up and use
- Basic customization works for simple use cases
- QR code generation for offline sharing

*What Users Dislike:*
- Limited customization on free plan
- Cannot create dynamic or interactive pages
- Drives traffic away from own domain
- Must pay to remove Linktree branding
- No social features (feeds, posts, interactions)
- Minimal SEO benefits
- Not a full profile page, just a link hub

*Gaps Vrss Can Fill:*
- Full social platform with customizable profiles, not just links
- Dynamic content (feeds, galleries, posts) beyond static links
- Social interactions and network effects
- Deep customization included, not paywalled
- Integrated posting and feed capabilities

---

**About.me**

*Customization Capabilities:*
- Profile: Single-page personal website with background image, bio, social links
- Feed: N/A - static profile page
- Algorithm transparency: N/A - no feeds or algorithm

*What Users Like:*
- Simple personal landing page concept
- Background image customization
- Aggregates social media links in one place
- Custom domain support (premium)

*What Users Dislike:*
- Purely static - no feed or content updates
- Limited layout options (mostly text over background)
- Not a social network, just a profile page
- Premium features required for serious customization
- No interaction or social features
- Backstory section feels like static resume

*Gaps Vrss Can Fill:*
- Dynamic, updateable profiles with feeds and posts
- Social network features (following, interactions, discovery)
- Multiple profile section types (galleries, feeds, links, text)
- Flexible layouts for different use cases
- Full platform experience, not just landing page

---

**MySpace (Historical Reference)**

*Customization Capabilities:*
- Profile: Extensive HTML/CSS customization, background images, fonts, colors, autoplay music
- Feed: Basic chronological feed with limited algorithm
- Algorithm transparency: High - mostly chronological with minimal curation

*What Users Like (Historical):*
- Complete creative control over profile design
- Personal expression through music, design, and layout
- Users learned HTML/CSS through customization
- Profile reflected individual identity and creativity
- Top 8 friends feature added social dynamics

*What Users Dislike (Why It Declined):*
- Overwhelming customization led to cluttered, slow-loading pages
- No mobile optimization
- Spam and security issues from custom code
- Inconsistent user experience across profiles
- Technical knowledge required for advanced customization

*Lessons for Vrss:*
- Users deeply value profile customization and self-expression
- Need to balance flexibility with usability and performance
- Must work on mobile (MySpace failed at mobile transition)
- Provide templates and building blocks, not raw HTML/CSS
- Security and performance guardrails essential
- Customization taught users creativity and even coding
- Standardization (Facebook) won over chaos (MySpace) but removed expression

---

#### Key Learnings

**Successful Patterns Vrss Should Adopt:**

1. **Multiple Feed Options** (Instagram, Facebook, Twitter/X)
   - Users appreciate choosing between algorithmic, chronological, and custom feeds
   - Vrss should embrace multiple feed types and make it easy to switch between them

2. **Topic/Interest Controls** (Instagram, TikTok)
   - Recent additions of topic filtering show platforms recognize user demand for control
   - Vrss should make this proactive (define interests) not just reactive (hide topics)

3. **Transparency Attempts** (Twitter/X GitHub code)
   - Even technical transparency shows users value understanding algorithms
   - Vrss should make transparency accessible to all users through visual interface

4. **Reset/Refresh Options** (Instagram, TikTok)
   - Users want ability to start fresh with recommendations
   - Vrss should enable easy algorithm modification and reset

5. **Professional Structure** (LinkedIn)
   - Organized sections work well for certain use cases
   - Vrss should offer templates for common scenarios while allowing customization

6. **Simplicity and Focus** (BeReal)
   - Authenticity and minimal manipulation resonate with users
   - Vrss should make algorithm transparency feel simple, not overwhelming

7. **Link Aggregation** (Linktree, About.me)
   - Users need to consolidate their online presence
   - Vrss profiles should serve as comprehensive personal/brand hubs

---

**Pain Points Vrss Should Solve:**

1. **Black Box Algorithms**
   - Current landscape: Users frustrated by opaque recommendation systems they cannot understand or control
   - Growing regulatory pressure (EU Digital Services Act, Missouri 2025 rule) for algorithm transparency
   - User complaint: "unseen code deciding what they view" creates distrust
   - Vrss solution: Visual algorithm builder using logical blocks (like Apple Shortcuts) makes feed logic transparent and customizable

2. **Lack of Profile Customization**
   - Current landscape: Profile layouts are standardized across Instagram, Twitter/X, TikTok, LinkedIn, Facebook
   - Historical lesson: MySpace's demise led platforms to remove customization entirely
   - User need: Different use cases require different layouts (artist portfolio vs. restaurant menu vs. personal profile)
   - Vrss solution: Flexible sections and layouts while maintaining mobile performance and security

3. **Reactive vs. Proactive Control**
   - Current landscape: Platforms offer "not interested" and "hide this topic" but not "show me this"
   - Users can only react to what algorithm shows them, cannot define preferences upfront
   - Vrss solution: User-created feed algorithms that proactively define what content appears

4. **One-Size-Fits-All Profiles**
   - Current landscape: Social platforms assume everyone wants the same profile format
   - Linktree/About.me show demand for custom landing pages but lack social features
   - LinkedIn structure works for traditional professionals but not creators, artists, businesses
   - Vrss solution: Modular profile sections (feeds, galleries, links, text, etc.) arranged per use case

5. **Filter Bubbles Without Escape**
   - Current landscape: AI personalization creates echo chambers users cannot see or control
   - Platforms recommend content from accounts users don't follow based on opaque criteria
   - Vrss solution: Transparent discovery algorithms users can modify, multiple discovery feeds for different perspectives

6. **Platform Lock-In**
   - Current landscape: Each platform forces users into its paradigm
   - Users must maintain different presences for different platforms
   - Vrss solution: Flexible enough to serve multiple purposes (personal, professional, creative)

7. **Limited Feed Diversity**
   - Current landscape: Users get one algorithmic feed or one chronological feed
   - No way to create specialized feeds for different interests or moods
   - TikTok FYP is one-size-fits-all personalization
   - Vrss solution: Multiple custom feeds users can create and switch between

---

**What Makes Vrss Differentiated:**

1. **Visual Algorithm Builder**
   - Unique feature: Create feed and discovery algorithms using logical blocks (filters, operators, conditions)
   - Inspired by Apple Shortcuts - technical power with visual, accessible interface
   - No platform offers this level of user-created algorithm control
   - Competitors: Twitter/X exploring custom algorithms but not visual/accessible; Instagram adding topic toggles but not proactive building

2. **Deep Profile Customization That Works**
   - Unique feature: Flexible sections, layouts, and styles while maintaining mobile performance
   - Learns from MySpace mistakes: guardrails prevent slow/broken pages
   - Learns from MySpace success: creative expression and identity
   - Competitors: All major platforms abandoned customization; Linktree/About.me are static not social

3. **Multiple Custom Feeds**
   - Unique feature: Create, save, and switch between multiple feed algorithms
   - Use case: Morning news feed, afternoon entertainment feed, evening friends feed
   - Competitors: Bluesky has custom feeds but not user-created algorithms; others offer 2-3 preset options

4. **Transparent Discovery**
   - Unique feature: See and modify how discovery/ForYou page works
   - Create multiple discovery algorithms for different exploration modes
   - Competitors: BeReal has no discovery; others use completely opaque recommendation engines

5. **Use-Case Flexibility**
   - Unique feature: Same platform works for personal profiles, creator portfolios, business pages, restaurant menus
   - Achieved through modular sections and flexible layouts
   - Competitors: LinkedIn for professional, Instagram for visual, Twitter for text - must choose platform based on use case

6. **Algorithm Transparency as Core Value**
   - Unique positioning: Transparency is not a feature but the foundation
   - Addresses 2025 regulatory trends and user demands
   - Users own and understand their experience
   - Competitors: Transparency is bolt-on afterthought; Vrss builds it in from start

7. **Personalization Without Manipulation**
   - Unique approach: Users create personalization logic themselves
   - No hidden AI making decisions based on engagement maximization
   - Authenticity (BeReal philosophy) meets customization (MySpace philosophy)
   - Competitors: AI personalization optimizes for platform goals (engagement, ads), not user goals

---

**Market Positioning:**

Vrss occupies a unique position in the social media landscape:

- **More customizable than** modern platforms (Instagram, TikTok, Twitter/X, LinkedIn, Facebook) which standardized everything
- **More social than** profile services (Linktree, About.me) which are static landing pages
- **More accessible than** technical transparency (Twitter/X GitHub code) with visual algorithm builder
- **More flexible than** use-case-specific platforms (LinkedIn for professional, Instagram for visual) by serving multiple use cases
- **More transparent than** AI-driven platforms (TikTok FYP, Instagram Explore) while maintaining personalization power
- **More practical than** MySpace by preventing performance/security issues while keeping creative freedom

**Value Proposition:** Vrss returns control, creativity, and transparency to users while learning from 20 years of social media evolution to avoid past mistakes.

### User Research

**Research Conducted:**
- Persona development based on competitive landscape analysis and market trends
- Analysis of user complaints and feature requests on existing social platforms (Reddit, Twitter, product forums)
- Review of algorithm transparency regulations and user demands

**Key Findings:**
- **Customization Demand:** Users express frustration with standardized profiles on modern platforms, nostalgia for MySpace-era personalization
- **Algorithm Distrust:** Growing sentiment that opaque algorithms prioritize platform engagement over user satisfaction
- **Control vs Convenience:** Segment of users values control over algorithmic curation, willing to invest time in feed creation
- **Creator Pain Points:** Independent creators struggle with unpredictable visibility, profile layouts that don't match use cases
- **Intentional Consumption:** Users seeking ways to reduce doomscrolling and consume content purposefully

**Research Gaps (To Address Pre-Launch):**
- Need direct user interviews with target personas (20-30 participants recommended)
- Usability testing of visual algorithm builder prototype required
- A/B testing of onboarding flows and profile templates
- Beta user feedback on feature prioritization
- Willingness-to-pay research for storage tiers

### Market Data

**Social Media Market Size:**
- Global social media users: 5.04 billion (62% of global population, 2025)
- U.S. social media users: 302 million (90% of U.S. population)
- Annual growth rate: 3-5% year-over-year
- Social media advertising spending: $207 billion globally (2025)

**Platform Customization Trends:**
- 78% of users want more control over what content they see (2024 survey)
- 65% of users distrust social media algorithms (Pew Research)
- Algorithm transparency regulations growing (EU Digital Services Act, Missouri 2025 law)
- Creator economy: $250 billion market, 50+ million independent creators globally

**Target Market Indicators:**
- Indie music market: $643 million (2023), growing 25% annually
- Local business social media adoption: 70% of SMBs use social media for marketing
- Intentional tech movement: 30% of users have taken social media breaks, seeking healthier alternatives
- PWA adoption: 63% of mobile users prefer in-browser experiences for new services

**Competitive Landscape Gaps:**
- No major platform offers user-created feed algorithms with visual interface
- Profile customization largely abandoned by major platforms since Facebook's rise
- Algorithm transparency initiatives limited to technical users (Twitter/X) or not implemented (most platforms)
- Niche platforms (Linktree, About.me) lack social features; social platforms lack customization

**Relevant Trends:**
- Decentralization movement (Mastodon, Bluesky) shows demand for user control
- BeReal's initial success (then decline) validates authenticity demand but shows limits of oversimplification
- Regulatory pressure for algorithm transparency increasing globally
- Creator monetization expectations rising (expect platforms to support income generation)

**Market Opportunity:**
- Estimated addressable market: 10-20 million users (creators, intentional consumers, businesses seeking flexible profiles)
- Serviceable obtainable market (first 3 years): 100K-500K users
- Revenue potential at scale: $5M-25M annual revenue at 100K-500K users with 5-10% paid conversion
