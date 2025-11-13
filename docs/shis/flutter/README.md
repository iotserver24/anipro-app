# AniSurge Flutter - Multi-Platform Anime Streaming App

A cross-platform anime streaming application built with Flutter, supporting **Android, iOS, Linux, macOS, and Web**.

## 📱 Supported Platforms

- ✅ **Android** (Mobile & TV with Remote Control Support)
- ✅ **iOS** (iPhone & iPad)
- ✅ **Linux** (Desktop)
- ✅ **macOS** (Desktop)
- ✅ **Web** (Progressive Web App - PWA)

## 🎯 Features

- **Browse Anime**: Discover trending, popular, recent, and completed anime
- **Search**: Find your favorite anime with powerful search
- **Streaming**: High-quality video playback with M3U8 support
- **Details**: View comprehensive anime information, episodes, genres, and ratings
- **TV Remote Support**: Full navigation support for Android TV remotes
- **Modern UI**: Beautiful dark theme interface optimized for all platforms
- **Multi-Quality**: Automatic quality selection for best viewing experience

## 🔧 Technical Details

- **Package Name**: `com.r3ap3redit.anisurge2`
- **Framework**: Flutter 3.35.7
- **Language**: Dart
- **Video Player**: Chewie with Video Player
- **State Management**: Provider
- **API**: Zoro Anime API (https://con.anisurge.me/anime/zoro)

## 📦 Dependencies

### Core
- `flutter` - UI framework
- `http` - API communication
- `provider` - State management

### UI Components
- `cached_network_image` - Image caching
- `shimmer` - Loading animations
- `flutter_staggered_grid_view` - Grid layouts

### Video Playback
- `video_player` - Video playback
- `chewie` - Video player UI

### Storage & Navigation
- `shared_preferences` - Local storage
- `go_router` - Navigation
- `flutter_keyboard_visibility` - Keyboard detection for TV remote

## 🚀 Building the App

### Prerequisites

1. Install Flutter SDK (3.35.7 or later)
2. **For Android:** Android Studio with Android SDK
3. **For iOS:** macOS with Xcode 14+
4. **For macOS:** macOS with Xcode 14+
5. **For Linux:** GTK 3.0 development libraries
6. **For Web:** Modern web browser (no additional setup)

### Build Commands

#### Android
```bash
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

#### Android (Split by ABI - Smaller Size)
```bash
flutter build apk --release --split-per-abi
# Generates separate APKs for arm64-v8a, armeabi-v7a, x86_64
```

#### iOS (macOS only)
```bash
flutter build ios --release
# Requires: macOS + Xcode
# Output: build/ios/iphoneos/Runner.app
```

#### macOS (macOS only)
```bash
flutter build macos --release
# Requires: macOS + Xcode
# Output: build/macos/Build/Products/Release/AniSurge.app
```

#### Linux
```bash
flutter build linux --release
# Output: build/linux/x64/release/bundle/
```

#### Web
```bash
flutter build web --release
# Output: build/web/
# Deploy to any web server
```

### Development
```bash
# Get dependencies
flutter pub get

# Run on connected device
flutter run

# Run with hot reload
flutter run --debug
```

## 📱 Android TV Setup

The app is fully configured for Android TV:

1. **Leanback Launcher**: Shows up in Android TV launcher
2. **Remote Navigation**: Full D-pad support for navigation
3. **No Touchscreen Required**: All features accessible via remote
4. **Banner Icon**: Custom TV banner in launcher

### Installing on Android TV

1. Enable Developer Options and USB Debugging on your Android TV
2. Connect via ADB: `adb connect <TV_IP_ADDRESS>`
3. Install APK: `adb install -r app-release.apk`
4. Or transfer APK to TV and install using file manager

## 🎮 Remote Control Navigation

- **D-Pad Up/Down/Left/Right**: Navigate through content
- **Center/OK**: Select item
- **Back**: Go back to previous screen
- **Menu**: Open options (where available)
- **Play/Pause**: Control video playback (in video player)

## 🔑 API Endpoints

The app uses the following API endpoints:

- Search: `GET /anime/zoro/{query}`
- Anime Details: `GET /anime/zoro/info?id={id}`
- Episode Sources: `GET /anime/zoro/watch/{episodeId}`
- Trending: `GET /anime/zoro/top-airing`
- Recent: `GET /anime/zoro/recent-episodes`
- Popular: `GET /anime/zoro/most-popular`
- Favorites: `GET /anime/zoro/most-favorite`
- Completed: `GET /anime/zoro/latest-completed`
- New Releases: `GET /anime/zoro/recent-added`

## 📂 Project Structure

```
flutter/
├── lib/
│   ├── main.dart                 # App entry point
│   ├── models/                   # Data models
│   ├── services/                 # API & Firebase services
│   ├── screens/                  # App screens
│   ├── widgets/                  # Reusable widgets
│   └── providers/                # State management
├── android/                      # Android configuration
├── ios/                          # iOS configuration
├── linux/                        # Linux configuration
├── macos/                        # macOS configuration
├── web/                          # Web configuration
└── pubspec.yaml                  # Dependencies
```

## 🎨 Theming

The app uses a modern dark theme:

- **Primary Color**: `#6C63FF` (Purple)
- **Secondary Color**: `#03DAC6` (Teal)
- **Background**: `#121212` (Dark Gray)
- **Surface**: `#1F1F1F` (Slightly Lighter)

## 📚 Documentation

- **Non-Windows Build Guide:** See `NON_WINDOWS_BUILD_GUIDE.md` for detailed platform-specific instructions
- **Firebase Setup:** See `FIREBASE_SETUP.md` for authentication and database configuration
- **Platform Setup:** See `PLATFORM_SETUP_COMPLETE.md` for configuration status
- **General Build Guide:** See `BUILD_GUIDE.md` for comprehensive build instructions

## 📄 License

This project is part of AniSurge, the multi-platform anime streaming application.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## 📞 Support

For issues, questions, or contributions, please open an issue on GitHub.

---

Built with ❤️ using Flutter
