import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';

const STATS_ENDPOINT = 'https://app.animeverse.cc/api/stats';
const INSTALL_KEY = '@anisurge_install_id';
const LAST_ACTIVE_KEY = '@anisurge_last_active';

class StatsService {
  private installId: string | null = null;

  constructor() {
    this.initInstallId();
  }

  private async initInstallId() {
    try {
      let id = await AsyncStorage.getItem(INSTALL_KEY);
      if (!id) {
        id = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
        await AsyncStorage.setItem(INSTALL_KEY, id);
      }
      this.installId = id;
    } catch (error) {
      console.error('Failed to initialize install ID:', error);
    }
  }

  async trackInstall() {
    try {
      const deviceInfo = {
        brand: await DeviceInfo.getBrand(),
        model: await DeviceInfo.getModel(),
        systemVersion: await DeviceInfo.getSystemVersion(),
        isTablet: await DeviceInfo.isTablet(),
        architecture: await this.getDeviceArchitecture(),
      };

      await fetch(`${STATS_ENDPOINT}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installId: this.installId,
          deviceInfo,
          timestamp: Date.now(),
        }),
      });
    } catch (error) {
      console.error('Failed to track install:', error);
    }
  }

  async trackActivity() {
    try {
      const lastActive = await AsyncStorage.getItem(LAST_ACTIVE_KEY);
      const now = Date.now();
      
      // Only track activity once per day
      if (!lastActive || now - parseInt(lastActive) > 24 * 60 * 60 * 1000) {
        await fetch(`${STATS_ENDPOINT}/activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            installId: this.installId,
            timestamp: now,
          }),
        });
        await AsyncStorage.setItem(LAST_ACTIVE_KEY, now.toString());
      }
    } catch (error) {
      console.error('Failed to track activity:', error);
    }
  }

  private async getDeviceArchitecture(): Promise<string> {
    try {
      const cpu = await DeviceInfo.supportedAbis();
      if (cpu.includes('arm64-v8a')) return 'arm64';
      if (cpu.includes('x86_64')) return 'x86_64';
      if (cpu.includes('x86')) return 'x86';
      return 'universal';
    } catch {
      return 'universal';
    }
  }
}

export const statsService = new StatsService(); 