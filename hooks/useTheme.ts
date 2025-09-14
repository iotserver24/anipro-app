/**
 * Custom hook for accessing theme context
 * 
 * This hook provides easy access to the current theme and theme-related functions.
 * It should be used in components that need to access theme colors or change themes.
 */

import { useTheme as useThemeContext } from '../contexts/ThemeContext';

export const useTheme = useThemeContext;

export default useTheme;
