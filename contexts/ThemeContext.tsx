/**
 * UNIFIED THEME CONTEXT
 * 
 * This context provides theme management for the entire app.
 * All components can access and modify themes through this context.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Get current theme object
  const theme = getTheme(currentTheme);
  
  // Check if current theme has background media (including custom media for immersive theme)
  const hasBackgroundMedia = !!(
    theme.colors.backgroundImage || 
    theme.colors.backgroundVideo || 
    (currentTheme === 'immersive' && customBackgroundMedia?.uri)
  );
  
  // Get background media info (prioritize custom media for immersive theme)
  const backgroundMedia = {
    image: currentTheme === 'immersive' && customBackgroundMedia?.type === 'image' 
      ? customBackgroundMedia.uri 
      : theme.colors.backgroundImage,
    video: currentTheme === 'immersive' && customBackgroundMedia?.type === 'video' 
      ? customBackgroundMedia.uri 
      : theme.colors.backgroundVideo,
    opacity: currentTheme === 'immersive' && customBackgroundMedia?.opacity !== undefined
      ? customBackgroundMedia.opacity
      : theme.colors.backgroundOpacity || 1,
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

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('selectedTheme');
      if (savedTheme && THEMES[savedTheme]) {
        setCurrentTheme(savedTheme);
      }
      
      // Load custom background media
      const savedCustomMedia = await AsyncStorage.getItem('customBackgroundMedia');
      if (savedCustomMedia) {
        setCustomBackgroundMediaState(JSON.parse(savedCustomMedia));
      }
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
      if (media) {
        setCustomBackgroundMediaState(media);
        await AsyncStorage.setItem('customBackgroundMedia', JSON.stringify(media));
      } else {
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
