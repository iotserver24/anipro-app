# Build Instructions for AniSurge 2 Flutter App

This guide provides step-by-step instructions to build and deploy the AniSurge 2 Flutter app on multiple platforms: Android, Android TV, Windows, and Linux.

## Prerequisites

### All Platforms
- Flutter SDK 3.0 or higher
- Git
- A text editor or IDE (VS Code, Android Studio, IntelliJ IDEA)

### Android & Android TV
- Android Studio or Android SDK Command-Line Tools
- Java Development Kit (JDK) 17 or higher
- Android SDK (API level 34 recommended)
- Android NDK (optional, for native code)

### Windows
- Visual Studio 2022 or Build Tools for Visual Studio 2022
- Windows 10 SDK
- Enable Developer Mode in Windows Settings

### Linux (Ubuntu/Debian)
- GCC/G++ compiler (build-essential package)
- GTK 3 development headers
- CMake 3.10 or higher

```bash
sudo apt-get install build-essential libgtk-3-dev cmake ninja-build clang pkg-config
```

## Setup

### 1. Clone the Repository

```bash
cd /path/to/project/flutter
```

### 2. Install Flutter Dependencies

```bash
flutter pub get
```

### 3. Verify Flutter Setup

```bash
flutter doctor
```

Address any issues reported by `flutter doctor` before proceeding.

## Building for Different Platforms

### Android (Phone & Tablet)

#### Debug Build

```bash
flutter run
```

Or specify a device:

```bash
flutter run -d <device-id>
```

#### Release Build (APK)

```bash
flutter build apk --release
```

The APK will be located at: `build/app/outputs/flutter-apk/app-release.apk`

#### Release Build (App Bundle for Play Store)

```bash
flutter build appbundle --release
```

The AAB will be located at: `build/app/outputs/bundle/release/app-release.aab`

### Android TV

Android TV uses the same build process as Android, but ensure your device/emulator is configured for TV:

1. **Test on Android TV Emulator:**
   - Create an Android TV AVD in Android Studio
   - Select "TV" as the device type
   - Launch the emulator

2. **Run on Android TV:**

```bash
flutter run -d <androidtv-device-id>
```

3. **Build for Android TV:**

```bash
flutter build apk --release --target-platform android-arm64
```

#### Remote Control Navigation

The app includes special support for Android TV remotes:
- D-pad navigation with focus indicators
- OK/Select button for activation
- Back button support

### Windows Desktop

#### Debug Build

```bash
flutter run -d windows
```

#### Release Build

```bash
flutter build windows --release
```

The executable will be located at: `build/windows/x64/runner/Release/anisurge2.exe`

**Distribution:**
- The entire `Release` folder should be distributed together
- Include all `.dll` files and the `data` folder

### Linux Desktop

#### Debug Build

```bash
flutter run -d linux
```

#### Release Build

```bash
flutter build linux --release
```

The executable will be located at: `build/linux/x64/release/bundle/anisurge2`

**Distribution:**
- The entire `bundle` folder should be distributed together
- Users may need to install GTK3 runtime on their systems

## Configuration

### Package Name/Bundle ID

The app uses the package identifier: `com.r3ap3redit.anisurge2`

This is configured in:
- **Android:** `android/app/build.gradle` (applicationId)
- **Linux:** `linux/my_application.cc` (application-id)
- **Windows:** Uses the same identifier in metadata

### App Name

- **Display name:** AniSurge 2
- **Binary name:** anisurge2

To change the display name:
- **Android:** `android/app/src/main/AndroidManifest.xml` (android:label)
- **Linux:** `linux/my_application.cc` (window title)
- **Windows:** `windows/main.cpp` (window title)

### API Configuration

The app connects to the AniSurge API at `https://con.anisurge.me/anime/zoro`

To change the API endpoint, edit:
```
lib/src/services/api_config.dart
```

## Testing

### Run Unit Tests

```bash
flutter test
```

### Run Widget Tests

```bash
flutter test test/
```

### Run Integration Tests (if available)

```bash
flutter test integration_test/
```

## Signing (Android Release)

For production releases, you need to sign your Android app.

### Generate a Keystore

```bash
keytool -genkey -v -keystore ~/anisurge2-release.keystore -alias anisurge2 -keyalg RSA -keysize 2048 -validity 10000
```

### Configure Signing in Gradle

Create `android/key.properties`:

```properties
storePassword=<your-store-password>
keyPassword=<your-key-password>
keyAlias=anisurge2
storeFile=<path-to-keystore>
```

Update `android/app/build.gradle`:

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    ...
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

## Troubleshooting

### Common Issues

#### Flutter not recognized
- Ensure Flutter is added to your PATH
- Run `flutter doctor` to verify installation

#### Gradle build fails (Android)
- Check that Java 17+ is installed
- Verify Android SDK is properly configured
- Clear Gradle cache: `flutter clean && flutter pub get`

#### Video player not working
- Ensure internet permissions are granted
- Check network connectivity
- Verify API endpoints are accessible

#### Windows build fails
- Install Visual Studio 2022 with C++ desktop development workload
- Run build from a Visual Studio Developer Command Prompt

#### Linux build fails
- Install required GTK3 development libraries
- Ensure CMake and Ninja are installed

### Debug Logs

Enable verbose logging:

```bash
flutter run -v
```

Or for specific platforms:

```bash
flutter run -d windows --verbose
```

## Performance Optimization

### Reduce APK Size

```bash
flutter build apk --release --split-per-abi
```

This creates separate APKs for different CPU architectures (arm64-v8a, armeabi-v7a, x86_64).

### Enable Obfuscation

```bash
flutter build apk --release --obfuscate --split-debug-info=build/debug-info
```

## CI/CD Integration

The project structure supports continuous integration. Sample configurations:

### GitHub Actions (Android)

```yaml
- uses: actions/setup-java@v3
  with:
    java-version: '17'
- uses: subosito/flutter-action@v2
  with:
    flutter-version: '3.24.0'
- run: flutter pub get
- run: flutter test
- run: flutter build apk --release
```

## Support

For issues related to the AniSurge 2 Flutter app:
- Check the main README.md for project overview
- Review API documentation in the Expo app's codebase
- Ensure you're using compatible API endpoints

## License

Refer to the repository root for licensing information.
