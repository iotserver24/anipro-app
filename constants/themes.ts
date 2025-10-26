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
  
  // NEW THEME WITH BACKGROUND MEDIA SUPPORT - COMMENTED OUT FOR NOW
  // immersive: {
  //   name: 'immersive',
  //   displayName: 'Immersive',
  //   isDark: true,
  //   statusBarStyle: 'light',
  //   colors: {
  //     // Primary Colors
  //     primary: '#f4511e',
  //     secondary: '#d44117',
  //     accent: '#4CAF50',
  //     
  //     // Background Colors
  //     background: '#121212',
  //     surface: 'rgba(26, 26, 26, 0.9)',
  //     card: 'rgba(44, 44, 44, 0.9)',
  //     overlay: 'rgba(0, 0, 0, 0.7)',
  //     
  //     // Text Colors
  //     text: '#ffffff',
  //     textSecondary: '#cccccc',
  //     textMuted: '#666666',
  //     textInverse: '#000000',
  //     
  //     // Border & Divider Colors
  //     border: 'rgba(255, 255, 255, 0.2)',
  //     divider: 'rgba(255, 255, 255, 0.1)',
  //     
  //     // Status Colors
  //     success: '#4CAF50',
  //     warning: '#FF9800',
  //     error: '#FF5252',
  //     info: '#2196F3',
  //     
  //     // Interactive Colors
  //     button: '#f4511e',
  //     buttonText: '#ffffff',
  //     buttonSecondary: 'rgba(44, 44, 44, 0.9)',
  //     buttonSecondaryText: '#ffffff',
  //     
  //     // Special Colors
  //     shadow: '#000000',
  //     placeholder: '#666666',
  //     disabled: '#444444',
  //     
  //     // Background Media (NEW FEATURE)
  //     backgroundImage: 'https://anisurge.me/api/backgrounds/anime-bg.jpg',
  //     backgroundVideo: 'https://anisurge.me/api/backgrounds/anime-bg.mp4',
  //     backgroundOpacity: 0.1,
  //   }
  // },

  // ANIME-INSPIRED THEMES
  
  // Sakura Theme - Pink/Cherry Blossom inspired
  sakura: {
    name: 'sakura',
    displayName: 'Sakura',
    isDark: false,
    statusBarStyle: 'dark',
    colors: {
      // Primary Colors - Pink/Cherry Blossom
      primary: '#FF69B4',
      secondary: '#FF1493',
      accent: '#FFB6C1',
      
      // Background Colors - Light Pink/White
      background: '#FFF0F5',
      surface: '#FFFFFF',
      card: '#FFE4E1',
      overlay: 'rgba(255, 182, 193, 0.8)',
      
      // Text Colors
      text: '#8B008B',
      textSecondary: '#C71585',
      textMuted: '#DA70D6',
      textInverse: '#FFFFFF',
      
      // Border & Divider Colors
      border: '#FFB6C1',
      divider: '#FFC0CB',
      
      // Status Colors
      success: '#32CD32',
      warning: '#FF8C00',
      error: '#DC143C',
      info: '#1E90FF',
      
      // Interactive Colors
      button: '#FF69B4',
      buttonText: '#FFFFFF',
      buttonSecondary: '#FFE4E1',
      buttonSecondaryText: '#8B008B',
      
      // Special Colors
      shadow: '#FFB6C1',
      placeholder: '#DDA0DD',
      disabled: '#D3D3D3',
    }
  },

  // Neon Theme - Cyberpunk/Anime inspired
  neon: {
    name: 'neon',
    displayName: 'Neon',
    isDark: true,
    statusBarStyle: 'light',
    colors: {
      // Primary Colors - Neon Cyan/Magenta
      primary: '#00FFFF',
      secondary: '#FF00FF',
      accent: '#00FF00',
      
      // Background Colors - Dark with neon accents
      background: '#0A0A0A',
      surface: '#1A1A1A',
      card: '#2A2A2A',
      overlay: 'rgba(0, 255, 255, 0.1)',
      
      // Text Colors
      text: '#FFFFFF',
      textSecondary: '#00FFFF',
      textMuted: '#808080',
      textInverse: '#000000',
      
      // Border & Divider Colors
      border: '#00FFFF',
      divider: '#333333',
      
      // Status Colors
      success: '#00FF00',
      warning: '#FFFF00',
      error: '#FF0080',
      info: '#0080FF',
      
      // Interactive Colors
      button: '#00FFFF',
      buttonText: '#000000',
      buttonSecondary: '#2A2A2A',
      buttonSecondaryText: '#00FFFF',
      
      // Special Colors
      shadow: '#00FFFF',
      placeholder: '#666666',
      disabled: '#404040',
    }
  },

  // Ocean Theme - Deep blue/teal inspired
  ocean: {
    name: 'ocean',
    displayName: 'Ocean',
    isDark: true,
    statusBarStyle: 'light',
    colors: {
      // Primary Colors - Ocean Blue/Teal
      primary: '#20B2AA',
      secondary: '#008B8B',
      accent: '#00CED1',
      
      // Background Colors - Deep ocean
      background: '#001122',
      surface: '#002244',
      card: '#003366',
      overlay: 'rgba(32, 178, 170, 0.2)',
      
      // Text Colors
      text: '#E0F6FF',
      textSecondary: '#87CEEB',
      textMuted: '#4682B4',
      textInverse: '#000000',
      
      // Border & Divider Colors
      border: '#20B2AA',
      divider: '#004488',
      
      // Status Colors
      success: '#00FF7F',
      warning: '#FFD700',
      error: '#FF6347',
      info: '#1E90FF',
      
      // Interactive Colors
      button: '#20B2AA',
      buttonText: '#FFFFFF',
      buttonSecondary: '#003366',
      buttonSecondaryText: '#87CEEB',
      
      // Special Colors
      shadow: '#20B2AA',
      placeholder: '#4682B4',
      disabled: '#2F4F4F',
    }
  },

  // Sunset Theme - Orange/Red inspired
  sunset: {
    name: 'sunset',
    displayName: 'Sunset',
    isDark: true,
    statusBarStyle: 'light',
    colors: {
      // Primary Colors - Sunset Orange/Red
      primary: '#FF4500',
      secondary: '#FF6347',
      accent: '#FFD700',
      
      // Background Colors - Dark with warm tones
      background: '#1A0F0A',
      surface: '#2A1F1A',
      card: '#3A2F2A',
      overlay: 'rgba(255, 69, 0, 0.2)',
      
      // Text Colors
      text: '#FFF8DC',
      textSecondary: '#FFD700',
      textMuted: '#CD853F',
      textInverse: '#000000',
      
      // Border & Divider Colors
      border: '#FF4500',
      divider: '#4A3F3A',
      
      // Status Colors
      success: '#32CD32',
      warning: '#FFD700',
      error: '#DC143C',
      info: '#00BFFF',
      
      // Interactive Colors
      button: '#FF4500',
      buttonText: '#FFFFFF',
      buttonSecondary: '#3A2F2A',
      buttonSecondaryText: '#FFD700',
      
      // Special Colors
      shadow: '#FF4500',
      placeholder: '#CD853F',
      disabled: '#5D4E37',
    }
  },

  // Forest Theme - Green/Nature inspired
  forest: {
    name: 'forest',
    displayName: 'Forest',
    isDark: true,
    statusBarStyle: 'light',
    colors: {
      // Primary Colors - Forest Green
      primary: '#228B22',
      secondary: '#32CD32',
      accent: '#90EE90',
      
      // Background Colors - Dark forest
      background: '#0A1A0A',
      surface: '#1A2A1A',
      card: '#2A3A2A',
      overlay: 'rgba(34, 139, 34, 0.2)',
      
      // Text Colors
      text: '#F0FFF0',
      textSecondary: '#90EE90',
      textMuted: '#9ACD32',
      textInverse: '#000000',
      
      // Border & Divider Colors
      border: '#228B22',
      divider: '#3A4A3A',
      
      // Status Colors
      success: '#00FF00',
      warning: '#FFD700',
      error: '#FF4500',
      info: '#00BFFF',
      
      // Interactive Colors
      button: '#228B22',
      buttonText: '#FFFFFF',
      buttonSecondary: '#2A3A2A',
      buttonSecondaryText: '#90EE90',
      
      // Special Colors
      shadow: '#228B22',
      placeholder: '#9ACD32',
      disabled: '#4A5A4A',
    }
  },

  // Lavender Theme - Purple/Lavender inspired
  lavender: {
    name: 'lavender',
    displayName: 'Lavender',
    isDark: false,
    statusBarStyle: 'dark',
    colors: {
      // Primary Colors - Lavender/Purple
      primary: '#9370DB',
      secondary: '#8A2BE2',
      accent: '#DDA0DD',
      
      // Background Colors - Light purple/white
      background: '#F8F0FF',
      surface: '#FFFFFF',
      card: '#F0E6FF',
      overlay: 'rgba(147, 112, 219, 0.8)',
      
      // Text Colors
      text: '#4B0082',
      textSecondary: '#8A2BE2',
      textMuted: '#9370DB',
      textInverse: '#FFFFFF',
      
      // Border & Divider Colors
      border: '#DDA0DD',
      divider: '#E6E6FA',
      
      // Status Colors
      success: '#32CD32',
      warning: '#FF8C00',
      error: '#DC143C',
      info: '#1E90FF',
      
      // Interactive Colors
      button: '#9370DB',
      buttonText: '#FFFFFF',
      buttonSecondary: '#F0E6FF',
      buttonSecondaryText: '#4B0082',
      
      // Special Colors
      shadow: '#DDA0DD',
      placeholder: '#BA55D3',
      disabled: '#D3D3D3',
    }
  },

  // Midnight Theme - Deep purple/blue
  midnight: {
    name: 'midnight',
    displayName: 'Midnight',
    isDark: true,
    statusBarStyle: 'light',
    colors: {
      // Primary Colors - Midnight Purple/Blue
      primary: '#4B0082',
      secondary: '#6A5ACD',
      accent: '#9370DB',
      
      // Background Colors - Deep midnight
      background: '#0A0A1A',
      surface: '#1A1A2A',
      card: '#2A2A3A',
      overlay: 'rgba(75, 0, 130, 0.3)',
      
      // Text Colors
      text: '#E6E6FA',
      textSecondary: '#9370DB',
      textMuted: '#6A5ACD',
      textInverse: '#000000',
      
      // Border & Divider Colors
      border: '#4B0082',
      divider: '#3A3A4A',
      
      // Status Colors
      success: '#00FF7F',
      warning: '#FFD700',
      error: '#FF1493',
      info: '#00BFFF',
      
      // Interactive Colors
      button: '#4B0082',
      buttonText: '#FFFFFF',
      buttonSecondary: '#2A2A3A',
      buttonSecondaryText: '#9370DB',
      
      // Special Colors
      shadow: '#4B0082',
      placeholder: '#6A5ACD',
      disabled: '#4A4A5A',
    }
  },

  // MORE ANIME-INSPIRED THEMES
  
  // Manga Theme - Black and white manga style
  manga: {
    name: 'manga',
    displayName: 'Manga',
    isDark: true,
    statusBarStyle: 'light',
    colors: {
      // Primary Colors - Pure black and white
      primary: '#FFFFFF',
      secondary: '#E0E0E0',
      accent: '#FFD700',
      
      // Background Colors - Pure black manga style
      background: '#000000',
      surface: '#1A1A1A',
      card: '#2A2A2A',
      overlay: 'rgba(255, 255, 255, 0.1)',
      
      // Text Colors
      text: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#808080',
      textInverse: '#000000',
      
      // Border & Divider Colors
      border: '#FFFFFF',
      divider: '#333333',
      
      // Status Colors
      success: '#00FF00',
      warning: '#FFD700',
      error: '#FF0000',
      info: '#00BFFF',
      
      // Interactive Colors
      button: '#FFFFFF',
      buttonText: '#000000',
      buttonSecondary: '#2A2A2A',
      buttonSecondaryText: '#FFFFFF',
      
      // Special Colors
      shadow: '#FFFFFF',
      placeholder: '#666666',
      disabled: '#404040',
    }
  },

  // Kawaii Theme - Cute pastel colors
  kawaii: {
    name: 'kawaii',
    displayName: 'Kawaii',
    isDark: false,
    statusBarStyle: 'dark',
    colors: {
      // Primary Colors - Pastel pink and blue
      primary: '#FFB6C1',
      secondary: '#87CEEB',
      accent: '#98FB98',
      
      // Background Colors - Soft pastels
      background: '#FFF8DC',
      surface: '#FFFFFF',
      card: '#F0F8FF',
      overlay: 'rgba(255, 182, 193, 0.8)',
      
      // Text Colors
      text: '#8B4513',
      textSecondary: '#CD853F',
      textMuted: '#D2B48C',
      textInverse: '#FFFFFF',
      
      // Border & Divider Colors
      border: '#FFB6C1',
      divider: '#E6E6FA',
      
      // Status Colors
      success: '#90EE90',
      warning: '#FFD700',
      error: '#FFB6C1',
      info: '#87CEEB',
      
      // Interactive Colors
      button: '#FFB6C1',
      buttonText: '#FFFFFF',
      buttonSecondary: '#F0F8FF',
      buttonSecondaryText: '#8B4513',
      
      // Special Colors
      shadow: '#FFB6C1',
      placeholder: '#D2B48C',
      disabled: '#D3D3D3',
    }
  },

  // Shounen Theme - Bold and energetic
  shounen: {
    name: 'shounen',
    displayName: 'Shounen',
    isDark: true,
    statusBarStyle: 'light',
    colors: {
      // Primary Colors - Bold orange and blue
      primary: '#FF6B35',
      secondary: '#004E98',
      accent: '#FFD700',
      
      // Background Colors - Dark with energy
      background: '#0A0A0A',
      surface: '#1A1A1A',
      card: '#2A2A2A',
      overlay: 'rgba(255, 107, 53, 0.2)',
      
      // Text Colors
      text: '#FFFFFF',
      textSecondary: '#FFD700',
      textMuted: '#808080',
      textInverse: '#000000',
      
      // Border & Divider Colors
      border: '#FF6B35',
      divider: '#333333',
      
      // Status Colors
      success: '#00FF00',
      warning: '#FFD700',
      error: '#FF0000',
      info: '#004E98',
      
      // Interactive Colors
      button: '#FF6B35',
      buttonText: '#FFFFFF',
      buttonSecondary: '#2A2A2A',
      buttonSecondaryText: '#FFD700',
      
      // Special Colors
      shadow: '#FF6B35',
      placeholder: '#666666',
      disabled: '#404040',
    }
  },

  // Shoujo Theme - Romantic and dreamy
  shoujo: {
    name: 'shoujo',
    displayName: 'Shoujo',
    isDark: false,
    statusBarStyle: 'dark',
    colors: {
      // Primary Colors - Romantic pink and purple
      primary: '#FF69B4',
      secondary: '#DA70D6',
      accent: '#FFB6C1',
      
      // Background Colors - Soft and dreamy
      background: '#FFF0F5',
      surface: '#FFFFFF',
      card: '#FFE4E1',
      overlay: 'rgba(255, 105, 180, 0.8)',
      
      // Text Colors
      text: '#8B008B',
      textSecondary: '#C71585',
      textMuted: '#DA70D6',
      textInverse: '#FFFFFF',
      
      // Border & Divider Colors
      border: '#FFB6C1',
      divider: '#FFC0CB',
      
      // Status Colors
      success: '#98FB98',
      warning: '#FFD700',
      error: '#FF69B4',
      info: '#87CEEB',
      
      // Interactive Colors
      button: '#FF69B4',
      buttonText: '#FFFFFF',
      buttonSecondary: '#FFE4E1',
      buttonSecondaryText: '#8B008B',
      
      // Special Colors
      shadow: '#FFB6C1',
      placeholder: '#DDA0DD',
      disabled: '#D3D3D3',
    }
  },

  // Mecha Theme - Futuristic and metallic
  mecha: {
    name: 'mecha',
    displayName: 'Mecha',
    isDark: true,
    statusBarStyle: 'light',
    colors: {
      // Primary Colors - Metallic silver and blue
      primary: '#C0C0C0',
      secondary: '#4682B4',
      accent: '#00FFFF',
      
      // Background Colors - Dark metallic
      background: '#0F0F0F',
      surface: '#1F1F1F',
      card: '#2F2F2F',
      overlay: 'rgba(192, 192, 192, 0.1)',
      
      // Text Colors
      text: '#E0E0E0',
      textSecondary: '#00FFFF',
      textMuted: '#808080',
      textInverse: '#000000',
      
      // Border & Divider Colors
      border: '#C0C0C0',
      divider: '#3F3F3F',
      
      // Status Colors
      success: '#00FF00',
      warning: '#FFD700',
      error: '#FF4500',
      info: '#4682B4',
      
      // Interactive Colors
      button: '#C0C0C0',
      buttonText: '#000000',
      buttonSecondary: '#2F2F2F',
      buttonSecondaryText: '#00FFFF',
      
      // Special Colors
      shadow: '#C0C0C0',
      placeholder: '#666666',
      disabled: '#4F4F4F',
    }
  },

  // Yandere Theme - Dark and intense
  yandere: {
    name: 'yandere',
    displayName: 'Yandere',
    isDark: true,
    statusBarStyle: 'light',
    colors: {
      // Primary Colors - Dark red and black
      primary: '#DC143C',
      secondary: '#8B0000',
      accent: '#FF1493',
      
      // Background Colors - Dark and intense
      background: '#0A0000',
      surface: '#1A0000',
      card: '#2A0000',
      overlay: 'rgba(220, 20, 60, 0.3)',
      
      // Text Colors
      text: '#FFE4E1',
      textSecondary: '#FF1493',
      textMuted: '#8B0000',
      textInverse: '#FFFFFF',
      
      // Border & Divider Colors
      border: '#DC143C',
      divider: '#3A0000',
      
      // Status Colors
      success: '#00FF00',
      warning: '#FFD700',
      error: '#FF0000',
      info: '#00BFFF',
      
      // Interactive Colors
      button: '#DC143C',
      buttonText: '#FFFFFF',
      buttonSecondary: '#2A0000',
      buttonSecondaryText: '#FF1493',
      
      // Special Colors
      shadow: '#DC143C',
      placeholder: '#8B0000',
      disabled: '#4A0000',
    }
  },

  // ANIME SERIES-SPECIFIC THEMES
  
  // Naruto Hidden Leaf Theme - Orange and green ninja colors
  naruto: {
    name: 'naruto',
    displayName: 'Naruto',
    isDark: true,
    statusBarStyle: 'light',
    colors: {
      // Primary Colors - Orange and green ninja colors
      primary: '#FF8C00',
      secondary: '#32CD32',
      accent: '#FFD700',
      
      // Background Colors - Dark forest/ninja village
      background: '#0A1A0A',
      surface: '#1A2A1A',
      card: '#2A3A2A',
      overlay: 'rgba(255, 140, 0, 0.2)',
      
      // Text Colors
      text: '#F0FFF0',
      textSecondary: '#FFD700',
      textMuted: '#9ACD32',
      textInverse: '#000000',
      
      // Border & Divider Colors
      border: '#FF8C00',
      divider: '#3A4A3A',
      
      // Status Colors
      success: '#32CD32',
      warning: '#FFD700',
      error: '#DC143C',
      info: '#00BFFF',
      
      // Interactive Colors
      button: '#FF8C00',
      buttonText: '#FFFFFF',
      buttonSecondary: '#2A3A2A',
      buttonSecondaryText: '#FFD700',
      
      // Special Colors
      shadow: '#FF8C00',
      placeholder: '#9ACD32',
      disabled: '#4A5A4A',
    }
  },

  // One Punch Man Theme - Yellow and blue hero colors
  opm: {
    name: 'opm',
    displayName: 'One Punch Man',
    isDark: true,
    statusBarStyle: 'light',
    colors: {
      // Primary Colors - Yellow and blue hero colors
      primary: '#FFD700',
      secondary: '#1E90FF',
      accent: '#FF4500',
      
      // Background Colors - Dark city/superhero
      background: '#0A0A0A',
      surface: '#1A1A1A',
      card: '#2A2A2A',
      overlay: 'rgba(255, 215, 0, 0.2)',
      
      // Text Colors
      text: '#FFFFFF',
      textSecondary: '#FFD700',
      textMuted: '#808080',
      textInverse: '#000000',
      
      // Border & Divider Colors
      border: '#FFD700',
      divider: '#333333',
      
      // Status Colors
      success: '#00FF00',
      warning: '#FFD700',
      error: '#FF0000',
      info: '#1E90FF',
      
      // Interactive Colors
      button: '#FFD700',
      buttonText: '#000000',
      buttonSecondary: '#2A2A2A',
      buttonSecondaryText: '#FFD700',
      
      // Special Colors
      shadow: '#FFD700',
      placeholder: '#666666',
      disabled: '#404040',
    }
  },

  // One Piece Grand Line Theme - Blue ocean and adventure colors
  onepiece: {
    name: 'onepiece',
    displayName: 'One Piece',
    isDark: false,
    statusBarStyle: 'dark',
    colors: {
      // Primary Colors - Ocean blue and adventure colors
      primary: '#1E90FF',
      secondary: '#FF6347',
      accent: '#FFD700',
      
      // Background Colors - Ocean and sky
      background: '#E0F6FF',
      surface: '#FFFFFF',
      card: '#F0F8FF',
      overlay: 'rgba(30, 144, 255, 0.8)',
      
      // Text Colors
      text: '#000080',
      textSecondary: '#1E90FF',
      textMuted: '#4682B4',
      textInverse: '#FFFFFF',
      
      // Border & Divider Colors
      border: '#1E90FF',
      divider: '#E6F3FF',
      
      // Status Colors
      success: '#32CD32',
      warning: '#FFD700',
      error: '#DC143C',
      info: '#1E90FF',
      
      // Interactive Colors
      button: '#1E90FF',
      buttonText: '#FFFFFF',
      buttonSecondary: '#F0F8FF',
      buttonSecondaryText: '#000080',
      
      // Special Colors
      shadow: '#1E90FF',
      placeholder: '#4682B4',
      disabled: '#D3D3D3',
    }
  },

  // Dragon Ball Z Theme - Orange and blue energy colors
  dbz: {
    name: 'dbz',
    displayName: 'Dragon Ball Z',
    isDark: true,
    statusBarStyle: 'light',
    colors: {
      // Primary Colors - Orange energy and blue
      primary: '#FF8C00',
      secondary: '#00BFFF',
      accent: '#FFD700',
      
      // Background Colors - Dark space/energy
      background: '#0A0A1A',
      surface: '#1A1A2A',
      card: '#2A2A3A',
      overlay: 'rgba(255, 140, 0, 0.3)',
      
      // Text Colors
      text: '#E0E0FF',
      textSecondary: '#FFD700',
      textMuted: '#8080FF',
      textInverse: '#000000',
      
      // Border & Divider Colors
      border: '#FF8C00',
      divider: '#3A3A4A',
      
      // Status Colors
      success: '#00FF00',
      warning: '#FFD700',
      error: '#FF0000',
      info: '#00BFFF',
      
      // Interactive Colors
      button: '#FF8C00',
      buttonText: '#FFFFFF',
      buttonSecondary: '#2A2A3A',
      buttonSecondaryText: '#FFD700',
      
      // Special Colors
      shadow: '#FF8C00',
      placeholder: '#8080FF',
      disabled: '#4A4A5A',
    }
  },

  // Attack on Titan Theme - Dark and military colors
  aot: {
    name: 'aot',
    displayName: 'Attack on Titan',
    isDark: true,
    statusBarStyle: 'light',
    colors: {
      // Primary Colors - Military green and dark red
      primary: '#228B22',
      secondary: '#8B0000',
      accent: '#C0C0C0',
      
      // Background Colors - Dark military
      background: '#0A0A0A',
      surface: '#1A1A1A',
      card: '#2A2A2A',
      overlay: 'rgba(34, 139, 34, 0.2)',
      
      // Text Colors
      text: '#E0E0E0',
      textSecondary: '#C0C0C0',
      textMuted: '#808080',
      textInverse: '#000000',
      
      // Border & Divider Colors
      border: '#228B22',
      divider: '#333333',
      
      // Status Colors
      success: '#00FF00',
      warning: '#FFD700',
      error: '#8B0000',
      info: '#00BFFF',
      
      // Interactive Colors
      button: '#228B22',
      buttonText: '#FFFFFF',
      buttonSecondary: '#2A2A2A',
      buttonSecondaryText: '#C0C0C0',
      
      // Special Colors
      shadow: '#228B22',
      placeholder: '#666666',
      disabled: '#404040',
    }
  },

  // Demon Slayer Theme - Red and blue demon colors
  demonslayer: {
    name: 'demonslayer',
    displayName: 'Demon Slayer',
    isDark: true,
    statusBarStyle: 'light',
    colors: {
      // Primary Colors - Red and blue demon colors
      primary: '#DC143C',
      secondary: '#4169E1',
      accent: '#FFD700',
      
      // Background Colors - Dark night
      background: '#0A0000',
      surface: '#1A0000',
      card: '#2A0000',
      overlay: 'rgba(220, 20, 60, 0.3)',
      
      // Text Colors
      text: '#FFE4E1',
      textSecondary: '#FFD700',
      textMuted: '#8B0000',
      textInverse: '#FFFFFF',
      
      // Border & Divider Colors
      border: '#DC143C',
      divider: '#3A0000',
      
      // Status Colors
      success: '#00FF00',
      warning: '#FFD700',
      error: '#FF0000',
      info: '#4169E1',
      
      // Interactive Colors
      button: '#DC143C',
      buttonText: '#FFFFFF',
      buttonSecondary: '#2A0000',
      buttonSecondaryText: '#FFD700',
      
      // Special Colors
      shadow: '#DC143C',
      placeholder: '#8B0000',
      disabled: '#4A0000',
    }
  },

  // My Hero Academia Theme - Red, blue, and yellow hero colors
  mha: {
    name: 'mha',
    displayName: 'My Hero Academia',
    isDark: false,
    statusBarStyle: 'dark',
    colors: {
      // Primary Colors - Hero red, blue, and yellow
      primary: '#DC143C',
      secondary: '#1E90FF',
      accent: '#FFD700',
      
      // Background Colors - Bright hero academy
      background: '#FFF8DC',
      surface: '#FFFFFF',
      card: '#F0F8FF',
      overlay: 'rgba(220, 20, 60, 0.8)',
      
      // Text Colors
      text: '#8B0000',
      textSecondary: '#1E90FF',
      textMuted: '#CD853F',
      textInverse: '#FFFFFF',
      
      // Border & Divider Colors
      border: '#DC143C',
      divider: '#E6E6FA',
      
      // Status Colors
      success: '#32CD32',
      warning: '#FFD700',
      error: '#DC143C',
      info: '#1E90FF',
      
      // Interactive Colors
      button: '#DC143C',
      buttonText: '#FFFFFF',
      buttonSecondary: '#F0F8FF',
      buttonSecondaryText: '#8B0000',
      
      // Special Colors
      shadow: '#DC143C',
      placeholder: '#CD853F',
      disabled: '#D3D3D3',
    }
  },

  // Tokyo Ghoul Theme - Dark red and black ghoul colors
  tokyoghoul: {
    name: 'tokyoghoul',
    displayName: 'Tokyo Ghoul',
    isDark: true,
    statusBarStyle: 'light',
    colors: {
      // Primary Colors - Dark red and black ghoul colors
      primary: '#8B0000',
      secondary: '#000000',
      accent: '#DC143C',
      
      // Background Colors - Dark Tokyo night
      background: '#000000',
      surface: '#1A0000',
      card: '#2A0000',
      overlay: 'rgba(139, 0, 0, 0.3)',
      
      // Text Colors
      text: '#FFE4E1',
      textSecondary: '#DC143C',
      textMuted: '#8B0000',
      textInverse: '#FFFFFF',
      
      // Border & Divider Colors
      border: '#8B0000',
      divider: '#3A0000',
      
      // Status Colors
      success: '#00FF00',
      warning: '#FFD700',
      error: '#FF0000',
      info: '#00BFFF',
      
      // Interactive Colors
      button: '#8B0000',
      buttonText: '#FFFFFF',
      buttonSecondary: '#2A0000',
      buttonSecondaryText: '#DC143C',
      
      // Special Colors
      shadow: '#8B0000',
      placeholder: '#8B0000',
      disabled: '#4A0000',
    }
  },

  // Studio Ghibli Theme - Soft nature colors
  ghibli: {
    name: 'ghibli',
    displayName: 'Studio Ghibli',
    isDark: false,
    statusBarStyle: 'dark',
    colors: {
      // Primary Colors - Soft nature colors
      primary: '#90EE90',
      secondary: '#87CEEB',
      accent: '#FFB6C1',
      
      // Background Colors - Soft nature
      background: '#F0FFF0',
      surface: '#FFFFFF',
      card: '#E6FFE6',
      overlay: 'rgba(144, 238, 144, 0.8)',
      
      // Text Colors
      text: '#228B22',
      textSecondary: '#32CD32',
      textMuted: '#9ACD32',
      textInverse: '#FFFFFF',
      
      // Border & Divider Colors
      border: '#90EE90',
      divider: '#E6FFE6',
      
      // Status Colors
      success: '#32CD32',
      warning: '#FFD700',
      error: '#DC143C',
      info: '#87CEEB',
      
      // Interactive Colors
      button: '#90EE90',
      buttonText: '#FFFFFF',
      buttonSecondary: '#E6FFE6',
      buttonSecondaryText: '#228B22',
      
      // Special Colors
      shadow: '#90EE90',
      placeholder: '#9ACD32',
      disabled: '#D3D3D3',
    }
  },

  // Sailor Moon Theme - Pink and white magical colors
  sailormoon: {
    name: 'sailormoon',
    displayName: 'Sailor Moon',
    isDark: false,
    statusBarStyle: 'dark',
    colors: {
      // Primary Colors - Pink and white magical colors
      primary: '#FF69B4',
      secondary: '#FFFFFF',
      accent: '#FFD700',
      
      // Background Colors - Soft magical
      background: '#FFF0F5',
      surface: '#FFFFFF',
      card: '#FFE4E1',
      overlay: 'rgba(255, 105, 180, 0.8)',
      
      // Text Colors
      text: '#8B008B',
      textSecondary: '#C71585',
      textMuted: '#DA70D6',
      textInverse: '#FFFFFF',
      
      // Border & Divider Colors
      border: '#FFB6C1',
      divider: '#FFC0CB',
      
      // Status Colors
      success: '#32CD32',
      warning: '#FFD700',
      error: '#DC143C',
      info: '#1E90FF',
      
      // Interactive Colors
      button: '#FF69B4',
      buttonText: '#FFFFFF',
      buttonSecondary: '#FFE4E1',
      buttonSecondaryText: '#8B008B',
      
      // Special Colors
      shadow: '#FFB6C1',
      placeholder: '#DDA0DD',
      disabled: '#D3D3D3',
    }
  },

  // AUSTIC BLUE THEME
  custom: {
    name: 'custom',
    displayName: 'Austic Blue',
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
