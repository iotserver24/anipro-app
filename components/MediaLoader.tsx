import React, { useRef, useState } from 'react';
import { View, Image, StyleSheet, Text, TouchableOpacity, Animated, ImageProps, ActivityIndicator, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Video, { OnLoadData } from 'react-native-video';
import Slider from '@react-native-community/slider';

interface MediaLoaderProps {
  type: 'image' | 'video';
  source: ImageProps['source'];
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  loadingSize?: number;
  loadingColor?: string;
  showControls?: boolean;
  autoPlay?: boolean;
  onLoad?: () => void;
  onError?: (error: any) => void;
}

const MediaLoader: React.FC<MediaLoaderProps> = ({
  type,
  source,
  style,
  resizeMode = 'cover',
  loadingSize = 30,
  loadingColor = '#fff',
  showControls = true,
  autoPlay = false,
  onLoad,
  onError,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [paused, setPaused] = useState(!autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showingControls, setShowingControls] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const controlsTimeout = useRef<NodeJS.Timeout>();
  const retryCount = useRef(0);
  const MAX_RETRIES = 2;
  const videoRef = useRef<any>(null);

  const handleLoad = (data: OnLoadData) => {
    setLoading(false);
    setError(false);
    setDuration(data.duration);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true
    }).start();
    onLoad?.();
  };

  const handleError = (err: any) => {
    if (retryCount.current < MAX_RETRIES) {
      retryCount.current += 1;
      setLoading(true);
      setError(false);
    } else {
      setError(true);
      setLoading(false);
    }
    onError?.(err);
  };

  const handleRetry = () => {
    retryCount.current = 0;
    setError(false);
    setLoading(true);
    fadeAnim.setValue(0);
  };

  const togglePlayPause = () => {
    setPaused(!paused);
    showControlsTemporarily();
  };

  const showControlsTemporarily = () => {
    setShowingControls(true);
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    controlsTimeout.current = setTimeout(() => {
      if (!paused) {
        setShowingControls(false);
      }
    }, 3000);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleProgress = (data: { currentTime: number }) => {
    setCurrentTime(data.currentTime);
  };

  const handleSliderChange = (value: number) => {
    if (videoRef.current) {
      videoRef.current.seek(value);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {type === 'video' ? (
        <TouchableOpacity 
          activeOpacity={1} 
          style={styles.videoContainer}
          onPress={showControlsTemporarily}
        >
          <Video
            ref={videoRef}
            source={source}
            style={styles.media}
            resizeMode={resizeMode}
            onLoad={handleLoad}
            onError={handleError}
            paused={paused}
            onProgress={handleProgress}
            playInBackground={false}
            playWhenInactive={false}
          />
          
          {showControls && showingControls && (
            <Animated.View style={[styles.controlsOverlay, { opacity: fadeAnim }]}>
              <TouchableOpacity 
                style={styles.playPauseButton}
                onPress={togglePlayPause}
              >
                <MaterialIcons 
                  name={paused ? "play-arrow" : "pause"} 
                  size={40} 
                  color="white" 
                />
              </TouchableOpacity>
              
              <View style={styles.progressContainer}>
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                <Slider
                  style={styles.progressBar}
                  minimumValue={0}
                  maximumValue={duration}
                  value={currentTime}
                  onValueChange={handleSliderChange}
                  minimumTrackTintColor="#f4511e"
                  maximumTrackTintColor="#ffffff50"
                  thumbTintColor="#f4511e"
                />
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>
            </Animated.View>
          )}
        </TouchableOpacity>
      ) : (
        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          <Image
            source={source}
            style={styles.media}
            resizeMode={resizeMode}
            onLoad={() => handleLoad({ duration: 0 } as OnLoadData)}
            onError={handleError}
            fadeDuration={0}
            progressiveRenderingEnabled={true}
          />
        </Animated.View>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size={loadingSize} color={loadingColor} />
        </View>
      )}

      {error && (
        <View style={styles.errorOverlay}>
          <MaterialIcons name="error-outline" size={40} color="#ff6b6b" />
          <Text style={styles.errorText}>Failed to load {type}</Text>
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
  videoContainer: {
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
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'space-between',
    padding: 20,
  },
  playPauseButton: {
    alignSelf: 'center',
    padding: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  progressBar: {
    flex: 1,
    marginHorizontal: 10,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
  }
});

export default MediaLoader; 