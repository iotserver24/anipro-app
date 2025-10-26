/**
 * UNIFIED THEME CONTEXT
 * 
 * This context provides theme management for the entire app.
 * All components can access and modify themes through this context.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { THEMES, DEFAULT_THEME, getTheme, Theme } from '../constants/themes';

interface CustomBackgroundMedia {
  type: 'image' | 'video';
  uri: string;
  size: number;
  opacity?: number;
}

interface ThemeContextType {
  // Current theme
  currentTheme: string;
  theme: Theme;
  
  // Theme management
  changeTheme: (themeName: string) => Promise<void>;
  availableThemes: string[];
  
  // Background media support
  hasBackgroundMedia: boolean;
  backgroundMedia: {
    image?: string;
    video?: string;
    opacity: number;
  };
  
  // Custom background media for Immersive theme
  customBackgroundMedia?: CustomBackgroundMedia;
  setCustomBackgroundMedia: (media: CustomBackgroundMedia | null) => Promise<void>;
  updateCustomBackgroundOpacity: (opacity: number) => Promise<void>;
  
  // Global custom background media for all themes
  globalCustomBackground?: CustomBackgroundMedia;
  setGlobalCustomBackground: (media: CustomBackgroundMedia | null) => Promise<void>;
  updateGlobalCustomBackgroundOpacity: (opacity: number) => Promise<void>;
  
  // Loading state
  isLoading: boolean;
  
  // Theme utilities
  isDark: boolean;
  statusBarStyle: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<string>(DEFAULT_THEME);
  const [customBackgroundMedia, setCustomBackgroundMediaState] = useState<CustomBackgroundMedia | undefined>(undefined);
  const [globalCustomBackground, setGlobalCustomBackgroundState] = useState<CustomBackgroundMedia | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Get current theme object
  const theme = getTheme(currentTheme);
  
  // Check if current theme has background media (including custom media for immersive theme and global custom background)
  const hasBackgroundMedia = !!(
    theme.colors.backgroundImage || 
    theme.colors.backgroundVideo || 
    (currentTheme === 'immersive' && customBackgroundMedia?.uri) ||
    globalCustomBackground?.uri
  );
  
  // Get background media info (prioritize global custom background, then immersive custom media, then theme defaults)
  const backgroundMedia = {
    image: globalCustomBackground?.type === 'image' 
      ? globalCustomBackground.uri 
      : (currentTheme === 'immersive' && customBackgroundMedia?.type === 'image' 
        ? customBackgroundMedia.uri 
        : theme.colors.backgroundImage),
    video: globalCustomBackground?.type === 'video' 
      ? globalCustomBackground.uri 
      : (currentTheme === 'immersive' && customBackgroundMedia?.type === 'video' 
        ? customBackgroundMedia.uri 
        : theme.colors.backgroundVideo),
    opacity: globalCustomBackground?.opacity !== undefined
      ? globalCustomBackground.opacity
      : (currentTheme === 'immersive' && customBackgroundMedia?.opacity !== undefined
        ? customBackgroundMedia.opacity
        : theme.colors.backgroundOpacity || 1),
  };

  // Debug logging (commented out for production)
  // console.log('Theme Context Debug:', {
  //   currentTheme,
  //   customBackgroundMedia,
  //   backgroundMedia,
  //   hasBackgroundMedia
  // });

  // Load saved theme on app start
  useEffect(() => {
    loadTheme();
  }, []);

  // Cleanup orphaned theme images on app start
  const cleanupOrphanedImages = async () => {
    try {
      const documentDir = FileSystem.documentDirectory;
      if (!documentDir) return;

      const themesDir = documentDir + 'themes/';
      const dirInfo = await FileSystem.getInfoAsync(themesDir);
      
      if (dirInfo.exists) {
        const files = await FileSystem.readDirectoryAsync(themesDir);
        const currentImmersiveImageUri = customBackgroundMedia?.uri;
        const currentGlobalImageUri = globalCustomBackground?.uri;
        
        // Delete files that are not the current custom background images
        for (const file of files) {
          const fileUri = themesDir + file;
          if (fileUri !== currentImmersiveImageUri && fileUri !== currentGlobalImageUri) {
            try {
              await FileSystem.deleteAsync(fileUri, { idempotent: true });
            } catch (error) {
              console.error('Error deleting orphaned image:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error during orphaned image cleanup:', error);
    }
  };

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('selectedTheme');
      if (savedTheme && THEMES[savedTheme]) {
        setCurrentTheme(savedTheme);
      }
      
      // Load custom background media for immersive theme
      const savedCustomMedia = await AsyncStorage.getItem('customBackgroundMedia');
      if (savedCustomMedia) {
        setCustomBackgroundMediaState(JSON.parse(savedCustomMedia));
      }
      
      // Load global custom background media
      const savedGlobalCustomMedia = await AsyncStorage.getItem('globalCustomBackground');
      if (savedGlobalCustomMedia) {
        setGlobalCustomBackgroundState(JSON.parse(savedGlobalCustomMedia));
      }
      
      // Cleanup orphaned images after loading theme data
      await cleanupOrphanedImages();
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeTheme = async (themeName: string) => {
    if (THEMES[themeName]) {
      setCurrentTheme(themeName);
      try {
        await AsyncStorage.setItem('selectedTheme', themeName);
      } catch (error) {
        console.error('Error saving theme:', error);
      }
    }
  };

  const setCustomBackgroundMedia = async (media: CustomBackgroundMedia | null) => {
    try {
      // Clean up old image file if it exists and we're setting a new one
      if (media && customBackgroundMedia?.uri && customBackgroundMedia.uri !== media.uri) {
        try {
          // Only delete if it's a file URI (our copied image)
          if (customBackgroundMedia.uri.startsWith('file://')) {
            await FileSystem.deleteAsync(customBackgroundMedia.uri, { idempotent: true });
          }
        } catch (cleanupError) {
          console.error('Error cleaning up old image:', cleanupError);
          // Continue with setting new media even if cleanup fails
        }
      }

      if (media) {
        setCustomBackgroundMediaState(media);
        await AsyncStorage.setItem('customBackgroundMedia', JSON.stringify(media));
      } else {
        // Clean up current image file when removing media
        if (customBackgroundMedia?.uri && customBackgroundMedia.uri.startsWith('file://')) {
          try {
            await FileSystem.deleteAsync(customBackgroundMedia.uri, { idempotent: true });
          } catch (cleanupError) {
            console.error('Error cleaning up image on removal:', cleanupError);
          }
        }
        setCustomBackgroundMediaState(undefined);
        await AsyncStorage.removeItem('customBackgroundMedia');
      }
    } catch (error) {
      console.error('Error saving custom background media:', error);
    }
  };

  const updateCustomBackgroundOpacity = async (opacity: number) => {
    try {
      if (customBackgroundMedia) {
        const updatedMedia = { ...customBackgroundMedia, opacity };
        setCustomBackgroundMediaState(updatedMedia);
        await AsyncStorage.setItem('customBackgroundMedia', JSON.stringify(updatedMedia));
      }
    } catch (error) {
      console.error('Error updating background opacity:', error);
    }
  };

  const setGlobalCustomBackground = async (media: CustomBackgroundMedia | null) => {
    try {
      // Clean up old global image file if it exists and we're setting a new one
      if (media && globalCustomBackground?.uri && globalCustomBackground.uri !== media.uri) {
        try {
          // Only delete if it's a file URI (our copied image)
          if (globalCustomBackground.uri.startsWith('file://')) {
            await FileSystem.deleteAsync(globalCustomBackground.uri, { idempotent: true });
          }
        } catch (cleanupError) {
          console.error('Error cleaning up old global image:', cleanupError);
          // Continue with setting new media even if cleanup fails
        }
      }

      if (media) {
        setGlobalCustomBackgroundState(media);
        await AsyncStorage.setItem('globalCustomBackground', JSON.stringify(media));
      } else {
        // Clean up current global image file when removing media
        if (globalCustomBackground?.uri && globalCustomBackground.uri.startsWith('file://')) {
          try {
            await FileSystem.deleteAsync(globalCustomBackground.uri, { idempotent: true });
          } catch (cleanupError) {
            console.error('Error cleaning up global image on removal:', cleanupError);
          }
        }
        setGlobalCustomBackgroundState(undefined);
        await AsyncStorage.removeItem('globalCustomBackground');
      }
    } catch (error) {
      console.error('Error saving global custom background media:', error);
    }
  };

  const updateGlobalCustomBackgroundOpacity = async (opacity: number) => {
    try {
      if (globalCustomBackground) {
        const updatedMedia = { ...globalCustomBackground, opacity };
        setGlobalCustomBackgroundState(updatedMedia);
        await AsyncStorage.setItem('globalCustomBackground', JSON.stringify(updatedMedia));
      }
    } catch (error) {
      console.error('Error updating global background opacity:', error);
    }
  };

  const value: ThemeContextType = {
    currentTheme,
    theme,
    changeTheme,
    availableThemes: Object.keys(THEMES),
    hasBackgroundMedia,
    backgroundMedia,
    customBackgroundMedia,
    setCustomBackgroundMedia,
    updateCustomBackgroundOpacity,
    globalCustomBackground,
    setGlobalCustomBackground,
    updateGlobalCustomBackgroundOpacity,
    isLoading,
    isDark: theme.isDark,
    statusBarStyle: theme.statusBarStyle,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme context
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Export theme utilities for direct use
export { THEMES, getTheme, getAllThemes, getThemeNames } from '../constants/themes';
