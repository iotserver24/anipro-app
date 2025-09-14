/**
 * Theme System for AniSurge
 * 
 * This file defines all available themes and their color palettes.
 * Each theme includes colors for backgrounds, text, surfaces, and accents.
 */

export interface ThemeColors {
  // Primary colors
  primary: string;
  secondary: string;
  
  // Background colors
  background: string;
  surface: string;
  card: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textMuted: string;
  
  // UI colors
  border: string;
  accent: string;
  error: string;
  warning: string;
  success: string;
  
  // Special colors
  overlay: string;
  shadow: string;
  
  // Status colors
  online: string;
  offline: string;
  
  // Badge colors
  premium: string;
  supporter: string;
}

export interface Theme {
  name: string;
  colors: ThemeColors;
}

export const THEMES: Record<string, Theme> = {
  dark: {
    name: 'Dark',
    colors: {
      // Primary colors
      primary: '#f4511e',
      secondary: '#d44117',
      
      // Background colors
      background: '#121212',
      surface: '#1a1a1a',
      card: '#2C2C2C',
      
      // Text colors
      text: '#ffffff',
      textSecondary: '#cccccc',
      textMuted: '#666666',
      
      // UI colors
      border: '#333333',
      accent: '#4CAF50',
      error: '#FF5252',
      warning: '#FF9800',
      success: '#4CAF50',
      
      // Special colors
      overlay: 'rgba(0, 0, 0, 0.7)',
      shadow: '#000000',
      
      // Status colors
      online: '#4CAF50',
      offline: '#666666',
      
      // Badge colors
      premium: '#FFD700',
      supporter: '#f4511e',
    }
  },
  
  light: {
    name: 'Light',
    colors: {
      // Primary colors
      primary: '#f4511e',
      secondary: '#d44117',
      
      // Background colors
      background: '#ffffff',
      surface: '#f5f5f5',
      card: '#ffffff',
      
      // Text colors
      text: '#000000',
      textSecondary: '#666666',
      textMuted: '#999999',
      
      // UI colors
      border: '#e0e0e0',
      accent: '#4CAF50',
      error: '#FF5252',
      warning: '#FF9800',
      success: '#4CAF50',
      
      // Special colors
      overlay: 'rgba(0, 0, 0, 0.5)',
      shadow: '#000000',
      
      // Status colors
      online: '#4CAF50',
      offline: '#999999',
      
      // Badge colors
      premium: '#FFD700',
      supporter: '#f4511e',
    }
  },
  
  anime: {
    name: 'Anime',
    colors: {
      // Primary colors
      primary: '#FF6B9D',
      secondary: '#C44569',
      
      // Background colors
      background: '#2D1B69',
      surface: '#3D2B7A',
      card: '#4A3B8A',
      
      // Text colors
      text: '#FFEAA7',
      textSecondary: '#DDA0DD',
      textMuted: '#B19CD9',
      
      // UI colors
      border: '#6C5CE7',
      accent: '#00CEC9',
      error: '#FF7675',
      warning: '#FDCB6E',
      success: '#00CEC9',
      
      // Special colors
      overlay: 'rgba(45, 27, 105, 0.8)',
      shadow: '#1A0B3D',
      
      // Status colors
      online: '#00CEC9',
      offline: '#B19CD9',
      
      // Badge colors
      premium: '#FFD700',
      supporter: '#FF6B9D',
    }
  },
  
  cyberpunk: {
    name: 'Cyberpunk',
    colors: {
      // Primary colors
      primary: '#00FFFF',
      secondary: '#FF00FF',
      
      // Background colors
      background: '#0D1117',
      surface: '#161B22',
      card: '#21262D',
      
      // Text colors
      text: '#00FFFF',
      textSecondary: '#58A6FF',
      textMuted: '#7D8590',
      
      // UI colors
      border: '#30363D',
      accent: '#00FF00',
      error: '#FF0000',
      warning: '#FFFF00',
      success: '#00FF00',
      
      // Special colors
      overlay: 'rgba(13, 17, 23, 0.9)',
      shadow: '#000000',
      
      // Status colors
      online: '#00FF00',
      offline: '#7D8590',
      
      // Badge colors
      premium: '#FFD700',
      supporter: '#00FFFF',
    }
  }
};

/**
 * Get theme by name
 */
export const getTheme = (themeName: string): Theme => {
  return THEMES[themeName] || THEMES.dark;
};

/**
 * Get all available theme names
 */
export const getAvailableThemes = (): string[] => {
  return Object.keys(THEMES);
};

/**
 * Check if theme exists
 */
export const isValidTheme = (themeName: string): boolean => {
  return themeName in THEMES;
};
