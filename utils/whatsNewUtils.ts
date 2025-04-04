import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppVersion, APP_CONFIG } from '../constants/appConfig';
import { logger } from './logger';

// Key for storing the last shown version
export const LAST_SHOWN_VERSION_KEY = 'whats_new_last_shown_version';

interface ChangelogItem {
  type: 'text' | 'image' | 'video' | 'url';
  content: string;
  title?: string;
  description?: string;
  format?: 'bold' | 'italic' | 'normal';
}

export interface WhatsNewInfo {
  version: string;
  changelog: ChangelogItem[];
  releaseDate: string;
}

/**
 * Checks if the "What's New" modal should be shown
 * @returns Promise<boolean> - True if the modal should be shown
 */
export const shouldShowWhatsNew = async (): Promise<boolean> => {
  try {
    // Get the current app version
    const currentVersion = getAppVersion();
    
    // Get the last shown version
    const lastShownVersion = await AsyncStorage.getItem(LAST_SHOWN_VERSION_KEY);
    
    // If this is the first time the app is run or the version has changed
    if (!lastShownVersion || lastShownVersion !== currentVersion) {
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('Error checking if "What\'s New" modal should be shown:', error);
    return false;
  }
};

/**
 * Fetches the "What's New" information from the API
 * @returns Promise<WhatsNewInfo | null> - The "What's New" information or null if there was an error
 */
export const fetchWhatsNewInfo = async (): Promise<WhatsNewInfo | null> => {
  try {
    // First try to get the update info from the API
    const response = await fetch(`${APP_CONFIG.API_BASE_URL}/updates`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch "What's New" information: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if the data has the required fields
    if (!data || !data.latestVersion || !data.changelog) {
      logger.error('Invalid "What\'s New" data received:', data);
      return null;
    }
    
    // Handle legacy format (string[] instead of ChangelogItem[])
    let changelog = data.changelog;
    if (Array.isArray(changelog) && changelog.length > 0 && typeof changelog[0] === 'string') {
      changelog = (changelog as unknown as string[]).map(item => ({
        type: 'text',
        content: item,
        format: 'normal'
      }));
    }
    
    // Return the "What's New" information
    return {
      version: getAppVersion(), // Use the current app version
      changelog: changelog,
      releaseDate: data.releaseDate || new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error fetching "What\'s New" information:', error);
    
    // If there was an error, return a default "What's New" information
    return {
      version: getAppVersion(),
      changelog: [
        {
          type: 'text',
          content: 'Welcome to the latest version of the app!',
          format: 'bold'
        },
        {
          type: 'text',
          content: 'We\'re constantly working to improve your experience.',
          format: 'normal'
        }
      ],
      releaseDate: new Date().toISOString()
    };
  }
};

/**
 * Marks the current version as shown
 */
export const markVersionAsShown = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(LAST_SHOWN_VERSION_KEY, getAppVersion());
  } catch (error) {
    logger.error('Error marking version as shown:', error);
  }
}; 