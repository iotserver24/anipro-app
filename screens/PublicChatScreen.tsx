import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import PublicChat from '../components/PublicChat';
import { useTheme } from '../hooks/useTheme';

const PublicChatScreen = () => {
  const { theme } = useTheme();
  const styles = createThemedStyles(theme);
  
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Public Chat',
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <View style={styles.container}>
        <PublicChat />
      </View>
    </>
  );
};

// Create themed styles function
const createThemedStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});

export default PublicChatScreen; 