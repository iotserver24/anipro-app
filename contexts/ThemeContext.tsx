import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, Theme, getTheme } from '../constants/themes';

interface ThemeContextType {
  currentTheme: string;
  theme: Theme;
  changeTheme: (themeName: string) => Promise<void>;
  availableThemes: string[];
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<string>('dark');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('selectedTheme');
      if (savedTheme && THEMES[savedTheme]) {
        setCurrentTheme(savedTheme);
      } else {
        // Use default theme from app config
        setCurrentTheme('dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
      setCurrentTheme('dark');
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

  const value: ThemeContextType = {
    currentTheme,
    theme: getTheme(currentTheme),
    changeTheme,
    availableThemes: Object.keys(THEMES),
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export default ThemeContext;
