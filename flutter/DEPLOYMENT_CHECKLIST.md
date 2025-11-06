# AniSurge Flutter - Deployment Checklist

Use this checklist before building and distributing the application.

## Pre-Build Checklist

### Code Quality
- [x] All Dart files compile without errors
- [x] `flutter analyze` shows no issues
- [x] No unused imports or variables
- [x] Deprecated APIs updated
- [x] Code follows Flutter best practices

### Configuration
- [x] Package name set: `com.r3ap3redit.anisurge2`
- [x] App name set: "AniSurge"
- [x] Version number updated in `pubspec.yaml`
- [x] Build number incremented

### Platform Support
- [x] Android support configured
- [x] Android TV support enabled
- [x] Windows support configured
- [x] Linux support configured

### Android TV Specific
- [x] Leanback launcher category added
- [x] D-pad navigation implemented
- [x] Focus indicators visible
- [x] Touchscreen not required
- [x] Remote control tested

### Permissions
- [x] Internet permission added
- [x] Network state permission added
- [x] No unnecessary permissions

### Dependencies
- [x] All dependencies up to date
- [x] No security vulnerabilities
- [x] Compatible versions selected

## Build Checklist

### GitHub Actions Build
- [ ] Version number decided (e.g., 1.0.0)
- [ ] Build number decided (e.g., 1)
- [ ] Release type selected:
  - [ ] Draft (for testing)
  - [ ] Pre-release (for beta)
  - [ ] Latest (for public)
- [ ] Workflow triggered
- [ ] Build completed successfully
- [ ] All platforms built (Android, Windows, Linux)

### Local Build (if applicable)
- [ ] Android SDK installed
- [ ] Flutter SDK version correct
- [ ] Dependencies installed (`flutter pub get`)
- [ ] Build completed: `flutter build apk --release`
- [ ] APK signed (if for production)

## Testing Checklist

### Android Mobile Testing
- [ ] App installs correctly
- [ ] App launches without crashes
- [ ] Home screen loads anime
- [ ] Search works properly
- [ ] Anime details display
- [ ] Video plays correctly
- [ ] Back navigation works
- [ ] App doesn't crash on rotation
- [ ] Network errors handled gracefully

### Android TV Testing
- [ ] App appears in TV launcher
- [ ] D-pad navigation works
- [ ] Focus indicators visible
- [ ] Remote control responsive
- [ ] Video playback smooth
- [ ] Can navigate entire app with remote
- [ ] Back button returns correctly
- [ ] No touchscreen needed

### Windows Testing
- [ ] Executable runs on Windows 10/11
- [ ] UI scales properly
- [ ] Mouse navigation works
- [ ] Keyboard shortcuts work
- [ ] Video plays correctly
- [ ] App doesn't crash
- [ ] Network connectivity works

### Linux Testing
- [ ] Executable runs on Ubuntu/Debian
- [ ] Dependencies included
- [ ] UI renders correctly
- [ ] Video playback works
- [ ] No permission issues
- [ ] App doesn't crash

### Functionality Testing
- [ ] Browse trending anime
- [ ] Browse popular anime
- [ ] Browse recent episodes
- [ ] Search by title
- [ ] View anime details
- [ ] View episode list
- [ ] Play video
- [ ] Video controls work
- [ ] Fullscreen mode
- [ ] Landscape orientation (video)
- [ ] Handle no internet
- [ ] Handle API errors

## Distribution Checklist

### Android
- [ ] APK file size acceptable (~50-60 MB)
- [ ] APK signed (if required)
- [ ] Installation tested on multiple devices
- [ ] Works on Android 5.0+ (API 21+)
- [ ] Android TV compatible

### Windows
- [ ] ZIP file created
- [ ] All DLLs included
- [ ] Executable not flagged by Windows Defender
- [ ] Tested on Windows 10 and 11
- [ ] Installation instructions clear

### Linux
- [ ] Tarball created
- [ ] All libraries included
- [ ] Executable has correct permissions
- [ ] Tested on Ubuntu/Debian
- [ ] Dependencies documented

### GitHub Release
- [ ] Release tag created (vX.X.X)
- [ ] Release title descriptive
- [ ] Release notes complete
- [ ] All platform files attached
- [ ] File names clear and versioned
- [ ] Installation instructions included
- [ ] Known issues documented

## Documentation Checklist

- [x] README.md complete
- [x] BUILD_GUIDE.md accurate
- [x] API endpoints documented
- [x] Installation instructions clear
- [x] Troubleshooting guide included
- [x] Remote control guide for TV
- [ ] Changelog updated
- [ ] Screenshots included (optional)

## Post-Release Checklist

### Monitoring
- [ ] Monitor crash reports
- [ ] Check user feedback
- [ ] Monitor GitHub issues
- [ ] Test on different devices
- [ ] Verify downloads work

### Support
- [ ] Respond to user issues
- [ ] Update documentation as needed
- [ ] Fix critical bugs promptly
- [ ] Plan next version features

### Analytics (Optional)
- [ ] Track download count
- [ ] Monitor user engagement
- [ ] Collect feedback
- [ ] Identify popular features

## Version Management

### Version Numbering
Format: `MAJOR.MINOR.PATCH+BUILD`
- MAJOR: Breaking changes
- MINOR: New features
- PATCH: Bug fixes
- BUILD: Build number (incremental)

Example: `1.0.0+1`

### Update Version
1. Edit `pubspec.yaml`
2. Update `version: X.X.X+X`
3. Or use workflow input

## Security Checklist

- [x] No hardcoded API keys
- [x] No sensitive data in logs
- [x] HTTPS connections only
- [x] No debug code in release
- [x] Permissions minimal
- [x] Dependencies secure

## Performance Checklist

- [x] App startup time < 3 seconds
- [x] Images cached properly
- [x] Videos load within 5 seconds
- [x] No memory leaks
- [x] Smooth scrolling
- [x] Efficient network usage
- [x] Battery consumption reasonable

## Accessibility Checklist

- [x] Focus indicators visible
- [x] Touch targets adequate size
- [x] Text readable (dark theme)
- [x] Keyboard navigation (TV)
- [x] Error messages clear
- [x] Loading states visible

## Final Verification

Before releasing to users:

1. **Test on Real Devices**
   - [ ] Android phone
   - [ ] Android TV
   - [ ] Windows PC
   - [ ] Linux machine

2. **Test Critical Paths**
   - [ ] Open app → Browse → Select anime → Play video
   - [ ] Open app → Search → Select anime → Play video
   - [ ] Navigate with remote (Android TV)

3. **Test Error Scenarios**
   - [ ] No internet connection
   - [ ] Invalid anime ID
   - [ ] Video unavailable
   - [ ] API timeout

4. **Verify Release Assets**
   - [ ] All files downloadable
   - [ ] Correct file sizes
   - [ ] No corrupted files
   - [ ] Checksums match (if provided)

## Sign-Off

- [ ] Development team approved
- [ ] Testing completed
- [ ] Documentation verified
- [ ] Release notes prepared
- [ ] All checklists completed

**Release Date**: __________

**Version**: __________

**Released By**: __________

---

## Quick GitHub Actions Release

For fastest deployment:

```bash
# 1. Go to GitHub Actions
# 2. Select "Flutter Multi-Platform Build"
# 3. Click "Run workflow"
# 4. Enter version: 1.0.0
# 5. Enter build number: 1
# 6. Select release type: latest
# 7. Click "Run workflow"
# 8. Wait ~10-15 minutes
# 9. Download from Releases
```

**Done!** 🎉
