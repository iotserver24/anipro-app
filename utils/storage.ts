import { MMKV } from 'react-native-mmkv';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

// Create storage instance with fallback
let storage: MMKV | null = null;
let usingFallback = false;

try {
  storage = new MMKV({
    id: 'anipro-storage',
    encryptionKey: 'anipro-secure-key'
  });
  console.log('[DEBUG] Storage: MMKV initialized successfully');
} catch (error) {
  //console.error('[DEBUG] Storage: Failed to initialize MMKV, falling back to AsyncStorage', error);
  usingFallback = true;
}

/**
 * Get a value from storage
 * @param key The key to get
 * @returns The value or null if not found
 */
export const getItem = async <T>(key: string): Promise<T | null> => {
  try {
    if (usingFallback) {
      // AsyncStorage fallback
      const value = await AsyncStorage.getItem(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } else if (storage) {
      // MMKV storage
      const value = storage.getString(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    }
    return null;
  } catch (error) {
    logger.error(`Error getting item from storage: ${key}`, error);
    return null;
  }
};

/**
 * Set a value in storage
 * @param key The key to set
 * @param value The value to set
 * @returns true if successful, false otherwise
 */
export const setItem = async <T>(key: string, value: T): Promise<boolean> => {
  try {
    const jsonValue = JSON.stringify(value);
    if (usingFallback) {
      // AsyncStorage fallback
      await AsyncStorage.setItem(key, jsonValue);
    } else if (storage) {
      // MMKV storage
      storage.set(key, jsonValue);
    }
    return true;
  } catch (error) {
    logger.error(`Error setting item in storage: ${key}`, error);
    return false;
  }
};

/**
 * Remove a value from storage
 * @param key The key to remove
 * @returns true if successful, false otherwise
 */
export const removeItem = async (key: string): Promise<boolean> => {
  try {
    if (usingFallback) {
      // AsyncStorage fallback
      await AsyncStorage.removeItem(key);
    } else if (storage) {
      // MMKV storage
      storage.delete(key);
    }
    return true;
  } catch (error) {
    logger.error(`Error removing item from storage: ${key}`, error);
    return false;
  }
};

/**
 * Clear all values from storage
 * @returns true if successful, false otherwise
 */
export const clearAll = async (): Promise<boolean> => {
  try {
    if (usingFallback) {
      // AsyncStorage fallback
      await AsyncStorage.clear();
    } else if (storage) {
      // MMKV storage
      storage.clearAll();
    }
    return true;
  } catch (error) {
    logger.error('Error clearing storage', error);
    return false;
  }
};

/**
 * Get all keys from storage
 * @returns Array of keys
 */
export const getAllKeys = async (): Promise<string[]> => {
  try {
    if (usingFallback) {
      // AsyncStorage fallback
      return await AsyncStorage.getAllKeys();
    } else if (storage) {
      // MMKV storage
      return storage.getAllKeys();
    }
    return [];
  } catch (error) {
    logger.error('Error getting all keys from storage', error);
    return [];
  }
};

export default {
  getItem,
  setItem,
  removeItem,
  clearAll,
  getAllKeys,
  isUsingFallback: () => usingFallback
}; 