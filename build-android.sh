#!/bin/bash

# Check if version update is requested
if [ "$1" = "--update-version" ] && [ ! -z "$2" ] && [ ! -z "$3" ]; then
  echo "🔄 Updating app version to $2 (code: $3)..."
  node scripts/update-version.js "$2" "$3"
  if [ $? -ne 0 ]; then
    echo "❌ Failed to update version. Aborting build."
    exit 1
  fi
  echo "✅ Version updated successfully!"
fi

# Set environment variables
export NODE_ENV=production

# Create necessary directories if they don't exist
echo "Creating necessary directories..."
mkdir -p android/app/src/main/assets
mkdir -p android/app/src/main/res

# Bundle JavaScript code
echo "📦 Bundling JavaScript code..."
npx react-native bundle --platform android \
    --dev false \
    --entry-file app/_layout.tsx \
    --bundle-output android/app/src/main/assets/index.android.bundle \
    --assets-dest android/app/src/main/res

# Change directory to android
echo "📱 Changing directory to android..."
cd android

# Build release APKs for all architectures
echo "🔨 Building release APKs for all architectures..."
./gradlew clean
./gradlew assembleRelease

# List the generated APKs
echo "📱 Generated APKs:"
find ./app/build/outputs/apk/release -name "*.apk" | sort

# Install universal release APK (optional)
echo "📲 Installing universal release APK..."
./gradlew installRelease

# assembleRelease: Bundles the release AAB.
# echo "Bundling release AAB........................................................................."
# ./gradlew bundleRelease

echo "✅ All tasks completed successfully!"
echo ""
echo "Usage:"
echo "  ./build-android.sh                           # Build with current version"
echo "  ./build-android.sh --update-version 1.0.1 2  # Update to version 1.0.1 (code 2) and build" 