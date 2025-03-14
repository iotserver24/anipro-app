import { Stack, router, usePathname } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { View, BackHandler, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import SearchBar from '../components/SearchBar';
import { useWatchHistoryStore } from '../store/watchHistoryStore';
import * as ScreenOrientation from 'expo-screen-orientation';
import BottomTabBar from '../components/BottomTabBar';
import { useGlobalStore } from '../store/globalStore';

// Make sure SplashScreen is prevented from auto-hiding
SplashScreen.preventAutoHideAsync();

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

  useEffect(() => {
    // Load watch history when app starts
    console.log('[DEBUG] App: Initializing watch history store');
    initializeHistory().then(() => {
      console.log('[DEBUG] App: Watch history initialized successfully');
    }).catch(error => {
      console.error('[DEBUG] App: Error initializing watch history:', error);
    });
    
    // Force a refresh of the history every time the app comes to the foreground
    const refreshInterval = setInterval(() => {
      console.log('[DEBUG] App: Refreshing watch history');
      initializeHistory().catch(error => {
        console.error('[DEBUG] App: Error refreshing watch history:', error);
      });
    }, 60000); // Refresh every minute
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

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
              headerRight: () => <SearchBar />,
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
        </Stack>
        {!isVideoFullscreen && !isWatchPage && <BottomTabBar />}
      </View>
    </ThemeProvider>
  );
}
