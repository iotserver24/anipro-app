# Build Verification Guide

This document outlines the steps to verify that the AniSurge Flutter app builds without errors.

## Pre-Build Checklist

Before attempting to build, ensure:

- ✅ Flutter SDK is installed (version 3.0.0 or higher)
- ✅ All dependencies in `pubspec.yaml` are available
- ✅ Android SDK is configured (for Android builds)
- ✅ Visual Studio 2022 is installed (for Windows builds)
- ✅ `google-services.json` exists in `android/app/`
- ✅ All assets are present in `assets/` folder

## Dependency Verification

```bash
# Check Flutter installation
flutter doctor -v

# Get dependencies
flutter pub get

# Analyze code for errors
flutter analyze
```

Expected output from `flutter analyze`:
```
Analyzing flutter-test...
No issues found!
```

## Build Verification Steps

### 1. Android Build Verification

#### Step 1: Check Android Configuration
```bash
cd flutter-test
flutter doctor --android-licenses
```

#### Step 2: Debug Build Test
```bash
flutter build apk --debug
```

Expected: Build completes without errors

#### Step 3: Release Build Test
```bash
flutter build apk --release
```

Expected output:
```
✓ Built build/app/outputs/flutter-apk/app-release.apk (XX.XMB)
```

#### Common Android Build Issues and Fixes

**Issue 1: "SDK location not found"**
```bash
# Create android/local.properties with:
sdk.dir=/path/to/Android/sdk
flutter.sdk=/path/to/flutter
```

**Issue 2: "Gradle build failed"**
```bash
cd android
./gradlew clean
cd ..
flutter clean
flutter pub get
flutter build apk --release
```

**Issue 3: "MinSdkVersion too low"**
- Already set to 21 in `android/app/build.gradle`
- Should not occur with current configuration

**Issue 4: "Google Services plugin error"**
- Verify `google-services.json` is in `android/app/`
- Check that it matches Firebase project ID

### 2. Windows Build Verification

#### Step 1: Check Windows Prerequisites
```bash
flutter doctor -v
```

Look for:
- ✅ Visual Studio - develop Windows apps
- ✅ Windows Version

#### Step 2: Debug Build Test
```bash
flutter build windows --debug
```

Expected: Build completes without errors

#### Step 3: Release Build Test
```bash
flutter build windows --release
```

Expected output:
```
✓ Built build\windows\x64\runner\Release\anisurge.exe
```

#### Common Windows Build Issues and Fixes

**Issue 1: "Visual Studio not found"**
- Install Visual Studio 2022 with "Desktop development with C++" workload

**Issue 2: "Windows SDK not found"**
- Install Windows 10 SDK via Visual Studio Installer

**Issue 3: "CMake error"**
```bash
flutter clean
flutter pub get
flutter build windows --release
```

## Runtime Verification

After successful builds, verify the app runs correctly:

### Android Runtime Checks

1. **Launch Test**
   ```bash
   flutter run -d android
   ```
   - App should launch without crashes
   - Splash screen should display
   - Home screen should load

2. **Feature Tests**
   - Navigate to Search screen
   - Navigate to Profile screen
   - Pull to refresh home screen
   - Tap on an anime card
   - View anime details
   - Play an episode

### Windows Runtime Checks

1. **Launch Test**
   ```bash
   flutter run -d windows
   ```
   - App window should open
   - UI should render correctly
   - No console errors

2. **Feature Tests**
   - Same as Android feature tests

## Performance Verification

### Check App Size

**Android:**
```bash
ls -lh build/app/outputs/flutter-apk/app-release.apk
```
Expected: < 50MB

**Windows:**
```bash
du -sh build/windows/x64/runner/Release/
```
Expected: < 100MB

### Check Build Time

- Android: Should complete in 2-5 minutes (first build)
- Windows: Should complete in 3-7 minutes (first build)
- Subsequent builds: Should be faster (30 seconds - 2 minutes)

## Error-Free Build Checklist

Mark these items when verified:

### Code Quality
- [ ] `flutter analyze` returns no issues
- [ ] No compilation errors
- [ ] No deprecated API warnings (acceptable if minor)

### Android Build
- [ ] Debug build completes successfully
- [ ] Release build completes successfully
- [ ] APK file is generated
- [ ] APK size is reasonable (<50MB)
- [ ] App launches on emulator/device
- [ ] No runtime crashes on launch

### Windows Build
- [ ] Debug build completes successfully
- [ ] Release build completes successfully
- [ ] EXE file is generated
- [ ] App launches on Windows
- [ ] No runtime crashes on launch

### Features Working
- [ ] Splash screen displays
- [ ] Home screen loads anime
- [ ] Search functionality works
- [ ] Navigation works
- [ ] Video player opens (may need network)
- [ ] Profile screen accessible
- [ ] Theme toggle works

## Build Output Locations

After successful builds, find your app here:

**Android APK:**
```
flutter-test/build/app/outputs/flutter-apk/app-release.apk
```

**Windows Executable:**
```
flutter-test/build/windows/x64/runner/Release/anisurge.exe
```

## Continuous Integration Notes

For CI/CD pipelines:

```bash
# Install dependencies
flutter pub get

# Analyze code
flutter analyze || exit 1

# Build Android
flutter build apk --release || exit 1

# Build Windows (if on Windows runner)
flutter build windows --release || exit 1
```

## Final Verification Statement

Once all items in the "Error-Free Build Checklist" are marked:

✅ **The AniSurge Flutter app builds without errors for both Android and Windows platforms.**

## Support

If you encounter issues not covered here:
1. Check `flutter doctor -v` output
2. Review error messages carefully
3. Clean build and retry: `flutter clean && flutter pub get`
4. Check Flutter version compatibility
5. Verify all prerequisites are installed

## Build Success Confirmation

Date: ___________
Built by: ___________
Android Build: ✅ / ❌
Windows Build: ✅ / ❌
All Features Tested: ✅ / ❌

Notes:
_______________________________
_______________________________
