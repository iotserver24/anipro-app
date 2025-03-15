/**
 * App Configuration
 * 
 * This file serves as a central place to store app-wide configuration values.
 * Update these values when releasing a new version of the app.
 */

export const APP_CONFIG = {
  // App Information
  APP_NAME: 'AniSurge',
  VERSION: '2.9.7',
  VERSION_CODE: 6,
  
  // API Endpoints
  API_BASE_URL: 'https://app.animeverse.cc/api',
  
  // Branding
  PRIMARY_COLOR: '#f4511e',
  SECONDARY_COLOR: '#d44117',
  
  // Contact Information
  SUPPORT_EMAIL: 'support@animeverse.cc',
  
  // External Links
  WEBSITE_URL: 'https://app.animeverse.cc',
  DOWNLOAD_URL: 'https://app.animeverse.cc',
  
  // Cache Keys
  CACHE_KEYS: {
    TRENDING_RECENT: 'home_trending_recent_cache',
    NEW_EPISODES: 'home_new_episodes_cache',
  },
  
  // Default User Preferences
  DEFAULT_PREFERENCES: {
    theme: 'dark',
    autoPlayNextEpisode: true,
    videoQuality: 'auto',
    downloadQuality: '720p',
    subtitleLanguage: 'english',
    notificationsEnabled: true,
    dataUsageOptimization: true,
  },
};

/**
 * Helper function to get the app version string
 * @returns Formatted version string (e.g., "1.0.0")
 */
export const getAppVersion = (): string => {
  return APP_CONFIG.VERSION;
};

/**
 * Helper function to get the app version code
 * @returns Version code as a number
 */
export const getAppVersionCode = (): number => {
  return APP_CONFIG.VERSION_CODE;
};

/**
 * Helper function to get the app name
 * @returns App name string
 */
export const getAppName = (): string => {
  return APP_CONFIG.APP_NAME;
};

export default APP_CONFIG; 