import React from 'react';
import { View, ActivityIndicator, StyleSheet, Animated } from 'react-native';

interface LoadingAnimationProps {
  type?: 'spinner' | 'pulse' | 'dots';
  size?: number;
  color?: string;
}

export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  type = 'spinner',
  size = 30,
  color = '#fff'
}) => {
  switch (type) {
    case 'spinner':
      return <ActivityIndicator size={size} color={color} />;
    
    // For now we'll default all types to spinner for simplicity
    case 'pulse':
    case 'dots':
    default:
      return <ActivityIndicator size={size} color={color} />;
  }
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center'
  }
}); 