# AniSurge - Multi-Platform Build Guide (Non-Windows)

Complete guide for building AniSurge for **Android, iOS, Linux, macOS, and Web** platforms.

## 📱 Supported Platforms

- ✅ **Android** (Mobile & TV)
- ✅ **iOS** (iPhone & iPad)
- ✅ **Linux** (Desktop)
- ✅ **macOS** (Desktop)
- ✅ **Web** (PWA)

## 🚀 Quick Start

### Prerequisites

#### All Platforms
```bash
# Install Flutter SDK (3.35.7 or later)
flutter --version

# Install dependencies
flutter pub get
```

#### Android
- Android Studio (latest)
- Android SDK (API 21+)
- Java JDK 17+

#### iOS/macOS
- macOS with Xcode 14+
- CocoaPods: `sudo gem install cocoapods`
- iOS Simulator (for iOS testing)

#### Linux
```bash
sudo apt-get update
sudo apt-get install -y clang cmake ninja-build pkg-config libgtk-3-dev liblzma-dev
```

#### Web
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No additional setup needed

## 🔨 Build Commands

### Android

#### Debug Build
```bash
flutter build apk --debug
```

#### Release Build (Universal APK)
```bash
flutter build apk --release
```

#### Release Build (Split by ABI - Smaller Size)
```bash
flutter build apk --release --split-per-abi
```

**Output:** `build/app/outputs/flutter-apk/app-release.apk`

#### Android App Bundle (for Play Store)
```bash
flutter build appbundle --release
```

**Output:** `build/app/outputs/bundle/release/app-release.aab`

### iOS

#### Debug Build
```bash
flutter build ios --debug
```

#### Release Build
```bash
flutter build ios --release
```

**Note:** iOS builds require:
- macOS computer
- Xcode installed
- Apple Developer account (for device testing)
- Run `cd ios && pod install` before first build

#### Create IPA for Distribution
1. Open `ios/Runner.xcworkspace` in Xcode
2. Select Product → Archive
3. Distribute App

### macOS

#### Debug Build
```bash
flutter build macos --debug
```

#### Release Build
```bash
flutter build macos --release
```

**Output:** `build/macos/Build/Products/Release/AniSurge.app`

#### Create DMG (Distribution)
```bash
# After building, create DMG using:
# - Disk Utility (GUI)
# - create-dmg (CLI tool)
```

### Linux

#### Debug Build
```bash
flutter build linux --debug
```

#### Release Build
```bash
flutter build linux --release
```

**Output:** `build/linux/x64/release/bundle/`

#### Create Distribution Package
```bash
cd build/linux/x64/release/bundle
tar -czvf anisurge-linux.tar.gz .
```

### Web

#### Debug Build
```bash
flutter build web --debug
```

#### Release Build
```bash
flutter build web --release
```

**Output:** `build/web/`

#### Deploy to Web Server
1. Upload `build/web/` contents to your web server
2. Ensure server supports SPA routing
3. Configure HTTPS (required for PWA features)

## 🧪 Testing on Devices

### Android
```bash
# List devices
flutter devices

# Run on connected device
flutter run -d <device-id>

# Run on Android TV
adb connect <TV_IP>:5555
flutter run -d <tv-device-id>
```

### iOS
```bash
# Run on iOS Simulator
flutter run -d <simulator-id>

# Run on physical device (requires Xcode setup)
flutter run -d <device-id>
```

### macOS
```bash
flutter run -d macos
```

### Linux
```bash
flutter run -d linux
```

### Web
```bash
flutter run -d chrome
# or
flutter run -d edge
```

## 📦 Platform-Specific Features

### Android
- ✅ Android TV support (Leanback launcher)
- ✅ Picture-in-Picture (PiP) support
- ✅ Background playback
- ✅ Media session controls
- ✅ Remote control navigation

### iOS
- ✅ Picture-in-Picture support
- ✅ Background audio playback
- ✅ AirPlay support
- ✅ iOS Share Sheet integration
- ✅ Haptic feedback

### macOS
- ✅ Native macOS menu bar
- ✅ Keyboard shortcuts
- ✅ Window management
- ✅ macOS Share Sheet

