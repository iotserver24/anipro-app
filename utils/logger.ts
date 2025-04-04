import { Platform, NativeModules } from 'react-native';

// Determine if running on a device (vs simulator/emulator)
const isDevice = !NativeModules.DevSettings?.isRemoteDebuggingAvailable || true;

// Log level to control verbosity - can be updated at runtime
let currentLogLevel = 'INFO'; // DEBUG, INFO, WARN, ERROR
let minimalMode = true; // When true, reduces amount of logging

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
   * Set the current log level
   */
  setLogLevel: (level: string) => {
    currentLogLevel = level;
  },

  /**
   * Set minimal logging mode
   */
  setMinimalMode: (minimal: boolean) => {
    minimalMode = minimal;
  },

  /**
   * Debug logging - only shown in development or when debug is enabled
   */
  debug: (category: string, message: string, ...args: any[]) => {
    if (minimalMode || currentLogLevel === 'INFO' || currentLogLevel === 'WARN' || currentLogLevel === 'ERROR') {
      return;
    }
    console.log(`[${category}] 🔍 DEBUG: ${message}`, ...args);
  },

  /**
   * Information logging
   */
  info: (category: string, message: string, ...args: any[]) => {
    if (minimalMode || currentLogLevel === 'WARN' || currentLogLevel === 'ERROR') {
      return;
    }
    console.log(`[${category}] ℹ️ INFO: ${message}`, ...args);
  },

  /**
   * Warning logging
   */
  warn: (category: string, message: string, ...args: any[]) => {
    if (currentLogLevel === 'ERROR') {
      return;
    }
    console.warn(`[${category}] ⚠️ WARN: ${message}`, ...args);
  },

  /**
   * Error logging - always shown
   */
  error: (category: string, message: string, ...args: any[]) => {
    console.error(`[${category}] 🛑 ERROR: ${message}`, ...args);
  },

  /**
   * UI event logging - specifically for tracking UI interactions like clicks
   * (disabled in minimal mode)
   */
  uiEvent: (component: string, action: string, details?: any) => {
    if (minimalMode) {
      return;
    }
    console.log(`[UI] ${component} - ${action}`, details || '');
  },

  /**
   * Profile modal specific logging (reduced in minimal mode)
   */
  profileModal: {
    open: (userId: string) => {
      if (minimalMode) return;
      console.log(`[PROFILE_MODAL] 🔎 Opening profile for user: ${userId}`);
    },
    close: (userId: string) => {
      if (minimalMode) return;
      console.log(`[PROFILE_MODAL] 🚪 Closing profile for user: ${userId}`);
    },
    dataFetch: (userId: string, success: boolean, data?: any) => {
      if (minimalMode) {
        if (!success) {
          console.error(`[PROFILE_MODAL] ❌ Failed to fetch data for user: ${userId}`);
        }
        return;
      }
      
      if (success) {
        console.log(`[PROFILE_MODAL] ✅ Data fetched for user: ${userId}`, data);
      } else {
        console.error(`[PROFILE_MODAL] ❌ Failed to fetch data for user: ${userId}`, data);
      }
    }
  }
}; 