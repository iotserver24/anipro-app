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