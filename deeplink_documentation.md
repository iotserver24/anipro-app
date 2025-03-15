# AniSurge Deeplink Documentation

## Overview

This document explains how deeplinks work in the AniSurge app using the `anisurge://` URL scheme. Deeplinks allow users to navigate directly to specific content within the app from external sources such as websites, messages, or other apps.

## Deeplink URL Structure

AniSurge supports the following deeplink formats:

1. **Anime Details**: `anisurge://anime/{animeId}`
2. **Watch Episode**: `anisurge://anime/watch/{episodeId}`

## How Deeplinks Are Configured

### App Configuration

The deeplink scheme is configured in the `app.json` file:

```json
{
  "expo": {
    "scheme": "anisurge",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "anisurge",
              "host": "*",
              "pathPrefix": "/anime"
            },
            {
              "scheme": "anisurge",
              "host": "*",
              "pathPrefix": "/anime/watch"
            }
          ],
          "category": [
            "BROWSABLE",
            "DEFAULT"
          ]
        }
      ]
    }
  }
}
```

This configuration:
- Registers the `anisurge://` URL scheme
- Sets up intent filters for Android to handle URLs with the paths `/anime` and `/anime/watch`
- Makes the links browsable (can be opened from browsers)

### Deeplink Handling

AniSurge uses Expo Router to automatically handle deeplinks. When a user clicks on a deeplink:

1. The operating system recognizes the `anisurge://` scheme
2. The app is launched (if not already running)
3. Expo Router parses the URL and navigates to the corresponding screen:
   - `anisurge://anime/{animeId}` → Opens the anime details screen for the specified anime
   - `anisurge://anime/watch/{episodeId}` → Opens the video player for the specified episode

## Using Deeplinks

### Creating Deeplinks

To create a deeplink to share with users:

```javascript
// To link to an anime details page
const animeDeeplink = `anisurge://anime/${animeId}`;

// To link to a specific episode
const episodeDeeplink = `anisurge://anime/watch/${episodeId}`;
```

### Testing Deeplinks

You can test deeplinks using:

1. **ADB (Android Debug Bridge)**:
   ```bash
   adb shell am start -a android.intent.action.VIEW -d "anisurge://anime/12345" com.anisurge.app
   ```

2. **Browser**:
   Simply enter the deeplink URL in a mobile browser address bar.

### Sharing Content with Deeplinks

The app implements sharing functionality that generates web URLs which can be converted back to deeplinks:

1. When a user shares content from the app, it creates a web URL: `https://app.animeverse.cc/share/{animeId}`
2. When this URL is opened on a device with AniSurge installed, it can redirect to the app using the `anisurge://` scheme

## Web to App Linking

For users who receive a shared link via the web:

1. The web page at `app.animeverse.cc` detects if the user is on a mobile device
2. It offers an "Open in App" button
3. When clicked, it attempts to open the corresponding `anisurge://` URL
4. If the app isn't installed, it falls back to the Play Store

## Implementation Example

Here's how you might implement a function to open content with deeplinks:

```javascript
import { Linking } from 'react-native';

const openAnimeInApp = async (animeId) => {
  const url = `anisurge://anime/${animeId}`;
  
  // Check if the URL can be opened
  const canOpen = await Linking.canOpenURL(url);
  
  if (canOpen) {
    // Open the URL
    await Linking.openURL(url);
  } else {
    // Handle the case where the app isn't installed
    // Perhaps open the Play Store or show an error
  }
};
```

## Security Considerations

- Deeplinks can potentially expose sensitive functionality, so ensure proper validation of parameters
- Consider implementing authentication checks for sensitive content accessed via deeplinks
- Validate all input parameters from deeplinks before using them in your app logic

## Benefits of Using Deeplinks

1. **Improved User Experience**: Users can navigate directly to specific content
2. **Better Sharing**: Makes it easy to share specific content with other users
3. **Cross-App Integration**: Allows other apps to link directly to your content
4. **Marketing Campaigns**: Enables direct linking to specific features from marketing materials

## Troubleshooting

If deeplinks aren't working:

1. Verify the URL scheme is correctly registered in `app.json`
2. Ensure the app is properly handling the incoming links
3. Check that the URL format matches exactly what the app expects
4. On Android, verify the intent filters are correctly configured
5. Test with the ADB command to rule out issues with the source of the deeplink

## Conclusion

Deeplinks using the `anisurge://` scheme provide a powerful way to navigate directly to content within the AniSurge app. By implementing proper deeplink handling, the app offers a seamless experience for users sharing and accessing content across different platforms. 