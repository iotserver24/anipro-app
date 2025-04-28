import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import PublicChat from '../components/PublicChat';

const PublicChatScreen = () => {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Public Chat',
          headerStyle: {
            backgroundColor: '#1a1a1a',
          },
          headerTintColor: '#fff',
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
});

export default PublicChatScreen; 