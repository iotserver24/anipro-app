# AniSurge - Complete Features Index for Flutter Migration

## 📱 App Overview
**Tech Stack**: Expo-managed React Native app  
**Target Framework**: Flutter  
**Primary Language**: TypeScript/JavaScript → Dart  
**Database**: Firebase (Firestore, Realtime DB, Auth)  
**API Base**: https://con.anisurge.me/anime/zoro

---

## 🔥 Core Features & Implementation Guide

### 1. **Home Screen** (`app/index.tsx`)

#### Features:
- **Trending Anime Carousel** (Auto-scroll banner)
- **Continue Watching Section** (Watch history integration)
- **Recent Episodes Grid**
- **Popular Anime Grid**
- **Latest Completed Grid**
- **Update Banner** (Version checking)
- **What's New Modal**
- **Auto-update checking**

#### API Endpoints:
```javascript
// Trending
GET https://con.anisurge.me/anime/zoro/top-airing

// Recent Episodes
GET https://con.anisurge.me/anime/zoro/recent-episodes

// Popular
GET https://con.anisurge.me/anime/zoro/most-popular

// Latest Completed
GET https://con.anisurge.me/anime/zoro/latest-completed

// Update Check
GET https://anisurge.me/api/updates

// What's New
GET https://anisurge.me/api/whats-new
```

#### State Management (Zustand → Riverpod/Provider):
```typescript
// Watch History Store
const { history, addToHistory, updateProgress, clearHistory } = useWatchHistoryStore();

// My List Store
const { myList, isBookmarked, addAnime, removeAnime } = useMyListStore();

// Global Store
const { isVideoFullscreen, isWatchPage, emailVerified } = useGlobalStore();
```

#### Local Storage Keys:
- `home_trending_recent_cache` - Trending/Recent cache (24h)
- `home_new_episodes_cache` - New episodes (30min cache)
- `home_popular_cache` - Popular anime cache
- `home_latest_completed_cache` - Completed anime cache
- `beta_updates_enabled` - Beta updates preference

#### Flutter Implementation Notes:
- Use `CarouselSlider` package for banner
- Use `cached_network_image` for image loading
- Implement pull-to-refresh with `RefreshIndicator`
- Cache management with `shared_preferences` & `hive`
- Background auto-updating with `workmanager`

---

### 2. **Anime Details Screen** (`app/anime/[id].tsx`)

#### Features:
- Anime banner with gradient overlay
- Title, Japanese title, rating
- Synopsis with "Read More" expansion
- Genre tags (clickable)
- Episode list with sub/dub toggle
- Episode search (by number or name)
- Pagination (24 episodes per page)
- Watch progress indicators
- Filler episode indicators
- Related anime section
- Recommendations section
- Comments section
- Bookmark/My List toggle
- Share functionality
- Download options

#### API Endpoints:
```javascript
// Anime Details
GET https://con.anisurge.me/anime/zoro/info?id={animeId}

// Response Schema:
{
  id: string,
  title: string,
  japaneseTitle: string,
  image: string,
  description: string,
  type: string,
  genres: string[],
  status: string,
  season: string,
  totalEpisodes: number,
  rating: string,
  episodes: [{
    id: string,
    number: number,
    title: string,
    isSubbed: boolean,
    isDubbed: boolean,
    isFiller: boolean,
    url: string
  }],
  recommendations: [...],
  relations: [...]
}
```

#### Comments Integration (Firebase):
```javascript
// Firestore collection: 'comments'
{
  animeId: string,
  userId: string,
  userName: string,
  userAvatar: string,
  content: string,
  gifUrl?: string,
  likes: number,
  createdAt: Timestamp
}

// Firestore collection: 'comment_likes'
{
  userId: string,
  commentId: string,
  timestamp: Timestamp
}
```

#### Flutter Packages Needed:
- `expandable_text` - For synopsis expansion
- `flutter_staggered_grid_view` - For episodes grid
- `share_plus` - For sharing
- `cloud_firestore` - For comments
- `cached_network_image` - For images

