# AniSurge 2 Flutter - Feature Documentation

This document describes the features implemented in the AniSurge 2 Flutter application and how they map to the original Expo React Native app.

## Core Features

### 1. Home Screen

**Implementation:** `lib/src/features/home/screens/home_screen.dart`

The home screen displays multiple anime categories:

- **Featured Banner** - Large hero section showcasing trending anime
- **Trending Now** - Top airing anime shows
- **Recent Episodes** - Latest episode releases
- **Popular Anime** - Most popular shows
- **New Releases** - Recently added anime
- **Latest Completed** - Recently finished series

**API Endpoints Used:**
- `/top-airing` → Trending
- `/recent-episodes` → Recent Episodes
- `/most-popular` → Popular
- `/recent-added` → New Releases
- `/latest-completed` → Latest Completed

### 2. Search Functionality

**Implementation:** `lib/src/features/home/screens/search_screen.dart`

- Text-based anime search with debouncing (350ms delay)
- Real-time search results as you type
- Results display anime title, image, and type
- Tap to navigate to detail page

**API Endpoint:** `/{query}` (dynamic search)

### 3. Anime Details

**Implementation:** `lib/src/features/details/screens/details_screen.dart`

Shows comprehensive information about a selected anime:

- Cover image with scrollable app bar
- Title and description
- Type, status, and episode count chips
- Genre tags
- Episode list with play buttons
- Recommendations carousel
- Related anime (if available)

**API Endpoint:** `/info?id={animeId}`

### 4. Video Player

**Implementation:** `lib/src/features/player/screens/player_screen.dart`

Multi-platform video player supporting:

- HLS/M3U8 streaming
- Standard video controls (play, pause, seek, volume)
- Fullscreen mode
- Subtitles (when available from API)
- Playback speed controls
- Auto-play on load

**Libraries:** 
- `video_player` for core playback
- `chewie` for enhanced UI controls

**API Endpoint:** `/watch/{episodeId}?dub={true|false}`

Returns:
- Video source URLs
- Subtitles (VTT format)
- Intro/outro timestamps (future feature)
- Referer headers

## Multi-Platform Features

### Android TV Support

**Implementation:** `lib/src/utils/remote_controls.dart`

#### Remote Control Navigation
- **D-Pad:** Arrow keys mapped to focus navigation (up, down, left, right)
- **OK/Select Button:** Activates the focused element
- **Back Button:** Returns to previous screen
- **Focus Indicators:** Visual borders highlight the currently focused item

#### Components:
- `RemoteFocusController` - Tracks remote vs touch input
- `RemoteScaffold` - Root wrapper with keyboard shortcuts
- `RemoteFocusable` - Makes widgets focusable with animations

#### Features:
- Automatic mode switching between touch and remote
- Scale animation on focus (1.05x)
- Colored border indication
- Lazy focus (only active when using remote)

**Android TV Manifest Configuration:**
```xml
<uses-feature android:name="android.software.leanback" android:required="false"/>
<uses-feature android:name="android.hardware.touchscreen" android:required="false"/>
<category android:name="android.intent.category.LEANBACK_LAUNCHER"/>
```

### Windows Desktop

**Implementation:** `windows/` directory

- Native Win32 window with Flutter embedding
- Custom window chrome
- DPI-aware rendering
- Window resizing and minimization
- Taskbar integration

**Entry Point:** `windows/main.cpp`

Default window size: 1280x720

### Linux Desktop

**Implementation:** `linux/` directory

- GTK 3 integration
- CMake build system
- Native menus (future enhancement)
- System theme integration

**Entry Point:** `linux/main.cc`

Default window size: 1280x720

## UI/UX Features

### Theme System

**Implementation:** `lib/src/theme/app_theme.dart`

Dual theme support:

