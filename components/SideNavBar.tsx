import React, { useCallback, memo, useState, useEffect, useRef, useMemo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, Animated, ScrollView, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { getTVFocusProps } from '../hooks/useTVRemoteHandler';
import { useGlobalStore } from '../store/globalStore';
import { openDonationPage } from '../services/donationService';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { getCurrentUser } from '../services/userService';
import AvatarDisplay from '../components/AvatarDisplay';
import { DEFAULT_AVATARS } from '../constants/avatars';
import { getAppVersion, getAppVersionCode } from '../constants/appConfig';

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

interface NavItemConfig {
  name: string;
  icon: string;
  IconComponent: any;
  category: string;
  path?: string;
  action?: () => void;
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

const toTranslucentColor = (color: string, alpha: number) => {
  if (typeof color !== 'string') {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  const trimmed = color.trim();

  if (trimmed.startsWith('#')) {
    let hex = trimmed.slice(1);

    if (hex.length === 3) {
      hex = hex.split('').map((char) => char + char).join('');
    }

    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);

      if (![r, g, b].some((value) => Number.isNaN(value))) {
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    }
  }

  if (trimmed.startsWith('rgb(')) {
    const values = trimmed
      .slice(4, -1)
      .split(',')
      .map((value) => parseInt(value.trim(), 10));

    if (values.length >= 3 && values.every((value) => !Number.isNaN(value))) {
      return `rgba(${values[0]}, ${values[1]}, ${values[2]}, ${alpha})`;
    }
  }

  if (trimmed.startsWith('rgba(')) {
    return trimmed.replace(
      /rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)/,
      (_, r, g, b) => `rgba(${r.trim()}, ${g.trim()}, ${b.trim()}, ${alpha})`
    );
  }

  return trimmed;
};

function SideNavBar() {
  const { theme } = useTheme();
  const pathname = usePathname();
  
  // Navigation items - organized by category
  const navItems: NavItemConfig[] = [
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
      name: 'Chat',
      path: '/chat',
      icon: 'chat',
      IconComponent: MaterialIcons,
      category: 'main'
    },
    {
      name: 'About',
      path: '/about',
      icon: 'info',
      IconComponent: MaterialIcons,
      category: 'user'
    },
    {
      name: 'Profile',
      path: '/profile',
      icon: 'person',
      IconComponent: MaterialIcons,
      category: 'user'
    },
    {
      name: 'Schedule',
      path: '/schedule',
      icon: 'schedule',
      IconComponent: MaterialIcons,
      category: 'main'
    },
    {
      name: 'Gallery',
      path: '/gallery',
      icon: 'photo-library',
      IconComponent: MaterialIcons,
      category: 'main'
    },
    // Communication
    {
      name: 'Notifications',
      path: '/notifications',
      icon: 'notifications',
      IconComponent: MaterialIcons,
      category: 'social'
    },
    // User
    {
      name: 'Mentions',
      path: '/mentions',
      icon: 'alternate-email',
      IconComponent: MaterialIcons,
      category: 'user'
    },
    {
      name: 'Theme Settings',
      path: '/theme-settings',
      icon: 'palette',
      IconComponent: MaterialIcons,
      category: 'settings'
    },
    {
      name: 'Import / Export',
      path: '/importExport',
      icon: 'sync',
      IconComponent: MaterialIcons,
      category: 'settings'
    },
    {
      name: 'Support AniSurge',
      icon: 'volunteer-activism',
      IconComponent: MaterialIcons,
      category: 'support',
      action: () => openDonationPage()
    }
  ];

  const isMenuOpen = useGlobalStore(state => state.isMenuOpen);
  const setIsMenuOpen = useGlobalStore(state => state.setIsMenuOpen);
  const [shouldRender, setShouldRender] = useState(isMenuOpen);
  const slideAnim = useRef(new Animated.Value(-250)).current; // Start off-screen
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  
  // Profile avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const user = getCurrentUser();
  const translucentSurface = useMemo(() => {
    const translucent = toTranslucentColor(theme.colors.surface, 0.92);
    if (translucent === theme.colors.surface) {
      return 'rgba(12, 12, 12, 0.92)';
    }
    return translucent;
  }, [theme.colors.surface]);

  const { versionLabel, buildLabel } = useMemo(() => {
    const version = getAppVersion() || '0.0.0';
    const build = getAppVersionCode();
    return {
      versionLabel: version,
      buildLabel: build !== undefined ? build.toString() : '0',
    };
  }, []);

  // Fetch user avatar
  const fetchUserAvatar = useCallback(async () => {
    try {
      if (!initialized || !user) {
        setAvatarUrl(DEFAULT_AVATARS[0].url);
        setLoading(false);
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        setAvatarUrl(DEFAULT_AVATARS[0].url);
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      const isPremiumUser = userData.isPremium || false;
      const donationAmount = userData.donationAmount || userData.premiumAmount || 0;
      setIsPremium(isPremiumUser || donationAmount > 0);

      let finalAvatarUrl = userData.avatarUrl || userData.avatar || user.photoURL || DEFAULT_AVATARS[0].url;
      setAvatarUrl(finalAvatarUrl);
    } catch (error) {
      console.error('[SideNav Avatar] Error fetching avatar:', error);
      setAvatarUrl(DEFAULT_AVATARS[0].url);
    } finally {
      setLoading(false);
    }
  }, [initialized, user]);

  // Listen for auth initialization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  // Fetch avatar when component mounts and auth is initialized
  useEffect(() => {
    if (initialized) {
      fetchUserAvatar();
    }
  }, [initialized, user?.uid, fetchUserAvatar]);

  // Animate menu slide in/out
  useEffect(() => {
    if (isMenuOpen) {
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (shouldRender) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -250,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [isMenuOpen, shouldRender, slideAnim, backdropOpacity]);

  // Direct navigation callback - optimized for nav
  const navigateTo = useCallback((path) => {
    if (pathname === path) {
      setIsMenuOpen(false);
      return;
    }

    if (path === '/') {
      router.replace(path);
    } else {
      router.push(path);
    }
    setIsMenuOpen(false);
  }, [pathname, setIsMenuOpen]);

  const handleCloseMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, [setIsMenuOpen]);

  const handleProfilePress = useCallback(() => {
    router.push('/profile');
    setIsMenuOpen(false);
  }, [setIsMenuOpen]);

  if (!shouldRender) {
    return null; // Don't render anything when menu is closed
  }

  return (
    <Modal
      transparent
      visible={shouldRender}
      animationType="none"
      onRequestClose={handleCloseMenu}
    >
      <View style={styles.modalContainer}>
        {/* Backdrop overlay */}
        <Animated.View 
          style={[
            styles.backdrop,
            { opacity: backdropOpacity }
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleCloseMenu}
          />
        </Animated.View>

        {/* Side menu */}
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: translucentSurface,
              borderRightColor: theme.colors.border,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Profile Avatar Section */}
            <TouchableOpacity
              onPress={handleProfilePress}
              style={styles.profileSection}
              activeOpacity={0.7}
            >
              <View style={styles.avatarContainer}>
                {loading ? (
                  <View style={styles.avatarPlaceholder}>
                    <MaterialIcons name="person" size={32} color={theme.colors.textSecondary} />
                  </View>
                ) : (
                  isPremium ? (
                    <View style={styles.premiumAvatarBorderWrapper}>
                      <View style={styles.premiumAvatarImageContainer}>
                        <AvatarDisplay
                          url={avatarUrl || DEFAULT_AVATARS[0].url}
                          style={styles.premiumAvatarImageLarge}
                          isPremium={isPremium}
                          onError={() => {
                            setAvatarUrl(DEFAULT_AVATARS[0].url);
                          }}
                        />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.regularAvatarBorderWrapper}>
                      <View style={styles.regularAvatarImageContainer}>
                        <AvatarDisplay
                          url={avatarUrl || DEFAULT_AVATARS[0].url}
                          style={styles.avatarImageLarge}
                          isPremium={isPremium}
                          onError={() => {
                            setAvatarUrl(DEFAULT_AVATARS[0].url);
                          }}
                        />
                      </View>
                    </View>
                  )
                )}
                {isPremium && (
                  <View style={styles.premiumBadge}>
                    <MaterialIcons name="star" size={16} color="#FFD700" />
                  </View>
                )}
              </View>
              <Text style={[styles.profileName, { color: theme.colors.text }]}>
                {user?.email?.split('@')[0] || 'Guest'}
              </Text>
              {isPremium && (
                <Text style={[styles.premiumLabel, { color: theme.colors.primary }]}>
                  Premium
                </Text>
              )}
              <Text
                style={[
                  styles.versionText,
                  { color: theme.colors.textSecondary ?? 'rgba(255,255,255,0.6)' }
                ]}
              >
                Version {versionLabel} (build {buildLabel})
              </Text>
            </TouchableOpacity>

            {/* Navigation items */}
            <View style={styles.navItemsContainer}>
              {navItems.map((item) => {
                const key = `${item.category}-${item.path ?? item.name}`;
                const itemPath = item.path ?? '';
                const isActive = item.path ? pathname === item.path : false;

                const handleItemPress = () => {
                  if (item.action) {
                    item.action();
                    setIsMenuOpen(false);
                  } else if (item.path) {
                    navigateTo(item.path);
                  }
                };

                return (
                  <NavItem
                    key={key}
                    path={itemPath}
                    name={item.name}
                    icon={item.icon}
                    IconComponent={item.IconComponent}
                    isActive={isActive}
                    onPress={handleItemPress}
                    theme={theme}
                  />
                );
              })}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Export a memoized version of the component to prevent unnecessary re-renders
export default memo(SideNavBar);

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    width: 250,
    height: '100%',
    borderRightWidth: 1,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 1000,
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
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarContainer: {
    position: 'relative',
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    marginTop: -5,
  },
  regularAvatarBorderWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#f4511e',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  regularAvatarImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#f4511e',
    overflow: 'hidden',
  },
  avatarImageLarge: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 0,
    overflow: 'hidden',
    transform: [{ translateX: -2 }, { translateY: -5 }],
  },
  premiumAvatarImageLarge: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 0,
    overflow: 'hidden',
    transform: [{ translateX: -2 }, { translateY: -5 }],
  },
  premiumAvatarBorderWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  premiumAvatarImageContainer: {
    width: 62,
    height: 62,
    borderRadius: 31,
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#555',
  },
  premiumBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#121212',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  premiumLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  versionText: {
    fontSize: 12,
    opacity: 0.7,
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
