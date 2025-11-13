# AniSurge Flutter - Complete Build Guide

## Overview

This guide provides comprehensive instructions for building the AniSurge Flutter application for multiple platforms.

## Prerequisites

### 1. Flutter SDK Installation

```bash
# Download Flutter 3.35.7 or later
git clone https://github.com/flutter/flutter.git -b stable
export PATH="$PATH:`pwd`/flutter/bin"
flutter --version
```

### 2. Platform-Specific Requirements

#### Android
- **Android Studio** (latest version)
- **Android SDK** (API level 21 or higher)
- **Java JDK** 17 or higher

#### Windows
- **Visual Studio 2022** with:
  - Desktop development with C++
  - Windows 10/11 SDK

#### Linux
- **GTK 3.0 development libraries**
```bash
sudo apt-get update
sudo apt-get install -y clang cmake ninja-build pkg-config libgtk-3-dev liblzma-dev
```

## Quick Start

### 1. Install Dependencies

```bash
cd flutter
flutter pub get
```

### 2. Verify Installation

```bash
flutter doctor -v
```

This command checks your environment and displays a report of the status of your Flutter installation.

## Building for Different Platforms

### Android Mobile & TV

#### Debug Build
```bash
flutter build apk --debug
```

#### Release Build (Universal APK)
```bash
flutter build apk --release
```

#### Release Build (Split by ABI)
```bash
flutter build apk --release --split-per-abi
```

This generates three APKs:
- `app-armeabi-v7a-release.apk` (32-bit ARM)
- `app-arm64-v8a-release.apk` (64-bit ARM) - Recommended for modern devices
- `app-x86_64-release.apk` (Intel/AMD)

#### Output Location
```
flutter/build/app/outputs/flutter-apk/
├── app-release.apk (Universal)
└── app-arm64-v8a-release.apk (Split ABIs)
```

### Windows Desktop

#### Release Build
```bash
flutter build windows --release
```

#### Output Location
```
flutter/build/windows/x64/runner/Release/
├── anisurge2.exe
├── flutter_windows.dll
└── (other DLLs and data files)
```

To distribute:
1. Zip the entire `Release` folder
2. Users extract and run `anisurge2.exe`

### Linux Desktop

#### Release Build
```bash
flutter build linux --release
```

#### Output Location
```
flutter/build/linux/x64/release/bundle/
├── anisurge2 (executable)
├── lib/
└── data/
```

To distribute:
1. Create a tarball: `tar -czvf anisurge-linux.tar.gz -C build/linux/x64/release/bundle .`
2. Users extract and run `./anisurge2`

## Custom Version & Build Number

You can specify custom version and build numbers during build:

```bash
# Android
flutter build apk --release --build-name=1.0.0 --build-number=1

# Windows
flutter build windows --release --build-name=1.0.0 --build-number=1

# Linux
flutter build linux --release --build-name=1.0.0 --build-number=1
```

## Testing

### Run on Device/Emulator

```bash
# List available devices
flutter devices

# Run on specific device
flutter run -d <device-id>

# Run with hot reload
flutter run
```

### Android TV Testing

1. Enable Developer Options on Android TV
2. Enable USB Debugging
3. Connect via ADB:
   ```bash
   adb connect <TV_IP_ADDRESS>:5555
   ```
4. Run app:
   ```bash
   flutter run -d <device-id>
   ```

## GitHub Actions Automated Build

The project includes a GitHub Actions workflow for automated multi-platform builds.

### Workflow Location
`.github/workflows/flutter-build.yml`

### Triggering a Build

1. Go to your repository on GitHub
2. Click on **Actions** tab
3. Select **"Flutter Multi-Platform Build"** workflow
4. Click **"Run workflow"** button
5. Fill in the parameters:
   - **version**: e.g., `1.0.0`
   - **build_number**: e.g., `1`
   - **release_type**: 
     - `draft` - Private draft release
     - `pre-release` - Beta/Alpha release
     - `latest` - Public stable release
6. Click **"Run workflow"**

### Build Outputs

The workflow produces three artifacts:

1. **AniSurge-{version}-android.apk**
   - Universal APK for all Android devices
   - Size: ~50-60 MB

2. **AniSurge-{version}-windows.zip**
   - Windows executable and dependencies
   - Size: ~30-40 MB

3. **AniSurge-{version}-linux.tar.gz**
   - Linux executable and dependencies
   - Size: ~40-50 MB

### Release Notes

The workflow automatically generates release notes with:
- Version information
- Platform support details
- Installation instructions
- What's new section

## Troubleshooting

### Common Issues

#### 1. Android SDK Not Found

**Error**: `No Android SDK found`

