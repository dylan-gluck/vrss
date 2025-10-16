# VRSS Component Specifications

**Version**: 1.0
**Date**: 2025-10-16

This document provides detailed specifications for key components in the VRSS social platform.

---

## Table of Contents

1. [Feed Builder Components](#feed-builder-components)
2. [Profile Editor Components](#profile-editor-components)
3. [Post Components](#post-components)
4. [Navigation Components](#navigation-components)
5. [Form Components](#form-components)

---

## Feed Builder Components

### FilterBlock Component

**Purpose**: Represents a single filter or transformation in the feed algorithm.

**Props**:
```typescript
interface FilterBlockProps {
  block: AlgorithmBlock;
  onUpdate: (config: any) => void;
  onRemove: () => void;
  isDragging?: boolean;
}
```

**Block Types**:

#### 1. Filter by Author
```typescript
{
  type: 'filter-author',
  config: {
    usernames: string[];      // List of usernames to filter
    mode: 'include' | 'exclude'  // Include or exclude posts
  }
}
```

**UI**: Multi-select user search input with chips

#### 2. Filter by Post Type
```typescript
{
  type: 'filter-type',
  config: {
    types: ('text' | 'image' | 'video' | 'song' | 'gallery')[];
    mode: 'include' | 'exclude'
  }
}
```

**UI**: Checkbox group for post types

#### 3. Filter by Hashtag
```typescript
{
  type: 'filter-hashtag',
  config: {
    hashtags: string[];
    mode: 'include' | 'exclude'
    matchAll: boolean;  // true = AND, false = OR
  }
}
```

**UI**: Tag input with autocomplete

#### 4. Filter by Date Range
```typescript
{
  type: 'filter-date',
  config: {
    from?: string;  // ISO date
    to?: string;    // ISO date
    relative?: {
      value: number;
      unit: 'hours' | 'days' | 'weeks' | 'months';
    }
  }
}
```

**UI**: Date picker or relative time selector

#### 5. Sort by Popularity
```typescript
{
  type: 'sort-popular',
  config: {
    metric: 'likes' | 'comments' | 'shares' | 'engagement';
    direction: 'asc' | 'desc';
    timeWindow?: {
      value: number;
      unit: 'hours' | 'days' | 'weeks';
    }
  }
}
```

**UI**: Dropdown for metric, toggle for direction

#### 6. Sort by Recency
```typescript
{
  type: 'sort-recent',
  config: {
    direction: 'asc' | 'desc';
  }
}
```

**UI**: Simple toggle for direction

#### 7. Sort by Random
```typescript
{
  type: 'sort-random',
  config: {
    seed?: number;  // Optional seed for reproducible randomness
  }
}
```

**UI**: No configuration needed

#### 8. Limit Results
```typescript
{
  type: 'limit',
  config: {
    count: number;
  }
}
```

**UI**: Number input with increment/decrement buttons

### BlockLibrary Component

**Purpose**: Modal/drawer showing available filter blocks with descriptions.

```typescript
interface BlockLibraryProps {
  onSelectBlock: (type: BlockType) => void;
  onClose: () => void;
}
```

**Layout**:
```
┌─────────────────────────────────┐
│  Filter Block Library      [X]  │
├─────────────────────────────────┤
│                                 │
│  Filters                        │
│  ┌────────────────────┐         │
│  │ Filter by Author   │ +       │
│  │ Select posts from  │         │
│  │ specific users     │         │
│  └────────────────────┘         │
│                                 │
│  ┌────────────────────┐         │
│  │ Filter by Type     │ +       │
│  │ Show only certain  │         │
│  │ post types         │         │
│  └────────────────────┘         │
│                                 │
│  Sorting                        │
│  ┌────────────────────┐         │
│  │ Sort by Popular    │ +       │
│  │ Order by likes or  │         │
│  │ engagement         │         │
│  └────────────────────┘         │
│                                 │
└─────────────────────────────────┘
```

### BlockConnector Component

**Purpose**: Visual connector between filter blocks showing data flow.

```typescript
interface BlockConnectorProps {
  type?: 'and' | 'then';  // Default: 'then'
}
```

**Visual Design**:
```
    ┌──────────────┐
    │ Filter Block │
    └──────────────┘
           │
           ↓   <- BlockConnector
    ┌──────────────┐
    │ Filter Block │
    └──────────────┘
```

---

## Profile Editor Components

### BackgroundPicker Component

**Purpose**: Select profile background (color, gradient, or image).

```typescript
interface BackgroundPickerProps {
  value: {
    type: 'color' | 'gradient' | 'image';
    value: string;
  };
  onChange: (background: BackgroundPickerProps['value']) => void;
}
```

**Features**:
- Tab switcher for color/gradient/image
- Color picker with presets
- Gradient builder (start/end colors, direction)
- Image upload with crop tool
- Preview panel

**Layout**:
```
┌─────────────────────────────────┐
│ [Color] [Gradient] [Image]      │
├─────────────────────────────────┤
│                                 │
│  Color Picker                   │
│  ┌─────┐ ┌─────┐ ┌─────┐       │
│  │ Red │ │Green│ │Blue │       │
│  └─────┘ └─────┘ └─────┘       │
│                                 │
│  Presets:                       │
│  ⬜ ⬜ ⬜ ⬜ ⬜                  │
│                                 │
│  Preview:                       │
│  ┌─────────────────┐            │
│  │                 │            │
│  │   Your Profile  │            │
│  │                 │            │
│  └─────────────────┘            │
│                                 │
└─────────────────────────────────┘
```

### ColorPicker Component

**Purpose**: Pick colors for text, links, and accents.

```typescript
interface ColorPickerProps {
  colors: {
    primary: string;
    secondary: string;
    text: string;
    accent: string;
  };
  onChange: (colors: ColorPickerProps['colors']) => void;
}
```

**Features**:
- Individual color pickers for each color role
- Color harmony suggestions
- Accessibility contrast checker
- Save custom color palettes
- Preview in real-time

### FontSelector Component

**Purpose**: Select typography settings.

```typescript
interface FontSelectorProps {
  selectedFont: {
    family: string;
    headingSize: 'sm' | 'md' | 'lg' | 'xl';
    bodySize: 'sm' | 'md' | 'lg';
  };
  onChange: (font: FontSelectorProps['selectedFont']) => void;
}
```

**Available Fonts**:
- System fonts: System UI, Arial, Georgia, etc.
- Web fonts: Inter, Roboto, Playfair Display, Merriweather, etc.

**Features**:
- Font preview with sample text
- Size sliders for headings and body
- Line height adjustment
- Weight selection (for variable fonts)

### SectionManager Component

**Purpose**: Add, remove, and reorder profile sections.

```typescript
interface SectionManagerProps {
  sections: ProfileSection[];
  onAdd: (type: ProfileSection['type']) => void;
  onRemove: (sectionId: string) => void;
  onReorder: (sections: ProfileSection[]) => void;
  onUpdate: (sectionId: string, config: any) => void;
}
```

**Features**:
- Drag-and-drop reordering
- Section type selector modal
- Individual section configuration
- Toggle section visibility
- Preview mode

**Layout**:
```
┌─────────────────────────────────┐
│ Profile Sections          [+]   │
├─────────────────────────────────┤
│                                 │
│  ≡ Feed - Recent Posts     [👁] │
│    Show latest 10 posts         │
│                           [⚙][X]│
│                                 │
│  ≡ Gallery - Photos        [👁] │
│    3 column grid                │
│                           [⚙][X]│
│                                 │
│  ≡ Links                   [👁] │
│    Social media links           │
│                           [⚙][X]│
│                                 │
└─────────────────────────────────┘
```

### DraggableSection Component

**Purpose**: Individual draggable section item in the manager.

```typescript
interface DraggableSectionProps {
  section: ProfileSection;
  onUpdate: (config: any) => void;
  onRemove: () => void;
  onToggleVisibility: () => void;
}
```

**Features**:
- Drag handle
- Section icon and title
- Quick visibility toggle
- Settings button
- Delete button
- Collapse/expand

### ProfileRenderer Component

**Purpose**: Render the customized profile with applied styles and layout.

```typescript
interface ProfileRendererProps {
  profile: Profile;
  isPreview?: boolean;
  isEditable?: boolean;
}
```

**Features**:
- Apply background styles
- Apply color theme
- Apply typography
- Render sections in order
- Responsive layout
- Background music player (if set)

---

## Post Components

### PostComposer Component

**Purpose**: Create a new post with text and media.

```typescript
interface PostComposerProps {
  onSubmit: (post: Partial<Post>) => void;
  onCancel?: () => void;
  initialContent?: string;
  initialType?: Post['type'];
}
```

**Features**:
- Rich text editor with formatting
- Post type selector
- Media upload (based on type)
- Hashtag autocomplete
- Character counter
- Save as draft
- Preview mode

**Layout (Mobile)**:
```
┌─────────────────────────────────┐
│ [Cancel]  New Post    [Publish] │
├─────────────────────────────────┤
│                                 │
│  What's on your mind?           │
│  ┌─────────────────────────┐   │
│  │ Type here...            │   │
│  │                         │   │
│  └─────────────────────────┘   │
│                                 │
│  [Text] [Image] [Video] [Song] │
│                                 │
│  Add media:                     │
│  ┌─────────────────────────┐   │
│  │   [📷 Upload Photo]      │   │
│  └─────────────────────────┘   │
│                                 │
│  #hashtags                      │
│  ┌─────────────────────────┐   │
│  │ #music #newrelease      │   │
│  └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

### TextPost Component

**Purpose**: Display a text-only post.

```typescript
interface TextPostProps {
  content: string;
  maxLines?: number;  // Truncate long posts
  showReadMore?: boolean;
}
```

**Features**:
- Parse and linkify URLs
- Parse and link hashtags
- Parse and link mentions
- Expandable for long content
- Copy text option

### ImagePost Component

**Purpose**: Display post with image(s).

```typescript
interface ImagePostProps {
  images: Media[];
  caption?: string;
  layout?: 'single' | 'grid' | 'carousel';
}
```

**Features**:
- Single image: Full width
- 2-4 images: Grid layout
- 5+ images: Carousel with indicators
- Lightbox on click
- Pinch to zoom (mobile)
- Download option

### VideoPost Component

**Purpose**: Display post with video.

```typescript
interface VideoPostProps {
  video: Media;
  caption?: string;
  autoplay?: boolean;
  muted?: boolean;
}
```

**Features**:
- Custom video player controls
- Thumbnail preview
- Progress bar
- Fullscreen option
- Playback speed control
- Quality selector (if available)

### SongPost Component

**Purpose**: Display post with audio (single song or album).

```typescript
interface SongPostProps {
  song: Media;
  album?: Media[];
  artist?: string;
  coverArt?: string;
}
```

**Features**:
- Album artwork display
- Play/pause button
- Progress bar with time
- Volume control
- Previous/next track (for albums)
- Add to playlist option

### GalleryPost Component

**Purpose**: Display post with multiple images in a gallery.

```typescript
interface GalleryPostProps {
  images: Media[];
  caption?: string;
  columns?: number;
}
```

**Features**:
- Masonry grid layout
- Lazy loading images
- Lightbox gallery view
- Swipe navigation (mobile)
- Download individual images

---

## Navigation Components

### BottomNav Component

**Purpose**: Mobile bottom navigation bar.

```typescript
interface BottomNavProps {
  activeRoute?: string;
  unreadMessages?: number;
  unreadNotifications?: number;
}
```

**Layout**:
```
┌─────────────────────────────────┐
│  🏠    🔍    ➕    💬(3)  👤    │
│ Home  Search  New  Messages  Me │
└─────────────────────────────────┘
```

**Features**:
- Icon-based navigation
- Active state highlighting
- Badge for unread counts
- Haptic feedback on tap (if supported)
- Smooth transitions

### Sidebar Component

**Purpose**: Desktop sidebar navigation.

```typescript
interface SidebarProps {
  user: User;
  activeRoute?: string;
  unreadMessages?: number;
  unreadNotifications?: number;
  onLogout?: () => void;
}
```

**Layout**:
```
┌───────────────┐
│               │
│  [Avatar]     │
│  @username    │
│               │
│  🏠 Home      │
│  🔍 Search    │
│  💬 Messages  │
│  🔔 Notifs(3) │
│  👤 Profile   │
│  ⚙️ Settings  │
│               │
│  [Logout]     │
│               │
└───────────────┘
```

**Features**:
- Collapsible (icon-only mode)
- User info at top
- Active route highlighting
- Notification badges
- Quick post button

### MobileHeader Component

**Purpose**: Mobile top header with branding and actions.

```typescript
interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  showSearch?: boolean;
  showMenu?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
}
```

**Layout**:
```
┌─────────────────────────────────┐
│ [←] VRSS              [🔍] [⋮]  │
└─────────────────────────────────┘
```

**Features**:
- Dynamic title based on route
- Back button for nested routes
- Search icon
- Menu for additional actions
- Scroll-triggered hide/show

---

## Form Components

### AuthForm Components

#### LoginForm
```typescript
interface LoginFormProps {
  onSubmit: (credentials: { email: string; password: string }) => Promise<void>;
  onForgotPassword?: () => void;
  onSignUp?: () => void;
}
```

**Fields**:
- Email (validation: email format)
- Password (show/hide toggle)
- Remember me checkbox
- Submit button

**Validation**:
- Email: Required, valid email format
- Password: Required, min 8 characters

#### RegisterForm
```typescript
interface RegisterFormProps {
  onSubmit: (data: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => Promise<void>;
  onLogin?: () => void;
}
```

**Fields**:
- Username (validation: unique, alphanumeric + underscore)
- Email (validation: email format, unique)
- Password (validation: min 8 chars, strength indicator)
- Confirm Password (validation: must match)
- Terms acceptance checkbox
- Submit button

**Validation**:
- Username: Required, 3-20 chars, alphanumeric + underscore, unique
- Email: Required, valid format, unique
- Password: Required, min 8 chars, strength validation
- Confirm: Required, must match password
- Terms: Must be checked

**Password Strength Indicator**:
- Weak: < 8 chars, no special chars
- Medium: 8+ chars, letters + numbers
- Strong: 8+ chars, letters + numbers + special chars

### SearchForm Component

```typescript
interface SearchFormProps {
  onSearch: (query: string, filters?: SearchFilters) => void;
  placeholder?: string;
  showFilters?: boolean;
  recentSearches?: string[];
}

interface SearchFilters {
  type?: 'all' | 'users' | 'posts' | 'hashtags';
  dateRange?: {
    from?: string;
    to?: string;
  };
}
```

**Features**:
- Auto-suggest as you type
- Recent searches dropdown
- Filter panel (type, date range)
- Clear button
- Voice search (if supported)
- Keyboard shortcuts (Cmd/Ctrl + K)

---

## Responsive Breakpoints

```css
/* Mobile First */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md - Tablet */ }
@media (min-width: 1024px) { /* lg - Desktop */ }
@media (min-width: 1280px) { /* xl - Large Desktop */ }
```

**Component Behavior**:

| Component | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| Navigation | Bottom Nav | Bottom Nav | Sidebar |
| Post Composer | Full screen modal | Sheet/drawer | Inline modal |
| Profile Editor | Full screen | 2-column | 2-column with preview |
| Feed | 1 column | 1 column | 1-2 columns (configurable) |
| Gallery | 2 columns | 3 columns | 4 columns |

---

## Touch Gestures

**Mobile Interactions**:

1. **Feed Navigation**:
   - Swipe left/right: Switch between feeds
   - Pull to refresh: Refresh current feed
   - Long press on post: Quick actions menu

2. **Image Gallery**:
   - Pinch to zoom
   - Swipe to navigate
   - Double tap to zoom

3. **Profile Sections**:
   - Drag to reorder (edit mode)
   - Swipe left to delete (edit mode)

4. **Post Composer**:
   - Swipe down to dismiss
   - Pull up to expand

---

## Animation Guidelines

**Principles**:
- Use subtle animations (avoid flashy effects)
- Keep durations short (150-300ms)
- Use easing functions (ease-in-out)
- Respect reduced motion preferences

**Common Animations**:

```css
/* Page transitions */
.page-enter {
  opacity: 0;
  transform: translateX(20px);
}
.page-enter-active {
  opacity: 1;
  transform: translateX(0);
  transition: all 200ms ease-out;
}

/* Modal/dialog */
.modal-enter {
  opacity: 0;
  transform: scale(0.95);
}
.modal-enter-active {
  opacity: 1;
  transform: scale(1);
  transition: all 150ms ease-out;
}

/* List items */
.list-item-enter {
  opacity: 0;
  transform: translateY(-10px);
}
.list-item-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: all 200ms ease-out;
}
```

---

## Loading States

**Skeleton Screens**:

```typescript
// Post Card Skeleton
<Card>
  <div className="animate-pulse">
    <div className="flex items-center gap-3 p-4">
      <div className="w-10 h-10 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-1/4" />
        <div className="h-3 bg-muted rounded w-1/6" />
      </div>
    </div>
    <div className="h-64 bg-muted" />
    <div className="p-4 space-y-2">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-4 bg-muted rounded w-1/2" />
    </div>
  </div>
</Card>
```

**Spinner for Quick Actions**:
```typescript
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Save Changes
</Button>
```

**Progress Bar for Uploads**:
```typescript
<Progress value={uploadProgress} className="w-full" />
```

---

## Error States

**Error Boundaries**:
- Catch component errors
- Show friendly error message
- Provide retry action
- Log errors for debugging

**Form Validation Errors**:
- Show inline below field
- Red border on invalid field
- Clear on correction
- Prevent submission

**Network Errors**:
- Toast notification
- Retry button
- Offline indicator
- Queue failed actions

---

## Accessibility Checklist

- [ ] All interactive elements keyboard accessible
- [ ] Focus visible on all interactive elements
- [ ] Proper heading hierarchy (h1 -> h2 -> h3)
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Error messages announced to screen readers
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] No content relies solely on color
- [ ] Skip to main content link
- [ ] Focus trap in modals/dialogs
- [ ] Aria labels for icon-only buttons
- [ ] Live regions for dynamic content
- [ ] Reduced motion support

---

## Performance Checklist

- [ ] Images lazy loaded
- [ ] Routes code split
- [ ] Heavy components lazy loaded
- [ ] Virtual scrolling for long lists
- [ ] Debounced search input
- [ ] Memoized expensive computations
- [ ] Optimized re-renders
- [ ] Service worker caching
- [ ] Bundle size < 500KB initial
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Lighthouse score > 90
