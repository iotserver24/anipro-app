/**
 * UNIFIED THEME HOOK
 * 
 * This hook provides easy access to theme functionality.
 * Use this hook in any component to access theme colors and functions.
 */

import { useTheme as useThemeContext } from '../contexts/ThemeContext';

export const useTheme = useThemeContext;

// Export theme utilities for convenience
export { THEMES, getTheme, getAllThemes, getThemeNames } from '../constants/themes';
export type { Theme, ThemeColors } from '../constants/themes';
