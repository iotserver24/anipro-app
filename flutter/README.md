# AniSurge 2 Flutter

A multi-platform Flutter client for the AniSurge ecosystem targeting:

- **Android phones & tablets**
- **Android TV** with remote (D-pad) navigation support
- **Windows desktop**
- **Linux desktop** (Debian/Ubuntu family tested)

The app consumes the same AniSurge API used by the Expo application (`https://con.anisurge.me/anime/zoro`) to deliver trending lists, recent episodes, detailed show information, and streamable sources.

## Features

- Home screen highlights (Trending, Recent Episodes, New Releases, Popular)
- Search powered by the AniSurge API
- Detail pages with episode lists, related series, and metadata
- Built-in video player powered by `video_player` + `chewie`
- Responsive UI that adapts to large screens and touch vs remote focus
- Android TV remote support (D-pad navigation, `Enter`/`Back` intents)
- Light/dark theme with Material 3 styling

## Package name

The Android package identifier is **`com.r3ap3redit.anisurge2`**. Desktop builds share the same bundle name.

## Getting started

1. Install Flutter 3.24 or newer with the multi-platform toolchain enabled.
2. From the repository root:

   ```bash
   cd flutter
   flutter pub get
   fluttergen-assets --skip-unresolved # optional if fluttergen is installed
   ```

3. Run on your target platform:

   ```bash
   # Android or Android TV
   flutter run
   
   # Windows
   flutter run -d windows
   
   # Linux
   flutter run -d linux
   ```

   To build an Android TV release, ensure you run with the `androidtv` emulator/device or a physical TV device; the focus system will automatically adjust.

## API configuration

All API traffic goes through `lib/src/services/anime_service.dart`. The base endpoint (`https://con.anisurge.me/anime/zoro`) mirrors the Expo app's `constants/api.ts`. Update `ApiConfig.baseUrl` when the backend URL changes.

## Project structure

```
flutter/
 ├─ lib/
 │   ├─ main.dart
 │   └─ src/
 │       ├─ app.dart
 │       ├─ theme/
 │       ├─ models/
 │       ├─ services/
 │       ├─ state/
 │       ├─ utils/
 │       └─ features/
 │           ├─ home/
 │           │   ├─ screens/
 │           │   └─ widgets/
 │           ├─ details/
 │           └─ player/
 ├─ assets/
 │   └─ images/
 ├─ android/
 ├─ linux/
 ├─ windows/
 └─ test/
```

- **`lib/src/services`** mirrors the Expo app's services but implemented with Dart + `http`.
- **`lib/src/state`** wraps the service layer with repositories to simplify UI access.
- **`lib/src/utils/remote_controls.dart`** implements Android TV remote/d-pad navigation helpers.
- **`lib/src/features/player`** contains a multiplaform player backed by `video_player` and `chewie`.

## Remote navigation

Android TV remote support is provided by:

- `RemoteFocusController` for focus traversal
- `DpadIntent` with shortcut mappings (`LogicalKeyboardKey.arrowUp` etc.)
- `RemoteFocusable` widget wrapping content in `FocusableActionDetector`

Touch users can continue to interact normally; the focus tree is disabled when pointer (touch/mouse) input is detected.

## Desktop notes

- Replace the placeholder launcher icons under `android/app/src/main/res` and `windows/app_icon.ico` before shipping a production build.
- Linux and Windows runners are configured with default 1280×720 windows; adjust the CMake and Win32 sources if you need custom behaviour.

## Testing

Run the unit tests with:

```bash
flutter test
```

The current suite focuses on the API integration layer (`AnimeService`) via mocked HTTP clients. Extend the tests folder as new features are added.

## CI/CD

Refer to the repository root for Fastlane/EAS pipelines. The Flutter project integrates with the same API keys via `.env` when needed, but no secrets are committed.
