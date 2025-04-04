import React, { useState, useRef } from 'react';
import { 
  View, 
  Image, 
  StyleSheet, 
  ImageProps, 
  StyleProp, 
  ViewStyle, 
  TouchableOpacity, 
  Text,
  Animated,
  Easing
} from 'react-native';
import { Video, ResizeMode, VideoProps } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import LoadingAnimation from './LoadingAnimation';

interface MediaLoaderProps {
  type: 'image' | 'video';
  source: ImageProps['source'] | VideoProps['source'];
  style?: StyleProp<ViewStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  showControls?: boolean;
  autoPlay?: boolean;
  loadingSize?: number;
  loadingColor?: string;
  loadingType?: 'dots' | 'pulse' | 'rotate' | 'bounce';
  onLoad?: () => void;
  onError?: (error: any) => void;
  onRetry?: () => void;
}

const MediaLoader: React.FC<MediaLoaderProps> = ({
  type,
  source,
  style,
  resizeMode = 'contain',
  showControls = true,
  autoPlay = false,
  loadingSize = 12,
  loadingColor = '#f4511e',
  loadingType = 'dots',
  onLoad,
  onError,
  onRetry
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const videoRef = useRef<Video>(null);

  const handleLoad = () => {
    setLoading(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.ease
    }).start();
    if (onLoad) onLoad();
  };

  const handleError = (err: any) => {
    setLoading(false);
    setError(true);
    if (onError) onError(err);
  };

  const handleRetry = () => {
    setLoading(true);
    setError(false);
    fadeAnim.setValue(0);
    
    if (type === 'video' && videoRef.current) {
      videoRef.current.loadAsync(source as VideoProps['source']);
    }
    
    if (onRetry) onRetry();
  };

  const getResizeMode = (): ResizeMode => {
    switch (resizeMode) {
      case 'cover': return ResizeMode.COVER;
      case 'contain': return ResizeMode.CONTAIN;
      case 'stretch': return ResizeMode.STRETCH;
      case 'center': return ResizeMode.CENTER;
      default: return ResizeMode.CONTAIN;
    }
  };

  return (
    <View style={[styles.container, style]}>
      {type === 'image' && (
        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          <Image
            source={source as ImageProps['source']}
            style={styles.media}
            resizeMode={resizeMode}
            onLoad={handleLoad}
            onError={handleError}
          />
        </Animated.View>
      )}

      {type === 'video' && (
        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          <Video
            ref={videoRef}
            source={source as VideoProps['source']}
            style={styles.media}
            resizeMode={getResizeMode()}
            useNativeControls={showControls}
            shouldPlay={autoPlay}
            onLoad={handleLoad}
            onError={handleError}
          />
        </Animated.View>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <LoadingAnimation 
            type={loadingType} 
            size={loadingSize} 
            color={loadingColor} 
          />
          <Text style={styles.loadingText}>
            {type === 'image' ? 'Loading image...' : 'Loading video...'}
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorOverlay}>
          <MaterialIcons name="error-outline" size={40} color="#ff6b6b" />
          <Text style={styles.errorText}>
            Failed to load {type}
          </Text>
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
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 12,
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