---

### 3. **Video Player Screen** (`app/anime/watch/[episodeId].tsx`)

#### Features:
- **HLS/M3U8 Video Playback**
- **Multiple Quality Options** (auto, 1080p, 720p, 480p, 360p)
- **Subtitle Support** (VTT format, multi-language)
- **Playback Speed Control** (0.25x - 2x)
- **Intro/Outro Skip Buttons** (with timestamps)
- **Auto-play Next Episode**
- **Picture-in-Picture (PiP)**
- **Fullscreen Mode** (Auto-rotate)
- **Resume from Last Position**
- **Double-tap to Seek** (10s forward/backward)
- **Brightness/Volume Gesture Control**
- **Keep Screen Awake**
- **Lock Controls**
- **Episode List Drawer**
- **Comments Overlay**

#### API Endpoints:
```javascript
// Episode Sources
GET https://con.anisurge.me/anime/zoro/watch/{episodeId}?dub=true

// Response Schema:
{
  headers: {
    Referer: string
  },
  sources: [{
    url: string,
    isM3U8: boolean
  }],
  subtitles: [{
    kind: string,
    url: string,
    lang: string
  }],
  intro?: { start: number, end: number },
  outro?: { start: number, end: number },
  download: string
}
```

#### Watch History Tracking:
```typescript
// Stored locally + Firebase sync
interface WatchHistoryItem {
  id: string;              // Anime ID
  name: string;
  img: string;
  episodeId: string;
  episodeNumber: number;
  timestamp: number;
  progress: number;        // Current position in seconds
  duration: number;        // Total duration
  lastWatched: number;     // Unix timestamp
  subOrDub: 'sub' | 'dub';
}

// Save progress every 5 seconds (debounced)
// Auto-save on pause, seek, quality change
```

#### Flutter Video Player Setup:
```dart
// Packages:
// - video_player (official)
// - chewie (video controls)
// - better_player (advanced features)
// - wakelock (keep screen on)
// - screen_brightness (brightness control)
// - volume_controller (volume control)

// Required features:
1. HLS streaming support
2. Custom controls overlay
3. Subtitle rendering (VTT)
4. Quality selector
5. Playback speed
6. Skip buttons
7. Episode navigation
8. Resume functionality
9. Fullscreen handling
10. Gesture controls
```

---

### 4. **Search Screen** (`app/search.tsx`)

#### Features:
- Search input with debouncing
- Advanced filters:
  - Genres (multi-select)
  - Type (TV, Movie, OVA, ONA, Special)
  - Sort (Recently Added, Score, Popularity)
  - Season (Winter, Spring, Summer, Fall)
  - Language (Sub, Dub, Both)
  - Status (Airing, Finished, Not Yet Aired)
  - Rating (G, PG, PG-13, R, R+, Rx)
  - Score (Good, Very Good, Excellent)
- Results grid with pagination
- Bookmark toggle on cards

#### API Endpoints:
```javascript
// Search with filters
GET https://con.anisurge.me/anime/zoro/{query}?page={page}&type={type}&sort={sort}...

// Genre list
GET https://con.anisurge.me/anime/zoro/genre/list

// Filter by genre
GET https://con.anisurge.me/anime/zoro/genre/{genre}
```

#### Available Genres:
```typescript
const genres = [
  'action', 'adventure', 'comedy', 'drama', 'fantasy', 'horror',
  'mystery', 'romance', 'sci-fi', 'slice-of-life', 'sports',
  'supernatural', 'thriller', 'ecchi', 'harem', 'isekai',
  'mecha', 'music', 'psychological', 'school', 'military',
  'historical', 'demons', 'magic', 'vampire'
];
```

#### Flutter Implementation:
- Use `flutter_typeahead` for search suggestions
- Use `filter_list` for advanced filters
- Implement lazy loading with `infinite_scroll_pagination`

