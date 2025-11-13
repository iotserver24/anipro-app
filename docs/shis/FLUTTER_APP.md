# AniSurge Flutter App Documentation

## Overview

This document describes the Flutter implementation of AniSurge - a multi-platform anime streaming application located in the `/flutter` directory.

## Package Information

- **Package Name**: `com.r3ap3redit.anisurge2`
- **App Name**: AniSurge
- **Framework**: Flutter 3.35.7
- **Platforms**: Android, Android TV, Windows, Linux

## Directory Structure

```
flutter/
├── android/              # Android platform configuration
│   └── app/
│       ├── build.gradle.kts       # Android build configuration
│       └── src/main/
│           └── AndroidManifest.xml # Android TV & permissions
├── linux/                # Linux platform configuration
├── windows/              # Windows platform configuration
├── lib/                  # Dart source code
│   ├── main.dart        # Application entry point
│   ├── models/          # Data models
│   │   └── anime.dart
│   ├── services/        # API services
│   │   └── anime_api_service.dart
│   ├── screens/         # UI screens
│   │   ├── home_screen.dart
│   │   ├── search_screen.dart
│   │   ├── anime_details_screen.dart
│   │   └── video_player_screen.dart
│   └── widgets/         # Reusable UI components
│       └── anime_card.dart
├── assets/              # Images and icons
├── pubspec.yaml         # Dependencies and configuration
└── README.md           # Flutter app documentation
```

## Features Implemented

### 1. Home Screen
- Displays trending, recent, and popular anime
- Horizontal scrollable lists for each category
- Pull-to-refresh functionality
- Navigation to anime details

### 2. Search Screen
- Real-time anime search
- Grid layout for search results
- Keyboard input support
- D-pad navigation for TV

### 3. Anime Details Screen
- Full anime information display
- Episode list with grid layout
- Genres, status, rating chips
- Japanese title display
- Expandable header with anime poster
- Navigation to video player

### 4. Video Player Screen
- Full-screen video playback
- M3U8 streaming support
- Custom headers for API requests
- Landscape mode enforcement
- Play/pause controls
- Episode information display
- Error handling and retry

### 5. Android TV Support
- Leanback launcher integration
- D-pad navigation support
- Remote control button mapping
- Focus indicators
- TV-optimized layouts
- No touchscreen requirement

## API Integration

The app connects to the Zoro Anime API at `https://con.anisurge.me/anime/zoro`

### Endpoints Used

1. **Search**: `GET /{query}`
2. **Anime Info**: `GET /info?id={animeId}`
3. **Episode Sources**: `GET /watch/{episodeId}?dub={true|false}`
4. **Trending**: `GET /top-airing`
5. **Recent**: `GET /recent-episodes`
6. **Popular**: `GET /most-popular`
7. **Favorites**: `GET /most-favorite`
8. **Latest Completed**: `GET /latest-completed`
9. **New Releases**: `GET /recent-added`

### Data Models

#### AnimeResult
- Basic anime information for lists
- Contains: id, title, image, type, episodes count

#### AnimeDetails
- Complete anime information
- Includes: description, genres, status, episode list

#### Episode
- Episode information
- Contains: id, number, title, sub/dub status

#### StreamingResponse
- Video streaming data
- Contains: video URLs, headers, subtitles, intro/outro markers

## Dependencies

### Production Dependencies

```yaml
# UI Components
cached_network_image: ^3.3.1        # Image caching
flutter_staggered_grid_view: ^0.7.0 # Grid layouts
shimmer: ^3.0.0                      # Loading animations

# Video Player
video_player: ^2.8.6                 # Core video playback
chewie: ^1.8.1                       # Video player UI

# Networking & State
http: ^1.2.0                         # HTTP client
provider: ^6.1.1                     # State management
shared_preferences: ^2.2.2           # Local storage

# Navigation
go_router: ^13.2.0                   # Routing

# Android TV
flutter_keyboard_visibility: ^6.0.0  # Keyboard/Remote detection
```

## Android TV Configuration

### AndroidManifest.xml Features

```xml
<!-- Internet permissions -->
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>

<!-- TV features -->
<uses-feature android:name="android.hardware.touchscreen" android:required="false" />
<uses-feature android:name="android.software.leanback" android:required="false" />

<!-- Leanback launcher category -->
<category android:name="android.intent.category.LEANBACK_LAUNCHER"/>
```

### Remote Control Support

The app supports the following remote control inputs:

- **D-Pad**: Up, Down, Left, Right navigation
- **Center/OK**: Select/Confirm
- **Back**: Navigate back
- **Play/Pause**: Video controls (in player)
- **Menu**: Context options

## Building the Application

### Local Build (Requires Android SDK)

```bash
cd flutter

# Get dependencies
flutter pub get

# Build Android APK
flutter build apk --release

# Build for specific ABI
flutter build apk --release --target-platform android-arm64

# Build Windows
flutter build windows --release

# Build Linux
flutter build linux --release
```

### GitHub Actions Build

The repository includes a GitHub Actions workflow (`.github/workflows/flutter-build.yml`) that:

