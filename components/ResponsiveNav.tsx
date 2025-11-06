import React, { memo } from 'react';
import { useWindowDimensions, Platform } from 'react-native';
import BottomTabBar from './BottomTabBar';
import SideNavBar from './SideNavBar';

// Breakpoint for switching between bottom and side navigation
const LARGE_SCREEN_BREAKPOINT = 768; // Tablets and above

function ResponsiveNav() {
  const { width } = useWindowDimensions();
  
  // Determine if we should show side navigation
  // Use side nav for:
  // - Large screens (tablets, desktops)
  // - Android TV
  // - Windows/macOS/Linux
  const isLargeScreen = width >= LARGE_SCREEN_BREAKPOINT;
  const isTV = Platform.isTV || Platform.OS === 'android' && Platform.Version >= 21; // Android TV detection
  const isDesktop = Platform.OS === 'web' || Platform.OS === 'windows' || Platform.OS === 'macos';
  
  const shouldUseSideNav = isLargeScreen || isTV || isDesktop;
  
  return shouldUseSideNav ? <SideNavBar /> : <BottomTabBar />;
}

// Export memoized component
export default memo(ResponsiveNav);

// Export helper to determine if side nav is being used (for layout adjustments)
export const useIsLargeScreen = () => {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= LARGE_SCREEN_BREAKPOINT;
  const isTV = Platform.isTV || Platform.OS === 'android' && Platform.Version >= 21;
  const isDesktop = Platform.OS === 'web' || Platform.OS === 'windows' || Platform.OS === 'macos';
  
  return isLargeScreen || isTV || isDesktop;
};

// Export the breakpoint for use in other components
export { LARGE_SCREEN_BREAKPOINT };
