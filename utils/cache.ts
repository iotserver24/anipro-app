import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const cacheKeys = {
  HOME_DATA: 'home_data',
  SCHEDULE_DATA: 'schedule_data',
};

export const getCachedData = async (key: string) => {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const isExpired = Date.now() - timestamp > CACHE_EXPIRY;

    if (isExpired) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
};

export const setCachedData = async (key: string, data: any) => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Cache write error:', error);
  }
}; 