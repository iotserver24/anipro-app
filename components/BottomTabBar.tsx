import React, { useCallback, memo, useState, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, Animated } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { getTVFocusProps } from '../hooks/useTVRemoteHandler';

// Props interface for Tab
interface TabProps {
  path: string;
  name: string;
  icon: string;
  IconComponent: any;
  isActive: boolean;
  onPress: () => void;
  theme: any;
}

// Create a memoized tab component to prevent unnecessary re-renders
const Tab = memo(({ path, name, icon, IconComponent, isActive, onPress, theme }: TabProps) => {
  // Animation value for press feedback
  const [pressAnim] = useState(new Animated.Value(1));
  
  const handlePressIn = () => {
    Animated.timing(pressAnim, {
      toValue: 0.8,
      duration: 100,
      useNativeDriver: true
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true
    }).start();
  };

  return (
    <TouchableOpacity
      key={path}
      style={styles.tab}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.5}
      delayPressIn={0}
      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      pressRetentionOffset={{ top: 20, left: 20, bottom: 20, right: 20 }}
      {...getTVFocusProps(isActive)}
    >
      <Animated.View style={{ 
        transform: [{ scale: pressAnim }],
        alignItems: 'center'
      }}>
        <IconComponent
          name={icon}
          size={24}
          color={isActive ? theme.colors.primary : theme.colors.textSecondary}
        />
        <Text style={[
          styles.tabText,
          { color: isActive ? theme.colors.primary : theme.colors.textSecondary },
          isActive && styles.activeTabText
        ]}>
          {name}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

function BottomTabBar() {
  const { theme } = useTheme();
  const pathname = usePathname();
  const [searchPressAnim] = useState(new Animated.Value(1));
  
  // Navigation tabs for the left side
  const leftTabs = [
    {
      name: 'Home',
      path: '/',
      icon: 'home',
      IconComponent: MaterialIcons
    },
    {
      name: 'Schedule',
      path: '/schedule',
      icon: 'schedule',
      IconComponent: MaterialIcons
    }
  ];

  // Navigation tabs for the right side
  const rightTabs = [
    {
      name: 'History',
      path: '/history',
      icon: 'history',
      IconComponent: MaterialIcons
    },
    {
      name: 'Profile',
      path: '/profile',
      icon: 'person',
      IconComponent: MaterialIcons
    }
  ];

  // Direct navigation callback - optimized for tab navigation
  const navigateTo = useCallback((path) => {
    if (pathname === path) return; // Don't navigate if already on the page
    
    // Use replace for tab navigation to avoid building up navigation stack
    router.replace(path);
  }, [pathname]);

  // Search button animation
  const handleSearchPressIn = () => {
    Animated.timing(searchPressAnim, {
      toValue: 0.9,
      duration: 100,
      useNativeDriver: true
    }).start();
  };
  
  const handleSearchPressOut = () => {
    Animated.timing(searchPressAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true
    }).start();
  };

  // Handle search button press - use push instead of replace
  const handleSearchPress = useCallback(() => {
    router.push({
      pathname: '/search',
      params: { query: '' }
    });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
      {/* Left tabs */}
      <View style={styles.sideContainer}>
        {leftTabs.map((tab) => (
          <Tab
            key={tab.path}
            path={tab.path}
            name={tab.name}
            icon={tab.icon}
            IconComponent={tab.IconComponent}
            isActive={pathname === tab.path}
            onPress={() => navigateTo(tab.path)}
            theme={theme}
          />
        ))}
      </View>

      {/* Center search button */}
      <View style={styles.centerContainer}>
        <TouchableOpacity
          style={styles.searchButtonTouchable}
          onPress={handleSearchPress}
          onPressIn={handleSearchPressIn}
          onPressOut={handleSearchPressOut}
          activeOpacity={0.7}
          delayPressIn={0}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          pressRetentionOffset={{ top: 20, left: 20, bottom: 20, right: 20 }}
          {...getTVFocusProps(pathname === '/search')}
        >
          <Animated.View style={[
            styles.searchButton,
            { transform: [{ scale: searchPressAnim }] }
          ]}>
            <MaterialIcons name="search" size={30} color="#000" />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Right tabs */}
      <View style={styles.sideContainer}>
        {rightTabs.map((tab) => (
          <Tab
            key={tab.path}
            path={tab.path}
            name={tab.name}
            icon={tab.icon}
            IconComponent={tab.IconComponent}
            isActive={pathname === tab.path}
            onPress={() => navigateTo(tab.path)}
            theme={theme}
          />
        ))}
      </View>
    </View>
  );
}

// Export a memoized version of the component to prevent unnecessary re-renders
export default memo(BottomTabBar);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    height: 60,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999, // Ensure it's above other content
    elevation: Platform.OS === 'android' ? 8 : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  sideContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000, // Above the tab bar itself
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    // Apply a slight elevation to each tab for better visual touch feedback
    ...Platform.select({
      android: {
        elevation: 0,
      },
      ios: {
        shadowColor: 'transparent',
      }
    }),
  },
  tabText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: 'bold',
  },
  searchButtonTouchable: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e91e63', // Pink color matching the image
    justifyContent: 'center',
    alignItems: 'center',
    bottom: 15, // Position it partly outside the navbar
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: Platform.OS === 'android' ? 10 : 0,
  }
}); 