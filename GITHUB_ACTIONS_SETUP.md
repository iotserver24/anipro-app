# 🚀 GitHub Actions Setup for AniSurge

This document explains the complete GitHub Actions setup for automated building, versioning, and releasing of the AniSurge Android app.

## 📋 Overview

Your GitHub Actions workflows will now:

1. **Automatically build APKs** when you push version tags
2. **Create GitHub releases** with properly named APK files
3. **Auto-version based on commit messages** (optional)
4. **Build development versions** for feature branches
5. **Upload to public repository** (if configured)

## 🔧 What Was Created/Updated

### New Workflows

1. **`.github/workflows/release.yml`** - Main release workflow
2. **`.github/workflows/auto-version.yml`** - Automatic versioning
3. **`.github/workflows/build-dev.yml`** - Development builds

### Updated Workflows

- **`.github/workflow/main.yml`** - Removed hardcoded versions
- **`.github/workflow/build-apk.yml`** - Removed hardcoded versions  
- **`.github/workflow/apk-uploader.yml`** - Removed hardcoded versions

### Helper Scripts

- **`scripts/create-release.sh`** - Linux/Mac release script
- **`scripts/create-release.bat`** - Windows release script
- **`.github/README.md`** - Detailed workflow documentation

## 🚀 How to Use

### Method 1: Automatic Release (Recommended)

1. **Make your changes and commit with version bump keywords:**
   ```bash
   git add .
   git commit -m "feat: add new feature (minor version bump)"
   git push origin main
   ```

2. **The auto-version workflow will:**
   - Detect the version bump keyword
   - Increment the version automatically
   - Create a version tag (e.g., `v2.26.6`)
   - Trigger the release workflow

3. **The release workflow will:**
   - Build APKs for all architectures
   - Create a GitHub release
   - Upload APK files to the release

### Method 2: Manual Release Script

**On Windows:**
```cmd
scripts\create-release.bat
```

**On Linux/Mac:**
```bash
./scripts/create-release.sh
```

**Command line:**
```bash
# Custom version
scripts\create-release.bat 2.26.6 2

# Interactive mode
scripts\create-release.bat
```

### Method 3: Manual Tag Creation

1. **Update version manually:**
   ```bash
   node scripts/version-manager.js update 2.26.6 2
   git add .
   git commit -m "chore: bump version to 2.26.6"
   git push origin main
   ```

2. **Create and push tag:**
   ```bash
   git tag -a v2.26.6 -m "Release v2.26.6"
   git push origin v2.26.6
   ```

3. **GitHub Actions will automatically build and release**

## 📱 APK Files Generated

Each release will include:

- **`AniSurge-v{version}-universal.apk`** - Universal compatibility
- **`AniSurge-v{version}-arm64-v8a.apk`** - 64-bit ARM devices (most phones)
- **`AniSurge-v{version}-x86_64.apk`** - 64-bit Intel/AMD devices
- **`AniSurge-v{version}-x86.apk`** - 32-bit Intel/AMD devices

## 🔑 Version Bump Keywords

The auto-version workflow detects these keywords in commit messages:

- **`major`** → 1.0.0 → 2.0.0
- **`minor`** → 1.0.0 → 1.1.0  
- **`patch`** → 1.0.0 → 1.0.1
- **`bump`**, **`version`**, **`release`** → Defaults to patch

## 🛠️ Configuration

### Required Secrets

- **`GITHUB_TOKEN`** - Automatically provided by GitHub ✅
- **`PUBLIC_REPO_TOKEN`** - For uploading to public repository (optional)

### Public Repository Upload

If you want to upload releases to a public repository, add this secret:

1. Go to GitHub Settings → Secrets and variables → Actions
2. Add new repository secret:
   - Name: `PUBLIC_REPO_TOKEN`
   - Value: Personal access token with repo permissions

The workflow will automatically upload to `iotserver24/anisurge-apk` if this secret is configured.

## 📊 Workflow Triggers

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `release.yml` | Version tags (`v*.*.*`) | Build and release APKs |
| `auto-version.yml` | Push to main/master | Auto-increment versions |
| `build-dev.yml` | Feature branches, PRs | Development builds |
| `main.yml` | Push to master | Legacy build (updated) |
| `build-apk.yml` | Push to main | Legacy build (updated) |
| `apk-uploader.yml` | Push to master | Legacy upload (updated) |

## 🔍 Monitoring

### Check Workflow Status

1. Go to **Actions** tab in GitHub
2. View workflow runs and logs
3. Download APK artifacts from development builds

### Release Management

1. Go to **Releases** tab in GitHub
2. View all releases with APK downloads
3. Edit release notes if needed

## 🐛 Troubleshooting

### Common Issues

1. **Version mismatch errors:**
   ```bash
   node scripts/version-manager.js check
   node scripts/version-manager.js update 2.26.6 2
   ```

2. **Build failures:**
   - Check Actions tab for detailed logs
   - Ensure all dependencies are installed
   - Verify Android SDK configuration

3. **Release not created:**
   - Ensure tag format is `v*.*.*` (e.g., `v2.26.6`)
   - Check workflow permissions
   - Verify GITHUB_TOKEN has release permissions

### Manual Commands

```bash
# Check current versions
node scripts/version-manager.js check

# Update to specific version
node scripts/version-manager.js update 2.26.6 2

# Increment versions
node scripts/version-manager.js patch
node scripts/version-manager.js minor  
node scripts/version-manager.js major

# Run prebuild
node scripts/version-manager.js update 2.26.6 2 --prebuild
```

## 📈 Benefits

✅ **Automated releases** - No more manual APK building  
✅ **Consistent versioning** - All files stay in sync  
✅ **Multiple APK architectures** - Universal, ARM64, x86, x86_64  
✅ **Automatic changelog** - Generated from git commits  
✅ **Development builds** - For testing feature branches  
✅ **Public repository upload** - Optional public APK hosting  
✅ **Easy rollback** - All releases are tagged and tracked  

## 🎯 Next Steps

1. **Test the setup:**
   ```bash
   # Create a test release
   scripts\create-release.bat 2.26.6 2
   ```

2. **Monitor the first build:**
   - Check Actions tab
   - Verify APK files are created
   - Test APK installation

3. **Configure public repository (optional):**
   - Add `PUBLIC_REPO_TOKEN` secret
   - Verify uploads to public repo

4. **Update your release process:**
   - Use commit message keywords for auto-versioning
   - Use release scripts for manual releases
   - Monitor Actions tab for build status

## 📚 Additional Resources

- **`.github/README.md`** - Detailed workflow documentation
- **`scripts/version-manager.js`** - Version management script
- **GitHub Actions documentation** - https://docs.github.com/en/actions

---

**🎉 Your GitHub Actions setup is now complete!** 

The next time you push a version tag or use the release scripts, GitHub Actions will automatically build your APKs and create a release with all the necessary files.