**Solution**:
- Install Android Studio
- Set `ANDROID_HOME` environment variable:
  ```bash
  export ANDROID_HOME=$HOME/Android/Sdk
  export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
  ```
- Or use GitHub Actions for builds

#### 2. Gradle Build Failed

**Error**: `Gradle build failed`

**Solution**:
- Check Java version: `java -version` (Should be 17+)
- Clean build: `flutter clean && flutter pub get`
- Update Gradle wrapper:
  ```bash
  cd android
  ./gradlew wrapper --gradle-version=8.3
  ```

#### 3. Windows Build Error

**Error**: `Visual Studio not found`

**Solution**:
- Install Visual Studio 2022
- Enable "Desktop development with C++"
- Run: `flutter config --enable-windows-desktop`

#### 4. Linux Dependencies Missing

**Error**: `gtk-3.0 not found`

**Solution**:
```bash
sudo apt-get update
sudo apt-get install -y clang cmake ninja-build pkg-config libgtk-3-dev liblzma-dev
```

#### 5. Video Playback Issues

**Problem**: Video not playing

**Checks**:
- Internet connectivity
- API endpoint accessible
- Check console logs for errors
- Verify video URL format

## Performance Optimization

### Build Size Reduction

#### Android
```bash
# Split by ABI (reduces APK size by ~60%)
flutter build apk --release --split-per-abi --target-platform android-arm64

# Enable obfuscation
flutter build apk --release --obfuscate --split-debug-info=./debug-info
```

#### All Platforms
```bash
# Remove debug symbols
flutter build <platform> --release --no-tree-shake-icons
```

### Runtime Performance

The app includes:
- Image caching for faster loads
- Lazy loading for lists
- Memory-efficient video player
- Proper controller disposal

## Signing Android APK (for Distribution)

### 1. Generate Keystore

```bash
keytool -genkey -v -keystore anisurge-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias anisurge
```

### 2. Create key.properties

Create `android/key.properties`:
```properties
storePassword=<your-keystore-password>
keyPassword=<your-key-password>
keyAlias=anisurge
storeFile=<path-to-keystore>/anisurge-key.jks
```

### 3. Update build.gradle

The build is already configured to use signing if `key.properties` exists.

### 4. Build Signed APK

```bash
flutter build apk --release
```

## Continuous Integration

### Setting Up GitHub Secrets

For private releases or Play Store deployment:

1. Go to Settings > Secrets and variables > Actions
2. Add secrets:
   - `ANDROID_SIGNING_KEY` (base64 encoded keystore)
   - `ANDROID_SIGNING_PASSWORD` (keystore password)
   - `ANDROID_KEY_ALIAS` (key alias)

## Distribution Checklist

Before distributing your build:

- [ ] Test on multiple devices/platforms
- [ ] Verify package name: `com.r3ap3redit.anisurge2`
- [ ] Check app name: "AniSurge"
- [ ] Test Android TV remote navigation
- [ ] Verify video playback
- [ ] Test search functionality
- [ ] Check API connectivity
- [ ] Review permissions in AndroidManifest
- [ ] Test on different screen sizes
- [ ] Verify dark theme rendering
- [ ] Check memory usage
- [ ] Test offline behavior

## Version Management

### Updating Version

Edit `pubspec.yaml`:
```yaml
version: 1.0.0+1
#        ^^^^^  ^^
#        |      |
#        |      +-- Build number (integer)
#        +--------- Version name (semantic versioning)
```

Or use command line:
```bash
# Via workflow (recommended)
# GitHub Actions > Run workflow > Enter version

# Manually in pubspec.yaml
sed -i 's/^version: .*/version: 1.0.0+1/' pubspec.yaml
```

## Code Analysis

### Run Analyzer
```bash
flutter analyze
```

### Run Tests
```bash
flutter test
```

### Format Code
```bash
flutter format lib/
```

## Additional Resources

- [Flutter Documentation](https://docs.flutter.dev/)
- [Flutter Desktop Support](https://flutter.dev/desktop)
- [Android TV Development](https://developer.android.com/training/tv)
- [Video Player Package](https://pub.dev/packages/video_player)
- [Chewie Package](https://pub.dev/packages/chewie)

## Support

For build issues:
1. Check Flutter version: `flutter --version`
2. Clean project: `flutter clean`
3. Re-install dependencies: `flutter pub get`
4. Check platform setup: `flutter doctor -v`
5. Review error logs in console
6. Open an issue on GitHub with:
   - Flutter version
   - Platform (Android/Windows/Linux)
   - Error logs
   - Steps to reproduce

## License

Part of the AniSurge project.

---

**Happy Building!** 🚀
