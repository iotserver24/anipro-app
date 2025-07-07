// Delete this file - it's not needed with Expo Router

import React, { useEffect } from 'react';
import { Alert, Linking, AppState } from 'react-native';
import { useWatchHistoryStore } from './store/watchHistoryStore';
import { statsService } from './services/stats';
import { updateService } from './services/updateService';
import { StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { logger } from './utils/logger';
import DonateScreen from './screens/DonateScreen';

export default function App() {
  const initializeHistory = useWatchHistoryStore(state => state.initializeHistory);

  useEffect(() => {
    // Initialize watch history
    initializeHistory();

    // Check for updates on app start
    updateService.checkForUpdates();

    // Set up periodic update checks when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        updateService.checkForUpdates();
        statsService.trackActivity();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // Track app install and initial activity
    statsService.trackInstall();
    statsService.trackActivity();
  }, []);

  const linking = {
    prefixes: ['anisurge://'],
    config: {
      screens: {
        Donate: 'donate',
        'donation-success': 'donation-success',
      },
    },
  };

  return (
    <>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1a1a1a',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Donate" 
          component={DonateScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </>
  );
}