#### Dark Theme (Default)
- Background: Pure black (#000000)
- Surface: Dark gray (#1E1E1E)
- Primary: Purple (#BB86FC)
- Secondary: Teal (#03DAC6)

#### Light Theme
- Background: Light gray (#F5F5F5)
- Surface: White
- Primary: Deep purple (#6200EE)
- Secondary: Teal (#03DAC6)

Both themes follow Material 3 design guidelines with rounded corners, elevation, and smooth transitions.

### Navigation

**Implementation:** `lib/src/app.dart`

Simple route-based navigation:

- `/` → Home Screen
- `/search` → Search Screen
- `/details` → Anime Details (with anime ID argument)
- `/player` → Video Player (with episode ID argument)

Uses `MaterialPageRoute` for native platform transitions.

## Data Layer

### Models

**Location:** `lib/src/models/`

#### AnimeResult
Basic anime metadata from list/search endpoints:
- ID, title, image, URL
- Japanese title
- Type (TV, Movie, OVA, etc.)
- Sub/dub episode counts

#### AnimeDetails
Full anime information from the detail endpoint:
- All AnimeResult fields
- Description, genres, status, season
- Complete episode list
- Recommendations and relations
- Rating

#### Episode
Individual episode data:
- Episode ID, number, title
- Sub/dub availability
- URL, filler flag

#### StreamingResponse
Video source information:
- Source URLs (M3U8 or direct)
- Subtitles (kind + URL)
- Download link
- Intro/outro markers

### Services

**Implementation:** `lib/src/services/anime_service.dart`

Wraps all API calls with error handling:

```dart
class AnimeService {
  Future<List<AnimeResult>> searchAnime(String query);
  Future<AnimeDetails?> getAnimeDetails(String id);
  Future<StreamingResponse?> getEpisodeSources(String episodeId, {bool isDub});
  Future<List<AnimeResult>> getRecentAnime();
  Future<List<AnimeResult>> getTrending();
  // ... more methods
}
```

**Features:**
- JSON parsing with null safety
- Content-type validation
- Error logging
- HTTP client injection for testing

### Repository Pattern

**Implementation:** `lib/src/state/anime_repository.dart`

Provides a clean interface for the UI layer:

```dart
class AnimeRepository {
  Future<List<AnimeResult>> loadHomeSection(String section);
  Future<List<String>> loadGenres();
  Future<List<AnimeResult>> loadGenre(String genre);
  Future<List<AnimeResult>> search(String query);
  Future<AnimeDetails?> loadDetails(String id);
  Future<StreamingResponse?> loadEpisodeSources(String episodeId, {bool isDub});
}
```

## Comparison with Expo App

### Implemented Features
✅ Home screen with multiple sections
✅ Search functionality
✅ Anime detail pages
✅ Video player
✅ Multi-platform support (Android, Windows, Linux, Android TV)
✅ Material theming
✅ Remote control navigation (Android TV)

### Not Yet Implemented
⏸️ User authentication (Firebase Auth)
⏸️ Watch history persistence
⏸️ Watchlist/favorites
⏸️ Comments and likes
⏸️ Push notifications
⏸️ Offline caching with Hive
⏸️ Profile management
⏸️ Schedule view
⏸️ Genre browsing
⏸️ Advanced player features (intro skip, quality selection)

### Differences
- **State Management:** Flutter app uses stateful widgets; Expo uses Zustand
- **Navigation:** Flutter uses named routes; Expo uses Expo Router
- **Video Player:** Flutter uses `chewie`; Expo uses React Native Video
- **Styling:** Flutter uses Material 3; Expo uses custom styled components

## Testing

**Location:** `test/`

### Unit Tests
- `anime_service_test.dart` - Tests API service methods with mocked HTTP client

### Running Tests
```bash
flutter test
```

## Future Enhancements

### Planned Features
1. **Persistent Storage** - Add Hive for offline data and watch history
2. **User Authentication** - Integrate Firebase Auth
3. **Advanced Player** - Quality selection, subtitle customization, skip intro/outro
4. **Watchlist** - Save favorite anime
5. **Schedules** - View airing schedules
6. **Genres** - Browse by genre
7. **Settings** - Theme switcher, playback preferences
8. **Downloads** - Offline episode viewing

### Performance Optimizations
- Lazy loading for long lists
- Image caching strategy
- API response caching with TTL
- Background data refresh

## API Reference

**Base URL:** `https://con.anisurge.me/anime/zoro`

All endpoints are consumed via the `AnimeService` class, which mirrors the endpoints defined in the Expo app's `constants/api.ts`.

For detailed API documentation, refer to the Expo codebase or the backend provider's documentation.
