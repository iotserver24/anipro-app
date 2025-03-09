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
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as ScreenOrientation from 'expo-screen-orientation';
import { LinearGradient } from 'expo-linear-gradient';

interface VideoPlayerProps {
  source: {
    uri: string | null;
    headers?: { [key: string]: string };
  };
  style?: any;
  initialPosition?: number;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnd?: () => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  title?: string;
  onPositionChange?: (position: number) => void;
  onLoad?: (status: AVPlaybackStatus) => void;
  onQualityChange?: (position: number) => void;
  rate?: number;
  onPlaybackRateChange?: (rate: number) => void;
}

const VideoPlayer = ({
  source,
  style,
  initialPosition = 0,
  onProgress,
  onEnd,
  onFullscreenChange,
  title,
  onPositionChange,
  onLoad,
  onQualityChange,
  rate = 1.0,
  onPlaybackRateChange,
}: VideoPlayerProps) => {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isQualityChanging, setIsQualityChanging] = useState(false);
  const [savedPosition, setSavedPosition] = useState(0);

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
      // Exit fullscreen
      if (videoRef.current) {
        await videoRef.current.dismissFullscreenPlayer();
      }
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      StatusBar.setHidden(false);
      setIsFullscreen(false);
    } else {
      // Enter fullscreen
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      StatusBar.setHidden(true);
      setIsFullscreen(true);
    }
  };

  // Handle play/pause toggle
  const togglePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle seeking
  const handleSeek = async (value: number) => {
    if (videoRef.current) {
      const wasPlaying = isPlaying;
      setIsSeeking(true);
      try {
        await videoRef.current.setPositionAsync(value * 1000);
        setCurrentTime(value);
        
        // Resume playback if it was playing before
        if (wasPlaying) {
          await new Promise(resolve => setTimeout(resolve, 50));
          await videoRef.current.playAsync();
          setIsPlaying(true);
        }
      } catch (error) {
        console.error('Error seeking:', error);
      } finally {
        setIsSeeking(false);
      }
    }
  };

  // Handle video status update
  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      const newPosition = status.positionMillis / 1000;
      setCurrentTime(newPosition);
      setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
      setIsBuffering(status.isBuffering);
      setIsPlaying(status.isPlaying);

      if (onProgress && !isSeeking) {
        onProgress(
          newPosition,
          status.durationMillis ? status.durationMillis / 1000 : 0
        );
      }

      // Notify parent of position changes
      if (onPositionChange && !isSeeking) {
        onPositionChange(newPosition);
      }

      if (status.didJustFinish && onEnd) {
        onEnd();
      }
    }
  };

  // Update handleScreenTap to be more reliable
  const handleScreenTap = () => {
    if (showControls) {
      // If controls are showing, hide them
      setShowControls(false);
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    } else {
      // If controls are hidden, show them and set auto-hide timer
      setShowControls(true);
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      setControlsTimeout(timeout);
    }
  };

  // Auto-hide controls
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

  // Clean up
  useEffect(() => {
    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
      ScreenOrientation.unlockAsync();
      StatusBar.setHidden(false);
    };
  }, []);

  // Communicate fullscreen state
  useEffect(() => {
    if (onFullscreenChange) {
      onFullscreenChange(isFullscreen);
    }
  }, [isFullscreen, onFullscreenChange]);

  // Add handler for fullscreen updates
  const handleFullscreenUpdate = async ({ fullscreenUpdate }: { fullscreenUpdate: number }) => {
    switch (fullscreenUpdate) {
      case Video.FULLSCREEN_UPDATE_PLAYER_WILL_PRESENT:
        setIsFullscreen(true);
        break;
      case Video.FULLSCREEN_UPDATE_PLAYER_DID_PRESENT:
        break;
      case Video.FULLSCREEN_UPDATE_PLAYER_WILL_DISMISS:
        break;
      case Video.FULLSCREEN_UPDATE_PLAYER_DID_DISMISS:
        setIsFullscreen(false);
        // Ensure we return to portrait mode
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        break;
    }
  };

  // Add skip functions
  const skipForward = async () => {
    if (videoRef.current) {
      const wasPlaying = isPlaying;
      const newPosition = Math.min(duration, currentTime + 5);
      try {
        await videoRef.current.setPositionAsync(newPosition * 1000);
        setCurrentTime(newPosition);
        
        // Resume playback if it was playing before
        if (wasPlaying) {
          await new Promise(resolve => setTimeout(resolve, 50));
          await videoRef.current.playAsync();
          setIsPlaying(true);
        }
      } catch (error) {
        console.error('Error skipping forward:', error);
      }
    }
  };

  const skipBackward = async () => {
    if (videoRef.current) {
      const wasPlaying = isPlaying;
      const newPosition = Math.max(0, currentTime - 5);
      try {
        await videoRef.current.setPositionAsync(newPosition * 1000);
        setCurrentTime(newPosition);
        
        // Resume playback if it was playing before
        if (wasPlaying) {
          await new Promise(resolve => setTimeout(resolve, 50));
          await videoRef.current.playAsync();
          setIsPlaying(true);
        }
      } catch (error) {
        console.error('Error skipping backward:', error);
      }
    }
  };

  const handleLoad = async (status: AVPlaybackStatus) => {
    try {
      if (status.isLoaded) {
        const wasPlaying = isPlaying;
        
        // Handle initial position or quality change position
        if ((initialPosition > 0 && !isReady) || isQualityChanging) {
          const positionToSeek = isQualityChanging ? savedPosition : initialPosition;
          
          // Add a small delay to ensure video is ready
          await new Promise(resolve => setTimeout(resolve, 100));
          
          if (videoRef.current) {
            await videoRef.current.setPositionAsync(positionToSeek * 1000);
            
            // Resume playback if it was playing
            if (wasPlaying) {
              await videoRef.current.playAsync();
            }
            
            setIsReady(true);
            if (isQualityChanging) {
              setIsQualityChanging(false);
            }
          }
        }
        
        // Call parent's onLoad handler
        if (onLoad) {
          onLoad(status);
        }
      }
    } catch (error) {
      console.error('Error in handleLoad:', error);
      setIsQualityChanging(false);
    }
  };

  // Add this useEffect to handle rate changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.setRateAsync(rate, true);
    }
  }, [rate]);

  return (
    <View style={[styles.container, style, isFullscreen && styles.fullscreenContainer]}>
      <Pressable style={styles.videoWrapper} onPress={handleScreenTap}>
        <Video
          ref={videoRef}
          source={source}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={isPlaying}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          useNativeControls={false}
          onFullscreenUpdate={handleFullscreenUpdate}
          onLoad={handleLoad}
        />
        
        {/* Only show buffering indicator when buffering AND not playing */}
        {isBuffering && !isPlaying && (
          <View style={styles.bufferingContainer}>
            <ActivityIndicator size="large" color="#f4511e" />
          </View>
        )}
        
        {showControls && (
          <View style={styles.controlsOverlay}>
            {/* Top Bar */}
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'transparent']}
              style={styles.topBar}
            >
              <Text style={styles.titleText} numberOfLines={1}>
                {title}
              </Text>
            </LinearGradient>

            {/* Center Controls */}
            <View style={styles.centerControls}>
              <TouchableOpacity 
                style={styles.skipButton}
                onPress={skipBackward}
              >
                <MaterialIcons
                  name="replay-5"
                  size={28}
                  color="white"
                />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.playPauseButton}
                onPress={togglePlayPause}
              >
                <MaterialIcons
                  name={isPlaying ? 'pause' : 'play-arrow'}
                  size={32}
                  color="white"
                />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.skipButton}
                onPress={skipForward}
              >
                <MaterialIcons
                  name="forward-5"
                  size={28}
                  color="white"
                />
              </TouchableOpacity>
            </View>

            {/* Bottom Controls */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.bottomControls}
            >
              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={duration}
                  value={currentTime}
                  onSlidingStart={() => setIsSeeking(true)}
                  onSlidingComplete={handleSeek}
                  minimumTrackTintColor="#2196F3"
                  maximumTrackTintColor="rgba(255,255,255,0.3)"
                  thumbTintColor="#2196F3"
                />
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>

              {/* Bottom Row */}
              <View style={styles.controlsRow}>
                <TouchableOpacity 
                  style={styles.controlButton}
                  onPress={togglePlayPause}
                >
                  <MaterialIcons
                    name={isPlaying ? 'pause' : 'play-arrow'}
                    size={20}
                    color="white"
                  />
                </TouchableOpacity>

                <View style={styles.rightControls}>
                  <TouchableOpacity 
                    style={styles.controlButton}
                    onPress={toggleFullscreen}
                  >
                    <MaterialIcons
                      name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'}
                      size={20}
                      color="white"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
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
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  topBar: {
    paddingHorizontal: 12,
    paddingTop: 32,
    paddingBottom: 16,
  },
  titleText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  centerControls: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  playPauseButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    padding: 12,
    paddingTop: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
    width: 40,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  slider: {
    flex: 1,
    marginHorizontal: 6,
    height: 32,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 3,
  },
  bufferingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  skipButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default VideoPlayer; 