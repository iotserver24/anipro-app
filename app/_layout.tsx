// NOTE: The main entry page for the app is app/index.tsx as per Expo Router conventions.
import { Stack, router, usePathname } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { View, BackHandler, Alert, Text, StyleSheet, TouchableOpacity, Image, ImageBackground } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider as NavigationThemeProvider, DarkTheme } from '@react-navigation/native';
import { ThemeProvider } from '../contexts/ThemeContext';
import { useTheme } from '../hooks/useTheme';
import SearchBar from '../components/SearchBar';
import { useWatchHistoryStore } from '../store/watchHistoryStore';
import * as ScreenOrientation from 'expo-screen-orientation';
import BottomTabBar from '../components/BottomTabBar';
import { restoreUserSession, isEmailVerified, getCurrentUser } from '../services/userService';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { useGlobalStore } from '../store/globalStore';
import { MaterialIcons } from '@expo/vector-icons';
import { getDoc, doc } from 'firebase/firestore';
import { getAvatarById, DEFAULT_AVATARS } from '../constants/avatars';
import { Tabs } from 'expo-router';
import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import AvatarDisplay from '../components/AvatarDisplay';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Make sure SplashScreen is prevented from auto-hiding
SplashScreen.preventAutoHideAsync();

// Custom header component with profile avatar
const HeaderRight = () => {
  const { theme } = useTheme();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const user = getCurrentUser();

  // Generate unique filename for avatar caching
  const generateAvatarFilename = (avatarId: string, originalUrl: string): string => {
    // Extract extension from URL, handling various formats
    const urlParts = originalUrl.split('.');
    const extension = urlParts.length > 1 ? urlParts.pop()?.toLowerCase() : 'jpg';
    
    // Handle common avatar formats
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm'];
    const finalExtension = validExtensions.includes(extension || '') ? extension : 'jpg';
    
    return `header_avatar_${avatarId}_${Date.now()}.${finalExtension}`;
  };

  // Cache avatar media to local storage (supports images, gifs, videos)
  const cacheAvatarImage = async (avatarId: string, mediaUrl: string): Promise<string> => {
    try {
      const documentDir = FileSystem.documentDirectory;
      if (!documentDir) {
        throw new Error('Document directory not available');
      }

      // Create avatars subdirectory if it doesn't exist
      const avatarsDir = documentDir + 'avatars/';
      const dirInfo = await FileSystem.getInfoAsync(avatarsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(avatarsDir, { intermediates: true });
      }

      // Generate unique filename with proper extension
      const filename = generateAvatarFilename(avatarId, mediaUrl);
      const destinationUri = avatarsDir + filename;

      console.log(`[Header Avatar] Caching avatar: ${mediaUrl} -> ${destinationUri}`);

      // Download and cache the media file
      const downloadResult = await FileSystem.downloadAsync(mediaUrl, destinationUri);
      
      if (downloadResult.status === 200) {
        // Validate the downloaded file exists and has content
        const fileInfo = await FileSystem.getInfoAsync(destinationUri);
        if (fileInfo.exists && fileInfo.size && fileInfo.size > 0) {
          console.log(`[Header Avatar] Avatar cached successfully: ${destinationUri} (${fileInfo.size} bytes)`);
          return destinationUri;
        } else {
          throw new Error('Downloaded file is empty or invalid');
        }
      } else {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }
    } catch (error) {
      console.error('[Header Avatar] Error caching avatar:', error);
      throw error;
    }
  };

  // Validate cached avatar exists and is not corrupted
  const validateCachedAvatar = async (uri: string): Promise<boolean> => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      
      // Check if file exists and has content
      if (!fileInfo.exists || !fileInfo.size || fileInfo.size === 0) {
        console.log('[Header Avatar] Cached avatar is missing or empty:', uri);
        return false;
      }
      
      // Additional validation for different file types
      const extension = uri.split('.').pop()?.toLowerCase();
      
      // For video files, we might want to do additional checks
      if (extension === 'mp4' || extension === 'webm') {
        // Basic size check for videos (should be larger than a few KB)
        if (fileInfo.size < 1024) {
          console.log('[Header Avatar] Cached video avatar seems too small:', uri, fileInfo.size);
          return false;
        }
      }
      
      console.log('[Header Avatar] Cached avatar validation passed:', uri, fileInfo.size, 'bytes');
      return true;
    } catch (error) {
      console.error('[Header Avatar] Error validating cached avatar:', error);
      return false;
    }
  };

  // Clean up old avatar files and duplicates
  const cleanupOldAvatars = async (currentAvatarUri: string, avatarId: string) => {
    try {
      const documentDir = FileSystem.documentDirectory;
      if (!documentDir) return;

      const avatarsDir = documentDir + 'avatars/';
      const dirInfo = await FileSystem.getInfoAsync(avatarsDir);
      
      if (dirInfo.exists) {
        const files = await FileSystem.readDirectoryAsync(avatarsDir);
        
        // Delete files that are not the current avatar
        for (const file of files) {
          const fileUri = avatarsDir + file;
          
          // Keep current avatar, delete everything else
          if (fileUri !== currentAvatarUri) {
            try {
              await FileSystem.deleteAsync(fileUri, { idempotent: true });
              console.log('[Header Avatar] Cleaned up old avatar:', file);
            } catch (error) {
              console.error('[Header Avatar] Error deleting old avatar:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('[Header Avatar] Error during avatar cleanup:', error);
    }
  };

  // Function to fetch user avatar with caching
  const fetchUserAvatar = async () => {
    try {
      if (!initialized) {
        console.log('[Header Avatar] Waiting for auth initialization...');
        return;
      }

      // Prevent multiple simultaneous fetches
      if (isFetching) {
        console.log('[Header Avatar] Already fetching avatar, skipping...');
        return;
      }

      setIsFetching(true);
      setLoading(true);
      
      if (!user) {
        console.log('[Header Avatar] No user found, using default avatar');
        setAvatarUrl(DEFAULT_AVATARS[0].url);
        return;
      }

      console.log('[Header Avatar] Fetching avatar for user:', user.uid);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        console.log('[Header Avatar] User document not found, using default avatar');
        setAvatarUrl(DEFAULT_AVATARS[0].url);
        return;
      }

      const userData = userDoc.data();
      console.log('[Header Avatar] User data:', userData);

      // Check premium status first
      const isPremiumUser = userData.isPremium || false;
      const donationAmount = userData.donationAmount || userData.premiumAmount || 0;
      setIsPremium(isPremiumUser || donationAmount > 0);

      // Try each avatar source in order of preference
      let finalAvatarUrl = null;
      let avatarId = null;

      // 1. Try avatarId first
      if (userData.avatarId) {
        avatarId = userData.avatarId;
        
        // Check if we have a cached version first
        const cachedAvatarKey = `cached_header_avatar_${avatarId}`;
        const cachedAvatarUri = await AsyncStorage.getItem(cachedAvatarKey);
        
        if (cachedAvatarUri) {
          // Validate cached avatar still exists
          const isValid = await validateCachedAvatar(cachedAvatarUri);
          if (isValid) {
            console.log('[Header Avatar] Using cached avatar:', cachedAvatarUri);
            setAvatarUrl(cachedAvatarUri);
            return;
          } else {
            // Remove invalid cache entry
            await AsyncStorage.removeItem(cachedAvatarKey);
          }
        }

        try {
          console.log('[Header Avatar] Attempting to fetch avatar by ID:', avatarId);
          finalAvatarUrl = await getAvatarById(avatarId);
          console.log('[Header Avatar] Successfully fetched avatar by ID:', finalAvatarUrl);
          
          // Cache the avatar image locally
          try {
            const cachedUri = await cacheAvatarImage(avatarId, finalAvatarUrl);
            
            // Save the cached URI to AsyncStorage
            await AsyncStorage.setItem(cachedAvatarKey, cachedUri);
            
            // Clean up old avatars
            await cleanupOldAvatars(cachedUri, avatarId);
            
            setAvatarUrl(cachedUri);
            console.log('[Header Avatar] Avatar cached and set:', cachedUri);
            return;
          } catch (cacheError) {
            console.warn('[Header Avatar] Failed to cache avatar, using original URL:', cacheError);
            setAvatarUrl(finalAvatarUrl);
            return;
          }
        } catch (error) {
          console.error('[Header Avatar] Error fetching avatar by ID:', error);
        }
      }

      // 2. Try direct avatarUrl if avatarId failed
      if (!finalAvatarUrl && userData.avatarUrl) {
        console.log('[Header Avatar] Using direct avatarUrl:', userData.avatarUrl);
        finalAvatarUrl = userData.avatarUrl;
      }

      // 3. Try legacy avatar field if avatarUrl failed
      if (!finalAvatarUrl && userData.avatar) {
        console.log('[Header Avatar] Using legacy avatar field:', userData.avatar);
        finalAvatarUrl = userData.avatar;
      }

      // 4. Try user's photoURL if all else failed
      if (!finalAvatarUrl && user.photoURL) {
        console.log('[Header Avatar] Using user photoURL:', user.photoURL);
        finalAvatarUrl = user.photoURL;
      }

      // 5. Fall back to default if nothing worked
      if (!finalAvatarUrl) {
        console.log('[Header Avatar] No avatar found, using default');
        finalAvatarUrl = DEFAULT_AVATARS[0].url;
      }

      // Set the final avatar URL
      setAvatarUrl(finalAvatarUrl);

    } catch (error) {
      console.error('[Header Avatar] Error in fetchUserAvatar:', error);
      setAvatarUrl(DEFAULT_AVATARS[0].url);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  // Listen for auth initialization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('[Header Avatar] Auth state changed:', user ? 'User logged in' : 'No user');
      setInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  // Fetch avatar when component mounts and auth is initialized
  useEffect(() => {
    if (initialized && !isFetching) {
      console.log('[Header Avatar] Auth initialized, fetching avatar');
      fetchUserAvatar();
    }
  }, [initialized]); // Depend on initialized state

  // Fetch avatar when user changes
  useEffect(() => {
    if (initialized && user && !isFetching) {
      console.log('[Header Avatar] User changed, fetching new avatar');
      fetchUserAvatar();
    }
  }, [user?.uid, initialized]); // Depend on both user ID and initialized state

  const handleProfilePress = () => {
    router.push('/profile');
  };

  return (
    <TouchableOpacity 
      style={styles.profileButton} 
      onPress={handleProfilePress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {loading ? (
          <View style={styles.avatarPlaceholder}>
            <MaterialIcons name="person" size={24} color="#aaa" />
          </View>
        ) : (
          isPremium ? (
            <View style={styles.premiumAvatarBorderWrapper}>
                          <AvatarDisplay
              url={avatarUrl || DEFAULT_AVATARS[0].url}
              style={styles.avatarImage}
              isPremium={isPremium}
              onError={() => {
                console.error('[Header Avatar] Error loading avatar');
                console.log('[Header Avatar] Falling back to default avatar');
                setAvatarUrl(DEFAULT_AVATARS[0].url);
              }}
            />
            </View>
          ) : (
            <AvatarDisplay
              url={avatarUrl || DEFAULT_AVATARS[0].url}
              style={styles.avatarImage}
              isPremium={isPremium}
              onError={() => {
                console.error('[Header Avatar] Error loading avatar');
                console.log('[Header Avatar] Falling back to default avatar');
                setAvatarUrl(DEFAULT_AVATARS[0].url);
              }}
            />
          )
        )}
        {isPremium && (
          <View style={styles.premiumBadge}>
            <MaterialIcons name="star" size={14} color="#FFD700" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    // Temporarily comment out fonts until we have them
    // 'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
    // 'Poppins-Medium': require('../assets/fonts/Poppins-Medium.ttf'),
    // 'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
    // 'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const initializeHistory = useWatchHistoryStore(state => state.initializeHistory);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [verificationChecked, setVerificationChecked] = useState(false);
  
  // Store email verification status in global store
  const setEmailVerificationStatus = useGlobalStore(state => state.setEmailVerificationStatus);
  
  // Handle authentication state
  useEffect(() => {
    console.log('[DEBUG] App: Setting up auth state initialization');
    
    // First try to restore from AsyncStorage - this will sign in the user 
    // if there are stored credentials
    const initAuth = async () => {
      try {
        const restored = await restoreUserSession();
        if (restored) {
          console.log('[DEBUG] App: Successfully restored auth session');
          
          // Check email verification status
          const user = getCurrentUser();
          if (user) {
            const verified = isEmailVerified();
            console.log('[DEBUG] App: Email verification status:', verified);
            setEmailVerificationStatus(verified);
            
            // If not verified, navigate to profile page to show verification banner
            if (!verified) {
              // Use setTimeout to ensure navigation happens after app is fully loaded
              setTimeout(() => {
                Alert.alert(
                  "Email Verification Required",
                  "Please verify your email to access all app features. A verification link has been sent to your email.",
                  [
                    { text: "Later", style: "cancel" },
                    { 
                      text: "Go to Profile", 
                      onPress: () => router.push('/profile')
                    }
                  ]
                );
              }, 1000);
            }
          }
        } else {
          console.log('[DEBUG] App: No session to restore or restoration failed');
        }
        setVerificationChecked(true);
      } catch (error) {
        console.error('[DEBUG] App: Error during auth restoration:', error);
        setVerificationChecked(true);
      } finally {
        // Mark auth as initialized regardless of outcome
        setAuthInitialized(true);
      }
    };
    
    initAuth();
    
    // Then set up the Firebase auth state listener for future changes
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        console.log('[DEBUG] App: User is signed in:', user.uid);
        // Update verification status when auth state changes
        setEmailVerificationStatus(user.emailVerified);
      } else {
        console.log('[DEBUG] App: User is signed out');
        setEmailVerificationStatus(false);
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Initialize app data after authentication is handled
  useEffect(() => {
    if (!authInitialized) return;
    
    // Function to initialize all app data
    const initializeAppData = async () => {
      console.log('[DEBUG] App: Starting app data initialization');
      
      try {
        // Load watch history
        console.log('[DEBUG] App: Initializing watch history store');
        await initializeHistory();
        console.log('[DEBUG] App: Watch history initialized successfully');
        
        // Initialize avatars - critical for comment display
        try {
          // Avatar fetching and migration disabled for performance reasons
          // Avatars will be handled by Cloudflare Workers instead
          console.log('[DEBUG] App: Avatar fetching and migration disabled');
        } catch (avatarError) {
          console.error('[DEBUG] App: Error in avatar handling:', avatarError);
        }
      } catch (error) {
        console.error('[DEBUG] App: Error initializing app data:', error);
      }
    };
    
    initializeAppData();
    
    // Set up refresh interval for watch history
    const refreshInterval = setInterval(() => {
      console.log('[DEBUG] App: Refreshing watch history');
      initializeHistory().catch(error => {
        console.error('[DEBUG] App: Error refreshing watch history:', error);
      });
    }, 60000); // Refresh every minute
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [authInitialized, initializeHistory]);

  useEffect(() => {
    const backAction = () => {
      // Check if we can go back in navigation stack
      if (router.canGoBack()) {
        router.back(); // Let the normal back navigation happen
        return true;
      }
      
      // If we're at the root screen, show exit dialog
      Alert.alert(
        'Exit App',
        'Are you sure you want to exit?',
        [
          {
            text: 'Cancel',
            onPress: () => null,
            style: 'cancel',
          },
          { 
            text: 'Exit',
            onPress: () => BackHandler.exitApp(),
            style: 'destructive'
          },
        ],
        { cancelable: true }
      );
      return true; // Prevents default back action
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, []);

  // Removed orientation lock to allow app to respect device orientation

  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
  const pathname = usePathname();
  const isWatchPage = pathname?.includes('/anime/watch/');
  const isChatPage = pathname?.includes('/chat');
  
  // Update global store with current page states
  const setIsVideoFullscreenGlobal = useGlobalStore(state => state.setIsVideoFullscreen);
  const setIsWatchPageGlobal = useGlobalStore(state => state.setIsWatchPage);
  const setIsChatPageGlobal = useGlobalStore(state => state.setIsChatPage);
  
  useEffect(() => {
    setIsVideoFullscreenGlobal(isVideoFullscreen);
    setIsWatchPageGlobal(isWatchPage);
    setIsChatPageGlobal(isChatPage);
  }, [isVideoFullscreen, isWatchPage, isChatPage, setIsVideoFullscreenGlobal, setIsWatchPageGlobal, setIsChatPageGlobal]);

  useEffect(() => {
    const subscription = ScreenOrientation.addOrientationChangeListener((event) => {
      const isLandscape = event.orientationInfo.orientation >= 3; // 3 and 4 are landscape orientations
      // Only set video fullscreen if we're actually on a watch page
      if (isWatchPage) {
        setIsVideoFullscreen(isLandscape);
      } else {
        // If not on watch page, don't hide the bottom nav bar
        setIsVideoFullscreen(false);
      }
    });

    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription);
    };
  }, [isWatchPage]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <ThemedLayout onLayoutRootView={onLayoutRootView} />
    </ThemeProvider>
  );
}

// Separate component that uses theme context
function ThemedLayout({ onLayoutRootView }: { onLayoutRootView: () => void }) {
  const { theme, statusBarStyle, hasBackgroundMedia, backgroundMedia } = useTheme();
  const isVideoFullscreen = useGlobalStore(state => state.isVideoFullscreen);
  const isWatchPage = useGlobalStore(state => state.isWatchPage);
  const isChatPage = useGlobalStore(state => state.isChatPage);

  return (
    <NavigationThemeProvider value={DarkTheme}>
      {hasBackgroundMedia && backgroundMedia.image ? (
        <ImageBackground
          source={{ uri: backgroundMedia.image }}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          {/* Semi-transparent overlay for better content readability */}
          <View style={[styles.backgroundOverlay, { opacity: 1 - backgroundMedia.opacity }]} />
          <View style={styles.contentContainer} onLayout={onLayoutRootView}>
            <StatusBar style={statusBarStyle} />
            <Stack 
              screenOptions={{ 
                headerStyle: {
                  backgroundColor: 'transparent',
                },
                headerTintColor: theme.colors.text,
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              contentStyle: {
                backgroundColor: 'transparent',
                paddingBottom: isVideoFullscreen || isChatPage ? 0 : 60,
              },
                animation: 'none',
                animationDuration: 0,
              }}
            >
          <Stack.Screen
            name="index"
            options={{
              title: 'AniSurge',
              headerBackVisible: false, // Hide back button on home page
              headerLeft: () => null, // Remove headerLeft completely
              headerRight: () => <HeaderRight />,
            }}
          />
          <Stack.Screen
            name="schedule"
            options={{
              title: 'Schedule',
              headerShown: true,
              headerRight: () => <HeaderRight />,
            }}
          />
          <Stack.Screen
            name="anime/[id]"
            options={{
              title: '',
              headerTransparent: true,
              headerTintColor: '#fff',
              headerBackTitle: ' ',
              headerStyle: {
                backgroundColor: 'transparent',
              },
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="anime/watch/[episodeId]"
            options={({ route }) => ({
              title: 'Watch',
              headerShown: (route.params as any)?.headerShown !== false,
              presentation: 'card',
            })}
          />
          <Stack.Screen
            name="search"
            options={{
              title: 'Search',
              headerShown: true,
              headerRight: () => <HeaderRight />,
            }}
          />
          <Stack.Screen
            name="mylist"
            options={{
              title: 'My List',
              headerShown: true,
              headerRight: () => <HeaderRight />,
            }}
          />
          <Stack.Screen
            name="about"
            options={{
              title: 'About',
              headerShown: true,
              headerRight: () => <HeaderRight />,
            }}
          />
          <Stack.Screen
            name="profile"
            options={{
              title: 'Profile',
              headerShown: true,
            }}
          />
          <Stack.Screen
            name="mentions"
            options={{
              title: 'Mentions',
              headerShown: true,
              headerRight: () => <HeaderRight />,
            }}
          />
            </Stack>
            {/* Position the bottom tab bar with absolute positioning outside the Stack */}
            <View style={styles.bottomTabContainer}>
              {!isVideoFullscreen && !isChatPage && <BottomTabBar />}
            </View>
          </View>
        </ImageBackground>
      ) : (
        <View style={styles.contentContainer} onLayout={onLayoutRootView}>
          <StatusBar style={statusBarStyle} />
          <Stack 
            screenOptions={{ 
              headerStyle: {
                backgroundColor: theme.colors.surface,
              },
              headerTintColor: theme.colors.text,
              headerTitleStyle: {
                fontWeight: 'bold',
              },
              contentStyle: {
                backgroundColor: theme.colors.background,
                paddingBottom: isVideoFullscreen || isChatPage ? 0 : 60,
              },
              animation: 'none',
              animationDuration: 0,
            }}
          >
            <Stack.Screen
              name="index"
              options={{
                title: 'AniSurge',
                headerBackVisible: false, // Hide back button on home page
                headerLeft: () => null, // Remove headerLeft completely
                headerRight: () => <HeaderRight />,
              }}
            />
            <Stack.Screen
              name="schedule"
              options={{
                title: 'Schedule',
                headerShown: true,
                headerRight: () => <HeaderRight />,
              }}
            />
            <Stack.Screen
              name="search"
              options={{
                title: 'Search',
                headerShown: true,
                headerRight: () => <HeaderRight />,
              }}
            />
            <Stack.Screen
              name="chat"
              options={{
                title: 'Chat',
                headerShown: true,
                headerRight: () => <HeaderRight />,
              }}
            />
            <Stack.Screen
              name="mylist"
              options={{
                title: 'My List',
                headerShown: true,
                headerRight: () => <HeaderRight />,
              }}
            />
            <Stack.Screen
              name="about"
              options={{
                title: 'About',
                headerShown: true,
                headerRight: () => <HeaderRight />,
              }}
            />
            <Stack.Screen
              name="profile"
              options={{
                title: 'Profile',
                headerShown: true,
              }}
            />
            <Stack.Screen
              name="mentions"
              options={{
                title: 'Mentions',
                headerShown: true,
                headerRight: () => <HeaderRight />,
              }}
            />
          </Stack>
          {/* Position the bottom tab bar with absolute positioning outside the Stack */}
          <View style={styles.bottomTabContainer}>
            {!isVideoFullscreen && !isChatPage && <BottomTabBar />}
          </View>
        </View>
      )}
    </NavigationThemeProvider>
  );
}

const styles = StyleSheet.create({
  profileButton: {
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    marginTop: '-2%', // Move avatar up by 2%
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#f4511e', // Only for non-premium
  },
  premiumAvatarBorderWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#555',
  },
  avatarContainer: {
    position: 'relative',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#121212',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFD700',
  },
  bottomTabContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    zIndex: 9999,
  },
  backgroundMediaContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Base dark overlay
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
