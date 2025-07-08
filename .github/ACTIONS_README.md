# GitHub Actions Build and Release Workflow

This repository includes a GitHub Actions workflow that automatically builds Android APKs and creates releases.

## Workflow Features

- **Automatic APK Building**: Builds APKs for all supported architectures (ARM64, x86, x86_64, Universal)
- **Version Management**: Supports updating app version via workflow inputs
- **Release Creation**: Automatically creates GitHub releases with APK files
- **Cross-platform Compatibility**: Uses shell scripts for better CI/CD compatibility

## Workflow Triggers

The workflow runs on:

1. **Push to main/master branch**: Automatically builds and creates releases
2. **Pull requests**: Builds APKs for testing (without creating releases)
3. **Manual dispatch**: Allows manual triggering with optional version updates

## Manual Workflow Dispatch

You can manually trigger the workflow with optional parameters:

1. Go to the "Actions" tab in your GitHub repository
2. Select "Build and Release APKs" workflow
3. Click "Run workflow"
4. Optionally specify:
   - **Version**: New version number (e.g., "2.25.1")
   - **Version Code**: New version code (integer)
   - **Create Release**: Whether to create a GitHub release (default: true)

## APK Outputs

The workflow generates the following APK files:

- `Anisurge-universal.apk` - Universal APK (recommended for most users)
- `Anisurge-arm64.apk` - ARM64 architecture (modern Android devices)
- `Anisurge-x86.apk` - x86 architecture (rare Android devices)
- `Anisurge-x86_64.apk` - x86_64 architecture (rare Android devices)

## Release Structure

Each release includes:

- All APK files for different architectures
- `version-info.txt` with build information
- Automated release notes with download instructions

## Local Build Scripts

The workflow uses the existing build infrastructure:

- `build-android.sh` - Main build script for local development
- `android/rename-apks.sh` - Shell script for APK processing (cross-platform alternative to PowerShell)
- `android/rename-apks.ps1` - Original PowerShell script for Windows development

## Version Management

The workflow integrates with the existing version management system:

- Reads current version from `constants/appConfig.ts`
- Supports version updates via workflow inputs
- Uses existing `scripts/update-version.js` for version updates

## Setup Requirements

For the workflow to work properly, ensure:

1. **Keystore**: The repository should have the signing keystore properly configured
2. **Gradle Configuration**: Android build configuration should be properly set up
3. **Dependencies**: All npm dependencies should be properly defined in `package.json`

## Environment

The workflow runs on Ubuntu with:

- Node.js 18
- Java 17 (Temurin distribution)
- Android SDK (latest)

## Artifacts

Each workflow run creates:

- **GitHub Artifacts**: APK files available for 30 days
- **GitHub Releases**: Permanent releases for push events to main/master branch

## Monitoring

You can monitor workflow runs in the "Actions" tab of your GitHub repository. Each run provides:

- Build logs for debugging
- APK file sizes and details
- Success/failure status
- Download links for artifacts and releases