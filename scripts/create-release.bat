@echo off
setlocal enabledelayedexpansion

REM AniSurge Release Script for Windows
REM This script helps create a new release by updating versions and creating tags

echo.
echo 🚀 AniSurge Release Script
echo =========================
echo.

REM Check if we're in a git repository
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Not in a git repository
    exit /b 1
)

REM Check for required files
if not exist "package.json" (
    echo [ERROR] package.json not found
    exit /b 1
)
if not exist "app.json" (
    echo [ERROR] app.json not found
    exit /b 1
)
if not exist "constants\appConfig.ts" (
    echo [ERROR] constants\appConfig.ts not found
    exit /b 1
)

REM Get current version
for /f "tokens=*" %%i in ('node -p "require('./package.json').version"') do set current_version=%%i
for /f "tokens=*" %%i in ('node -p "require('./app.json').expo.android.versionCode"') do set current_version_code=%%i

echo Current version: %current_version% (code: %current_version_code%)
echo.

REM Parse command line arguments
if "%~1"=="" (
    REM Interactive mode
    echo Choose release type:
    echo 1) Patch release
    echo 2) Minor release  
    echo 3) Major release
    echo 4) Custom version
    echo.
    set /p choice="Enter choice (1-4): "
    
    if "!choice!"=="1" (
        REM Calculate patch version
        for /f "tokens=1,2,3 delims=." %%a in ("%current_version%") do (
            set /a new_patch=%%c+1
            set new_version=%%a.%%b.!new_patch!
        )
        set /a new_version_code=%current_version_code%+1
    ) else if "!choice!"=="2" (
        REM Calculate minor version
        for /f "tokens=1,2,3 delims=." %%a in ("%current_version%") do (
            set /a new_minor=%%b+1
            set new_version=%%a.!new_minor!.0
        )
        set /a new_version_code=%current_version_code%+10
    ) else if "!choice!"=="3" (
        REM Calculate major version
        for /f "tokens=1,2,3 delims=." %%a in ("%current_version%") do (
            set /a new_major=%%a+1
            set new_version=!new_major!.0.0
        )
        set /a new_version_code=%current_version_code%+100
    ) else if "!choice!"=="4" (
        set /p new_version="Enter new version (e.g., 2.26.5): "
        set /p new_version_code="Enter new version code (e.g., 1): "
    ) else (
        echo [ERROR] Invalid choice
        exit /b 1
    )
) else if "%~2"=="" (
    echo Usage: %0 [version] [version_code]
    echo        %0                    # Interactive mode
    echo.
    echo Examples:
    echo   %0 2.26.5 1              # Custom version
    echo   %0                        # Interactive mode
    exit /b 1
) else (
    REM Command line mode
    set new_version=%~1
    set new_version_code=%~2
)

REM Check if we're on main/master branch
for /f "tokens=*" %%i in ('git branch --show-current') do set current_branch=%%i
if not "%current_branch%"=="main" if not "%current_branch%"=="master" (
    echo [WARNING] You're not on main/master branch (current: %current_branch%)
    set /p continue="Do you want to continue? (y/N): "
    if /i not "!continue!"=="y" (
        echo [ERROR] Release cancelled
        exit /b 1
    )
)

REM Check for uncommitted changes
git diff-index --quiet HEAD --
if errorlevel 1 (
    echo [ERROR] You have uncommitted changes. Please commit or stash them first.
    git status --short
    exit /b 1
)

REM Confirm release
echo.
echo [WARNING] About to create release v%new_version% (code: %new_version_code%)
set /p confirm="Continue? (y/N): "
if /i not "!confirm!"=="y" (
    echo [ERROR] Release cancelled
    exit /b 1
)

REM Update version
echo.
echo [INFO] Updating version to %new_version% (code: %new_version_code%)...
node scripts\version-manager.js update %new_version% %new_version_code%
if errorlevel 1 (
    echo [ERROR] Failed to update version
    exit /b 1
)
echo [SUCCESS] Version updated successfully

REM Commit version changes
echo.
echo [INFO] Committing version changes...
git add package.json app.json constants\appConfig.ts
git commit -m "chore: bump version to %new_version%"
if errorlevel 1 (
    echo [ERROR] Failed to commit version changes
    exit /b 1
)
echo [SUCCESS] Version changes committed

REM Create and push tag
echo.
echo [INFO] Creating tag v%new_version%...
git tag -a "v%new_version%" -m "Release v%new_version%"
if errorlevel 1 (
    echo [ERROR] Failed to create tag
    exit /b 1
)
echo [SUCCESS] Tag v%new_version% created

echo.
echo [INFO] Pushing changes and tag...
git push origin HEAD
if errorlevel 1 (
    echo [ERROR] Failed to push changes
    exit /b 1
)
git push origin "v%new_version%"
if errorlevel 1 (
    echo [ERROR] Failed to push tag
    exit /b 1
)
echo [SUCCESS] Changes and tag pushed to remote

REM Show summary
echo.
echo [SUCCESS] Release v%new_version% created successfully!
echo.
echo 📋 Release Summary:
echo    Version: %new_version%
echo    Version Code: %new_version_code%
echo    Tag: v%new_version%
echo.
echo 🚀 Next steps:
echo    1. GitHub Actions will automatically build the APKs
echo    2. A release will be created with the APK files
echo    3. Check the Actions tab for build progress
echo.

REM Get repository name for URL
for /f "tokens=*" %%i in ('git config --get remote.origin.url') do set repo_url=%%i
set repo_name=%repo_url:https://github.com/=%
set repo_name=%repo_name:.git=%

echo 🔗 View release: https://github.com/%repo_name%/releases/tag/v%new_version%
echo.

pause
