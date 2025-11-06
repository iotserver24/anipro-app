# Flutter App - Quick Start Guide

## 🎯 What Is This?

A complete Flutter app for anime streaming has been added to this repository in the `/flutter` directory.

**Package Name**: `com.r3ap3redit.anisurge2`

## 📱 Supported Platforms

- ✅ Android (Mobile & Tablet)
- ✅ Android TV (with Remote Control)
- ✅ Windows Desktop
- ✅ Linux Desktop

## 🚀 Build Without Local Setup (Recommended)

### Using GitHub Actions

1. **Go to Actions Tab**
   - Navigate to your GitHub repository
   - Click on "Actions" tab at the top

2. **Select Workflow**
   - Click "Flutter Multi-Platform Build" from the list

3. **Run Workflow**
   - Click "Run workflow" button
   - Fill in the form:
     - **version**: e.g., `1.0.0`
     - **build_number**: e.g., `1`
     - **release_type**: Choose one:
       - `draft` - Private build (testing)
       - `pre-release` - Beta/Alpha release
       - `latest` - Public stable release
   - Click "Run workflow"

4. **Wait for Build** (~10-15 minutes)
   - GitHub will build for all platforms automatically
   - Android, Windows, and Linux builds run in parallel

5. **Download Builds**
   - Go to "Releases" section
   - Find your version
   - Download:
     - `AniSurge-{version}-android.apk` (~50-60 MB)
     - `AniSurge-{version}-windows.zip` (~30-40 MB)
     - `AniSurge-{version}-linux.tar.gz` (~40-50 MB)

## 💻 Build Locally (Advanced)

### Prerequisites

Install Flutter SDK:
```bash
git clone https://github.com/flutter/flutter.git -b stable
export PATH="$PATH:`pwd`/flutter/bin"
flutter doctor -v
```

### For Android
Install Android Studio + Android SDK

### For Windows
Install Visual Studio 2022 with C++ tools

### For Linux
```bash
sudo apt-get install clang cmake ninja-build pkg-config libgtk-3-dev liblzma-dev
```

### Build Commands

```bash
cd flutter

# Get dependencies
flutter pub get

# Build for Android
flutter build apk --release

# Build for Windows (Windows only)
flutter build windows --release

# Build for Linux (Linux only)
flutter build linux --release
```

## 📦 Installation

### Android Mobile/Tablet

1. Download `AniSurge-{version}-android.apk`
2. Enable "Install from Unknown Sources" in Settings
3. Tap the APK to install
4. Open "AniSurge" from your app drawer

### Android TV

1. Transfer APK to your Android TV via:
   - USB drive
   - ADB: `adb install AniSurge-{version}-android.apk`
   - File sharing app
2. Install using a file manager on TV
3. Find "AniSurge" in your TV launcher
4. Use your TV remote to navigate

### Windows

1. Download `AniSurge-{version}-windows.zip`
2. Extract the ZIP file
3. Open the extracted folder
4. Run `anisurge2.exe`
5. Allow network access if Windows Firewall asks

### Linux

1. Download `AniSurge-{version}-linux.tar.gz`
2. Extract: `tar -xzf AniSurge-{version}-linux.tar.gz`
3. Navigate to extracted folder
4. Make executable: `chmod +x anisurge2`
5. Run: `./anisurge2`

## 🎮 Using on Android TV

### Navigation with Remote

- **D-Pad (Arrow Keys)**: Move between items
- **Center/OK Button**: Select item
- **Back Button**: Go back to previous screen
- **Play/Pause**: Control video playback

### Tips

- The app appears in TV launcher with "AniSurge" name
- No touchscreen needed - fully remote compatible
- Focus indicators show selected items
- All features accessible via remote

## 📚 Documentation

More detailed guides:

- **App Overview**: `/flutter/README.md`
- **Build Guide**: `/flutter/BUILD_GUIDE.md`
- **Full Documentation**: `/FLUTTER_APP.md`
- **Implementation Details**: `/FLUTTER_IMPLEMENTATION_SUMMARY.md`

## 🔥 Features

- Browse trending, popular, and recent anime
- Search with real-time results
- View anime details, episodes, and genres
- Stream episodes with M3U8 support
- Fullscreen video player
- Dark theme optimized for viewing
- Optimized for all screen sizes

## 🔗 API Information

The app uses the same API as the React Native version:
- **Base URL**: `https://con.anisurge.me/anime/zoro`
- Same endpoints as existing app
- No additional configuration needed

## ❓ Troubleshooting

### Build Fails on GitHub Actions

- Check workflow syntax
- Verify Flutter version compatibility
- Review action logs in GitHub

### App Crashes on Launch

- Check internet connection
- Verify API is accessible
- Check device logs: `adb logcat`

### Video Won't Play

- Ensure internet connection is stable
- Check if API endpoint is accessible
- Try a different anime/episode

### Android TV Remote Not Working

- Ensure TV leanback feature is enabled
- Check focus indicators are visible
- Try different remote

## 📊 Project Stats

- **Lines of Code**: 1,226 Dart lines
- **Files**: 8 Dart source files
- **Dependencies**: 11 production packages
- **Platforms**: 4 (Android, Android TV, Windows, Linux)
- **API Endpoints**: 9 integrated

## 🎨 App Info

- **Package Name**: com.r3ap3redit.anisurge2
- **App Name**: AniSurge
- **Theme**: Dark Mode
- **Primary Color**: Purple (#6C63FF)
- **Language**: Dart/Flutter

## 🆘 Get Help

1. Read documentation in `/flutter` folder
2. Check build guide for detailed instructions
3. Review GitHub Issues
4. Create new issue with:
   - Platform (Android/Windows/Linux)
   - Error message/logs
   - Steps to reproduce

## ⚡ Quick Commands

```bash
# Check Flutter installation
flutter doctor -v

# Get dependencies
cd flutter && flutter pub get

# Run on connected device
flutter run

# Build Android APK
flutter build apk --release

# Analyze code
flutter analyze

# Format code
flutter format lib/
```

## 🎯 Next Steps

### For Users
1. Wait for first GitHub Actions build
2. Download for your platform
3. Install and enjoy!

### For Developers
1. Clone repository
2. Navigate to `/flutter` directory
3. Run `flutter pub get`
4. Start developing!

### For Distributors
1. Trigger GitHub Actions build
2. Download all platform builds
3. Test on target devices
4. Distribute via your channels

## ✅ Ready to Build!

Everything is set up and ready. Just:

1. Go to GitHub Actions
2. Run "Flutter Multi-Platform Build" workflow
3. Enter version and build number
4. Download the builds
5. Distribute to users

**That's it!** 🚀

---

**Questions?** Check `/flutter/README.md` or `/flutter/BUILD_GUIDE.md`
