import React, { useRef, useState } from 'react';
import { View, Image, StyleSheet, Text, TouchableOpacity, Animated, ImageProps, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface MediaLoaderProps {
  type: 'image' | 'video';
  source: ImageProps['source'];
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  loadingSize?: number;
  loadingColor?: string;
}

const MediaLoader: React.FC<MediaLoaderProps> = ({
  source,
  style,
  resizeMode = 'cover',
  loadingSize = 30,
  loadingColor = '#fff'
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const retryCount = useRef(0);
  const MAX_RETRIES = 2;

  const handleLoad = () => {
    setLoading(false);
    setError(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true
    }).start();
  };

  const handleError = () => {
    if (retryCount.current < MAX_RETRIES) {
      retryCount.current += 1;
      // Quick retry for direct URLs
      setLoading(true);
      setError(false);
    } else {
      setError(true);
      setLoading(false);
    }
  };

  const handleRetry = () => {
    retryCount.current = 0;
    setError(false);
    setLoading(true);
    fadeAnim.setValue(0);
  };

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
        <Image
          source={source}
          style={styles.media}
          resizeMode={resizeMode}
          onLoad={handleLoad}
          onError={handleError}
          fadeDuration={0}
          progressiveRenderingEnabled={true}
        />
      </Animated.View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size={loadingSize} color={loadingColor} />
        </View>
      )}

      {error && (
        <View style={styles.errorOverlay}>
          <MaterialIcons name="error-outline" size={40} color="#ff6b6b" />
          <Text style={styles.errorText}>Failed to load image</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleRetry}
          >
            <MaterialIcons name="refresh" size={16} color="#fff" style={styles.retryIcon} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    flex: 1,
  },
  media: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    marginTop: 10,
    marginBottom: 15,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#f4511e',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryIcon: {
    marginRight: 5,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});

export default MediaLoader; 