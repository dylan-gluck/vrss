# VRSS Frontend Data Models & State Management

**Version**: 1.0
**Date**: 2025-10-16
**Tech Stack**: React 18+ / TypeScript 5.5+ / Zustand 4.5+ / TanStack Query 5+

---

## Table of Contents

1. [State Management Architecture](#state-management-architecture)
2. [Global State Stores (Zustand)](#global-state-stores-zustand)
3. [Server State Models (TanStack Query)](#server-state-models-tanstack-query)
4. [Component Props Interfaces](#component-props-interfaces)
5. [Local State Patterns](#local-state-patterns)
6. [State Flow Diagrams](#state-flow-diagrams)

---

## State Management Architecture

VRSS uses a **multi-layered state management** approach:

```pseudocode
# Layer 1: Server State (TanStack Query)
# - Fetching, caching, synchronizing server data
# - Automatic refetching, pagination, infinite scroll
# - Optimistic updates

# Layer 2: Global Client State (Zustand)
# - User session/auth
# - UI state (theme, sidebar open/closed)
# - Cross-feature state
# - Offline queue

# Layer 3: Feature State (Zustand slices)
# - Profile editing state
# - Feed builder state
# - Message drafts

# Layer 4: Local Component State (useState/useReducer)
# - Form inputs
# - UI interactions
# - Ephemeral state
```

**State Location Decision Tree**:

```pseudocode
IS DATA from server?
  YES → TanStack Query (Server State)
  NO → Continue

DOES DATA need to persist across routes?
  YES → Zustand with persist middleware
  NO → Continue

IS DATA used by multiple unrelated components?
  YES → Zustand (Global State)
  NO → Continue

IS DATA complex with multiple related updates?
  YES → useReducer (Local State)
  NO → useState (Local State)
```

---

## Global State Stores (Zustand)

### 1. AuthStore

**Purpose**: Manage user authentication state and session

```pseudocode
STORE: AuthStore
  LOCATION: src/features/auth/stores/authStore.ts

  # State Fields
  FIELDS:
    user: User | null
    token: string | null
    isAuthenticated: boolean
    isLoading: boolean

  # Actions
  BEHAVIORS:
    setUser(user: User, token: string): void
      → Set authenticated user and token
      → Set isAuthenticated = true

    logout(): void
      → Clear user and token
      → Set isAuthenticated = false
      → Clear persisted data

    updateUser(updates: Partial<User>): void
      → Update user fields without full replacement
      → Merge updates with existing user data

  # Configuration
  MIDDLEWARE: persist
  STORAGE: localStorage
  KEY: 'vrss-auth'

  # Persisted Fields
  PERSISTED:
    - user
    - token
    - isAuthenticated

  # Type Definition
  TYPE User:
    id: string
    username: string
    email: string
    avatarUrl: string | undefined
```

**Usage Pattern**:

```pseudocode
# In Component
FUNCTION useAuthUser():
  user = useAuthStore(state → state.user)
  isAuthenticated = useAuthStore(state → state.isAuthenticated)
  RETURN { user, isAuthenticated }

# Login Flow
FUNCTION handleLogin(credentials):
  response = await authApi.login(credentials)
  authStore.setUser(response.user, response.token)

# Logout Flow
FUNCTION handleLogout():
  await authApi.logout()
  authStore.logout()
  router.navigate('/login')
```

---

### 2. UIStore

**Purpose**: Manage global UI state and interactions

```pseudocode
STORE: UIStore
  LOCATION: src/lib/store/uiStore.ts

  # State Fields
  FIELDS:
    theme: 'light' | 'dark' | 'system'
    sidebarOpen: boolean
    bottomNavVisible: boolean
    activeModal: string | null

  # Actions
  BEHAVIORS:
    setTheme(theme: 'light' | 'dark' | 'system'): void
      → Update theme preference
      → Apply theme to document

    toggleSidebar(): void
      → Toggle sidebar open/closed state

    setBottomNavVisible(visible: boolean): void
      → Show/hide bottom navigation
      → Used for scroll-triggered hiding

    openModal(modalId: string): void
      → Set active modal ID
      → Manages modal stack

    closeModal(): void
      → Clear active modal
      → Restore focus to previous element

  # Configuration
  MIDDLEWARE: none
  PERSISTENCE: theme only (via localStorage)

  # Usage Notes
  NOTES:
    - bottomNavVisible used for scroll behavior
    - activeModal manages modal z-index stack
    - Sidebar state resets on route change (mobile)
```

**Usage Pattern**:

```pseudocode
# Theme Toggle
FUNCTION useThemeToggle():
  theme = useUIStore(state → state.theme)
  setTheme = useUIStore(state → state.setTheme)

  FUNCTION toggleTheme():
    newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)

  RETURN { theme, toggleTheme }

# Modal Management
FUNCTION useModal(modalId: string):
  activeModal = useUIStore(state → state.activeModal)
  openModal = useUIStore(state → state.openModal)
  closeModal = useUIStore(state → state.closeModal)

  isOpen = activeModal === modalId

  FUNCTION open():
    openModal(modalId)

  RETURN { isOpen, open, close: closeModal }
```

---

### 3. OfflineStore

**Purpose**: Queue operations for offline-first functionality

```pseudocode
STORE: OfflineStore
  LOCATION: src/lib/store/offlineStore.ts

  # State Fields
  FIELDS:
    isOnline: boolean
    queue: QueuedAction[]

  # QueuedAction Type
  TYPE QueuedAction:
    id: string
    type: 'CREATE_POST' | 'UPDATE_PROFILE' | 'SEND_MESSAGE' | 'LIKE_POST' | 'COMMENT'
    payload: any
    timestamp: number
    retries: number

  # Actions
  BEHAVIORS:
    setOnline(online: boolean): void
      → Update online status
      → IF online THEN processQueue()

    addToQueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>): void
      → Generate UUID for action.id
      → Set timestamp = Date.now()
      → Set retries = 0
      → Add to queue array

    removeFromQueue(id: string): void
      → Filter out action by ID
      → Called after successful sync

    processQueue(): Promise<void>
      → FOR each action in queue:
          TRY:
            execute action via API
            removeFromQueue(action.id)
          CATCH error:
            IF retries < MAX_RETRIES:
              increment retries
            ELSE:
              show error notification
              removeFromQueue(action.id)

  # Configuration
  MIDDLEWARE: persist
  STORAGE: localStorage
  KEY: 'vrss-offline'

  # Constants
  MAX_RETRIES: 3
  RETRY_DELAY: 5000ms
```

**Usage Pattern**:

```pseudocode
# Queue Action When Offline
FUNCTION useCreatePost():
  isOnline = useOfflineStore(state → state.isOnline)
  addToQueue = useOfflineStore(state → state.addToQueue)

  FUNCTION createPost(post: Partial<Post>):
    IF isOnline:
      RETURN postApi.create(post)
    ELSE:
      addToQueue({
        type: 'CREATE_POST',
        payload: post
      })
      show toast "Post will be published when online"

  RETURN { createPost }

# Monitor Online Status
FUNCTION useOnlineMonitor():
  setOnline = useOfflineStore(state → state.setOnline)

  useEffect():
    FUNCTION handleOnline():
      setOnline(true)

    FUNCTION handleOffline():
      setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    RETURN cleanup

  RETURN null
```

---

### 4. ProfileStore

**Purpose**: Manage profile editing state during customization

```pseudocode
STORE: ProfileStore
  LOCATION: src/features/profile/stores/profileStore.ts

  # State Fields
  FIELDS:
    editingProfile: Profile | null
    isDirty: boolean
    selectedSectionId: string | null
    previewMode: boolean

  # Actions
  BEHAVIORS:
    startEditing(profile: Profile): void
      → Set editingProfile = clone of profile
      → Set isDirty = false
      → Enable edit mode

    updateStyles(styles: ProfileStyles): void
      → Merge styles into editingProfile.styles
      → Set isDirty = true

    updateLayout(layout: ProfileLayout): void
      → Update editingProfile.layout
      → Set isDirty = true

    addSection(type: ProfileSection['type']): void
      → Create new section with defaults
      → Add to editingProfile.layout.sections
      → Set isDirty = true

    updateSection(sectionId: string, config: any): void
      → Find section by ID
      → Update section config
      → Set isDirty = true

    removeSection(sectionId: string): void
      → Filter out section from layout
      → Set isDirty = true

    reorderSections(sections: ProfileSection[]): void
      → Replace layout.sections with reordered array
      → Set isDirty = true

    setSelectedSection(sectionId: string | null): void
      → Set selectedSectionId for UI focus

    togglePreview(): void
      → Toggle previewMode boolean

    discardChanges(): void
      → Clear editingProfile
      → Set isDirty = false

    reset(): void
      → Clear all state

  # Configuration
  MIDDLEWARE: none (ephemeral state)

  # Type Definitions
  TYPE ProfileStyles:
    background: {
      type: 'color' | 'gradient' | 'image'
      value: string
    }
    colors: {
      primary: string
      secondary: string
      text: string
      accent: string
    }
    font: {
      family: string
      headingSize: 'sm' | 'md' | 'lg' | 'xl'
      bodySize: 'sm' | 'md' | 'lg'
    }
    music: {
      url: string
      title: string
      autoplay: boolean
    } | undefined

  TYPE ProfileLayout:
    sections: ProfileSection[]
    columnsDesktop: 1 | 2
    columnsMobile: 1

  TYPE ProfileSection:
    id: string
    type: 'feed' | 'gallery' | 'links' | 'text' | 'image' | 'video' | 'friends'
    title: string | undefined
    config: Record<string, any>
    order: number
    visible: boolean
```

**Usage Pattern**:

```pseudocode
# Profile Editor Page
FUNCTION EditProfilePage():
  { profile } = useProfile(username)
  editingProfile = useProfileStore(state → state.editingProfile)
  isDirty = useProfileStore(state → state.isDirty)
  startEditing = useProfileStore(state → state.startEditing)

  useEffect():
    IF profile:
      startEditing(profile)

  FUNCTION handleSave():
    IF editingProfile AND isDirty:
      await profileApi.update(editingProfile.id, editingProfile)
      reset()
      navigate to profile

  RETURN EditProfileUI

# Style Editor Component
FUNCTION ProfileStyleEditor():
  editingProfile = useProfileStore(state → state.editingProfile)
  updateStyles = useProfileStore(state → state.updateStyles)

  FUNCTION handleStyleChange(styles: ProfileStyles):
    updateStyles(styles)

  RETURN StyleEditorUI
```

---

### 5. FeedStore

**Purpose**: Manage feed builder state and algorithm editing

```pseudocode
STORE: FeedStore
  LOCATION: src/features/feed/stores/feedStore.ts

  # State Fields
  FIELDS:
    activeFeedId: string | null
    editingAlgorithm: FeedAlgorithm | null
    isDirty: boolean
    savedFeeds: FeedAlgorithm[]

  # Actions
  BEHAVIORS:
    setActiveFeed(feedId: string | null): void
      → Update currently viewing feed
      → Used for tab switching

    startEditingAlgorithm(algorithm: FeedAlgorithm | null): void
      → Set editingAlgorithm = clone of algorithm
      → Set isDirty = false

    addBlock(blockType: BlockType): void
      → Create new AlgorithmBlock
      → Add to editingAlgorithm.blocks
      → Set isDirty = true

    updateBlock(blockId: string, config: any): void
      → Find block by ID
      → Update block config
      → Set isDirty = true

    removeBlock(blockId: string): void
      → Filter out block from algorithm
      → Set isDirty = true

    reorderBlocks(blocks: AlgorithmBlock[]): void
      → Replace algorithm.blocks with reordered array
      → Set isDirty = true

    saveAlgorithm(algorithm: FeedAlgorithm): void
      → Add or update in savedFeeds array
      → Set isDirty = false

    deleteAlgorithm(algorithmId: string): void
      → Remove from savedFeeds
      → IF active: clear activeFeedId

    discardChanges(): void
      → Clear editingAlgorithm
      → Set isDirty = false

  # Configuration
  MIDDLEWARE: persist (savedFeeds only)
  STORAGE: localStorage
  KEY: 'vrss-feeds'

  # Type Definitions
  TYPE FeedAlgorithm:
    id: string
    name: string
    blocks: AlgorithmBlock[]
    createdAt: string
    updatedAt: string

  TYPE AlgorithmBlock:
    id: string
    type: BlockType
    config: Record<string, any>

  TYPE BlockType:
    | 'filter-author'
    | 'filter-type'
    | 'filter-hashtag'
    | 'filter-date'
    | 'sort-popular'
    | 'sort-recent'
    | 'sort-random'
    | 'limit'
```

**Usage Pattern**:

```pseudocode
# Feed Tabs Component
FUNCTION FeedTabs():
  activeFeedId = useFeedStore(state → state.activeFeedId)
  savedFeeds = useFeedStore(state → state.savedFeeds)
  setActiveFeed = useFeedStore(state → state.setActiveFeed)

  FUNCTION handleTabChange(feedId: string):
    setActiveFeed(feedId)

  RETURN TabsUI with savedFeeds

# Algorithm Builder
FUNCTION AlgorithmBuilder():
  editingAlgorithm = useFeedStore(state → state.editingAlgorithm)
  addBlock = useFeedStore(state → state.addBlock)
  updateBlock = useFeedStore(state → state.updateBlock)
  reorderBlocks = useFeedStore(state → state.reorderBlocks)

  FUNCTION handleDragEnd(event):
    reorderedBlocks = applyDragResult(editingAlgorithm.blocks, event)
    reorderBlocks(reorderedBlocks)

  RETURN BuilderUI
```

---

### 6. MessageStore

**Purpose**: Manage real-time message state and drafts

```pseudocode
STORE: MessageStore
  LOCATION: src/features/messages/stores/messageStore.ts

  # State Fields
  FIELDS:
    drafts: Map<string, string>  # threadId → draft text
    typingUsers: Map<string, string[]>  # threadId → usernames[]
    unreadCounts: Map<string, number>  # threadId → count

  # Actions
  BEHAVIORS:
    saveDraft(threadId: string, text: string): void
      → Update drafts map with text
      → Persist to localStorage

    clearDraft(threadId: string): void
      → Remove from drafts map
      → Called after message sent

    setTypingUser(threadId: string, username: string): void
      → Add username to typingUsers for thread
      → Auto-remove after 3 seconds

    removeTypingUser(threadId: string, username: string): void
      → Filter out username from typingUsers

    setUnreadCount(threadId: string, count: number): void
      → Update unread count for thread

    incrementUnread(threadId: string): void
      → Increment count by 1

    clearUnread(threadId: string): void
      → Set count to 0
      → Called when thread opened

  # Configuration
  MIDDLEWARE: persist (drafts only)
  STORAGE: localStorage
  KEY: 'vrss-message-drafts'
```

**Usage Pattern**:

```pseudocode
# Message Input Component
FUNCTION MessageInput({ threadId }):
  draft = useMessageStore(state → state.drafts.get(threadId))
  saveDraft = useMessageStore(state → state.saveDraft)
  clearDraft = useMessageStore(state → state.clearDraft)

  [text, setText] = useState(draft || '')

  FUNCTION handleChange(newText):
    setText(newText)
    saveDraft(threadId, newText)

  FUNCTION handleSend():
    await messageApi.send(threadId, text)
    clearDraft(threadId)
    setText('')

  RETURN InputUI

# Typing Indicator
FUNCTION TypingIndicator({ threadId }):
  typingUsers = useMessageStore(state → state.typingUsers.get(threadId) || [])

  IF typingUsers.length === 0:
    RETURN null

  text = formatTypingText(typingUsers)  # "Alice is typing..." or "Alice and Bob are typing..."

  RETURN TypingIndicatorUI
```

---

## Server State Models (TanStack Query)

### 1. Post Model

**Purpose**: Fetch, cache, and mutate post data

```pseudocode
MODEL: Post
  LOCATION: src/features/feed/hooks/useFeed.ts

  # Data Structure
  TYPE Post:
    id: string
    type: 'text' | 'image' | 'video' | 'song' | 'gallery'
    author: {
      id: string
      username: string
      avatarUrl: string | undefined
    }
    content: string
    media: Media[]
    hashtags: string[]
    likesCount: number
    commentsCount: number
    sharesCount: number
    isLiked: boolean
    isBookmarked: boolean
    createdAt: string
    updatedAt: string

  TYPE Media:
    id: string
    type: 'image' | 'video' | 'audio'
    url: string
    thumbnailUrl: string | undefined
    alt: string | undefined
    width: number | undefined
    height: number | undefined
    duration: number | undefined

  # Query Hooks
  QUERIES:
    usePost(postId: string):
      KEY: ['post', postId]
      FN: feedApi.getPost(postId)
      STALE_TIME: 5 minutes
      GC_TIME: 30 minutes

    useFeed(options: UseFeedOptions):
      KEY: ['feed', algorithmId]
      FN: feedApi.getFeed({ algorithmId, cursor })
      TYPE: useInfiniteQuery
      NEXT_PAGE: lastPage.nextCursor
      STALE_TIME: 5 minutes
      GC_TIME: 30 minutes

    useUserPosts(username: string):
      KEY: ['posts', 'user', username]
      FN: feedApi.getUserPosts(username)
      TYPE: useInfiniteQuery
      STALE_TIME: 5 minutes

  # Mutation Hooks
  MUTATIONS:
    useCreatePost():
      FN: feedApi.createPost(post)
      OPTIMISTIC_UPDATE:
        1. Cancel outgoing feed queries
        2. Snapshot previous feed data
        3. Add new post to top of feed
      ON_ERROR: rollback to snapshot
      ON_SUCCESS: invalidate feed queries

    useUpdatePost():
      FN: feedApi.updatePost(postId, updates)
      OPTIMISTIC_UPDATE:
        1. Update post in cache
      ON_ERROR: rollback
      ON_SUCCESS: invalidate post queries

    useDeletePost():
      FN: feedApi.deletePost(postId)
      OPTIMISTIC_UPDATE:
        1. Remove post from feeds
      ON_ERROR: rollback
      ON_SUCCESS: invalidate related queries

    useLikePost():
      FN: feedApi.likePost(postId)
      OPTIMISTIC_UPDATE:
        1. Set isLiked = true
        2. Increment likesCount
      ON_ERROR: rollback

    useUnlikePost():
      FN: feedApi.unlikePost(postId)
      OPTIMISTIC_UPDATE:
        1. Set isLiked = false
        2. Decrement likesCount
      ON_ERROR: rollback

    useBookmarkPost():
      FN: feedApi.bookmarkPost(postId)
      OPTIMISTIC_UPDATE:
        1. Set isBookmarked = true
      ON_ERROR: rollback
```

**Usage Pattern**:

```pseudocode
# Infinite Feed Component
FUNCTION FeedView():
  { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeed()

  posts = data?.pages.flatMap(page → page.posts) || []

  FUNCTION handleScroll():
    IF scrolledNearBottom AND hasNextPage AND NOT isFetchingNextPage:
      fetchNextPage()

  RETURN VirtualList with posts

# Post Card Component
FUNCTION PostCard({ post }):
  { mutate: likePost } = useLikePost()
  { mutate: unlikePost } = useUnlikePost()

  FUNCTION handleLike():
    IF post.isLiked:
      unlikePost(post.id)
    ELSE:
      likePost(post.id)

  RETURN CardUI

# Create Post Component
FUNCTION PostComposer():
  { mutate: createPost, isLoading } = useCreatePost()

  FUNCTION handleSubmit(postData):
    createPost(postData, {
      onSuccess: () → {
        show toast "Post published"
        close modal
      }
    })

  RETURN ComposerUI
```

---

### 2. Profile Model

**Purpose**: Fetch and update user profile data

```pseudocode
MODEL: Profile
  LOCATION: src/features/profile/hooks/useProfile.ts

  # Data Structure
  TYPE Profile:
    id: string
    username: string
    displayName: string
    bio: string
    avatarUrl: string | undefined
    styles: ProfileStyles
    layout: ProfileLayout
    visibility: 'public' | 'friends' | 'private'
    createdAt: string
    updatedAt: string

  # Query Hooks
  QUERIES:
    useProfile(username: string):
      KEY: ['profile', username]
      FN: profileApi.getProfile(username)
      STALE_TIME: 10 minutes
      GC_TIME: 30 minutes
      ENABLED: username !== null

    useCurrentUserProfile():
      KEY: ['profile', 'me']
      FN: profileApi.getProfile(currentUser.username)
      STALE_TIME: 5 minutes
      DEPENDS_ON: authStore.user

  # Mutation Hooks
  MUTATIONS:
    useUpdateProfile():
      FN: profileApi.updateProfile(profileId, updates)
      OPTIMISTIC_UPDATE:
        1. Update profile in cache
      ON_ERROR: rollback
      ON_SUCCESS:
        - Invalidate profile queries
        - Update authStore.user if current user

    useUpdateStyles():
      FN: profileApi.updateStyles(profileId, styles)
      OPTIMISTIC_UPDATE:
        1. Update profile.styles in cache
      ON_ERROR: rollback
      ON_SUCCESS: invalidate profile

    useUpdateLayout():
      FN: profileApi.updateLayout(profileId, layout)
      OPTIMISTIC_UPDATE:
        1. Update profile.layout in cache
      ON_ERROR: rollback
      ON_SUCCESS: invalidate profile

    useUploadAvatar():
      FN: profileApi.uploadAvatar(file)
      ON_SUCCESS:
        - Update profile.avatarUrl
        - Update authStore.user.avatarUrl
        - Invalidate profile queries
```

**Usage Pattern**:

```pseudocode
# Profile Page
FUNCTION ProfilePage({ username }):
  { data: profile, isLoading, error } = useProfile(username)

  IF isLoading:
    RETURN ProfileSkeleton

  IF error:
    RETURN ErrorState

  RETURN ProfileRenderer({ profile })

# Profile Editor
FUNCTION ProfileEditor():
  currentUser = useAuthStore(state → state.user)
  { data: profile } = useProfile(currentUser.username)
  { mutate: updateProfile } = useUpdateProfile()
  { mutate: updateStyles } = useUpdateStyles()

  [localStyles, setLocalStyles] = useState(profile?.styles)

  FUNCTION handleSaveStyles():
    updateStyles({ profileId: profile.id, styles: localStyles })

  RETURN EditorUI
```

---

### 3. Message Model

**Purpose**: Fetch and send messages with real-time updates

```pseudocode
MODEL: Message
  LOCATION: src/features/messages/hooks/useMessages.ts

  # Data Structure
  TYPE Message:
    id: string
    threadId: string
    senderId: string
    senderUsername: string
    senderAvatarUrl: string | undefined
    content: string
    attachments: Media[]
    read: boolean
    createdAt: string

  TYPE Thread:
    id: string
    participants: User[]
    lastMessage: Message | null
    unreadCount: number
    updatedAt: string

  # Query Hooks
  QUERIES:
    useThreads():
      KEY: ['threads']
      FN: messageApi.getThreads()
      STALE_TIME: 30 seconds
      REFETCH_INTERVAL: 30 seconds (polling)

    useThread(threadId: string):
      KEY: ['thread', threadId]
      FN: messageApi.getThread(threadId)
      STALE_TIME: 30 seconds

    useMessages(threadId: string):
      KEY: ['messages', threadId]
      FN: messageApi.getMessages(threadId)
      TYPE: useInfiniteQuery
      STALE_TIME: 30 seconds
      REFETCH_INTERVAL: 10 seconds (polling)

  # Mutation Hooks
  MUTATIONS:
    useSendMessage():
      FN: messageApi.sendMessage(threadId, content)
      OPTIMISTIC_UPDATE:
        1. Create temp message with pending ID
        2. Add to messages cache
        3. Update thread.lastMessage
      ON_ERROR:
        - Show retry option
        - Keep in offline queue
      ON_SUCCESS:
        - Replace temp message with real message
        - Invalidate thread queries

    useMarkAsRead():
      FN: messageApi.markAsRead(threadId)
      OPTIMISTIC_UPDATE:
        1. Set all messages read = true
        2. Set thread.unreadCount = 0
      ON_SUCCESS:
        - Update messageStore unread count
```

**Usage Pattern**:

```pseudocode
# Message List (Inbox)
FUNCTION MessageList():
  { data: threads, refetch } = useThreads()

  # Pull to refresh
  FUNCTION handleRefresh():
    refetch()

  RETURN ThreadList with threads

# Message Thread
FUNCTION MessageThread({ threadId }):
  { data, fetchNextPage, hasNextPage } = useMessages(threadId)
  { mutate: sendMessage } = useSendMessage()
  { mutate: markAsRead } = useMarkAsRead()

  messages = data?.pages.flatMap(page → page.messages) || []

  useEffect():
    markAsRead(threadId)

  FUNCTION handleSend(content):
    sendMessage({ threadId, content })

  RETURN ThreadUI
```

---

### 4. Notification Model

**Purpose**: Fetch and manage notification data

```pseudocode
MODEL: Notification
  LOCATION: src/features/notifications/hooks/useNotifications.ts

  # Data Structure
  TYPE Notification:
    id: string
    type: 'LIKE' | 'COMMENT' | 'FOLLOW' | 'MENTION' | 'MESSAGE'
    actorId: string
    actorUsername: string
    actorAvatarUrl: string | undefined
    targetId: string  # post ID, profile ID, etc.
    targetType: 'POST' | 'PROFILE' | 'COMMENT'
    content: string | undefined
    read: boolean
    createdAt: string

  # Query Hooks
  QUERIES:
    useNotifications():
      KEY: ['notifications']
      FN: notificationApi.getNotifications()
      STALE_TIME: 30 seconds
      REFETCH_INTERVAL: 30 seconds (polling)

    useUnreadCount():
      KEY: ['notifications', 'unread']
      FN: notificationApi.getUnreadCount()
      STALE_TIME: 30 seconds
      REFETCH_INTERVAL: 30 seconds (polling)

  # Mutation Hooks
  MUTATIONS:
    useMarkNotificationRead():
      FN: notificationApi.markAsRead(notificationId)
      OPTIMISTIC_UPDATE:
        1. Set notification.read = true
        2. Decrement unread count
      ON_SUCCESS: invalidate queries

    useMarkAllRead():
      FN: notificationApi.markAllAsRead()
      OPTIMISTIC_UPDATE:
        1. Set all notifications.read = true
        2. Set unread count = 0
      ON_SUCCESS: invalidate queries
```

**Usage Pattern**:

```pseudocode
# Notification Badge
FUNCTION NotificationBadge():
  { data: unreadCount } = useUnreadCount()

  IF unreadCount === 0:
    RETURN null

  RETURN Badge with unreadCount

# Notification List
FUNCTION NotificationList():
  { data: notifications } = useNotifications()
  { mutate: markAllRead } = useMarkAllRead()

  FUNCTION handleMarkAllRead():
    markAllRead()

  RETURN NotificationListUI

# Notification Item
FUNCTION NotificationItem({ notification }):
  { mutate: markRead } = useMarkNotificationRead()

  FUNCTION handleClick():
    IF NOT notification.read:
      markRead(notification.id)

    navigate to target

  RETURN ItemUI
```

---

### 5. User Search Model

**Purpose**: Search and discover users

```pseudocode
MODEL: UserSearch
  LOCATION: src/features/search/hooks/useSearch.ts

  # Data Structure
  TYPE SearchResult:
    users: User[]
    posts: Post[]
    hashtags: { tag: string, count: number }[]

  # Query Hooks
  QUERIES:
    useSearch(query: string, filters: SearchFilters):
      KEY: ['search', query, filters]
      FN: searchApi.search(query, filters)
      STALE_TIME: 5 minutes
      ENABLED: query.length >= 2

    useUserSearch(query: string):
      KEY: ['search', 'users', query]
      FN: searchApi.searchUsers(query)
      STALE_TIME: 5 minutes
      ENABLED: query.length >= 2

    useDiscoverFeed(algorithmId: string):
      KEY: ['discover', algorithmId]
      FN: searchApi.getDiscoverFeed(algorithmId)
      TYPE: useInfiniteQuery
      STALE_TIME: 10 minutes
```

**Usage Pattern**:

```pseudocode
# Search Page
FUNCTION SearchPage():
  [query, setQuery] = useState('')
  [filters, setFilters] = useState(defaultFilters)

  debouncedQuery = useDebounce(query, 300)

  { data: results, isLoading } = useSearch(debouncedQuery, filters)

  RETURN SearchUI

# User Autocomplete
FUNCTION UserAutocomplete({ onSelect }):
  [input, setInput] = useState('')

  { data: users } = useUserSearch(input)

  FUNCTION handleSelect(user):
    onSelect(user)
    setInput('')

  RETURN AutocompleteUI
```

---

## Component Props Interfaces

### 1. Feed Builder Components

```pseudocode
# AlgorithmBuilder Component
INTERFACE AlgorithmBuilderProps:
  algorithm: FeedAlgorithm | undefined
  onSave: (algorithm: FeedAlgorithm) → void

# FilterBlock Component
INTERFACE FilterBlockProps:
  block: AlgorithmBlock
  onUpdate: (config: any) → void
  onRemove: () → void
  isDragging: boolean | undefined

# BlockLibrary Component
INTERFACE BlockLibraryProps:
  onSelectBlock: (type: BlockType) → void
  onClose: () → void

# BlockConnector Component
INTERFACE BlockConnectorProps:
  type: 'and' | 'then' | undefined  # default: 'then'
```

---

### 2. Profile Editor Components

```pseudocode
# ProfileStyleEditor Component
INTERFACE ProfileStyleEditorProps:
  profileId: string
  initialStyles: ProfileStyles
  onSave: (styles: ProfileStyles) → void
  onCancel: () → void

# BackgroundPicker Component
INTERFACE BackgroundPickerProps:
  value: {
    type: 'color' | 'gradient' | 'image'
    value: string
  }
  onChange: (background: BackgroundPickerProps['value']) → void

# ColorPicker Component
INTERFACE ColorPickerProps:
  colors: {
    primary: string
    secondary: string
    text: string
    accent: string
  }
  onChange: (colors: ColorPickerProps['colors']) → void

# FontSelector Component
INTERFACE FontSelectorProps:
  selectedFont: {
    family: string
    headingSize: 'sm' | 'md' | 'lg' | 'xl'
    bodySize: 'sm' | 'md' | 'lg'
  }
  onChange: (font: FontSelectorProps['selectedFont']) → void

# MusicSelector Component
INTERFACE MusicSelectorProps:
  selectedMusic: {
    url: string
    title: string
    autoplay: boolean
  } | undefined
  onChange: (music: MusicSelectorProps['selectedMusic']) → void

# SectionManager Component
INTERFACE SectionManagerProps:
  sections: ProfileSection[]
  onAdd: (type: ProfileSection['type']) → void
  onRemove: (sectionId: string) → void
  onReorder: (sections: ProfileSection[]) → void
  onUpdate: (sectionId: string, config: any) → void

# DraggableSection Component
INTERFACE DraggableSectionProps:
  section: ProfileSection
  onUpdate: (config: any) → void
  onRemove: () → void
  onToggleVisibility: () → void

# ProfileRenderer Component
INTERFACE ProfileRendererProps:
  profile: Profile
  isPreview: boolean | undefined
  isEditable: boolean | undefined
```

---

### 3. Post Components

```pseudocode
# PostCard Component
INTERFACE PostCardProps:
  post: Post
  onLike: ((postId: string) → void) | undefined
  onComment: ((postId: string) → void) | undefined
  onShare: ((postId: string) → void) | undefined
  onBookmark: ((postId: string) → void) | undefined

# PostComposer Component
INTERFACE PostComposerProps:
  onSubmit: (post: Partial<Post>) → void
  onCancel: (() → void) | undefined
  initialContent: string | undefined
  initialType: Post['type'] | undefined

# TextPost Component
INTERFACE TextPostProps:
  content: string
  maxLines: number | undefined  # default: unlimited
  showReadMore: boolean | undefined

# ImagePost Component
INTERFACE ImagePostProps:
  images: Media[]
  caption: string | undefined
  layout: 'single' | 'grid' | 'carousel' | undefined

# VideoPost Component
INTERFACE VideoPostProps:
  video: Media
  caption: string | undefined
  autoplay: boolean | undefined
  muted: boolean | undefined

# SongPost Component
INTERFACE SongPostProps:
  song: Media
  album: Media[] | undefined
  artist: string | undefined
  coverArt: string | undefined

# GalleryPost Component
INTERFACE GalleryPostProps:
  images: Media[]
  caption: string | undefined
  columns: number | undefined  # default: 3

# MediaUpload Component
INTERFACE MediaUploadProps:
  type: 'image' | 'video' | 'audio'
  multiple: boolean | undefined  # default: false
  maxFiles: number | undefined  # default: 10
  maxSize: number | undefined  # bytes, default: 50MB
  onUpload: (files: File[]) → Promise<void>
```

---

### 4. Navigation Components

```pseudocode
# BottomNav Component
INTERFACE BottomNavProps:
  activeRoute: string | undefined
  unreadMessages: number | undefined
  unreadNotifications: number | undefined

# Sidebar Component
INTERFACE SidebarProps:
  user: User
  activeRoute: string | undefined
  unreadMessages: number | undefined
  unreadNotifications: number | undefined
  onLogout: (() → void) | undefined

# MobileHeader Component
INTERFACE MobileHeaderProps:
  title: string | undefined
  showBack: boolean | undefined
  showSearch: boolean | undefined
  showMenu: boolean | undefined
  onBack: (() → void) | undefined
  actions: React.ReactNode | undefined
```

---

### 5. Form Components

```pseudocode
# LoginForm Component
INTERFACE LoginFormProps:
  onSubmit: (credentials: { email: string, password: string }) → Promise<void>
  onForgotPassword: (() → void) | undefined
  onSignUp: (() → void) | undefined

# RegisterForm Component
INTERFACE RegisterFormProps:
  onSubmit: (data: {
    username: string
    email: string
    password: string
    confirmPassword: string
  }) → Promise<void>
  onLogin: (() → void) | undefined

# SearchForm Component
INTERFACE SearchFormProps:
  onSearch: (query: string, filters?: SearchFilters) → void
  placeholder: string | undefined
  showFilters: boolean | undefined
  recentSearches: string[] | undefined

INTERFACE SearchFilters:
  type: 'all' | 'users' | 'posts' | 'hashtags' | undefined
  dateRange: {
    from: string | undefined
    to: string | undefined
  } | undefined
```

---

### 6. Layout Components

```pseudocode
# AppShell Component
INTERFACE AppShellProps:
  # No props - uses routing context

# ErrorBoundary Component
INTERFACE ErrorBoundaryProps:
  children: React.ReactNode
  fallback: React.ReactNode | undefined
  onError: ((error: Error, errorInfo: React.ErrorInfo) → void) | undefined

# LoadingSpinner Component
INTERFACE LoadingSpinnerProps:
  size: 'sm' | 'md' | 'lg' | undefined  # default: 'md'
  label: string | undefined

# EmptyState Component
INTERFACE EmptyStateProps:
  icon: React.ReactNode | undefined
  title: string
  description: string | undefined
  action: {
    label: string
    onClick: () → void
  } | undefined

# InfiniteScroll Component
INTERFACE InfiniteScrollProps:
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () → void
  threshold: number | undefined  # default: 300px
  children: React.ReactNode

# VirtualList Component
INTERFACE VirtualListProps<T>:
  items: T[]
  renderItem: (item: T, index: number) → React.ReactNode
  estimateSize: number | undefined  # default: 400
  overscan: number | undefined  # default: 5
  onEndReached: (() → void) | undefined
  endReachedThreshold: number | undefined  # default: 3
```

---

## Local State Patterns

### 1. Form State Pattern (React Hook Form)

```pseudocode
# Login Form
PATTERN: FormState with React Hook Form

COMPONENT LoginForm:
  # Setup form with validation
  form = useForm({
    defaultValues: {
      email: '',
      password: ''
    },
    resolver: zodResolver(loginSchema)
  })

  # Submit handler
  ASYNC FUNCTION onSubmit(data):
    TRY:
      await authApi.login(data)
      authStore.setUser(response.user, response.token)
      navigate to home
    CATCH error:
      form.setError('root', { message: error.message })

  # Render with form state
  RETURN Form:
    - Email field (controlled by form)
    - Password field (controlled by form)
    - Error messages (from form.formState.errors)
    - Submit button (disabled when form.formState.isSubmitting)

# Validation Schema
SCHEMA loginSchema:
  email: string().email().required()
  password: string().min(8).required()
```

---

### 2. Modal State Pattern

```pseudocode
# Modal Management Pattern

PATTERN: Controlled Modal State

COMPONENT Page:
  [isOpen, setIsOpen] = useState(false)
  [modalData, setModalData] = useState(null)

  FUNCTION openModal(data):
    setModalData(data)
    setIsOpen(true)

  FUNCTION closeModal():
    setIsOpen(false)
    setTimeout(() → setModalData(null), 300)  # after animation

  RETURN:
    - Page content
    - Modal component with isOpen and modalData props

# Alternative: Using UIStore
COMPONENT Page:
  activeModal = useUIStore(state → state.activeModal)
  openModal = useUIStore(state → state.openModal)
  closeModal = useUIStore(state → state.closeModal)

  isOpen = activeModal === 'myModal'

  FUNCTION handleOpen():
    openModal('myModal')

  RETURN:
    - Page content
    - Modal with isOpen prop
```

---

### 3. Multi-Step Form Pattern

```pseudocode
# Multi-Step Form State

PATTERN: Wizard Form with useReducer

TYPE FormState:
  step: number
  data: {
    step1: Record<string, any>
    step2: Record<string, any>
    step3: Record<string, any>
  }
  errors: Record<string, string>

TYPE FormAction:
  | { type: 'NEXT_STEP', payload: Record<string, any> }
  | { type: 'PREV_STEP' }
  | { type: 'SET_ERROR', payload: { field: string, message: string } }
  | { type: 'RESET' }

FUNCTION formReducer(state: FormState, action: FormAction):
  MATCH action.type:
    CASE 'NEXT_STEP':
      RETURN {
        ...state,
        step: state.step + 1,
        data: {
          ...state.data,
          [`step${state.step}`]: action.payload
        }
      }

    CASE 'PREV_STEP':
      RETURN { ...state, step: state.step - 1 }

    CASE 'SET_ERROR':
      RETURN {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.field]: action.payload.message
        }
      }

    CASE 'RESET':
      RETURN initialState

COMPONENT MultiStepForm:
  [state, dispatch] = useReducer(formReducer, initialState)

  FUNCTION handleNext(data):
    # Validate current step
    errors = validateStep(state.step, data)
    IF errors:
      FOR EACH error:
        dispatch({ type: 'SET_ERROR', payload: error })
      RETURN

    # Move to next step
    dispatch({ type: 'NEXT_STEP', payload: data })

    # If final step, submit
    IF state.step === totalSteps:
      submitForm(state.data)

  FUNCTION handlePrev():
    dispatch({ type: 'PREV_STEP' })

  RETURN:
    - Step indicator
    - Current step form
    - Navigation buttons
```

---

### 4. Drag and Drop State Pattern

```pseudocode
# Drag and Drop with @dnd-kit

PATTERN: Sortable List State

COMPONENT SortableList({ items, onReorder }):
  [activeId, setActiveId] = useState(null)

  sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  )

  FUNCTION handleDragStart(event):
    setActiveId(event.active.id)

  FUNCTION handleDragEnd(event):
    setActiveId(null)

    { active, over } = event

    IF active.id !== over.id:
      oldIndex = items.findIndex(item → item.id === active.id)
      newIndex = items.findIndex(item → item.id === over.id)

      reorderedItems = arrayMove(items, oldIndex, newIndex)
      onReorder(reorderedItems)

  FUNCTION handleDragCancel():
    setActiveId(null)

  RETURN DndContext:
    sensors: sensors
    onDragStart: handleDragStart
    onDragEnd: handleDragEnd
    onDragCancel: handleDragCancel
    children:
      - SortableContext with items
      - DragOverlay with activeId
```

---

### 5. Debounced Search Pattern

```pseudocode
# Debounced Input State

PATTERN: Debounced Search Input

COMPONENT SearchInput({ onSearch }):
  [value, setValue] = useState('')
  debouncedValue = useDebounce(value, 300)

  # Effect triggers search when debounced value changes
  useEffect():
    IF debouncedValue:
      onSearch(debouncedValue)
  , [debouncedValue, onSearch]

  FUNCTION handleChange(newValue):
    setValue(newValue)

  RETURN Input with value and onChange

# Custom Hook: useDebounce
HOOK useDebounce(value, delay):
  [debouncedValue, setDebouncedValue] = useState(value)

  useEffect():
    timer = setTimeout(() → {
      setDebouncedValue(value)
    }, delay)

    RETURN () → clearTimeout(timer)
  , [value, delay]

  RETURN debouncedValue
```

---

### 6. Toggle/Accordion State Pattern

```pseudocode
# Toggle State Management

PATTERN: Expandable Items

COMPONENT AccordionList({ items }):
  [openIds, setOpenIds] = useState<Set<string>>(new Set())

  FUNCTION toggleItem(id: string):
    setOpenIds(prev → {
      newSet = new Set(prev)
      IF newSet.has(id):
        newSet.delete(id)
      ELSE:
        newSet.add(id)
      RETURN newSet
    })

  FUNCTION isOpen(id: string):
    RETURN openIds.has(id)

  RETURN:
    FOR EACH item in items:
      AccordionItem
        expanded: isOpen(item.id)
        onToggle: () → toggleItem(item.id)

# Single Toggle Variant
COMPONENT SingleAccordion({ items }):
  [openId, setOpenId] = useState<string | null>(null)

  FUNCTION toggleItem(id: string):
    setOpenId(prev → prev === id ? null : id)

  RETURN items mapped to AccordionItem
```

---

### 7. Optimistic UI Update Pattern

```pseudocode
# Optimistic Update with Local State

PATTERN: Optimistic Like Button

COMPONENT LikeButton({ post }):
  # Optimistic state
  [isLiked, setIsLiked] = useState(post.isLiked)
  [likesCount, setLikesCount] = useState(post.likesCount)

  { mutate: likePost } = useLikePost()
  { mutate: unlikePost } = useUnlikePost()

  FUNCTION handleClick():
    # Optimistic update
    previousLiked = isLiked
    previousCount = likesCount

    newLiked = NOT isLiked
    newCount = newLiked ? likesCount + 1 : likesCount - 1

    setIsLiked(newLiked)
    setLikesCount(newCount)

    # Server request
    mutation = newLiked ? likePost : unlikePost

    mutation(post.id, {
      onError: () → {
        # Rollback on error
        setIsLiked(previousLiked)
        setLikesCount(previousCount)
        show toast "Failed to update like"
      }
    })

  RETURN Button with isLiked and likesCount
```

---

### 8. File Upload Progress Pattern

```pseudocode
# File Upload State

PATTERN: Upload with Progress

COMPONENT FileUploader({ onUpload }):
  [files, setFiles] = useState<File[]>([])
  [uploading, setUploading] = useState(false)
  [progress, setProgress] = useState(0)
  [error, setError] = useState<string | null>(null)

  ASYNC FUNCTION handleUpload():
    IF files.length === 0:
      RETURN

    setUploading(true)
    setProgress(0)
    setError(null)

    TRY:
      # Upload with progress tracking
      result = await uploadWithProgress(files, (progressEvent) → {
        percent = (progressEvent.loaded / progressEvent.total) * 100
        setProgress(percent)
      })

      onUpload(result)
      setFiles([])
      setProgress(0)

    CATCH error:
      setError(error.message)

    FINALLY:
      setUploading(false)

  FUNCTION handleFilesSelected(selectedFiles):
    setFiles(selectedFiles)
    setError(null)

  RETURN:
    - File dropzone
    - File list with remove buttons
    - Progress bar (if uploading)
    - Error message (if error)
    - Upload button
```

---

## State Flow Diagrams

### Authentication Flow

```pseudocode
# User Authentication State Flow

START: Unauthenticated
  ↓
  User enters credentials
  ↓
  Submit login form
  ↓
  [Local State] form.isSubmitting = true
  ↓
  Call authApi.login()
  ↓
SUCCESS?
  YES →
    ↓
    [Zustand] authStore.setUser(user, token)
    ↓
    [Persist] Save to localStorage
    ↓
    [TanStack Query] Invalidate user queries
    ↓
    [Router] Navigate to home
    ↓
    END: Authenticated

  NO →
    ↓
    [Local State] form.setError('Invalid credentials')
    ↓
    [Local State] form.isSubmitting = false
    ↓
    LOOP: Back to credentials entry

# Session Persistence
ON APP LOAD:
  ↓
  [Zustand] Load authStore from localStorage
  ↓
  IS token present?
    YES →
      ↓
      Verify token validity
      ↓
      VALID?
        YES → Set authenticated state
        NO → Clear auth state, redirect to login

    NO →
      ↓
      Redirect to login
```

---

### Post Creation Flow

```pseudocode
# Create Post State Flow

START: User opens post composer
  ↓
  [Local State] useState for form fields
  ↓
  User types content
  ↓
  [Local State] Update content state
  ↓
  User uploads media (optional)
  ↓
  [Local State] Add files to media array
  ↓
  [Local State] Show upload progress
  ↓
  User clicks publish
  ↓
  [TanStack Query] useMutation: createPost
  ↓
  [Optimistic Update] Add post to feed cache
  ↓
  Call postApi.create()
  ↓
SUCCESS?
  YES →
    ↓
    [TanStack Query] Invalidate feed queries
    ↓
    [Local State] Reset form
    ↓
    [UIStore] Close modal
    ↓
    Show success toast
    ↓
    END: Post published

  NO →
    ↓
    [TanStack Query] Rollback optimistic update
    ↓
    [OfflineStore] Add to queue (if offline)
    ↓
    Show error toast
    ↓
    OPTION: Retry or save as draft

# Offline Scenario
IF offline during publish:
  ↓
  [OfflineStore] addToQueue({ type: 'CREATE_POST', payload: post })
  ↓
  [Local Storage] Persist queue
  ↓
  Show "Will publish when online" message
  ↓
  WAIT for online
  ↓
  [OfflineStore] processQueue()
  ↓
  Retry post creation
```

---

### Profile Customization Flow

```pseudocode
# Profile Editing State Flow

START: User navigates to edit profile
  ↓
  [TanStack Query] useProfile(username)
  ↓
  [ProfileStore] startEditing(profile)
  ↓
  Clone profile to editingProfile
  ↓
  User changes styles
  ↓
  [ProfileStore] updateStyles(styles)
  ↓
  [ProfileStore] isDirty = true
  ↓
  User changes layout
  ↓
  [ProfileStore] updateLayout(layout)
  ↓
  User adds/removes sections
  ↓
  [ProfileStore] addSection / removeSection
  ↓
  User clicks save
  ↓
  [TanStack Query] useMutation: updateProfile
  ↓
  [Optimistic Update] Update profile in cache
  ↓
  Call profileApi.update()
  ↓
SUCCESS?
  YES →
    ↓
    [TanStack Query] Invalidate profile queries
    ↓
    [ProfileStore] reset()
    ↓
    [ProfileStore] isDirty = false
    ↓
    [Router] Navigate to profile
    ↓
    Show success toast
    ↓
    END: Profile updated

  NO →
    ↓
    [TanStack Query] Rollback optimistic update
    ↓
    Show error toast
    ↓
    OPTION: Retry or discard

# Discard Changes
IF user clicks cancel:
  ↓
  [ProfileStore] discardChanges()
  ↓
  [Router] Navigate back
  ↓
  END: Changes discarded
```

---

### Feed Algorithm Builder Flow

```pseudocode
# Feed Algorithm Editing State Flow

START: User opens feed builder
  ↓
  [FeedStore] startEditingAlgorithm(algorithm)
  ↓
  User adds filter block
  ↓
  [FeedStore] addBlock(blockType)
  ↓
  [FeedStore] isDirty = true
  ↓
  User configures block
  ↓
  [FeedStore] updateBlock(blockId, config)
  ↓
  User reorders blocks (drag and drop)
  ↓
  [Local State] useState for drag state
  ↓
  [FeedStore] reorderBlocks(newOrder)
  ↓
  User clicks save
  ↓
  [TanStack Query] useMutation: saveAlgorithm
  ↓
  Call feedApi.saveAlgorithm()
  ↓
SUCCESS?
  YES →
    ↓
    [FeedStore] saveAlgorithm(algorithm)
    ↓
    [FeedStore] isDirty = false
    ↓
    [TanStack Query] Invalidate feed queries
    ↓
    Show success toast
    ↓
    Apply new algorithm to feed
    ↓
    END: Algorithm saved

  NO →
    ↓
    Show error toast
    ↓
    OPTION: Retry or discard

# Preview Algorithm
IF user clicks preview:
  ↓
  [TanStack Query] useFeed({ algorithm: editingAlgorithm })
  ↓
  Fetch preview feed
  ↓
  Display in modal
  ↓
  User can continue editing or save
```

---

### Message Real-Time Updates Flow

```pseudocode
# Message Polling State Flow

START: User opens message thread
  ↓
  [TanStack Query] useMessages(threadId, { refetchInterval: 10s })
  ↓
  [MessageStore] clearUnread(threadId)
  ↓
  Display messages
  ↓
POLLING LOOP (every 10s):
  ↓
  Call messageApi.getMessages(threadId)
  ↓
  NEW MESSAGES?
    YES →
      ↓
      [TanStack Query] Update cache with new messages
      ↓
      [Local State] Scroll to bottom (if at bottom)
      ↓
      Play notification sound
      ↓
      CONTINUE POLLING

    NO →
      ↓
      CONTINUE POLLING

# Send Message
User types message
  ↓
  [MessageStore] saveDraft(threadId, text)
  ↓
  User presses send
  ↓
  [TanStack Query] useMutation: sendMessage
  ↓
  [Optimistic Update] Add temp message to cache
  ↓
  [MessageStore] clearDraft(threadId)
  ↓
  Call messageApi.send()
  ↓
SUCCESS?
  YES →
    ↓
    [TanStack Query] Replace temp message with real message
    ↓
    [TanStack Query] Invalidate thread queries
    ↓
    END: Message sent

  NO →
    ↓
    [TanStack Query] Rollback optimistic update
    ↓
    [MessageStore] saveDraft(threadId, text)
    ↓
    [OfflineStore] Add to queue if offline
    ↓
    Show retry option
```

---

## References

- **Frontend Architecture**: `/docs/frontend-architecture.md`
- **Component Specifications**: `/docs/component-specifications.md`
- **API Integration**: `/docs/frontend-api-integration.md`
- **Implementation Guide**: `/docs/frontend-implementation-guide.md`

---

## Summary

This document provides comprehensive documentation of the VRSS frontend data models and state management:

1. **Global State (Zustand)**: 6 stores for auth, UI, offline, profile, feed, and messages
2. **Server State (TanStack Query)**: 5 models for posts, profiles, messages, notifications, and search
3. **Component Props**: Typed interfaces for 30+ major components
4. **Local State**: 8 patterns for forms, modals, drag-and-drop, debouncing, and optimistic updates
5. **State Flows**: Detailed diagrams for authentication, post creation, profile editing, feed building, and messaging

**Key Principles**:
- Multi-layered state management (Server → Global → Feature → Local)
- Type-safe interfaces with TypeScript
- Optimistic updates for better UX
- Offline-first with queue management
- Efficient caching and refetching strategies
- Clear state ownership and data flow
