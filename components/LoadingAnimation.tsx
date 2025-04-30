import React from 'react';
import { View, ActivityIndicator, StyleSheet, Animated } from 'react-native';

interface LoadingAnimationProps {
  type: 'dots' | 'pulse' | 'rotate' | 'bounce' | 'default';
  size?: number;
  color?: string;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  type = 'default',
  size = 30,
  color = '#fff'
}) => {
  // For now we'll use ActivityIndicator for all types
  // You can implement different animations for each type later
  return <ActivityIndicator size={size} color={color} />;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center'
  }
});

export default LoadingAnimation; 