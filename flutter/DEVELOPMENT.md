# Anisurge2 Flutter App - Development Guide

## Project Structure

This is a Flutter application that supports multiple platforms (Android, Android TV, Windows, Linux).

### Directory Layout

```
flutter/
├── android/                      # Android-specific configuration
│   └── app/
│       ├── build.gradle         # Build configuration
│       └── src/main/
│           └── AndroidManifest.xml  # App permissions & settings
├── windows/                     # Windows-specific configuration
├── linux/                       # Linux-specific configuration
├── lib/                         # Dart source code
│   ├── main.dart               # Application entry point
│   ├── models/                 # Data models
│   ├── services/               # Business logic & API calls
│   ├── screens/                # UI screens
│   └── widgets/                # Reusable components
└── pubspec.yaml                # Dependencies & app metadata
```

## Key Dependencies

- **http** (^1.2.2): HTTP client for API requests
- **cached_network_image** (^3.3.1): Image caching
- **video_player** (^2.9.1): Video playback
- **shared_preferences** (^2.3.2): Local storage
- **provider** (^6.1.2): State management

## Development Setup

### Install Flutter

```bash
# Download Flutter SDK
wget https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.24.5-stable.tar.xz
tar xf flutter_linux_3.24.5-stable.tar.xz

# Add to PATH
export PATH="$PATH:/path/to/flutter/bin"

# Verify installation
flutter doctor
```

### Install Platform-Specific Tools

#### For Android Development:
1. Install Android Studio
2. Install Android SDK
3. Accept licenses: `flutter doctor --android-licenses`

#### For Linux Development:
```bash
sudo apt-get install clang cmake ninja-build pkg-config libgtk-3-dev
```

#### For Windows Development:
- Install Visual Studio 2022 with Desktop C++ workload

### Get Dependencies

```bash
cd flutter
flutter pub get
```

## API Integration

The app uses the Anisurge API at `https://con.anisurge.me/anime/zoro`.

### API Service (`lib/services/anime_api_service.dart`)

```dart
class AnimeApiService {
  static const String baseUrl = 'https://con.anisurge.me/anime/zoro';
  
  // Search anime
  Future<List<AnimeResult>> searchAnime(String query);
  
  // Get anime details
  Future<AnimeDetails?> getAnimeDetails(String id);
  
  // Get episode streaming sources
  Future<StreamingResponse?> getEpisodeSources(String episodeId, bool isDub);
  
  // Get trending anime
  Future<List<AnimeResult>> getTrendingAnime();
  
  // Get recent episodes
  Future<List<AnimeResult>> getRecentAnime();
  
  // Get popular anime
  Future<List<AnimeResult>> getPopularAnime();
}
```

## Building for Different Platforms

### Android APK

```bash
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

### Android App Bundle (for Play Store)

```bash
flutter build appbundle --release
# Output: build/app/outputs/bundle/release/app-release.aab
```

### Windows

```bash
flutter build windows --release
# Output: build/windows/x64/runner/Release/
```

### Linux

```bash
flutter build linux --release
# Output: build/linux/x64/release/bundle/
```

## Android TV Support

The app includes full Android TV support with remote control navigation:

### Manifest Configuration

```xml
<!-- Android TV features -->
<uses-feature android:name="android.software.leanback" android:required="false" />
<uses-feature android:name="android.hardware.touchscreen" android:required="false" />
<uses-feature android:name="android.hardware.gamepad" android:required="false" />
<uses-feature android:name="android.hardware.dpad" android:required="false" />

<!-- TV launcher category -->
<category android:name="android.intent.category.LEANBACK_LAUNCHER"/>
```

### Focus Management

The `FocusableAnimeCard` widget provides visual feedback when navigated with a remote:

```dart
// Highlights the focused card
AnimatedScale(
  scale: _isFocused ? 1.05 : 1.0,
  // ...
)
```

### Remote Control Keys

The video player handles these remote control inputs:

- **Select/Enter/Space**: Play/Pause
- **Arrow Left**: Rewind 10 seconds
- **Arrow Right**: Fast forward 10 seconds
- **Arrow Up/Down**: Show controls
- **Back**: Exit player

## Video Player

The custom video player (`lib/screens/video_player_screen.dart`) includes:

- **HLS/M3U8 Support**: Streams adaptive quality video
- **Custom Controls**: Overlay controls with auto-hide
- **Sub/Dub Switching**: Toggle between audio tracks
- **Seek Functionality**: Skip forward/backward
- **Fullscreen**: Landscape orientation support
- **Remote Support**: Full D-pad navigation

### Video Loading Flow

1. Fetch streaming sources from API
2. Select best quality (prefers M3U8)
3. Initialize VideoPlayerController with headers
4. Auto-play and track in watch history

## Watch History

Local watch history is stored using SharedPreferences:

```dart
// Add to history
await WatchHistoryService.instance.addToHistory(anime, episode);

// Load history
final history = await WatchHistoryService.instance.loadHistory();

// Clear history
await WatchHistoryService.instance.clearHistory();
```

History is limited to the last 50 entries and persists across app restarts.

## Theme & Styling

The app uses a dark Material 3 theme:

```dart
ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.fromSeed(
    seedColor: Colors.deepPurple,
    brightness: Brightness.dark,
  ),
  scaffoldBackgroundColor: const Color(0xFF121212),
  // ...
)
```

## Testing

### Run in Debug Mode

```bash
flutter run
```

### Run in Release Mode

```bash
flutter run --release
```

### Analyze Code

```bash
flutter analyze
```

### Run Tests

```bash
flutter test
```

## GitHub Actions Workflow

The project includes a workflow (`.github/workflows/flutter-build.yml`) that:

1. Builds for all platforms (Android, Windows, Linux)
2. Creates APK, AAB, Windows ZIP, and Linux tarball
3. Creates a GitHub release with all artifacts
4. Supports draft, pre-release, and latest release types

### Trigger the Workflow

1. Go to Actions tab in GitHub
2. Select "Flutter Multi-Platform Build"
3. Click "Run workflow"
4. Enter version (e.g., 1.0.0)
5. Enter build number (e.g., 1)
6. Select release type (draft/prerelease/latest)

## Version Management

Version is defined in `pubspec.yaml`:

```yaml
version: 1.0.0+1
```

Format: `MAJOR.MINOR.PATCH+BUILD_NUMBER`

The GitHub Action automatically updates this during builds.

## Common Issues & Solutions

### Android Build Fails

```bash
# Clean build cache
flutter clean
flutter pub get

# Rebuild
flutter build apk --release
```

### Video Won't Play

- Check internet connection
- Verify API is returning valid sources
- Check video URL in logs
- Ensure INTERNET permission in AndroidManifest.xml

### Android TV Remote Not Working

- Ensure focus is set on `_keyboardFocusNode`
- Check `RawKeyboardListener` is wrapping the content
- Verify key event handlers are not being consumed elsewhere

## Performance Tips

1. **Image Caching**: Use `CachedNetworkImage` for all remote images
2. **Lazy Loading**: Use `ListView.builder` for large lists
3. **State Management**: Minimize rebuilds with `setState`
4. **Video Disposal**: Always dispose video controllers in `dispose()`

## Contributing

When adding new features:

1. Follow existing code structure
2. Add null safety checks
3. Handle errors gracefully
4. Test on multiple platforms
5. Update documentation

## Contact & Support

For issues or questions, open a GitHub issue in the repository.
