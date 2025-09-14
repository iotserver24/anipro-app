/**
 * UNIFIED THEME SYSTEM
 * 
 * This is the SINGLE FILE that controls the entire app's theme.
 * Add new themes, colors, or modify existing ones here.
 * The entire app will automatically use these settings.
 */

export interface ThemeColors {
  // Primary Colors
  primary: string;
  secondary: string;
  accent: string;
  
  // Background Colors
  background: string;
  surface: string;
  card: string;
  overlay: string;
  
  // Text Colors
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  
  // Border & Divider Colors
  border: string;
  divider: string;
  
  // Status Colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Interactive Colors
  button: string;
  buttonText: string;
  buttonSecondary: string;
  buttonSecondaryText: string;
  
  // Special Colors
  shadow: string;
  placeholder: string;
  disabled: string;
  
  // Background Media (NEW FEATURE)
  backgroundImage?: string;
  backgroundVideo?: string;
  backgroundOpacity?: number;
}

export interface Theme {
  name: string;
  displayName: string;
  colors: ThemeColors;
  isDark: boolean;
  statusBarStyle: 'light' | 'dark';
}

// UNIFIED THEME DEFINITIONS
// Add new themes here - the entire app will automatically support them
export const THEMES: Record<string, Theme> = {
  dark: {
    name: 'dark',
    displayName: 'Dark',
    isDark: true,
    statusBarStyle: 'light',
    colors: {
      // Primary Colors
      primary: '#f4511e',
      secondary: '#d44117',
      accent: '#4CAF50',
      
      // Background Colors
      background: '#121212',
      surface: '#1a1a1a',
      card: '#2C2C2C',
      overlay: 'rgba(0, 0, 0, 0.7)',
      
      // Text Colors
      text: '#ffffff',
      textSecondary: '#cccccc',
      textMuted: '#666666',
      textInverse: '#000000',
      
      // Border & Divider Colors
      border: '#333333',
      divider: '#222222',
      
      // Status Colors
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#FF5252',
      info: '#2196F3',
      
      // Interactive Colors
      button: '#f4511e',
      buttonText: '#ffffff',
      buttonSecondary: '#2C2C2C',
      buttonSecondaryText: '#ffffff',
      
      // Special Colors
      shadow: '#000000',
      placeholder: '#666666',
      disabled: '#444444',
    }
  },
  
  light: {
    name: 'light',
    displayName: 'Light',
    isDark: false,
    statusBarStyle: 'dark',
    colors: {
      // Primary Colors
      primary: '#f4511e',
      secondary: '#d44117',
      accent: '#4CAF50',
      
      // Background Colors
      background: '#ffffff',
      surface: '#f5f5f5',
      card: '#ffffff',
      overlay: 'rgba(0, 0, 0, 0.5)',
      
      // Text Colors
      text: '#000000',
      textSecondary: '#666666',
      textMuted: '#999999',
      textInverse: '#ffffff',
      
      // Border & Divider Colors
      border: '#e0e0e0',
      divider: '#f0f0f0',
      
      // Status Colors
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#FF5252',
      info: '#2196F3',
      
      // Interactive Colors
      button: '#f4511e',
      buttonText: '#ffffff',
      buttonSecondary: '#f5f5f5',
      buttonSecondaryText: '#000000',
      
      // Special Colors
      shadow: '#000000',
      placeholder: '#999999',
      disabled: '#cccccc',
    }
  },
  
  anime: {
    name: 'anime',
    displayName: 'purple',
    isDark: true,
    statusBarStyle: 'light',
    colors: {
      // Primary Colors
      primary: '#FF6B9D',
      secondary: '#C44569',
      accent: '#00CEC9',
      
      // Background Colors
      background: '#2D1B69',
      surface: '#3D2B7A',
      card: '#4A3B8A',
      overlay: 'rgba(0, 0, 0, 0.7)',
      
      // Text Colors
      text: '#FFEAA7',
      textSecondary: '#DDA0DD',
      textMuted: '#B19CD9',
      textInverse: '#000000',
      
      // Border & Divider Colors
      border: '#6C5CE7',
      divider: '#5A4FCF',
      
      // Status Colors
      success: '#00CEC9',
      warning: '#FFD93D',
      error: '#FF7675',
      info: '#74B9FF',
      
      // Interactive Colors
      button: '#FF6B9D',
      buttonText: '#ffffff',
      buttonSecondary: '#4A3B8A',
      buttonSecondaryText: '#FFEAA7',
      
      // Special Colors
      shadow: '#000000',
      placeholder: '#B19CD9',
      disabled: '#5A4FCF',
    }
  },
  
  cyberpunk: {
    name: 'cyberpunk',
    displayName: 'Cyberpunk',
    isDark: true,
    statusBarStyle: 'light',
    colors: {
      // Primary Colors
      primary: '#00FFFF',
      secondary: '#FF00FF',
      accent: '#00FF00',
      
      // Background Colors
      background: '#0D1117',
      surface: '#161B22',
      card: '#21262D',
      overlay: 'rgba(0, 0, 0, 0.8)',
      
      // Text Colors
      text: '#00FFFF',
      textSecondary: '#58A6FF',
      textMuted: '#7D8590',
      textInverse: '#000000',
      
      // Border & Divider Colors
      border: '#30363D',
      divider: '#21262D',
      
      // Status Colors
      success: '#00FF00',
      warning: '#FFD700',
      error: '#FF0000',
      info: '#00FFFF',
      
      // Interactive Colors
      button: '#00FFFF',
      buttonText: '#000000',
      buttonSecondary: '#21262D',
      buttonSecondaryText: '#00FFFF',
      
      // Special Colors
      shadow: '#000000',
      placeholder: '#7D8590',
      disabled: '#30363D',
    }
  },
  
  // NEW THEME WITH BACKGROUND MEDIA SUPPORT
  immersive: {
    name: 'immersive',
    displayName: 'Immersive',
    isDark: true,
    statusBarStyle: 'light',
    colors: {
      // Primary Colors
      primary: '#f4511e',
      secondary: '#d44117',
      accent: '#4CAF50',
      
      // Background Colors
      background: '#121212',
      surface: 'rgba(26, 26, 26, 0.9)',
      card: 'rgba(44, 44, 44, 0.9)',
      overlay: 'rgba(0, 0, 0, 0.7)',
      
      // Text Colors
      text: '#ffffff',
      textSecondary: '#cccccc',
      textMuted: '#666666',
      textInverse: '#000000',
      
      // Border & Divider Colors
      border: 'rgba(255, 255, 255, 0.2)',
      divider: 'rgba(255, 255, 255, 0.1)',
      
      // Status Colors
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#FF5252',
      info: '#2196F3',
      
      // Interactive Colors
      button: '#f4511e',
      buttonText: '#ffffff',
      buttonSecondary: 'rgba(44, 44, 44, 0.9)',
      buttonSecondaryText: '#ffffff',
      
      // Special Colors
      shadow: '#000000',
      placeholder: '#666666',
      disabled: '#444444',
      
      // Background Media (NEW FEATURE)
      backgroundImage: 'https://anisurge.me/api/backgrounds/anime-bg.jpg',
      backgroundVideo: 'https://anisurge.me/api/backgrounds/anime-bg.mp4',
      backgroundOpacity: 0.1,
    }
  },

  // DEFAULT CUSTOM THEME TEMPLATE - MODIFY THIS ONE
  custom: {
    name: 'custom',
    displayName: 'My Custom Theme',
    isDark: true, // Change to false for light theme
    statusBarStyle: 'light', // Change to 'dark' for light theme
    colors: {
      // Primary Colors - Change these to your brand colors
      primary: '#3B82F6',        // Blue
      secondary: '#1E40AF',      // Darker blue
      accent: '#10B981',         // Green
      
      // Background Colors - Main app background
      background: '#0F172A',     // Very dark blue
      surface: '#1E293B',        // Slightly lighter
      card: '#334155',           // Card background
      overlay: 'rgba(0, 0, 0, 0.7)', // Modal overlays
      
      // Text Colors - All text in your app
      text: '#F8FAFC',           // Main text (white)
      textSecondary: '#CBD5E1',  // Secondary text (light gray)
      textMuted: '#64748B',      // Muted text (gray)
      textInverse: '#0F172A',    // Text on light backgrounds
      
      // Border & Divider Colors
      border: '#475569',         // Borders
      divider: '#334155',        // Dividers between sections
      
      // Status Colors - Success, warning, error messages
      success: '#10B981',        // Green
      warning: '#F59E0B',        // Orange
      error: '#EF4444',          // Red
      info: '#3B82F6',           // Blue
      
      // Interactive Colors - Buttons and clickable elements
      button: '#3B82F6',         // Primary button color
      buttonText: '#FFFFFF',     // Text on buttons
      buttonSecondary: '#334155', // Secondary button color
      buttonSecondaryText: '#F8FAFC', // Text on secondary buttons
      
      // Special Colors
      shadow: '#000000',         // Drop shadows
      placeholder: '#64748B',    // Input placeholders
      disabled: '#475569',       // Disabled elements
      
      // Background Media (OPTIONAL) - Add custom backgrounds
      // backgroundImage: 'https://your-domain.com/background.jpg',
      // backgroundVideo: 'https://your-domain.com/background.mp4',
      // backgroundOpacity: 0.2, // 0.0 = transparent, 1.0 = opaque
    }
  }
};

// DEFAULT THEME
export const DEFAULT_THEME = 'dark';

// THEME UTILITIES
export const getTheme = (themeName: string): Theme => {
  return THEMES[themeName] || THEMES[DEFAULT_THEME];
};

export const getAllThemes = (): Theme[] => {
  return Object.values(THEMES);
};

export const getThemeNames = (): string[] => {
  return Object.keys(THEMES);
};

// BACKGROUND MEDIA UTILITIES
export const hasBackgroundMedia = (theme: Theme): boolean => {
  return !!(theme.colors.backgroundImage || theme.colors.backgroundVideo);
};

export const getBackgroundMedia = (theme: Theme) => {
  return {
    image: theme.colors.backgroundImage,
    video: theme.colors.backgroundVideo,
    opacity: theme.colors.backgroundOpacity || 1,
  };
};
