import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Get the current app version information
 * 
 * @returns {Object} An object containing version information
 * - version: The semantic version string (e.g., "2.9.8")
 * - buildNumber: The build number (versionCode on Android)
 * - isLatestVersion: Function to compare with a remote version
 */
export const getAppVersion = () => {
  const version = Constants.expoConfig.version || '0.0.0';
  const buildNumber = Platform.OS === 'ios' 
    ? Constants.expoConfig.ios?.buildNumber || '0' 
    : Constants.expoConfig.android?.versionCode || 0;

  return {
    version,
    buildNumber,
    /**
     * Compare current version with remote version
     * @param {string} remoteVersion - The version to compare with (e.g., "2.9.8")
     * @returns {boolean} True if current version is greater or equal to remote version
     */
    isLatestVersion: (remoteVersion) => {
      if (!remoteVersion) return true;
      
      const current = version.split('.').map(Number);
      const remote = remoteVersion.split('.').map(Number);
      
      // Compare major version
      if (current[0] > remote[0]) return true;
      if (current[0] < remote[0]) return false;
      
      // Major versions are equal, compare minor version
      if (current[1] > remote[1]) return true;
      if (current[1] < remote[1]) return false;
      
      // Minor versions are equal, compare patch version
      return current[2] >= remote[2];
    }
  };
};

/**
 * Example usage in a React component:
 * 
 * import { getAppVersion } from '../utils/appVersion';
 * 
 * const MyComponent = () => {
 *   const { version, buildNumber } = getAppVersion();
 *   
 *   return (
 *     <View>
 *       <Text>App Version: {version} (Build {buildNumber})</Text>
 *     </View>
 *   );
 * };
 * 
 * // To check if an update is required:
 * const checkForUpdates = async () => {
 *   const { isLatestVersion } = getAppVersion();
 *   const response = await fetch('https://your-api.com/app-version');
 *   const { latestVersion } = await response.json();
 *   
 *   if (!isLatestVersion(latestVersion)) {
 *     // Show update prompt
 *   }
 * };
 */ 