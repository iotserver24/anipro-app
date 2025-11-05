# AniSurge Flutter App

A free anime streaming app built with Flutter that lets you watch your favorite anime shows and movies anytime, anywhere.

## Features

- 🎬 Browse trending, popular, and new anime releases
- 🔍 Search for your favorite anime
- 📺 Stream anime episodes with built-in video player
- 📱 Support for Android and Windows platforms
- 🔥 Firebase authentication and data storage
- 🎨 Beautiful Material Design 3 UI
- 🌙 Dark mode support
- 📖 Anime details with episodes list
- 💾 My List functionality
- 📜 Watch history tracking
- 🔔 Notifications support

## API

The app uses the AniSurge API:
- Base URL: `https://anisurge.me/api`
- Anime API: `https://con.anisurge.me/anime/zoro`

## Firebase Configuration

Firebase credentials are hardcoded in `lib/config/firebase_config.dart` for testing:

```dart
API Key: AIzaSyDwnApvEV4stf1L5etAaGZG9cOkAAo__7M
Project ID: anisurge-11808
App ID: 1:151470089122:web:41f2c84a70e28a8cc3c8fb
```

## Getting Started

### Prerequisites

- Flutter SDK (3.0.0 or higher)
- Android Studio / VS Code
- Android SDK for Android development
- Visual Studio 2022 for Windows development

### Installation

1. Install dependencies:
```bash
flutter pub get
```

2. Run the app:

For Android:
```bash
flutter run -d android
```

For Windows:
```bash
flutter run -d windows
```

### Building

For Android:
```bash
flutter build apk --release
```

For Windows:
```bash
flutter build windows --release
```

## Project Structure

```
lib/
├── config/          # App and Firebase configuration
├── models/          # Data models
├── providers/       # State management (Provider)
├── screens/         # UI screens
├── services/        # API and business logic
├── widgets/         # Reusable widgets
├── utils/           # Utility functions
└── main.dart        # App entry point

android/             # Android platform code
windows/             # Windows platform code
assets/              # Images, fonts, and other assets
```

## Key Dependencies

- **firebase_core**: Firebase initialization
- **firebase_auth**: Authentication
- **cloud_firestore**: Database
- **provider**: State management
- **video_player**: Video playback
- **chewie**: Video player UI
- **cached_network_image**: Image caching
- **http**: HTTP requests
- **shared_preferences**: Local storage

## Development

The app follows Flutter best practices:
- Provider for state management
- Repository pattern for API calls
- Separation of concerns (UI, business logic, data)
- Material Design 3 theming
- Responsive UI design

## Version

Current version: 2.26.6

## License

This project is proprietary software.
