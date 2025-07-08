#!/bin/bash

# Directory containing the APK files
APK_DIR="app/build/outputs/apk/release"

# Get version and version code from appConfig.ts
APP_CONFIG_PATH="../constants/appConfig.ts"

if [ ! -f "$APP_CONFIG_PATH" ]; then
    echo "❌ appConfig.ts not found at: $APP_CONFIG_PATH"
    exit 1
fi

# Extract version and version code using grep and sed
VERSION_NAME=$(grep "VERSION:" "$APP_CONFIG_PATH" | grep -oE "'[^']+'" | tr -d "'")
VERSION_CODE=$(grep "VERSION_CODE:" "$APP_CONFIG_PATH" | grep -oE "[0-9]+")

echo "Found version: $VERSION_NAME (code: $VERSION_CODE)"

# Create version-specific directory name
VERSION_DIR="${VERSION_NAME}-${VERSION_CODE}"

# Create base releases directory (using absolute path)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RELEASES_DIR="$SCRIPT_DIR/../releases"

if [ ! -d "$RELEASES_DIR" ]; then
    echo "Creating releases directory: $RELEASES_DIR"
    mkdir -p "$RELEASES_DIR"
fi

# Create version-specific output directory
OUTPUT_DIR="$RELEASES_DIR/$VERSION_DIR"
if [ ! -d "$OUTPUT_DIR" ]; then
    echo "Creating version directory: $OUTPUT_DIR"
    mkdir -p "$OUTPUT_DIR"
fi

# APK mapping (original name -> new name)
declare -A RENAME_MAP=(
    ["app-arm64-v8a-release.apk"]="Anisurge-arm64.apk"
    ["app-x86-release.apk"]="Anisurge-x86.apk"
    ["app-x86_64-release.apk"]="Anisurge-x86_64.apk"
    ["app-universal-release.apk"]="Anisurge-universal.apk"
)

# Get absolute path to APK directory
APK_DIR_FULL="$SCRIPT_DIR/$APK_DIR"

# Check if APK directory exists
if [ ! -d "$APK_DIR_FULL" ]; then
    echo "❌ APK directory not found: $APK_DIR_FULL"
    exit 1
fi

# Change to the APK directory
cd "$APK_DIR_FULL" || exit 1

# Process each APK file
for ORIGINAL_NAME in "${!RENAME_MAP[@]}"; do
    NEW_NAME="${RENAME_MAP[$ORIGINAL_NAME]}"
    
    if [ -f "$ORIGINAL_NAME" ]; then
        echo "📦 Renaming $ORIGINAL_NAME to $NEW_NAME..."
        
        # Copy and rename the file to the version directory
        cp "$ORIGINAL_NAME" "$OUTPUT_DIR/$NEW_NAME"
        
        echo "✅ Moved $NEW_NAME to version directory"
    else
        echo "⚠️ File not found: $ORIGINAL_NAME"
    fi
done

echo ""
echo "✅ APK processing complete!"
echo "📁 APKs have been processed and moved to: $OUTPUT_DIR"

# Create a version info file
VERSION_INFO_PATH="$OUTPUT_DIR/version-info.txt"
cat > "$VERSION_INFO_PATH" << EOF
Version: $VERSION_NAME
Version Code: $VERSION_CODE
Release Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
EOF

echo "📄 Version info has been saved to: $VERSION_INFO_PATH"

# List the contents of the output directory
echo ""
echo "📋 Contents of release directory:"
ls -la "$OUTPUT_DIR"

echo ""
echo "🎉 All APK processing tasks completed successfully!"