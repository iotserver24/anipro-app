# AniSurge Flutter Setup Guide

This guide will help you set up and build the AniSurge Flutter app for Android and Windows.

## Prerequisites

### Required Software

1. **Flutter SDK** (Latest stable version)
   - Download from: https://flutter.dev/docs/get-started/install
   - Add Flutter to your PATH

2. **Git**
   - For version control and Flutter dependencies

3. **For Android Development:**
   - Android Studio or VS Code
   - Android SDK (API 21 or higher)
   - Android SDK Build-Tools
   - Android SDK Platform-Tools
   - Java JDK 11 or higher

4. **For Windows Development:**
   - Visual Studio 2022 (with Desktop development with C++ workload)
   - Windows 10 SDK

## Setup Steps

### 1. Install Flutter

```bash
# Verify Flutter installation
flutter doctor

# This will show what's missing and what's properly configured
```

Fix any issues shown by `flutter doctor` before proceeding.

### 2. Clone and Setup Project

```bash
# Navigate to the flutter-test directory
cd flutter-test

# Get Flutter dependencies
flutter pub get
```

### 3. Configure Android

1. Make sure Android SDK is installed via Android Studio
2. Accept Android licenses:
   ```bash
   flutter doctor --android-licenses
   ```

3. Create `android/local.properties`:
   ```properties
   sdk.dir=/path/to/Android/sdk
   flutter.sdk=/path/to/flutter
   flutter.buildMode=debug
   flutter.versionName=2.26.6
   flutter.versionCode=1
   ```

### 4. Configure Firebase (Already Done)

Firebase configuration is already hardcoded in the app for testing:
- File: `lib/config/firebase_config.dart`
- Android config: `android/app/google-services.json`

No additional Firebase setup is required!

## Building the App

### For Android

#### Debug Build
```bash
flutter run -d android
```

#### Release APK
```bash
flutter build apk --release
```

The APK will be in: `build/app/outputs/flutter-apk/app-release.apk`

#### Release App Bundle (for Play Store)
```bash
flutter build appbundle --release
```

The AAB will be in: `build/app/outputs/bundle/release/app-release.aab`

### For Windows

#### Debug Build
```bash
flutter run -d windows
```

#### Release Build
```bash
flutter build windows --release
```

The executable will be in: `build\windows\x64\runner\Release\`

## Running the App

### On Android Device
```bash
# List connected devices
flutter devices

# Run on specific device
flutter run -d <device-id>
```

### On Android Emulator
```bash
# List available emulators
flutter emulators

# Launch emulator
flutter emulators --launch <emulator-id>

# Run app
flutter run
```

### On Windows
```bash
flutter run -d windows
```

## Troubleshooting

### Common Issues

#### 1. "Flutter SDK not found"
- Ensure Flutter is in your PATH
- Set `flutter.sdk` in `android/local.properties`

#### 2. "Android SDK not found"
- Install Android SDK via Android Studio
- Set `sdk.dir` in `android/local.properties`

#### 3. "Gradle build failed"
- Delete `build` folder and try again
- Run `flutter clean` then `flutter pub get`

#### 4. "Firebase initialization failed"
- Check that `google-services.json` exists in `android/app/`
- Verify Firebase configuration in `lib/config/firebase_config.dart`

#### 5. "Video player not working"
- Ensure you have internet connectivity
- Check API endpoints in `lib/config/app_config.dart`

### Clean Build

If you encounter persistent issues:

```bash
# Clean the project
flutter clean

# Remove build artifacts
rm -rf build/

# Get dependencies again
flutter pub get

# Rebuild
flutter build apk --release
```

## Features Verification

After building, verify these features:

- ✅ Splash screen displays
- ✅ Home screen loads anime lists
- ✅ Search functionality works
- ✅ Anime details screen shows information
- ✅ Video player opens and plays episodes
- ✅ Profile screen allows Google Sign-In
- ✅ Theme toggle works
- ✅ Navigation between screens works

## Performance Tips

1. **Enable R8 (Already enabled in gradle.properties)**
   - Shrinks, obfuscates, and optimizes code

2. **Build with profile mode for testing:**
   ```bash
   flutter run --profile
   ```

3. **Analyze performance:**
   ```bash
   flutter analyze
   ```

## Distribution

### Android
- Sign the APK with your keystore for production
- Upload to Google Play Console

### Windows
- Create installer using tools like Inno Setup or MSIX
- Distribute via Microsoft Store or direct download

## Support

For issues or questions:
- Check the main README.md
- Review Flutter documentation: https://flutter.dev/docs
- Check Firebase documentation: https://firebase.google.com/docs

## Version Information

- App Version: 2.26.6
- Flutter SDK: 3.0.0+
- Minimum Android SDK: 21 (Android 5.0)
- Target Android SDK: 34 (Android 14)
- Windows: Windows 10 or higher
