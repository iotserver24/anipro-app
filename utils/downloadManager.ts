import { Linking, Platform } from 'react-native';

interface DownloadOptions {
  url: string;
  filename: string;
  quality?: string;
  subtitles?: string[];
}

export const SUPPORTED_DOWNLOADERS = {
  ADM: {
    name: 'ADM',
    packageName: 'com.dv.adm',
    scheme: 'adm'
  },
  IDM: {
    name: '1DM',
    packageName: 'idm.internet.download.manager',
    scheme: 'idm'
  },
  SPLAYER: {
    name: 'Splayer',
    packageName: 'com.animeslayer.slayer',
    scheme: 'splayer'
  }
};

export const downloadWithExternalApp = async (options: DownloadOptions, downloader: string) => {
  const { url, filename, quality, subtitles } = options;

  // Construct download URL with parameters
  let downloadUrl = url;
  if (quality) {
    // Parse m3u8 to get specific quality stream
    // You'll need to implement m3u8 parsing logic here
  }

  // Add subtitle tracks if selected
  const subtitleParams = subtitles?.map(sub => `&subtitle=${sub}`).join('') || '';

  switch (downloader) {
    case 'ADM':
      await Linking.openURL(`adm:${downloadUrl}?filename=${filename}${subtitleParams}`);
      break;
    case 'IDM': 
      await Linking.openURL(`idm:${downloadUrl}?filename=${filename}${subtitleParams}`);
      break;
    case 'SPLAYER':
      await Linking.openURL(`splayer:download?url=${downloadUrl}&name=${filename}${subtitleParams}`);
      break;
    default:
      // Fall back to default download method
      break;
  }
};

export const checkDownloaderAvailability = async () => {
  const available = {};
  
  for (const [key, app] of Object.entries(SUPPORTED_DOWNLOADERS)) {
    try {
      // Try different URL schemes for each app
      let isAvailable = false;
      
      // Different apps might respond to different URL schemes
      const urlsToTry = [
        `${app.scheme}://`,
        `${app.scheme}:`,
        `intent://#Intent;package=${app.packageName};end`
      ];
      
      for (const url of urlsToTry) {
        try {
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            isAvailable = true;
            break;
          }
        } catch (e) {
          // Continue trying other URLs
        }
      }
      
      // If we couldn't detect via URL schemes, try a more direct approach for Android
      if (!isAvailable && Platform.OS === 'android') {
        try {
          // This is a more direct way to check if an app is installed on Android
          // Note: This requires additional setup in AndroidManifest.xml
          const sendIntent = {
            action: 'android.intent.action.VIEW',
            package: app.packageName
          };
          
          // This is a simplified version - in a real app you'd use NativeModules
          // to check if the package is installed
          console.log(`Checking if ${app.packageName} is installed via intent`);
          isAvailable = true; // Assume it's available for now
        } catch (e) {
          console.log(`Error checking ${app.packageName} via intent:`, e);
        }
      }
      
      available[key] = isAvailable;
      console.log(`Downloader ${key} (${app.packageName}) available: ${isAvailable}`);
    } catch (error) {
      console.error(`Error checking availability for ${key}:`, error);
      available[key] = false;
    }
  }

  return available;
};

// Add a direct method to open ADM with a URL
export const openWithADM = async (url: string, filename: string) => {
  try {
    // Try different URL formats for ADM
    const admUrl = `adm:${url}`;
    const admUrlWithParams = `adm:${url}?filename=${encodeURIComponent(filename)}`;
    
    // Log for debugging
    console.log('Attempting to open ADM with URL:', admUrl);
    
    // Try to open with the simple URL first
    const canOpenSimple = await Linking.canOpenURL(admUrl);
    if (canOpenSimple) {
      await Linking.openURL(admUrl);
      return true;
    }
    
    // Try with parameters
    const canOpenWithParams = await Linking.canOpenURL(admUrlWithParams);
    if (canOpenWithParams) {
      await Linking.openURL(admUrlWithParams);
      return true;
    }
    
    // If all else fails, try a more generic approach
    await Linking.openURL(`intent://#Intent;package=com.dv.adm;S.url=${encodeURIComponent(url)};end`);
    return true;
  } catch (error) {
    console.error('Failed to open ADM:', error);
    return false;
  }
};

// Add a direct method to open Splayer with a URL
export const openWithSplayer = async (url: string, filename: string, subtitles: string[] = []) => {
  try {
    console.log('Attempting to open Splayer with URL:', url);
    
    // Remove the scheme (https://) for the intent URI construction
    const urlWithoutScheme = url.replace(/^https?:\/\//, '');
    
    // Construct an intent URI for Splayer
    const intentUri = `intent://${urlWithoutScheme}#Intent;scheme=https;action=android.intent.action.VIEW;type=video/*;package=com.animeslayer.slayer;end`;
    
    // Try to open with the intent URI
    console.log('Using intent URI:', intentUri);
    const canOpen = await Linking.canOpenURL(intentUri);
    
    if (canOpen) {
      await Linking.openURL(intentUri);
      return true;
    } else {
      // Try alternative package name
      const alternativeIntentUri = `intent://${urlWithoutScheme}#Intent;scheme=https;action=android.intent.action.VIEW;type=video/*;package=com.simplemobiletools.splayer;end`;
      
      console.log('Trying alternative package:', alternativeIntentUri);
      const canOpenAlt = await Linking.canOpenURL(alternativeIntentUri);
      
      if (canOpenAlt) {
        await Linking.openURL(alternativeIntentUri);
        return true;
      }
      
      // If we can't open with intent, try direct URL schemes
      const directSchemes = [
        `splayer://play?url=${encodeURIComponent(url)}`,
        `animeslayer://play?url=${encodeURIComponent(url)}`
      ];
      
      for (const scheme of directSchemes) {
        try {
          console.log('Trying direct scheme:', scheme);
          const canOpenDirect = await Linking.canOpenURL(scheme);
          if (canOpenDirect) {
            await Linking.openURL(scheme);
            return true;
          }
        } catch (e) {
          console.log(`Failed with direct scheme ${scheme}:`, e);
        }
      }
      
      // If all else fails, try to open the Play Store
      console.log('All Splayer URL schemes failed, opening Play Store');
      await Linking.openURL(`market://details?id=${SUPPORTED_DOWNLOADERS.SPLAYER.packageName}`);
      return false;
    }
  } catch (error) {
    console.error('Failed to open Splayer:', error);
    
    // As a last resort, try a simpler approach
    try {
      const simpleIntent = `intent://com.animeslayer.slayer#Intent;scheme=https;action=android.intent.action.VIEW;end`;
      await Linking.openURL(simpleIntent);
      return true;
    } catch (e) {
      console.error('Simple intent also failed:', e);
      return false;
    }
  }
}; 