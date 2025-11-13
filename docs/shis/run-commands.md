# Run Commands

## Full Build Process

```bash
cd "C:\Users\Asus\all repos\anime-app\anipro-app"
npx expo prebuild --clean

npx react-native bundle --platform android `
    --dev false `
    --entry-file app/_layout.tsx `
    --bundle-output android/app/src/main/assets/index.android.bundle `
    --assets-dest android/app/src/main/res
cd android

./gradlew assembleRelease
./gradlew installRelease
./rename-apks.ps1

./gradlew clean
```

### APK Output Locations

The APKs will be generated in the following locations:
- **Universal APK**: `android/app/build/outputs/apk/release/app-universal-release.apk`
- **ARM64 APK**: `android/app/build/outputs/apk/release/app-arm64-v8a-release.apk`
- **x86 APK**: `android/app/build/outputs/apk/release/app-x86-release.apk`
- **x86_64 APK**: `android/app/build/outputs/apk/release/app-x86_64-release.apk`

---

## Quick Update Commands

> **Note**: For small changes only (JavaScript/TypeScript code changes without native code modifications or new dependencies)

```bash
cd "C:\Users\Asus\all repos\anime app\anipro-app"

npx react-native bundle --platform android `
    --dev false `
    --entry-file app/_layout.tsx `
    --bundle-output android/app/src/main/assets/index.android.bundle `
    --assets-dest android/app/src/main/res

node scripts/check-version.js
node scripts/update-version.js 2.26.2 2

cd android
./gradlew assembleRelease
./gradlew installRelease
./rename-apks.ps1
```

---

## Version Management

### Update Version Command
```bash
node scripts/update-version.js <version> <versionCode>
```

**Example:**
```bash
npm run version:update 2.9.9 1
```

**Output:**
```
> anisurge@2.9.9 version:update
> node scripts/version-manager.js update 2.9.9 1

🔄 Updating version to 2.9.9 (code: 1)...

✅ Updated package.json
✅ Updated app.json
✅ Updated android/app/build.gradle

🎉 Version update complete!
```

---

## Keystore Information

### Keystore Details
```bash
keytool -list -v -keystore anisurge-release-key.keystore
```

**Keystore Information:**
- **Keystore type**: PKCS12
- **Keystore provider**: SUN
- **Alias name**: anisurge-key
- **Creation date**: Mar 14, 2025
- **Entry type**: PrivateKeyEntry
- **Certificate chain length**: 1

**Certificate Details:**
- **Owner**: CN=r3ap3redit, OU=anisurge, O=Unknown, L=karnataka, ST=karnataka, C=91
- **Issuer**: CN=r3ap3redit, OU=anisurge, O=Unknown, L=karnataka, ST=karnataka, C=91
- **Serial number**: 9d60ae901b90eefc
- **Valid from**: Fri Mar 14 21:42:04 IST 2025
- **Valid until**: Tue Jul 30 21:42:04 IST 2052

**Certificate Fingerprints:**
- **SHA1**: D8:9F:B6:20:54:B8:F4:03:87:37:D1:73:58:37:50:5A:38:77:44:86
- **SHA256**: 55:69:AB:DE:44:84:52:C9:4E:E0:C5:45:DD:74:9D:CB:CB:65:F0:F5:B5:AD:F5:D3:37:76:4E:0A:81:BF:49:95

**Signature Algorithm**: SHA384withRSA
**Subject Public Key Algorithm**: 2048-bit RSA key
**Version**: 3

---

## Notes

- All commands are designed for Windows PowerShell environment
- Make sure to run commands from the correct directory
- The `rename-apks.ps1` script is used to rename generated APK files
- Version management is handled through the custom scripts in the `scripts/` directory
