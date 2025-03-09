#!/bin/bash

echo "🚀 Starting Android build process..."



# Bundle the app
echo "📦 Bundling the app..."
npx react-native bundle --platform android \
    --dev false \
    --entry-file index.js \
    --bundle-output android/app/src/main/assets/index.android.bundle \
    --assets-dest android/app/src/main/res

# Navigate to android directory
cd android

# Clean build
echo "🧹 Cleaning previous build..."
./gradlew clean

# Build release APK
echo "🔨 Building release APK..."
./gradlew assembleRelease

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "📱 APK location: android/app/build/outputs/apk/release/app-release.apk"
else
    echo "❌ Build failed!"
    exit 1
fi 