1. Builds for all platforms (Android, Windows, Linux)
2. Accepts version and build number as inputs
3. Creates GitHub releases with compiled binaries
4. Supports draft, pre-release, and latest release types

#### Triggering a Build

1. Navigate to **Actions** tab in GitHub
2. Select **"Flutter Multi-Platform Build"**
3. Click **"Run workflow"**
4. Fill in the required inputs:
   - **version**: Version number (e.g., `1.0.0`)
   - **build_number**: Build number (e.g., `1`)
   - **release_type**: Choose from:
     - `draft` - Creates a draft release (not visible to public)
     - `pre-release` - Marks as pre-release (beta/alpha)
     - `latest` - Creates a public release

#### Build Outputs

The workflow produces three artifacts:

1. **Android APK**: `AniSurge-{version}-android.apk`
   - Universal APK compatible with all Android devices
   - Works on phones, tablets, and Android TV

2. **Windows Build**: `AniSurge-{version}-windows.zip`
   - Contains all Windows executables and DLLs
   - Extract and run `anisurge2.exe`

3. **Linux Build**: `AniSurge-{version}-linux.tar.gz`
   - Contains Linux executable and dependencies
   - Extract and run `./anisurge2`

## Installation

### Android Mobile/Tablet

1. Download the APK from GitHub releases
2. Enable "Install from Unknown Sources" in Settings
3. Open the APK file to install
4. Grant internet permission when prompted

### Android TV

1. Transfer APK to Android TV (via USB, ADB, or file manager)
2. Install using a file manager app
3. Find "AniSurge" in your TV launcher
4. Navigate using your TV remote

### Windows

1. Download and extract the Windows ZIP file
2. Navigate to the extracted folder
3. Run `anisurge2.exe`
4. Allow network access in Windows Firewall if prompted

### Linux

1. Download and extract the Linux tar.gz file
2. Open terminal in the extracted folder
3. Make executable: `chmod +x anisurge2`
4. Run: `./anisurge2`

## UI Theme

The app uses a modern dark theme optimized for viewing:

```dart
Primary Color:   #6C63FF (Purple)
Secondary Color: #03DAC6 (Teal)
Background:      #121212 (Dark)
Surface:         #1F1F1F (Card Background)
```

## Video Playback

### Supported Formats
- M3U8 (HLS streaming)
- MP4 (Direct video)

### Features
- Automatic quality selection
- Subtitle support (VTT)
- Intro/outro skip markers
- Custom HTTP headers
- Fullscreen mode
- Landscape orientation lock

### Video Player Controls
- Play/Pause
- Seek bar
- Volume control
- Fullscreen toggle
- Settings (quality, subtitles)

## Performance Optimizations

1. **Image Caching**: Uses `cached_network_image` for efficient image loading
2. **Lazy Loading**: Lists load items on demand
3. **Network Optimization**: Reuses HTTP client
4. **Memory Management**: Proper disposal of video controllers
5. **Platform-Specific Builds**: Separate builds for different ABIs

## Testing the App

### Development Testing

```bash
# Run in debug mode with hot reload
flutter run --debug

# Run on specific device
flutter devices
flutter run -d <device-id>

# Run with verbose logging
flutter run -v
```

### Testing on Android TV

1. Enable Developer Options on Android TV
2. Enable USB Debugging
3. Connect via ADB: `adb connect <TV_IP>`
4. Run: `flutter run -d <device-id>`

## Troubleshooting

### Common Issues

1. **Build Failed - Android SDK not found**
   - Use GitHub Actions for automated builds
   - Or install Android Studio locally

2. **Video not playing**
   - Check internet connection
   - Verify API endpoint is accessible
   - Check video URL in console logs

3. **App not showing on Android TV**
   - Verify leanback launcher category in manifest
   - Ensure app is installed correctly

4. **Remote not working**
   - Check focus indicators
   - Verify D-pad navigation in code
   - Test with different remote types

## Future Enhancements

Potential improvements for future versions:

1. **Watchlist**: Save favorite anime
2. **Watch History**: Track watched episodes
3. **Offline Mode**: Download episodes for offline viewing
4. **Multiple Quality Options**: Manual quality selection
5. **Subtitle Customization**: Font size, color, position
6. **User Accounts**: Sync across devices
7. **Recommendations**: Personalized anime suggestions
8. **Continue Watching**: Resume from last position
9. **Picture-in-Picture**: Background video playback
10. **Chromecast Support**: Cast to TV devices

## Contributing

To contribute to the Flutter app:

1. Fork the repository
2. Create a feature branch
3. Make your changes in the `flutter/` directory
4. Test on multiple platforms
5. Submit a pull request

## License

This Flutter implementation is part of the AniSurge project.

## Support

For issues or questions about the Flutter app:

1. Check the README in `/flutter` directory
2. Review existing GitHub issues
3. Create a new issue with:
   - Platform (Android/Windows/Linux)
   - Flutter version
   - Error logs
   - Steps to reproduce

---

**Built with Flutter** 🎯  
**Cross-Platform Anime Streaming** 📱💻📺
