import { Stack } from 'expo-router';
import { useCallback } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import SearchBar from '../components/SearchBar';

// Prevent the splash screen from auto-hiding
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
              // Temporarily remove font family
              // fontFamily: 'Poppins-SemiBold',
              fontWeight: 'bold',
            },
            contentStyle: {
              backgroundColor: '#121212',
            },
          }}
        >
          <Stack.Screen 
            name="index" 
            options={{
              title: 'AniPro',
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
              title: 'Details',
              headerShown: true,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="anime/watch/[episodeId]"
            options={{
              title: 'Watch',
              headerShown: true,
              animation: 'slide_from_right',
              presentation: 'fullScreenModal',
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
      </View>
    </ThemeProvider>
  );
}
