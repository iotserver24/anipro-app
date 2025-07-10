import { Stack, router, usePathname } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { View, BackHandler, Alert, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
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
// These imports are commented out because we're removing the auth button from the header
// import { useGlobalStore } from '../store/globalStore';
// import AuthButton from '../components/AuthButton';

// Make sure SplashScreen is prevented from auto-hiding
SplashScreen.preventAutoHideAsync();

// Custom header component with profile avatar
const HeaderRight = () => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const user = getCurrentUser();

  // Function to fetch user avatar
  const fetchUserAvatar = async () => {
    try {
      if (!initialized) {
        console.log('[Avatar] Waiting for auth initialization...');
        return;
      }

      setLoading(true);
      
      if (!user) {
        console.log('[Avatar] No user found, using default avatar');
        setAvatarUrl(DEFAULT_AVATARS[0].url);
        return;
      }

      console.log('[Avatar] Fetching avatar for user:', user.uid);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        console.log('[Avatar] User document not found, using default avatar');
        setAvatarUrl(DEFAULT_AVATARS[0].url);
        return;
      }

      const userData = userDoc.data();
      console.log('[Avatar] User data:', userData);

      // Try each avatar source in order of preference
      let finalAvatarUrl = null;

      // 1. Try avatarId first
      if (userData.avatarId) {
        try {
          console.log('[Avatar] Attempting to fetch avatar by ID:', userData.avatarId);
          finalAvatarUrl = await getAvatarById(userData.avatarId);
          console.log('[Avatar] Successfully fetched avatar by ID:', finalAvatarUrl);
        } catch (error) {
          console.error('[Avatar] Error fetching avatar by ID:', error);
        }
      }

      // 2. Try direct avatarUrl if avatarId failed
      if (!finalAvatarUrl && userData.avatarUrl) {
        console.log('[Avatar] Using direct avatarUrl:', userData.avatarUrl);
        finalAvatarUrl = userData.avatarUrl;
      }

      // 3. Try legacy avatar field if avatarUrl failed
      if (!finalAvatarUrl && userData.avatar) {
        console.log('[Avatar] Using legacy avatar field:', userData.avatar);
        finalAvatarUrl = userData.avatar;
      }

      // 4. Try user's photoURL if all else failed
      if (!finalAvatarUrl && user.photoURL) {
        console.log('[Avatar] Using user photoURL:', user.photoURL);
        finalAvatarUrl = user.photoURL;
      }

      // 5. Fall back to default if nothing worked
      if (!finalAvatarUrl) {
        console.log('[Avatar] No avatar found, using default');
        finalAvatarUrl = DEFAULT_AVATARS[0].url;
      }

      // Set the final avatar URL
      setAvatarUrl(finalAvatarUrl);

      // Check premium status
      const isPremiumUser = userData.isPremium || false;
      const donationAmount = userData.donationAmount || userData.premiumAmount || 0;
      setIsPremium(isPremiumUser || donationAmount > 0);
      console.log('[Avatar] Premium status:', isPremiumUser || donationAmount > 0);

    } catch (error) {
      console.error('[Avatar] Error in fetchUserAvatar:', error);
      setAvatarUrl(DEFAULT_AVATARS[0].url);
    } finally {
      setLoading(false);
    }
  };

  // Listen for auth initialization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('[Avatar] Auth state changed:', user ? 'User logged in' : 'No user');
      setInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  // Fetch avatar when component mounts and auth is initialized
  useEffect(() => {
    if (initialized) {
      console.log('[Avatar] Auth initialized, fetching avatar');
      fetchUserAvatar();
    }
  }, [initialized]); // Depend on initialized state

  // Fetch avatar when user changes
  useEffect(() => {
    if (initialized && user) {
      console.log('[Avatar] User changed, fetching new avatar');
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
                style={[styles.avatarImage, { borderWidth: 0, borderColor: 'transparent' }]}
                isPremium={isPremium}
                onError={() => {
                  console.error('[Avatar] Error loading avatar');
                  console.log('[Avatar] Falling back to default avatar');
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
                console.error('[Avatar] Error loading avatar');
                console.log('[Avatar] Falling back to default avatar');
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

  useEffect(() => {
    const lockOrientation = async () => {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      } catch (error) {
        console.error('Failed to lock orientation:', error);
      }
    };

    lockOrientation();

    return () => {
      // Cleanup
      ScreenOrientation.unlockAsync().catch(error => {
        console.error('Failed to unlock orientation:', error);
      });
    };
  }, []);

  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
  const pathname = usePathname();
  const isWatchPage = pathname?.includes('/anime/watch/');
  const isChatPage = pathname?.includes('/chat');

  useEffect(() => {
    const subscription = ScreenOrientation.addOrientationChangeListener((event) => {
      const isLandscape = event.orientationInfo.orientation >= 3; // 3 and 4 are landscape orientations
      setIsVideoFullscreen(isLandscape);
    });

    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription);
    };
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <StatusBar style="light" />
        <Stack 
          screenOptions={{ 
            headerStyle: {
              backgroundColor: '#1a1a1a',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            contentStyle: {
              backgroundColor: '#121212',
              paddingBottom: isVideoFullscreen || isWatchPage || isChatPage ? 0 : 60,
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
              headerShown: route.params?.headerShown !== false,
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
            } as NativeStackNavigationOptions}
          />
        </Stack>
        {/* Position the bottom tab bar with absolute positioning outside the Stack */}
        <View style={styles.bottomTabContainer}>
          {!isVideoFullscreen && !isWatchPage && !isChatPage && <BottomTabBar />}
        </View>
      </View>
    </ThemeProvider>
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
});
