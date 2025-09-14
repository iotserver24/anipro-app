/**
 * THEMES API SERVICE
 * 
 * This service handles communication with the themes API
 * to fetch, download, and manage themes from the server.
 */

import { THEMES, Theme } from '../constants/themes';

// API Configuration
const API_BASE_URL = 'https://anisurge.me/api';

export interface ServerTheme {
  id: string;
  name: string;
  displayName: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    card: string;
    overlay: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    textInverse: string;
    border: string;
    divider: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    button: string;
    buttonText: string;
    buttonSecondary: string;
    buttonSecondaryText: string;
    shadow: string;
    placeholder: string;
    disabled: string;
    backgroundImage?: string;
    backgroundVideo?: string;
    backgroundOpacity?: number;
  };
  isDark: boolean;
  statusBarStyle: 'light' | 'dark';
  category: 'default' | 'anime' | 'cyberpunk' | 'minimal' | 'custom';
  previewImage?: string;
  isDefault?: boolean;
  isPremium?: boolean;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  version: string;
}

export interface ThemesResponse {
  themes: ServerTheme[];
  error?: string;
}

export interface ThemeResponse {
  theme: ServerTheme;
  error?: string;
}

class ThemesApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Fetch all available themes from the server
   */
  async fetchThemes(category?: string, featured?: boolean): Promise<ServerTheme[]> {
    try {
      const params = new URLSearchParams();
      if (category && category !== 'all') {
        params.append('category', category);
      }
      if (featured) {
        params.append('featured', 'true');
      }

      const url = `${this.baseUrl}/themes${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const themes = await response.json();
      return Array.isArray(themes) ? themes : [];
    } catch (error) {
      console.error('Error fetching themes:', error);
      // Return local themes as fallback
      return this.getLocalThemes();
    }
  }

  /**
   * Fetch a specific theme by ID
   */
  async fetchThemeById(themeId: string): Promise<ServerTheme | null> {
    try {
      const response = await fetch(`${this.baseUrl}/themes?id=${themeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const theme = await response.json();
      return theme;
    } catch (error) {
      console.error('Error fetching theme:', error);
      // Return local theme as fallback
      return this.getLocalThemeById(themeId);
    }
  }

  /**
   * Download a theme (increment download count)
   */
  async downloadTheme(themeId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/themes?id=${themeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // This will be handled by the server to increment download count
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error downloading theme:', error);
      return false;
    }
  }

  /**
   * Convert server theme to local theme format
   */
  convertServerThemeToLocal(serverTheme: ServerTheme): Theme {
    return {
      name: serverTheme.name,
      displayName: serverTheme.displayName,
      colors: serverTheme.colors,
      isDark: serverTheme.isDark,
      statusBarStyle: serverTheme.statusBarStyle,
    };
  }

  /**
   * Get local themes as fallback
   */
  private getLocalThemes(): ServerTheme[] {
    return Object.entries(THEMES).map(([key, theme]) => ({
      id: key,
      name: theme.name,
      displayName: theme.displayName,
      description: `Built-in ${theme.displayName} theme`,
      colors: theme.colors,
      isDark: theme.isDark,
      statusBarStyle: theme.statusBarStyle,
      category: key === 'dark' || key === 'light' ? 'default' : 
                key === 'anime' ? 'anime' : 
                key === 'cyberpunk' ? 'cyberpunk' : 'custom',
      isDefault: key === 'dark' || key === 'light',
      isPremium: key === 'immersive',
      downloadCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0',
    }));
  }

  /**
   * Get local theme by ID as fallback
   */
  private getLocalThemeById(themeId: string): ServerTheme | null {
    const localThemes = this.getLocalThemes();
    return localThemes.find(theme => theme.id === themeId) || null;
  }

  /**
   * Check if a theme is available locally
   */
  isThemeAvailableLocally(themeId: string): boolean {
    return themeId in THEMES;
  }

  /**
   * Get local theme by ID
   */
  getLocalTheme(themeId: string): Theme | null {
    return THEMES[themeId] || null;
  }

  /**
   * Get all local themes
   */
  getAllLocalThemes(): Theme[] {
    return Object.values(THEMES);
  }
}

// Export singleton instance
export const themesApiService = new ThemesApiService();
export default themesApiService;
