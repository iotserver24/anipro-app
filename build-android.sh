#!/bin/bash

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

# Build release APK
echo "🔨 Building release APK..."
./gradlew clean
./gradlew assembleRelease 

# Install release APK
echo "📲 Installing release APK..."
./gradlew installRelease

# assembleRelease: Bundles the release AAB.
# echo "Bundling release AAB........................................................................."
# ./gradlew bundleRelease 

echo "✅ All tasks completed successfully!"