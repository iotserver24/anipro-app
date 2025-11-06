# Anisurge2 - Multi-Platform Anime Streaming App

A Flutter-based anime streaming application for Android, Android TV, Windows, and Linux platforms.

## Features

- 🎬 **Browse & Search Anime** - Discover trending, recent, and popular anime
- 📺 **Stream Episodes** - Watch anime with built-in video player
- 🎯 **Quality Selection** - Automatic selection of best quality sources
- 🌐 **Sub/Dub Support** - Switch between subbed and dubbed versions
- 📜 **Watch History** - Track your watched episodes
- 🎮 **Android TV Support** - Full remote/D-pad navigation support
- 📱 **Responsive UI** - Optimized for all screen sizes
- 🎨 **Dark Theme** - Easy on the eyes

## Supported Platforms

- **Android** (Mobile & Tablet)
- **Android TV** (with remote support)
- **Windows** (Desktop)
- **Linux** (Desktop)

## API

This app uses the Anisurge anime API:
```
https://con.anisurge.me/anime/zoro
```

### API Endpoints:
- `/top-airing` - Trending anime
- `/recent-episodes` - Recently aired episodes
- `/most-popular` - Popular anime
- `/{query}` - Search anime
- `/info?id={id}` - Anime details
- `/watch/{episodeId}` - Streaming sources

## Building the App

### Prerequisites

- Flutter SDK 3.24.5 or higher
- For Android: Android SDK
- For Windows: Visual Studio with C++ tools
- For Linux: GTK3 development libraries

### Commands

```bash
# Get dependencies
flutter pub get

# Build for Android
flutter build apk --release
flutter build appbundle --release

# Build for Windows
flutter build windows --release

# Build for Linux
flutter build linux --release
```

## Running the App

```bash
# Run on connected device
flutter run

# Run in release mode
flutter run --release
```

## Android TV Remote Controls

- **D-pad**: Navigate through UI
- **Enter/Select**: Select item or play/pause video
- **Arrow Left**: Rewind 10 seconds
- **Arrow Right**: Fast forward 10 seconds
- **Back**: Go back

## Architecture

```
lib/
├── main.dart                  # App entry point
├── models/                    # Data models
│   ├── anime_result.dart
│   ├── anime_details.dart
│   ├── episode.dart
│   └── streaming_source.dart
├── services/                  # Business logic
│   ├── anime_api_service.dart
│   └── watch_history_service.dart
├── screens/                   # UI screens
│   ├── home_screen.dart
│   ├── search_screen.dart
│   ├── anime_details_screen.dart
│   ├── video_player_screen.dart
│   └── watch_history_screen.dart
└── widgets/                   # Reusable widgets
    ├── anime_card.dart
    ├── anime_list.dart
    ├── anime_grid.dart
    ├── episode_tile.dart
    └── focusable_anime_card.dart
```

## License

This is a personal project for educational purposes.

## Package Name

`com.r3ap3redit.anisurge2`
