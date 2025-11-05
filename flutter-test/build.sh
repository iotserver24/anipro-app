#!/bin/bash

# AniSurge Flutter Build Script

echo "🚀 AniSurge Flutter Build Script"
echo "================================"
echo ""

# Function to build Android
build_android() {
    echo "📱 Building Android APK..."
    flutter build apk --release
    
    if [ $? -eq 0 ]; then
        echo "✅ Android build successful!"
        echo "📦 APK location: build/app/outputs/flutter-apk/app-release.apk"
    else
        echo "❌ Android build failed!"
        exit 1
    fi
}

# Function to build Windows
build_windows() {
    echo "🪟 Building Windows executable..."
    flutter build windows --release
    
    if [ $? -eq 0 ]; then
        echo "✅ Windows build successful!"
        echo "📦 Executable location: build/windows/x64/runner/Release/"
    else
        echo "❌ Windows build failed!"
        exit 1
    fi
}

# Function to clean build
clean_build() {
    echo "🧹 Cleaning build artifacts..."
    flutter clean
    rm -rf build/
    echo "✅ Clean complete!"
}

# Function to get dependencies
get_deps() {
    echo "📦 Getting Flutter dependencies..."
    flutter pub get
    
    if [ $? -eq 0 ]; then
        echo "✅ Dependencies installed!"
    else
        echo "❌ Failed to get dependencies!"
        exit 1
    fi
}

# Main menu
echo "Select build option:"
echo "1) Build Android APK"
echo "2) Build Windows"
echo "3) Build Both (Android + Windows)"
echo "4) Clean + Rebuild Android"
echo "5) Clean + Rebuild Windows"
echo "6) Just clean"
echo "7) Get dependencies only"
echo ""
read -p "Enter your choice (1-7): " choice

case $choice in
    1)
        get_deps
        build_android
        ;;
    2)
        get_deps
        build_windows
        ;;
    3)
        get_deps
        build_android
        build_windows
        ;;
    4)
        clean_build
        get_deps
        build_android
        ;;
    5)
        clean_build
        get_deps
        build_windows
        ;;
    6)
        clean_build
        ;;
    7)
        get_deps
        ;;
    *)
        echo "❌ Invalid choice!"
        exit 1
        ;;
esac

echo ""
echo "🎉 Build process complete!"
