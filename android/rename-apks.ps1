# Directory containing the APK files
$apkDir = "app/build/outputs/apk/release"

# Mapping of original names to new names
$renameMap = @{
    "app-arm64-v8a-release.apk" = "Anisurge-arm64.apk"
    "app-x86-release.apk" = "Anisurge-x86.apk"
    "app-x86_64-release.apk" = "Anisurge-x86_64.apk"
    "app-universal-release.apk" = "Anisurge-universal.apk"
}

# Create the directory if it doesn't exist
if (-not (Test-Path $apkDir)) {
    Write-Host "APK directory not found: $apkDir"
    exit 1
}

# Change to the APK directory
Set-Location $apkDir

# Rename each APK file
foreach ($originalName in $renameMap.Keys) {
    if (Test-Path $originalName) {
        $newName = $renameMap[$originalName]
        Write-Host "Renaming $originalName to $newName..."
        Rename-Item -Path $originalName -NewName $newName -Force
    } else {
        Write-Host "File not found: $originalName"
    }
}

Write-Host "APK renaming complete!" 