### Linux
- ✅ GTK3 integration
- ✅ Native Linux look & feel
- ✅ Desktop notifications
- ✅ File system access

### Web
- ✅ Progressive Web App (PWA)
- ✅ Offline support
- ✅ Install to home screen
- ✅ Responsive design
- ✅ Service Worker caching

## 🔧 Platform Configuration

### Android Configuration
- **Package Name:** `com.r3ap3redit.anisurge2`
- **Min SDK:** 21 (Android 5.0)
- **Target SDK:** Latest
- **TV Support:** Enabled in AndroidManifest.xml

### iOS Configuration
- **Bundle ID:** Set in Xcode project
- **Min iOS:** 13.0
- **Internet Access:** Configured in Info.plist
- **Video Playback:** NSAppTransportSecurity enabled

### macOS Configuration
- **Bundle ID:** Set in Xcode project
- **Min macOS:** 10.15 (Catalina)
- **Internet Access:** Configured in Info.plist

### Linux Configuration
- **GTK Version:** 3.0+
- **Dependencies:** Listed in prerequisites

### Web Configuration
- **PWA:** Configured in manifest.json
- **Base URL:** Configurable via `--base-href`
- **Service Worker:** Auto-generated

## 🚢 Distribution

### Android
1. Build APK or AAB
2. Sign with your keystore
3. Upload to Google Play Store

### iOS
1. Build IPA in Xcode
2. Upload to App Store Connect
3. Submit for review

### macOS
1. Build .app bundle
2. Create DMG or ZIP
3. Distribute via App Store or direct download

### Linux
1. Build release bundle
2. Create tarball or AppImage
3. Distribute via package manager or direct download

### Web
1. Build web release
2. Deploy to hosting (Firebase Hosting, Netlify, Vercel, etc.)
3. Configure custom domain

## 🐛 Troubleshooting

### Android Build Issues
```bash
# Clean build
flutter clean
flutter pub get

# Check Java version
java -version  # Should be 17+

# Update Gradle
cd android
./gradlew wrapper --gradle-version=8.3
```

### iOS Build Issues
```bash
# Install CocoaPods dependencies
cd ios
pod install
pod update

# Clean Xcode build
rm -rf ios/Pods
rm ios/Podfile.lock
pod install
```

### macOS Build Issues
```bash
# Clean build
flutter clean
flutter pub get

# Check Xcode version
xcodebuild -version
```

### Linux Build Issues
```bash
# Install missing dependencies
sudo apt-get install -y clang cmake ninja-build pkg-config libgtk-3-dev liblzma-dev

# Check GTK version
pkg-config --modversion gtk+-3.0
```

### Web Build Issues
```bash
# Clear browser cache
# Use Chrome DevTools to check console errors
# Verify CORS settings for API calls
```

## 📊 Build Sizes

| Platform | Debug | Release |
|----------|-------|---------|
| Android APK | ~80 MB | ~50-60 MB |
| Android AAB | - | ~45-55 MB |
| iOS IPA | ~100 MB | ~60-70 MB |
| macOS App | ~120 MB | ~70-80 MB |
| Linux Bundle | ~100 MB | ~60-70 MB |
| Web | - | ~5-10 MB (gzipped) |

## ✅ Quality Checklist

Before releasing:
- [ ] Test on all target platforms
- [ ] Verify video playback works
- [ ] Test authentication flow
- [ ] Check offline functionality (web)
- [ ] Verify app icons and splash screens
- [ ] Test on different screen sizes
- [ ] Check performance metrics
- [ ] Verify Firebase configuration
- [ ] Test push notifications (if implemented)
- [ ] Check app store guidelines compliance

## 🎯 Next Steps

1. **Configure Firebase** - See `FIREBASE_SETUP.md`
2. **Set up CI/CD** - Use GitHub Actions for automated builds
3. **Create App Store Listings** - Prepare screenshots and descriptions
4. **Set up Analytics** - Track app usage
5. **Implement Updates** - Set up OTA updates if needed

---

**Need Help?** Check the main `README.md` or `BUILD_GUIDE.md` for more details.

