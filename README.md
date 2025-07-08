# AniSurge

A free anime streaming app that lets you watch your favorite anime shows and movies anytime, anywhere.

## App Configuration

The app uses a centralized configuration system to manage app-wide settings like version numbers, API endpoints, and branding colors.

### Configuration Files

- **`constants/appConfig.ts`**: The main configuration file that stores all app settings
- **`app.json`**: Expo configuration file that needs to be kept in sync with appConfig.ts

### App Version Management

#### Checking Current Version
To check the current app version and version code:
```bash
node scripts/check-version.js
```
This will display the current version information in a formatted output.

#### Updating App Version
To update the app version, use the provided script:
```bash
node scripts/update-version.js <version> <versionCode>
```

Example:
```bash
node scripts/update-version.js 1.0.1 2
```

This will update both `constants/appConfig.ts` and `app.json` with the new version information.

### Using Configuration Values

Import the configuration in your components:

```typescript
import { APP_CONFIG, getAppVersion } from '../constants/appConfig';

// Use the app name
const appName = APP_CONFIG.APP_NAME;  // "AniSurge"

// Use the app version
const version = getAppVersion();  // "1.0.0"
```

### Available Configuration

The configuration includes:

- **App Information**: Name, version, version code
- **API Endpoints**: Base URL for API calls
- **Branding**: Primary and secondary colors
- **Contact Information**: Support email
- **External Links**: Website and download URLs
- **Cache Keys**: Keys used for caching data

## Automated Build System

This project includes GitHub Actions workflows for automated building and releasing of Android APKs.

### Build Workflows

1. **Build and Release APKs** (`.github/workflows/build-and-release.yml`)
   - Automatically builds APKs on push to main/master branch
   - Creates GitHub releases with APK files
   - Supports manual triggering with version updates
   - Generates APKs for all architectures (ARM64, x86, x86_64, Universal)

2. **Build APKs (Development)** (`.github/workflows/build-dev.yml`)
   - Builds APKs for pull requests and development testing
   - No releases created, only artifacts for testing
   - Faster feedback for development

### Manual Release Process

To create a release manually:

1. Go to Actions tab in GitHub
2. Select "Build and Release APKs" workflow
3. Click "Run workflow"
4. Optionally specify version and version code
5. APKs will be built and attached to a new GitHub release

### Local Build Commands

For local development, use the existing build scripts:

```bash
# Quick build (for small changes)
./build-android.sh

# Build with version update
./build-android.sh --update-version 2.25.1 9
```

See [.github/ACTIONS_README.md](.github/ACTIONS_README.md) for detailed workflow documentation.

## Avatar System

The app includes a user avatar system that allows users to select profile pictures from a predefined set of avatars. 

### How It Works

1. **Remote Avatar Management**: Avatars are stored and managed through the companion website at https://anisurge.me/admin/avatars
2. **API Integration**: The mobile app fetches available avatars from the API endpoint at `/api/avatars/list`
3. **Default Fallbacks**: If the API can't be reached, the app uses a set of default avatars

### For Developers

- Avatars are defined in `anipro/constants/avatars.ts`
- The avatar selection UI is in `anipro/components/AvatarSelectionModal.tsx`
- Users can change their avatar from the profile screen at `anipro/app/profile.tsx`
- Avatar IDs are stored in Firestore under the user document

### Adding New Avatars

To add new avatars, use the admin panel at https://anisurge.me/admin/avatars. All users will automatically get access to new avatars without needing to update the app.

## GIF Support in Comments

The app includes GIF support in the comment section, allowing users to add animated GIFs to their comments.

### Setting Up Tenor API Key

To enable GIF functionality, follow these steps:

1. Create a Google Cloud project and enable the Tenor API at [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Generate an API key for the Tenor API
3. Update the API key in `constants/apiKeys.ts`:

```typescript
export const TENOR_API_KEY = 'YOUR_TENOR_API_KEY';
```

### How It Works

1. Users can click the "GIF" button in the comment input section
2. The GIF picker modal displays trending GIFs from Tenor
3. Users can search for specific GIFs
4. Selected GIFs are displayed in the comments using video format for better compatibility

### For Developers

- GIF picker is implemented in `components/GifPicker.tsx`
- The Comment type in `services/commentService.ts` has been extended to include `gifUrl`
- Comments with GIFs are displayed in `components/CommentSection.tsx`
- The app uses MP4 format for GIFs when available for better compatibility

## Development

### Prerequisites

- Node.js
- npm or yarn
- Expo CLI

### Installation

```bash
npm install
# or
yarn install
```

### Running the App

```bash
npx expo start
```

## Building for Production

```bash
# Build for Android
./build-android.sh
```

## License

This project is proprietary software. 