---

### 5. **Profile Screen** (`app/profile.tsx`)

#### Features:
- **User Avatar Display** (with premium border)
- **Avatar Selection Modal** (default + premium avatars)
- **Email Verification Banner**
- **Authentication** (Sign In/Sign Up/Sign Out)
- **User Stats**:
  - Total Comments
  - Watch History Count
  - My List Count
  - Premium Status
- **Settings**:
  - Beta Updates Toggle
  - Theme Settings
  - Background Media Selection
  - Birthdate Input
  - Storage Folder Selection (Android)
- **Import/Export** (redirect to dedicated screen)
- **About Section**

#### Firebase Auth Flow:
```javascript
// Registration
POST /api/register
Body: { email, password, username, birthdate }

// Creates:
1. Firebase Auth user
2. Firestore doc: users/{uid}
   {
     email, username, avatarId, createdAt,
     emailVerified, birthdate, isPremium, donationAmount
   }
3. Sends verification email

// Sign In
signInWithEmailAndPassword(auth, email, password)
// Stores session in AsyncStorage for persistence

// Sign Out
firebaseSignOut(auth)
// Clears AsyncStorage
```

#### Avatar System:
```typescript
// Avatar stored as avatarId in Firestore
// Premium avatars start with 'premium_'
// Regular avatars: 'default', 'avatar1', 'avatar2'...
// Avatar URLs resolved via constants/avatars.ts

// Premium check:
const userDoc = await getDoc(doc(db, 'users', uid));
const isPremium = userDoc.data().isPremium || userDoc.data().donationAmount > 0;
```

---

### 6. **Public Chat Screen** (`components/PublicChat.tsx`)

#### Features:
- **Real-time Chat** (Firebase Realtime Database)
- **AI Characters** (Aizen, Dazai, Lelouch, Gojo, Mikasa, Marin, Power)
- **User Messages** with avatars
- **GIF Support** (Tenor API integration)
- **Image Sharing**
- **Message Reactions**
- **User Profile Modal** (on avatar tap)
- **Message Copy/Delete**
- **Auto-scroll to bottom**
- **Typing Indicators**
- **Rate Limiting** (daily request limits)

#### Firebase Realtime DB Structure:
```javascript
// Path: /publicChat/messages/{messageId}
{
  userId: string,
  userName: string,
  userAvatar: string,
  message: string,
  gifUrl?: string,
  imageUrl?: string,
  timestamp: number,
  isAI: boolean,
  characterName?: string
}

// Rate limiting path: /publicChat/rateLimits/{userId}
{
  dailyRequests: number,
  lastReset: number
}
```

#### AI Integration:
```javascript
// Pollinations AI API
POST https://text.pollinations.ai/openai
Headers: { Authorization: 'Bearer {token}' }
Body: {
  model: 'deepseek-reasoning' | 'mistral' | 'openai-reasoning',
  messages: [
    { role: 'system', content: characterPrompt },
    { role: 'user', content: userMessage }
  ]
}

// Each AI character has unique personality prompt
// Configured in AI_CONFIGS object
```

#### Tenor GIF API:
```javascript
// Search GIFs
GET https://tenor.googleapis.com/v2/search?q={query}&key={apiKey}&limit=20

// Featured GIFs
GET https://tenor.googleapis.com/v2/featured?key={apiKey}&limit=20
```

---

### 7. **My List Screen** (`app/mylist.tsx`)

#### Features:
- Grid view of bookmarked anime
- Remove from list
- Navigate to anime details
- Empty state message
- Pull to refresh

#### Storage:
```typescript
// Stored in AsyncStorage + Firebase sync
// Key: 'myList'
interface MyListItem {
  id: string,
  title: string,
  image: string,
  type: string,
  episodes: number
}

// Zustand store: store/myListStore.ts
// Firebase sync: services/syncService.ts
```

---

### 8. **Watch History Screen** (`app/history.tsx`)

