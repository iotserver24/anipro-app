import { Platform, NativeModules } from 'react-native';

// Determine if running on a device (vs simulator/emulator)
const isDevice = !NativeModules.DevSettings?.isRemoteDebuggingAvailable || true;

/**
 * Enhanced logger utility with support for different log levels and categories
 */
export const logger = {
  /**
   * Log levels
   */
  levels: {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
  },

  /**
   * Debug logging - only shown in development or when debug is enabled
   */
  debug: (category: string, message: string, ...args: any[]) => {
    console.log(`[${category}] 🔍 DEBUG: ${message}`, ...args);
  },

  /**
   * Information logging
   */
  info: (category: string, message: string, ...args: any[]) => {
    console.log(`[${category}] ℹ️ INFO: ${message}`, ...args);
  },

  /**
   * Warning logging
   */
  warn: (category: string, message: string, ...args: any[]) => {
    console.warn(`[${category}] ⚠️ WARN: ${message}`, ...args);
  },

  /**
   * Error logging
   */
  error: (category: string, message: string, ...args: any[]) => {
    console.error(`[${category}] 🛑 ERROR: ${message}`, ...args);
  },

  /**
   * UI event logging - specifically for tracking UI interactions like clicks
   */
  uiEvent: (component: string, action: string, details?: any) => {
    console.log(`[UI] ${component} - ${action}`, details || '');
  },

  /**
   * Profile modal specific logging
   */
  profileModal: {
    open: (userId: string) => {
      console.log(`[PROFILE_MODAL] 🔎 Opening profile for user: ${userId}`);
    },
    close: (userId: string) => {
      console.log(`[PROFILE_MODAL] 🚪 Closing profile for user: ${userId}`);
    },
    dataFetch: (userId: string, success: boolean, data?: any) => {
      if (success) {
        console.log(`[PROFILE_MODAL] ✅ Data fetched for user: ${userId}`, data);
      } else {
        console.error(`[PROFILE_MODAL] ❌ Failed to fetch data for user: ${userId}`, data);
      }
    }
  }
}; 