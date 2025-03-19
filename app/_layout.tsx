import { Stack, router, usePathname } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { View, BackHandler, Alert, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import SearchBar from '../components/SearchBar';
import { useWatchHistoryStore } from '../store/watchHistoryStore';
import * as ScreenOrientation from 'expo-screen-orientation';
import BottomTabBar from '../components/BottomTabBar';
import { migrateCommentsWithAvatars } from '../services/commentService';
import { fetchAvatars } from '../constants/avatars';
import { restoreUserSession, isEmailVerified, getCurrentUser } from '../services/userService';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useGlobalStore } from '../store/globalStore';
// These imports are commented out because we're removing the auth button from the header
// import { useGlobalStore } from '../store/globalStore';
// import AuthButton from '../components/AuthButton';

// Make sure SplashScreen is prevented from auto-hiding
SplashScreen.preventAutoHideAsync();

// Custom header component with search bar only
const HeaderRight = () => {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <SearchBar />
    </View>
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
        
        // Initialize avatars
        await fetchAvatars();
        console.log('[DEBUG] App: Avatars loaded successfully');
        
        // Run comment avatar migration
        await migrateCommentsWithAvatars();
        console.log('[DEBUG] App: Comment avatar migration completed');
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
              paddingBottom: isVideoFullscreen || isWatchPage ? 0 : 60,
            },
            animation: 'fade',
            animationDuration: 200,
          }}
        >
          <Stack.Screen 
            name="index" 
            options={{
              title: 'AniSurge',
              headerShown: true,
              headerRight: () => <HeaderRight />,
            }}
          />
          <Stack.Screen
            name="schedule"
            options={{
              title: 'Schedule',
              headerShown: true,
              animation: 'slide_from_right',
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
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="anime/watch/[episodeId]"
            options={{
              title: 'Watch',
              headerShown: true,
              animation: 'slide_from_right',
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="search"
            options={{
              title: 'Search',
              headerShown: true,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="mylist"
            options={{
              title: 'My List',
              headerShown: true,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="about"
            options={{
              title: 'About',
              headerShown: true,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="profile"
            options={{
              title: 'Profile',
              headerShown: true,
              animation: 'slide_from_right',
            }}
          />
        </Stack>
        {!isVideoFullscreen && !isWatchPage && <BottomTabBar />}
      </View>
    </ThemeProvider>
  );
}