#### Features:
- Grid of recently watched anime
- Resume from last position
- Remove from history
- Clear all history
- Sort by last watched

#### Storage Schema:
```typescript
// AsyncStorage key: 'anipro:watchHistory'
// Synced to Firestore: users/{uid}/watchHistory

interface WatchHistoryItem {
  id: string,
  name: string,
  img: string,
  episodeId: string,
  episodeNumber: number,
  progress: number,
  duration: number,
  lastWatched: number,
  subOrDub: 'sub' | 'dub'
}
```

---

### 9. **Schedule Screen** (`app/schedule.tsx`)

#### Features:
- Daily airing schedule
- Countdown timers (live updating)
- Episode banners
- Airing time display
- Trigger schedule generation
- Navigate to anime details

#### API:
```javascript
// Get schedule cache
GET https://anisurge.me/api/schedule-cache

// Trigger schedule generation
POST https://she.anisurge.me/api/schedule/trigger

// Response:
{
  success: boolean,
  scheduledAnimes: [{
    id: string,
    time: string,
    name: string,
    jname: string,
    airingTimestamp: number,
    secondsUntilAiring: number,
    episode: number,
    bannerUrl: string,
    bannerType: 'banner' | 'poster'
  }]
}
```

---

### 10. **Notifications Screen** (`app/notifications.tsx`)

#### Features:
- App notifications list
- Notification types: update, announcement, feature, maintenance
- Rich media support (images, videos)
- Deep link support
- Mark as read
- Priority badges
- Expiration handling

#### API:
```javascript
// Fetch notifications
GET https://anisurge.me/api/notifications

// Mark as read
POST https://anisurge.me/api/notifications/read
Body: {
  notificationIds: string[],
  deviceId: string
}

// Get read status
GET https://anisurge.me/api/notifications/read?deviceId={deviceId}
```

---

### 11. **Import/Export Screen** (`app/importExport.tsx`)

#### Features:
- **Export Formats**: XML (MAL compatible), JSON, TXT
- **Import Sources**:
  - MyAnimeList XML export
  - AniList export
  - Local JSON/TXT files
- **Data Types**:
  - My List (bookmarks)
  - Watch History
- **Storage Folder Management** (Android SAF)
- **Progress Tracking** during import

#### Export Format (XML):
```xml
<?xml version="1.0" encoding="UTF-8" ?>
<myanimelist>
  <myinfo>
    <user_export_type>1</user_export_type>
  </myinfo>
  <anime>
    <series_animedb_id>{mal_id}</series_animedb_id>
    <series_title>{title}</series_title>
    <my_watched_episodes>{episodes}</my_watched_episodes>
    <my_status>Watching</my_status>
  </anime>
</myanimelist>
```

#### JSON Format:
```json
{
  "Watching": [
    {
      "name": "Anime Title",
      "link": "https://myanimelist.net/anime/...",
      "mal_id": 12345,
      "watchListType": 1,
      "watchedEpisodes": 5
    }
  ]
}
```

---

### 12. **Theme Settings** (`app/theme-settings.tsx`)

#### Features:
- Color theme selection
- Background media selection:
  - Images (from Tenor/custom URL)
  - Videos (from Tenor/custom URL)
  - Opacity slider
- Theme preview
- Reset to defaults

#### Storage:
```javascript
// AsyncStorage keys
'theme_background_media' // { type, url, opacity }
'app_theme' // theme name
```

---

### 13. **About Screen** (`app/about.tsx`)

#### Features:
- App version display
- Changelog viewer
- Developer credits
- Social links
- Privacy policy
- Terms of service
- Support/contact info
- Donation information
- Open source licenses

---

## 🔐 Authentication & User Management

### Firebase Auth Setup:
```javascript
// services/firebase.ts
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Flutter equivalent: firebase_auth with shared_preferences
```

