import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text, ViewStyle } from 'react-native';
import LoadingAnimation from './LoadingAnimation';

interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
  type?: 'dots' | 'pulse' | 'rotate' | 'bounce' | 'default';
  size?: number;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  text,
  type = 'default',
  size = 24,
  color = '#f4511e',
  backgroundColor = 'rgba(0, 0, 0, 0.7)',
  style
}) => {
  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      <LoadingAnimation type={type} size={size} color={color} />
      {text && <Text style={[styles.text, { color }]}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  }
});

export default LoadingOverlay; 