import React, { useCallback, memo, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, Animated, ScrollView } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { getTVFocusProps } from '../hooks/useTVRemoteHandler';

// Props interface for NavItem
interface NavItemProps {
  path: string;
  name: string;
  icon: string;
  IconComponent: any;
  isActive: boolean;
  onPress: () => void;
  theme: any;
}

// Create a memoized nav item component to prevent unnecessary re-renders
const NavItem = memo(({ path, name, icon, IconComponent, isActive, onPress, theme }: NavItemProps) => {
  const [pressAnim] = useState(new Animated.Value(1));
  
  const handlePressIn = () => {
    Animated.timing(pressAnim, {
      toValue: 0.95,
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
      style={[
        styles.navItem,
        isActive && [styles.activeNavItem, { backgroundColor: theme.colors.primary + '20' }]
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.7}
      delayPressIn={0}
      hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
      pressRetentionOffset={{ top: 10, left: 10, bottom: 10, right: 10 }}
      {...getTVFocusProps(isActive)}
    >
      <Animated.View style={{ 
        transform: [{ scale: pressAnim }],
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%'
      }}>
        <IconComponent
          name={icon}
          size={24}
          color={isActive ? theme.colors.primary : theme.colors.textSecondary}
        />
        <Text style={[
          styles.navText,
          { color: isActive ? theme.colors.primary : theme.colors.textSecondary },
          isActive && styles.activeNavText
        ]}>
          {name}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

function SideNavBar() {
  const { theme } = useTheme();
  const pathname = usePathname();
  
  // Navigation items - organized by category
  const navItems = [
    // Main Navigation
    {
      name: 'Home',
      path: '/',
      icon: 'home',
      IconComponent: MaterialIcons,
      category: 'main'
    },
    {
      name: 'Search',
      path: '/search',
      icon: 'search',
      IconComponent: MaterialIcons,
      category: 'main'
    },
    {
      name: 'My List',
      path: '/mylist',
      icon: 'bookmark',
      IconComponent: MaterialIcons,
      category: 'main'
    },
    {
      name: 'History',
      path: '/history',
      icon: 'history',
      IconComponent: MaterialIcons,
      category: 'main'
    },
    {
      name: 'Schedule',
      path: '/schedule',
      icon: 'schedule',
      IconComponent: MaterialIcons,
      category: 'main'
    },
    // Communication
    {
      name: 'Chat',
      path: '/chat',
      icon: 'chat',
      IconComponent: MaterialIcons,
      category: 'social'
    },
    {
      name: 'Notifications',
      path: '/notifications',
      icon: 'notifications',
      IconComponent: MaterialIcons,
      category: 'social'
    },
    // User
    {
      name: 'Profile',
      path: '/profile',
      icon: 'person',
      IconComponent: MaterialIcons,
      category: 'user'
    },
    {
      name: 'About',
      path: '/about',
      icon: 'info',
      IconComponent: MaterialIcons,
      category: 'user'
    }
  ];

  // Direct navigation callback - optimized for nav
  const navigateTo = useCallback((path) => {
    if (pathname === path) return; // Don't navigate if already on the page
    
    // Use replace for main navigation to avoid building up navigation stack
    router.replace(path);
  }, [pathname]);

  return (
    <View style={[styles.container, { 
      backgroundColor: theme.colors.surface, 
      borderRightColor: theme.colors.border 
    }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* App title/logo */}
        <View style={styles.header}>
          <MaterialIcons name="play-circle-filled" size={32} color={theme.colors.primary} />
          <Text style={[styles.appTitle, { color: theme.colors.text }]}>AniSurge</Text>
        </View>

        {/* Navigation items */}
        <View style={styles.navItemsContainer}>
          {navItems.map((item) => (
            <NavItem
              key={item.path}
              path={item.path}
              name={item.name}
              icon={item.icon}
              IconComponent={item.IconComponent}
              isActive={pathname === item.path}
              onPress={() => navigateTo(item.path)}
              theme={theme}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// Export a memoized version of the component to prevent unnecessary re-renders
export default memo(SideNavBar);

const styles = StyleSheet.create({
  container: {
    width: 250,
    height: '100%',
    borderRightWidth: 1,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 999,
    elevation: Platform.OS === 'android' ? 8 : 0,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 20,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  navItemsContainer: {
    paddingHorizontal: 10,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
  },
  activeNavItem: {
    borderLeftWidth: 4,
  },
  navText: {
    fontSize: 16,
    marginLeft: 16,
    fontWeight: '500',
  },
  activeNavText: {
    fontWeight: 'bold',
  },
});