### User Service Functions:
```typescript
// services/userService.ts

// Core functions to implement:
registerUser(email, password, username, birthdate)
loginUser(email, password)
signOut()
updateUserAvatar(avatarId)
isEmailVerified()
sendVerificationEmail()
sendPasswordResetEmail(email)
getCurrentUser()
reloadUser()
storeUserSession()
restoreUserSession()
```

---

## 📊 State Management Architecture

### Zustand Stores → Riverpod/Provider:

#### 1. **Watch History Store** (`store/watchHistoryStore.ts`)
```typescript
interface WatchHistoryState {
  history: WatchHistoryItem[];
  addToHistory: (item) => Promise<void>;
  updateProgress: (episodeId, progress) => Promise<void>;
  getHistory: () => WatchHistoryItem[];
  clearHistory: () => Promise<void>;
  removeFromHistory: (animeId) => Promise<void>;
  initializeHistory: () => Promise<void>;
}
```

#### 2. **My List Store** (`store/myListStore.ts`)
```typescript
interface MyListState {
  myList: AnimeItem[];
  isBookmarked: (id) => boolean;
  addAnime: (anime) => Promise<void>;
  removeAnime: (id) => Promise<void>;
  clearMyList: () => Promise<void>;
  initializeStore: () => Promise<void>;
}
```

#### 3. **Global Store** (`store/globalStore.ts`)
```typescript
interface GlobalState {
  isVideoFullscreen: boolean;
  isWatchPage: boolean;
  isChatPage: boolean;
  emailVerified: boolean;
  setIsVideoFullscreen: (value) => void;
  setIsWatchPage: (value) => void;
  setIsChatPage: (value) => void;
  setEmailVerificationStatus: (value) => void;
}
```

---

## 🔄 Data Sync Architecture

### Sync Service (`services/syncService.ts`):
```typescript
// Syncs local data with Firebase Firestore
// Paths:
// - users/{uid}/watchHistory
// - users/{uid}/myList

// Functions:
syncWatchHistory(localHistory)
syncMyList(localList)
performInitialSync(localHistory, localMyList)

// Sync strategy:
// 1. Load from AsyncStorage immediately
// 2. Fetch from Firestore in background
// 3. Merge based on timestamps
// 4. Update both local and cloud
```

---

## 🎨 Theme System

### Theme Context (`contexts/ThemeContext.tsx`):
```typescript
interface ThemeContextType {
  theme: {
    colors: {
      primary: string,
      background: string,
      surface: string,
      text: string,
      textSecondary: string,
      border: string,
      error: string
    }
  },
  hasBackgroundMedia: boolean,
  backgroundMedia: {
    type: 'image' | 'video',
    url: string,
    opacity: number
  },
  statusBarStyle: 'light' | 'dark',
  updateBackgroundMedia: (media) => void
}
```

---

## 📦 External Services & APIs

### 1. **Anime API** (con.anisurge.me)
- Provider: Custom proxy for Zoro/AniWatch
- Rate Limits: None specified
- Authentication: Not required
- Base: `https://con.anisurge.me/anime/zoro`

### 2. **Tenor GIF API**
```javascript
// API Key: AIzaSyADDZfPf44y7I5FqY2TZQr_X95RdlYXYgg
GET https://tenor.googleapis.com/v2/search?q={query}&key={key}&limit=20
GET https://tenor.googleapis.com/v2/featured?key={key}&limit=20
```

### 3. **Pollinations AI**
```javascript
// API URL: https://text.pollinations.ai/openai
// Token: uNoesre5jXDzjhiY
POST /openai?token={token}
Body: { model, messages }
```

### 4. **Firebase Services**
- **Firestore**: User data, comments, my list, watch history
- **Realtime DB**: Public chat, rate limiting
- **Auth**: Email/password authentication
- **Storage**: (Not used currently)

### 5. **Update Server**
```javascript
// App updates & notifications
GET https://anisurge.me/api/updates
GET https://anisurge.me/api/whats-new
GET https://anisurge.me/api/notifications
GET https://anisurge.me/api/schedule-cache
POST https://anisurge.me/api/count
```

