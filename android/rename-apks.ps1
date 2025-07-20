# Directory containing the APK files
$apkDir = "app/build/outputs/apk/release"

# Get version and version code from appConfig.ts
$appConfigPath = "../constants/appConfig.ts"
$configContent = Get-Content $appConfigPath -Raw

# Extract version and version code using regex
$versionName = [regex]::Match($configContent, 'VERSION:\s*''([^'']+)''').Groups[1].Value
$versionCode = [regex]::Match($configContent, 'VERSION_CODE:\s*(\d+)').Groups[1].Value

Write-Host "Found version: $versionName (code: $versionCode)"

# Create version-specific directory name
$versionDir = "$versionName-$versionCode"

# Create base releases directory first (using absolute path)
$releasesDir = Join-Path $PSScriptRoot "../releases"
if (-not (Test-Path $releasesDir)) {
    Write-Host "Creating releases directory: $releasesDir"
    New-Item -ItemType Directory -Path $releasesDir -Force | Out-Null
}

# Create version-specific output directory (using absolute path)
$outputDir = Join-Path $releasesDir $versionDir
if (-not (Test-Path $outputDir)) {
    Write-Host "Creating version directory: $outputDir"
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

# Mapping of original names to new names
$renameMap = @{
    "app-arm64-v8a-release.apk" = "Anisurge-arm64-v8a.apk"
    "app-armeabi-v7a-release.apk" = "Anisurge-armeabi-v7a.apk"
    "app-x86-release.apk" = "Anisurge-x86.apk"
    "app-x86_64-release.apk" = "Anisurge-x86_64.apk"
    "app-universal-release.apk" = "Anisurge-universal.apk"
}

# Get absolute path to APK directory
$apkDirFull = Join-Path $PSScriptRoot $apkDir

# Check if APK directory exists
if (-not (Test-Path $apkDirFull)) {
    Write-Host "APK directory not found: $apkDirFull"
    exit 1
}

# Change to the APK directory
Push-Location $apkDirFull

try {
    # Rename each APK file and move to version directory
    foreach ($originalName in $renameMap.Keys) {
        if (Test-Path $originalName) {
            $newName = $renameMap[$originalName]
            Write-Host "Renaming $originalName to $newName..."
            
            # First rename the file
            Rename-Item -Path $originalName -NewName $newName -Force
            
            # Then move it to the version directory
            Write-Host "Moving $newName to version directory..."
            Move-Item -Path $newName -Destination $outputDir -Force
        } else {
            Write-Host "File not found: $originalName"
        }
    }

    Write-Host "`nAPK processing complete!"
    Write-Host "APKs have been renamed and moved to: $outputDir"

    # Create a version info file
    $versionInfo = @"
Version: $versionName
Version Code: $versionCode
Release Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@

    $versionInfoPath = Join-Path $outputDir "version-info.txt"
    $versionInfo | Out-File -FilePath $versionInfoPath -Force

    Write-Host "`nVersion info has been saved to: $versionInfoPath"

    # Optional: Open the output directory
    $response = Read-Host "Would you like to open the output directory? (y/n)"
    if ($response -eq 'y') {
        Invoke-Item $outputDir
    }
} finally {
    # Always return to the original directory
    Pop-Location
} 