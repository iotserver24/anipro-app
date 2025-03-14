import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Pressable,
  Platform
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as ScreenOrientation from 'expo-screen-orientation';
import { LinearGradient } from 'expo-linear-gradient';
import * as NavigationBar from 'expo-navigation-bar';

interface VideoPlayerProps {
  source: {
    uri: string;
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
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
  onSkipIntro?: () => void;
  onSkipOutro?: () => void;
}

interface APIEpisode {
  id: string;
  number: number;
  title: string;
  isSubbed: boolean;
  isDubbed: boolean;
  url: string;
  isFiller: boolean;
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
  intro,
  outro,
  onSkipIntro,
  onSkipOutro,
}: VideoPlayerProps) => {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showBufferingIndicator, setShowBufferingIndicator] = useState(false);
  const bufferingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isQualityChanging, setIsQualityChanging] = useState(false);
  const [savedPosition, setSavedPosition] = useState(0);
  const [dimensions, setDimensions] = useState({
    width: Dimensions.get('window').width,
    height: (Dimensions.get('window').width * 9) / 16
  });
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);

  // Format time in MM:SS format
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle fullscreen toggle
  const toggleFullscreen = async () => {
    try {
      if (isFullscreen) {
        // Set state first for immediate UI response
        setIsFullscreen(false);
        if (onFullscreenChange) {
          onFullscreenChange(false);
        }
        
        // Exit fullscreen
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        if (Platform.OS === 'android') {
          await NavigationBar.setVisibilityAsync('visible');
        }
        StatusBar.setHidden(false);
        
        // Get current window dimensions in portrait mode
        const { width } = Dimensions.get('window');
        setDimensions({
          width: width,
          height: (width * 9) / 16
        });
      } else {
        // Set state first for immediate UI response
        setIsFullscreen(true);
        if (onFullscreenChange) {
          onFullscreenChange(true);
        }
        
        // Enter fullscreen
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        if (Platform.OS === 'android') {
          await NavigationBar.setVisibilityAsync('hidden');
        }
        StatusBar.setHidden(true);
        
        // Get current window dimensions in landscape mode immediately
        const { width, height } = Dimensions.get('window');
        setDimensions({
          width: Math.max(width, height), // Ensure we use the larger dimension as width
          height: Math.min(width, height)
        });
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
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
      setIsSeeking(true);
      try {
        // Set position without changing play state
        await videoRef.current.setPositionAsync(value * 1000);
        setCurrentTime(value);
        
        // Ensure we're playing if we were playing before
        if (isPlaying) {
          await videoRef.current.playAsync();
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
    if (!status.isLoaded) return;

    if (status.isLoaded) {
      const newPosition = status.positionMillis / 1000;
      setCurrentTime(newPosition);
      setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
      
      // Only show buffering indicator if we're actually buffering AND not playing
      // This prevents showing the buffering indicator when the video is playing smoothly
      const newIsBuffering = status.isBuffering && !status.isPlaying;
      setIsBuffering(newIsBuffering);
      
      // Add a delay before showing the buffering indicator to prevent flashing
      if (newIsBuffering) {
        if (!bufferingTimeoutRef.current) {
          bufferingTimeoutRef.current = setTimeout(() => {
            setShowBufferingIndicator(true);
            bufferingTimeoutRef.current = null;
          }, 500); // Wait 500ms before showing the buffering indicator
        }
      } else {
        if (bufferingTimeoutRef.current) {
          clearTimeout(bufferingTimeoutRef.current);
          bufferingTimeoutRef.current = null;
        }
        setShowBufferingIndicator(false);
      }
      
      // Only update isPlaying if we're not buffering
      // This prevents the player from pausing during buffering
      if (!status.isBuffering) {
        setIsPlaying(status.isPlaying);
      }

      // If we're buffering but should be playing, ensure we resume playback
      if (status.isBuffering && !status.isPlaying && isPlaying && videoRef.current) {
        videoRef.current.playAsync().catch(err => console.error('Error resuming playback:', err));
      }

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

      // Handle intro/outro button visibility
      if (intro && currentTime >= intro.start && currentTime < intro.end) {
        setShowSkipIntro(true);
      } else {
        setShowSkipIntro(false);
      }

      if (outro && currentTime >= outro.start && currentTime < outro.end) {
        setShowSkipOutro(true);
      } else {
        setShowSkipOutro(false);
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
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
      }
      ScreenOrientation.unlockAsync();
      StatusBar.setHidden(false);
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('visible');
      }
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
    try {
      switch (fullscreenUpdate) {
        case 0: // FULLSCREEN_UPDATE_PLAYER_WILL_PRESENT
          setIsFullscreen(true);
          if (Platform.OS === 'android') {
            await NavigationBar.setVisibilityAsync('hidden');
          }
          break;
        case 1: // FULLSCREEN_UPDATE_PLAYER_DID_PRESENT
          break;
        case 2: // FULLSCREEN_UPDATE_PLAYER_WILL_DISMISS
          break;
        case 3: // FULLSCREEN_UPDATE_PLAYER_DID_DISMISS
          setIsFullscreen(false);
          await Promise.all([
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP),
            Platform.OS === 'android' ? NavigationBar.setVisibilityAsync('visible') : Promise.resolve(),
          ]);
          break;
      }
    } catch (error) {
      console.error('Error handling fullscreen update:', error);
    }
  };

  // Add skip functions
  const skipForward = async () => {
    if (videoRef.current) {
      try {
        // Always maintain the current playing state
        const newPosition = Math.min(duration, currentTime + 5);
        
        // Set position without changing play state
        await videoRef.current.setPositionAsync(newPosition * 1000);
        setCurrentTime(newPosition);
        
        // Ensure we're playing if we were playing before
        if (isPlaying) {
          await videoRef.current.playAsync();
        }
      } catch (error) {
        console.error('Error skipping forward:', error);
      }
    }
  };

  const skipBackward = async () => {
    if (videoRef.current) {
      try {
        // Always maintain the current playing state
        const newPosition = Math.max(0, currentTime - 5);
        
        // Set position without changing play state
        await videoRef.current.setPositionAsync(newPosition * 1000);
        setCurrentTime(newPosition);
        
        // Ensure we're playing if we were playing before
        if (isPlaying) {
          await videoRef.current.playAsync();
        }
      } catch (error) {
        console.error('Error skipping backward:', error);
      }
    }
  };

  const handleLoad = async (status: AVPlaybackStatus) => {
    try {
      if (status.isLoaded) {
        // Handle initial position or quality change position
        if ((initialPosition > 0 && !isReady) || isQualityChanging) {
          const positionToSeek = isQualityChanging ? savedPosition : initialPosition;
          
          // Add a small delay to ensure video is ready
          await new Promise(resolve => setTimeout(resolve, 100));
          
          if (videoRef.current) {
            await videoRef.current.setPositionAsync(positionToSeek * 1000);
            
            // Always start playing when loaded
            await videoRef.current.playAsync();
            setIsPlaying(true);
            
            setIsReady(true);
            if (isQualityChanging) {
              setIsQualityChanging(false);
            }
          }
        } else if (isPlaying) {
          // Ensure we're playing if we should be
          await videoRef.current?.playAsync();
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

  // Add a listener for dimension changes
  useEffect(() => {
    const dimensionsChangeHandler = ({ window }: { window: { width: number; height: number } }) => {
      if (isFullscreen) {
        // In fullscreen/landscape mode
        setDimensions({
          width: window.width,
          height: window.height
        });
      } else {
        // In portrait mode
        setDimensions({
          width: window.width,
          height: (window.width * 9) / 16
        });
      }
    };

    const subscription = Dimensions.addEventListener('change', dimensionsChangeHandler);

    return () => {
      subscription.remove();
    };
  }, [isFullscreen]);

  return (
    <View style={[
      styles.container,
      isFullscreen && styles.fullscreenContainer,
      style,
      { 
        width: isFullscreen ? dimensions.width : '100%', 
        height: dimensions.height,
        backgroundColor: '#000'
      }
    ]}>
      <Pressable style={styles.videoWrapper} onPress={handleScreenTap}>
        <Video
          ref={videoRef}
          source={source.uri ? source : undefined}
          style={[
            styles.video, 
            isFullscreen && { width: dimensions.width, height: dimensions.height }
          ]}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={isPlaying}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          useNativeControls={false}
          onFullscreenUpdate={handleFullscreenUpdate}
          onLoad={handleLoad}
          progressUpdateIntervalMillis={500}
        />
        
        {/* Only show buffering indicator when actually buffering and not playing smoothly */}
        {showBufferingIndicator && (
          <View style={styles.bufferingContainer}>
            <ActivityIndicator size="large" color="#f4511e" />
          </View>
        )}
        
        {showControls && (
          <View 
            style={styles.controlsOverlay}
            onTouchEnd={(e) => e.stopPropagation()}
          >
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
                style={styles.skipBackwardButton}
                onPress={(e) => {
                  e.stopPropagation();
                  skipBackward();
                }}
              >
                <MaterialIcons
                  name="replay-5"
                  size={28}
                  color="white"
                />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.playPauseButton}
                onPress={(e) => {
                  e.stopPropagation();
                  togglePlayPause();
                }}
              >
                <MaterialIcons
                  name={isPlaying ? 'pause' : 'play-arrow'}
                  size={32}
                  color="white"
                />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.skipForwardButton}
                onPress={(e) => {
                  e.stopPropagation();
                  skipForward();
                }}
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
                  onSlidingStart={(value) => {
                    setIsSeeking(true);
                  }}
                  onSlidingComplete={(value) => {
                    handleSeek(value);
                  }}
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
                  onPress={(e) => {
                    e.stopPropagation();
                    togglePlayPause();
                  }}
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
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleFullscreen();
                    }}
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

            {/* Skip Intro Button */}
            {showSkipIntro && (
              <TouchableOpacity 
                style={styles.skipButton}
                onPress={(e) => {
                  e.stopPropagation();
                  if (videoRef.current && intro) {
                    // Set position and ensure playback continues
                    videoRef.current.setPositionAsync(intro.end * 1000)
                      .then(() => {
                        if (isPlaying) {
                          return videoRef.current?.playAsync();
                        }
                      })
                      .catch(err => console.error('Error skipping intro:', err));
                  }
                  if (onSkipIntro) {
                    onSkipIntro();
                  }
                }}
              >
                <Text style={styles.skipButtonText}>Skip Intro</Text>
              </TouchableOpacity>
            )}

            {/* Skip Outro Button */}
            {showSkipOutro && (
              <TouchableOpacity 
                style={styles.skipButton}
                onPress={(e) => {
                  e.stopPropagation();
                  if (videoRef.current && outro) {
                    // Set position and ensure playback continues
                    videoRef.current.setPositionAsync(outro.end * 1000)
                      .then(() => {
                        if (isPlaying) {
                          return videoRef.current?.playAsync();
                        }
                      })
                      .catch(err => console.error('Error skipping outro:', err));
                  }
                  if (onSkipOutro) {
                    onSkipOutro();
                  }
                }}
              >
                <Text style={styles.skipButtonText}>Skip Outro</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    overflow: 'hidden',
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
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fullscreenVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
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
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  centerControls: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 50,
  },
  playPauseButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipBackwardButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  skipForwardButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 20,
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
    pointerEvents: 'none',
  },
  skipButton: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  skipButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default VideoPlayer; 