---

## 🚀 Critical Features for Flutter

### 1. **Video Player Requirements**
- HLS/M3U8 streaming
- Subtitle support (VTT)
- Quality switching without losing position
- Gesture controls (brightness, volume, seek)
- Picture-in-Picture
- Fullscreen with auto-rotate
- Keep screen awake
- Media session controls
- Background playback (optional)

### 2. **Offline Caching**
- Image caching (anime posters, banners)
- API response caching (with TTL)
- Watch history persistence
- My list persistence
- User session persistence

### 3. **Background Tasks**
- Watch history sync
- My list sync
- Update checks
- Notification polling

### 4. **Performance Optimizations**
- Lazy loading for large lists
- Image lazy loading
- API response pagination
- Debounced search
- Memoization for expensive computations

### 5. **Platform-Specific**
- Deep linking (anime://anime/{id})
- Share functionality
- Storage Access Framework (Android)
- File picker
- Push notifications
- App version checking

---

## 📱 Navigation Structure

```
App Root
├── Home (/)
├── Search (/search)
├── My List (/mylist)
├── History (/history)
├── Schedule (/schedule)
├── Profile (/profile)
│   ├── Theme Settings (/theme-settings)
│   ├── Import/Export (/importExport)
│   └── About (/about)
├── Anime Details (/anime/[id])
│   └── Watch Episode (/anime/watch/[episodeId])
├── Notifications (/notifications)
├── Chat (/chat)
│   ├── Character Select (/character-select)
│   ├── Character Store (/character-store)
│   ├── Create Character (/create-character)
│   ├── Chat History (/chat-history)
│   └── AI Chat (/aichat)
└── Mentions (/mentions)
```

---

## 🔑 Environment Variables (.env)

```bash
# Firebase Configuration
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
FIREBASE_MEASUREMENT_ID=
FIREBASE_DATABASE_URL=

# API Keys
TENOR_API_KEY=AIzaSyADDZfPf44y7I5FqY2TZQr_X95RdlYXYgg
POLLINATIONS_API_KEY=uNoesre5jXDzjhiY

# App Configuration
API_BASE_URL=https://anisurge.me/api
ANIME_API_URL=https://con.anisurge.me/anime/zoro
APP_SCHEME=anisurge
```

---

## 📦 Flutter Packages Needed

### Core Packages:
```yaml
dependencies:
  # Firebase
  firebase_core: ^2.24.2
  firebase_auth: ^4.16.0
  firebase_database: ^10.4.0
  cloud_firestore: ^4.14.0
  
  # Video Player
  video_player: ^2.8.2
  chewie: ^1.7.5
  better_player: ^0.0.83
  wakelock: ^0.6.2
  
  # State Management
  flutter_riverpod: ^2.4.9
  
  # Storage
  shared_preferences: ^2.2.2
  hive: ^2.2.3
  hive_flutter: ^1.1.0
  
  # Networking
  dio: ^5.4.0
  cached_network_image: ^3.3.1
  
  # UI Components
  carousel_slider: ^4.2.1
  flutter_staggered_grid_view: ^0.7.0
  infinite_scroll_pagination: ^4.0.0
  shimmer: ^3.0.0
  lottie: ^3.0.0
  
  # Utilities
  intl: ^0.19.0
  path_provider: ^2.1.1
  share_plus: ^7.2.1
  url_launcher: ^6.2.2
  image_picker: ^1.0.5
  file_picker: ^6.1.1
  
  # Media
  photo_view: ^0.14.0
  flutter_markdown: ^0.6.18
```

---

## 🧪 Testing Checklist

### Critical User Flows:
- [ ] Sign up → Email verification → Sign in
- [ ] Search anime → View details → Watch episode
- [ ] Resume watching from home screen
- [ ] Add/remove from My List
- [ ] Submit comment → Like comment
- [ ] Send message in public chat
- [ ] Export My List → Import on new device
- [ ] Change theme → Set background media
- [ ] Check schedule → Navigate to anime
- [ ] Receive notification → Open deep link
- [ ] Quality switching mid-playback
- [ ] Subtitle language switching
- [ ] Auto-play next episode
- [ ] Intro/outro skip buttons

---

## 🐛 Known Issues & Considerations

1. **Avatar Caching**: Disabled for performance (uses Cloudflare Workers instead)
2. **Background Fetch**: Removed (old feature)
3. **Orientation Lock**: Removed to respect device orientation
4. **Media Session**: Android only, uses native media controls
5. **PiP Support**: Android only
6. **Storage Access**: Uses SAF on Android 10+
7. **Firebase Persistence**: Requires offline support setup
8. **Rate Limiting**: Pollinations AI has daily limits per user
9. **Video Buffering**: HLS streams may have variable quality
10. **Deep Links**: Requires proper manifest configuration

---

## 📞 API Reference Summary

### Base URLs:
- **Anime API**: `https://con.anisurge.me/anime/zoro`
- **App API**: `https://anisurge.me/api`
- **Schedule Trigger**: `https://she.anisurge.me/api`
- **Pollinations AI**: `https://text.pollinations.ai`
- **Tenor API**: `https://tenor.googleapis.com/v2`

### Key Endpoints:
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/top-airing` | GET | Trending anime |
| `/recent-episodes` | GET | New episodes |
| `/most-popular` | GET | Popular anime |
| `/info?id={id}` | GET | Anime details |
| `/watch/{episodeId}` | GET | Video sources |
| `/{query}` | GET | Search anime |
| `/updates` | GET | App updates |
| `/notifications` | GET | In-app notifications |
| `/schedule-cache` | GET | Airing schedule |

---

## 📝 Notes for AI-Assisted Migration

1. **State Management**: Convert Zustand stores to Riverpod providers
2. **Navigation**: Use GoRouter for Flutter navigation
3. **AsyncStorage**: Replace with shared_preferences
4. **React Native Video**: Use video_player or better_player
5. **Firebase SDK**: Use FlutterFire packages
6. **Expo Modules**: Find Flutter equivalents (file_picker, image_picker, etc.)
7. **Gestures**: Use GestureDetector and GestureRecognizer
8. **Animations**: Convert Animated API to AnimationController
9. **Styling**: Convert StyleSheet to Flutter widgets with Theme
10. **Platform Checks**: Use Platform.isAndroid/isIOS

---

## 🎯 Priority Implementation Order

1. **Phase 1**: Core UI & Navigation
   - Home screen with trending
   - Anime details screen
   - Search screen
   - Basic navigation

2. **Phase 2**: Video Playback
   - Video player with controls
   - Quality switching
   - Subtitle support
   - Watch history tracking

3. **Phase 3**: Authentication & Data
   - Firebase Auth setup
   - User profile
   - My List functionality
   - Watch history sync

4. **Phase 4**: Social Features
   - Comments system
   - Public chat
   - User profiles

5. **Phase 5**: Additional Features
   - Import/Export
   - Theme customization
   - Schedule
   - Notifications

---

## 📚 Additional Resources

- **Expo App**: `/home/engine/project/app/`
- **Components**: `/home/engine/project/components/`
- **Services**: `/home/engine/project/services/`
- **Stores**: `/home/engine/project/store/`
- **Constants**: `/home/engine/project/constants/`
- **Firebase Rules**: `/firestore.rules`, `/database.rules.json`
- **App Config**: `app.json`, `constants/appConfig.ts`

---

**Last Updated**: 2024-11-06  
**App Version**: 2.26.3  
**Version Code**: 4

---

This document provides a complete reference for migrating AniSurge from Expo/React Native to Flutter. Use it with AI code generation tools to accelerate the porting process.
