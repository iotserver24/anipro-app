# AniSurge Deeplink Documentation

## Overview

This document explains how deeplinks work in the AniSurge app using the `anisurge://` URL scheme. Deeplinks allow users to navigate directly to specific content within the app from external sources such as websites, messages, or other apps.

## Deeplink URL Structure

AniSurge supports the following deeplink formats:

1. **Anime Details**: `anisurge://anime/{animeId}`
2. **Watch Episode**: `anisurge://anime/watch/{episodeId}`
3. **About Page Sections**: `anisurge://about/{section}`

Note: 
- The `episodeId` includes the full episode identifier with token in the format: `animeId$ep=episodeNumber$token=uniqueToken`
- The `section` parameter for About page can be one of: `about`, `donate`, `stats`, `version`, `content`, `device`, `data`, `app`, or `developer`

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
            },
            {
              "scheme": "anisurge",
              "host": "*",
              "pathPrefix": "/about"
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
- Sets up intent filters for Android to handle URLs with the paths `/anime`, `/anime/watch`, and `/about`
- Makes the links browsable (can be opened from browsers)

### Deeplink Handling

AniSurge uses Expo Router to automatically handle deeplinks. When a user clicks on a deeplink:

1. The operating system recognizes the `anisurge://` scheme
2. The app is launched (if not already running)
3. Expo Router parses the URL and navigates to the corresponding screen:
   - `anisurge://anime/{animeId}` → Opens the anime details screen
   - `anisurge://anime/watch/{episodeId}` → Opens the video player
   - `anisurge://about/{section}` → Opens the About page and scrolls to the specified section

## Using Deeplinks

### Creating Deeplinks

To create a deeplink to share with users:

```javascript
// To link to an anime details page
const animeDeeplink = `anisurge://anime/${animeId}`;

// To link to a specific episode
const episodeDeeplink = `anisurge://anime/watch/${episodeId}`;

// To link to an About page section
const aboutDeeplink = `anisurge://about/${section}`;
```

### About Page Section Links

The About page supports deep linking to specific sections. Available sections are:

1. `about` - General app information
2. `donate` - Support development section
3. `stats` - User statistics
4. `version` - Version information
5. `content` - User content (history, bookmarks, etc.)
6. `device` - Device information
7. `data` - Data management
8. `app` - App settings
9. `developer` - Developer information

Example implementation for sharing About page sections:

```javascript
const shareSectionLink = async (section, sectionName) => {
  try {
    const deepLink = `anisurge://about/${section}`;
    await Share.share({
      message: `Check out the ${sectionName} section in AniSurge: ${deepLink}`,
    });
  } catch (error) {
    console.error('Error sharing section link:', error);
  }
};
```

### Testing Deeplinks

You can test deeplinks using:

1. **ADB (Android Debug Bridge)**:
   ```bash
   # Test anime details
   adb shell am start -a android.intent.action.VIEW -d "anisurge://anime/12345" com.anisurge.app

   # Test about page section
   adb shell am start -a android.intent.action.VIEW -d "anisurge://about/stats" com.anisurge.app
   ```

2. **Browser**:
   Simply enter the deeplink URL in a mobile browser address bar.

### Sharing Content with Deeplinks

The app implements sharing functionality that generates web URLs which can be converted back to deeplinks:

1. When a user shares anime content from the app, it creates a web URL: `https://anisurge.me/share/{animeId}`
2. When a user shares episode content, it creates a web URL: `https://anisurge.me/share/{encodedEpisodeId}` where `encodedEpisodeId` is the URL-encoded full episode ID with token
3. When these URLs are opened on a device with AniSurge installed, they redirect to the app using the `anisurge://` scheme

## Web to App Linking

For users who receive a shared link via the web:

1. The web page at `anisurge.me` detects if the user is on a mobile device
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

### Handling Shared Episode Links

When handling shared episode links, you need to properly decode the episode ID:

```javascript
import { Linking } from 'react-native';
import { router } from 'expo-router';

// Example deep linking handler for shared episodes
const handleDeepLink = (url) => {
  const parsedUrl = Linking.parse(url);
  
  if (parsedUrl.path.includes('share/')) {
    // Extract and decode the episode ID from the path
    const episodeId = decodeURIComponent(parsedUrl.path.replace('share/', ''));
    
    // Extract anime ID from episode ID format: animeId$ep=number$token=xyz
    const animeId = episodeId.split('$')[0];
    
    // Navigate to the watch screen with the full episode ID
    router.push({
      pathname: "/anime/watch/[episodeId]",
      params: { 
        episodeId: episodeId,
        animeId: animeId // Include animeId for better UI experience
      }
    });
  }
};
```

### Enhanced User Experience with Additional Parameters

To provide a better user experience when navigating from shared links, the app now extracts and displays additional information:

1. **Anime Title**: When opening a shared episode link, the app extracts the anime ID from the episode ID and fetches the anime details to display the proper title.

2. **Episode Title**: The app also extracts the episode number and title to display in the header, showing both the anime name and episode information.

Example implementation in the watch screen:

```javascript
// In the episode player screen
useEffect(() => {
  // If animeId is not provided (e.g., from a shared URL), extract it from episodeId
  if (!animeId && typeof episodeId === 'string') {
    // Extract animeId from episodeId format: animeId$ep=number$token=xyz
    const extractedAnimeId = episodeId.split('$')[0];
    if (extractedAnimeId) {
      // Fetch anime info with the extracted ID
      const animeData = await animeAPI.getAnimeDetails(extractedAnimeId);
      
      // Set anime info and episodes
      setAnimeInfo(animeData);
      setEpisodes(animeData.episodes);
    }
  }
}, [episodeId, animeId]);
```

This approach ensures that users get a complete experience even when accessing content through shared links, with proper titles and navigation options.

## Security Considerations

- Deeplinks can potentially expose sensitive functionality, so ensure proper validation of parameters
- Consider implementing authentication checks for sensitive content accessed via deeplinks
- Validate all input parameters from deeplinks before using them in your app logic
- Always URL-encode and decode episode IDs properly as they may contain special characters like `$`, `=`, and other URL-unsafe characters

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
6. For episode links, ensure the episode ID is properly URL-encoded when creating the share URL and properly decoded when handling the deeplink

### Common Episode Sharing Issues

If episode sharing is not working correctly:

1. **Encoding Issues**: Make sure the episode ID is properly URL-encoded using `encodeURIComponent()` when creating the share URL
2. **Decoding Issues**: Ensure the episode ID is properly decoded using `decodeURIComponent()` when handling the deeplink
3. **Token Format**: Verify that the complete episode ID with token is being used (format: `animeId$ep=episodeNumber$token=uniqueToken`)
4. **API Compatibility**: Confirm that the episode ID format matches what the API expects
5. **Missing UI Elements**: If the anime title or episode list is not showing when accessing from a shared link, ensure the app is extracting the anime ID from the episode ID and fetching the necessary data

## Conclusion

Deeplinks using the `anisurge://` scheme provide a powerful way to navigate directly to content within the AniSurge app. By implementing proper deeplink handling, the app offers a seamless experience for users sharing and accessing content across different platforms. 

The updated episode sharing implementation now provides a complete user experience by:
1. Using the full episode ID with token to ensure accurate playback
2. Extracting the anime ID to fetch and display proper anime information
3. Showing both anime title and episode title in the header
4. Providing access to the full episode list for easy navigation

These enhancements ensure that users can enjoy a consistent experience whether they access content through the app's navigation or via shared links. 