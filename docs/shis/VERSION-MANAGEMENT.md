# Version Management for AniSurge

This document describes how to manage app versions in AniSurge using the version management tools provided.

## Version Files

App versions are stored in these config files:

1. **`constants/appConfig.ts`** - Contains the main app configuration including version and version code
2. **`app.json`** - Contains the Expo app version and Android version code
3. **`package.json`** - Contains the npm package version

## Version Management Commands

The following npm scripts are available for version management:

```bash
# Check current versions across all files
npm run version:check

# Update to a specific version (e.g., 3.0.0 with build number 3)
npm run version:update 3.0.0 3

# Increment the patch version (e.g., 2.9.9 -> 2.9.10)
npm run version:patch

# Increment the minor version (e.g., 2.9.9 -> 2.10.0)
npm run version:minor

# Increment the major version (e.g., 2.9.9 -> 3.0.0)
npm run version:major

# Increment patch version and run prebuild
npm run version:patch-build

# Increment patch version and run clean prebuild
npm run version:patch-clean-build

# Run prebuild after checking versions
npm run prebuild

# Run clean prebuild after checking versions
npm run prebuild:clean
```

### Combined Workflows

You can also run combined commands using the script directly:

```bash
# Update to version 3.0.0 with build number 3 and run prebuild
node scripts/version-manager.js update 3.0.0 3 --prebuild

# Increment major version and run clean prebuild
node scripts/version-manager.js major --prebuild --clean
```

## Displaying Version in the App

You can display the current app version in your app using the provided components:

```jsx
import { APP_CONFIG, getAppVersion, getAppVersionCode } from '../constants/appConfig';

function MySettingsScreen() {
  return (
    <View style={styles.container}>
      <Text>Version: {getAppVersion()}</Text>
      <Text>Build: {getAppVersionCode()}</Text>
    </View>
  );
}
```

## Getting Version Programmatically

You can access version information programmatically:

```jsx
import { APP_CONFIG } from '../constants/appConfig';

function MyComponent() {
  const { VERSION, VERSION_CODE } = APP_CONFIG;
  
  return (
    <View>
      <Text>Current version: {VERSION} (Build {VERSION_CODE})</Text>
    </View>
  );
}
```

## Recommended Workflow

1. Check the current version: `npm run version:check`
2. Update version as needed: `npm run version:patch`
3. Run prebuild after updating versions: `npm run prebuild`
4. Build your app: `npm run build:android`

This ensures that your version numbers are consistent across all configuration files.

## Handling Clean Prebuild

If you need to run `npx expo prebuild --clean`, use the provided commands instead:

```bash
npm run prebuild:clean
```

Or to update version and run clean prebuild in one step:

```bash
npm run version:patch-clean-build
```

These commands ensure that your version numbers are correctly synchronized even after a clean prebuild. 