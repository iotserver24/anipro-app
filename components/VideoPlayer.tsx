import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Pressable
} from 'react-native';
import Video from 'react-native-video';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as ScreenOrientation from 'expo-screen-orientation';

type VideoPlayerProps = {
  source: { uri: string | null; headers?: { [key: string]: string } };
  title?: string;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnd?: () => void;
  initialPosition?: number;
  style?: any;
  onFullscreenChange?: (isFullscreen: boolean) => void;
};

const VideoPlayer = ({
  source,
  title = '',
  onProgress,
  onEnd,
  initialPosition = 0,
  style = {},
  onFullscreenChange
}: VideoPlayerProps) => {
  const videoRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);

  // Format time in MM:SS format
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle fullscreen toggle
  const toggleFullscreen = async () => {
    if (isFullscreen) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      StatusBar.setHidden(false);
      setIsFullscreen(false);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      StatusBar.setHidden(true);
      setIsFullscreen(true);
    }
  };

  // Handle play/pause toggle
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Handle seeking
  const handleSeek = (value: number) => {
    if (videoRef.current) {
      setIsSeeking(true);
      videoRef.current.seek(value);
    }
  };

  // Handle video load
  const handleLoad = (data: any) => {
    setDuration(data.duration);
    setIsVideoReady(true);
    
    // Seek to initial position if provided
    if (initialPosition > 0 && videoRef.current && !isVideoReady) {
      videoRef.current.seek(initialPosition);
    }
  };

  // Handle video progress
  const handleProgress = (data: any) => {
    if (!isSeeking) {
      setCurrentTime(data.currentTime);
    }
    
    if (onProgress && !isSeeking) {
      onProgress(data.currentTime, data.seekableDuration);
    }
  };

  // Handle seek complete
  const handleSeekComplete = () => {
    setIsSeeking(false);
  };

  // Handle screen tap to show/hide controls ONLY
  const handleScreenTap = () => {
    setShowControls(!showControls);
    
    // Clear any existing timeout
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    
    // Set a new timeout to hide controls after 3 seconds if playing
    if (showControls && isPlaying) {
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      setControlsTimeout(timeout);
    }
  };

  // Auto-hide controls after 3 seconds when playing
  useEffect(() => {
    if (showControls && isPlaying) {
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      setControlsTimeout(timeout);
      
      return () => {
        if (timeout) clearTimeout(timeout);
      };
    }
  }, [showControls, isPlaying]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
      // Reset orientation when component unmounts
      ScreenOrientation.unlockAsync();
      StatusBar.setHidden(false);
    };
  }, []);

  // Make sure we're properly communicating fullscreen state to the parent component
  useEffect(() => {
    if (onFullscreenChange) {
      onFullscreenChange(isFullscreen);
    }
  }, [isFullscreen, onFullscreenChange]);

  return (
    <View style={[styles.container, style, isFullscreen && styles.fullscreenContainer]}>
      <Pressable style={styles.videoWrapper} onPress={handleScreenTap}>
        <Video
          ref={videoRef}
          source={source}
          style={styles.video}
          resizeMode="contain"
          paused={!isPlaying}
          onLoad={handleLoad}
          onProgress={handleProgress}
          onEnd={onEnd}
          onSeek={handleSeekComplete}
          onBuffer={({ isBuffering }) => setIsBuffering(isBuffering)}
          onError={(error) => console.error('Video error:', error)}
        />
        
        {isBuffering && (
          <View style={styles.bufferingContainer}>
            <ActivityIndicator size="large" color="#f4511e" />
          </View>
        )}
        
        {showControls && (
          <View style={styles.controlsOverlay}>
            {/* Top bar with title */}
            <View style={styles.topBar}>
              <Text style={styles.titleText}>{title}</Text>
            </View>
            
            {/* Center play/pause button */}
            <View style={styles.centerControls}>
              <TouchableOpacity onPress={togglePlayPause}>
                <MaterialIcons
                  name={isPlaying ? 'pause' : 'play-arrow'}
                  size={50}
                  color="white"
                />
              </TouchableOpacity>
            </View>
            
            {/* Bottom controls */}
            <View style={styles.bottomControls}>
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={duration > 0 ? duration : 1}
                  value={currentTime}
                  onSlidingStart={() => setIsSeeking(true)}
                  onValueChange={(value) => setCurrentTime(value)}
                  onSlidingComplete={handleSeek}
                  minimumTrackTintColor="#f4511e"
                  maximumTrackTintColor="rgba(255,255,255,0.5)"
                  thumbTintColor="#f4511e"
                />
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>
              
              <View style={styles.controlsRow}>
                <TouchableOpacity onPress={toggleFullscreen}>
                  <MaterialIcons
                    name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'}
                    size={24}
                    color="white"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    width: '100%',
    aspectRatio: 16 / 9,
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    width: '100%',
    height: '100%',
  },
  videoWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
  },
  topBar: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centerControls: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    padding: 16,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    color: 'white',
    fontSize: 12,
    width: 45,
    textAlign: 'center',
  },
  slider: {
    flex: 1,
    marginHorizontal: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bufferingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
});

export default VideoPlayer; 