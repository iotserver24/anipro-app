// Delete this file - it's not needed with Expo Router

import { useEffect } from 'react';
import { Alert, Linking, AppState } from 'react-native';
import { useWatchHistoryStore } from './store/watchHistoryStore';
import Constants from 'expo-constants';
import { statsService } from './services/stats';
import { updateService } from './services/updateService';

export default function App() {
  const initializeHistory = useWatchHistoryStore(state => state.initializeHistory);

  const compareVersions = (v1: string, v2: string) => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
      if (parts1[i] > parts2[i]) return 1;
      if (parts1[i] < parts2[i]) return -1;
    }
    return 0;
  };

  const checkForUpdates = async () => {
    try {
      // Replace YOUR_USERNAME with your actual GitHub username
      const response = await fetch('https://raw.githubusercontent.com/YOUR_USERNAME/anisurge-releases/main/version.json');
      const data = await response.json();
      
      const currentVersion = Constants.expoConfig?.version || '1.0.0';
      const currentVersionCode = Constants.expoConfig?.android?.versionCode || 1;
      
      if (compareVersions(data.latestVersion, currentVersion) > 0 || data.versionCode > currentVersionCode) {
        Alert.alert(
          'Update Available',
          `A new version (${data.latestVersion}) of AniSurge is available!\n\n${data.notes}`,
          [
            {
              text: 'Download',
              onPress: () => Linking.openURL(data.downloadUrl)
            },
            {
              text: 'Later',
              style: 'cancel'
            }
          ]
        );
      }
    } catch (error) {
      console.log('Error checking for updates:', error);
    }
  };

  useEffect(() => {
    // Initialize watch history
    initializeHistory();

    // Check for updates on app start
    updateService.checkForUpdates();

    // Set up periodic update checks when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        updateService.checkForUpdates();
        statsService.trackActivity();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // Track app install and initial activity
    statsService.trackInstall();
    statsService.trackActivity();
  }, []);

  // ... rest of your App component
}
