import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Updates from 'expo-updates';

interface VersionInfo {
  latestVersion: string;
  minVersion: string;
  versionCode: number;
  changelog: string[];
  downloadUrls: {
    universal: string;
    arm64: string;
    x86_64: string;
    x86: string;
  };
  releaseDate: string;
  isForced: boolean;
  currentAppVersion?: string;
}

const UPDATE_CHECK_KEY = '@anisurge_last_update_check';
const UPDATE_ENDPOINT = 'https://app.animeverse.cc/api/updates';

class UpdateService {
  private currentVersion: string;
  private versionCode: number;

  constructor() {
    this.currentVersion = Constants.expoConfig?.version || '1.0.0';
    this.versionCode = Constants.expoConfig?.android?.versionCode || 1;
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
      if (parts1[i] > parts2[i]) return 1;
      if (parts1[i] < parts2[i]) return -1;
    }
    return 0;
  }

  async checkForUpdates(force: boolean = false): Promise<void> {
    try {
      const lastCheck = await AsyncStorage.getItem(UPDATE_CHECK_KEY);
      const now = Date.now();

      // Check for updates once per day unless forced
      if (!force && lastCheck && now - parseInt(lastCheck) < 24 * 60 * 60 * 1000) {
        return;
      }

      const response = await fetch(UPDATE_ENDPOINT);
      const versionInfo: VersionInfo = await response.json();

      // Set currentAppVersion to our actual app version (overriding any server value)
      // This ensures we're displaying the correct current version in the UI
      versionInfo.currentAppVersion = this.currentVersion;

      // Save last check time
      await AsyncStorage.setItem(UPDATE_CHECK_KEY, now.toString());

      // Check if update is available
      if (this.compareVersions(versionInfo.latestVersion, this.currentVersion) > 0 ||
          versionInfo.versionCode > this.versionCode) {
        
        // Check if current version is below minimum required
        const isRequired = this.compareVersions(this.currentVersion, versionInfo.minVersion) < 0;

        this.showUpdateDialog(versionInfo, isRequired || versionInfo.isForced);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }

  private showUpdateDialog(versionInfo: VersionInfo, isForced: boolean): void {
    const buttons = [
      {
        text: 'Update Now',
        onPress: () => this.startUpdate(versionInfo)
      }
    ];

    if (!isForced) {
      buttons.push({
        text: 'Later',
        style: 'cancel'
      });
    }

    Alert.alert(
      'Update Available',
      `A new version (${versionInfo.latestVersion}) is available!\n\nWhat's New:\n${versionInfo.changelog.map(change => `• ${change}`).join('\n')}`,
      buttons,
      { cancelable: !isForced }
    );
  }

  private async startUpdate(versionInfo: VersionInfo): Promise<void> {
    try {
      // Get device architecture
      const cpu = await FileSystem.getInfoAsync('cpu');
      let downloadUrl = versionInfo.downloadUrls.universal;

      if (cpu.uri.includes('arm64')) {
        downloadUrl = versionInfo.downloadUrls.arm64;
      } else if (cpu.uri.includes('x86_64')) {
        downloadUrl = versionInfo.downloadUrls.x86_64;
      } else if (cpu.uri.includes('x86')) {
        downloadUrl = versionInfo.downloadUrls.x86;
      }

      // Start download
      const downloadPath = `${FileSystem.cacheDirectory}update.apk`;
      const download = FileSystem.createDownloadResumable(
        downloadUrl,
        downloadPath,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          // You can implement a progress bar here
        }
      );

      const { uri } = await download.downloadAsync();

      // Install the update
      if (Platform.OS === 'android') {
        await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
          data: uri,
          flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
          type: 'application/vnd.android.package-archive'
        });
      }
    } catch (error) {
      console.error('Error updating app:', error);
      Alert.alert(
        'Update Failed',
        'Please try downloading the update manually from our website.',
        [
          {
            text: 'Download',
            onPress: () => Linking.openURL('https://app.animeverse.cc')
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    }
  }
}

export const updateService = new UpdateService(); 