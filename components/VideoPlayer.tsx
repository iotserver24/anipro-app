import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import { debounce } from 'lodash';

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
  isQualityChanging?: boolean;
  savedQualityPosition?: number;
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

// Memoize the controls overlay component
const ControlsOverlay = React.memo(({
  showControls,
  isPlaying,
  isFullscreen,
  currentTime,
  duration,
  isBuffering,
  title,
  onPlayPress,
  onFullscreenPress,
  onSeek
}: ControlsOverlayProps) => {
  // Memoize formatTime function
  const formatTime = useCallback((seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Memoize time strings
  const currentTimeStr = useMemo(() => formatTime(currentTime), [formatTime, currentTime]);
  const durationStr = useMemo(() => formatTime(duration), [formatTime, duration]);

  // Memoize button handlers to prevent re-renders
  const handlePlayPress = useCallback((e: any) => {
    e.stopPropagation();
    onPlayPress();
  }, [onPlayPress]);

  const handleFullscreenPress = useCallback((e: any) => {
    e.stopPropagation();
    onFullscreenPress();
  }, [onFullscreenPress]);

  // Add handlers for skip forward/backward
  const handleSkipBackward = useCallback((e: any) => {
    e.stopPropagation();
    onSeek(Math.max(0, currentTime - 5));
  }, [currentTime, onSeek]);

  const handleSkipForward = useCallback((e: any) => {
    e.stopPropagation();
    onSeek(Math.min(duration, currentTime + 5));
  }, [currentTime, duration, onSeek]);

  // Memoize slider callbacks
  const handleSliderComplete = useCallback((value: number) => {
    onSeek(value);
  }, [onSeek]);

  if (!showControls) return null;

  return (
    <View 
      style={styles.controlsOverlay}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'transparent']}
        style={styles.topBar}
      >
        <View>
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.centerControls}>
        <TouchableOpacity 
          style={styles.skipBackwardButton}
          onPress={handleSkipBackward}
        >
          <MaterialIcons
            name="replay-5"
            size={28}
            color="white"
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.playPauseButton}
          onPress={handlePlayPress}
        >
          <MaterialIcons
            name={isPlaying ? 'pause' : 'play-arrow'}
            size={32}
            color="white"
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.skipForwardButton}
          onPress={handleSkipForward}
        >
          <MaterialIcons
            name="forward-5"
            size={28}
            color="white"
          />
        </TouchableOpacity>
      </View>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.bottomControls}
      >
        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{currentTimeStr}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={duration > 0 ? duration : 1}
            value={currentTime}
            onSlidingComplete={handleSliderComplete}
            minimumTrackTintColor="#f4511e"
            maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
            thumbTintColor="#f4511e"
          />
          <Text style={styles.timeText}>{durationStr}</Text>
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={handlePlayPress}
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
              onPress={handleFullscreenPress}
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
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.showControls === nextProps.showControls &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.isFullscreen === nextProps.isFullscreen &&
    Math.floor(prevProps.currentTime) === Math.floor(nextProps.currentTime) &&
    prevProps.duration === nextProps.duration &&
    prevProps.isBuffering === nextProps.isBuffering &&
    prevProps.title === nextProps.title
  );
});

// Optimize the main VideoPlayer component
const VideoPlayer: React.FC<VideoPlayerProps> = ({
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
  isQualityChanging: externalQualityChanging = false,
  savedQualityPosition = 0,
}: VideoPlayerProps) => {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isQualityChanging, setIsQualityChanging] = useState(externalQualityChanging);
  const [savedPosition, setSavedPosition] = useState(savedQualityPosition);
  const [dimensions, setDimensions] = useState({
    width: Dimensions.get('window').width,
    height: (Dimensions.get('window').width * 9) / 16
  });
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);
  const initialPositionRef = useRef<number>(initialPosition);
  const sourceRef = useRef(source);
  const wasPlayingBeforeQualityChange = useRef(isPlaying);
  const orientationChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isOrientationChangingRef = useRef(false);
  const lastUpdateTimeRef = useRef<number>(0);
  const currentPositionRef = useRef<number>(0);
  const isInSeekOperationRef = useRef<boolean>(false);
  const isInPlayPauseOperationRef = useRef<boolean>(false);
  const lastSeekTimeRef = useRef<number>(0);
  const isAtEndRef = useRef<boolean>(false);
  const lastPositionRef = useRef<number>(0);
  const lastTapRef = useRef<number>(0);
  const lastTapXRef = useRef<number>(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add a lastRateLoggedRef to track the last rate we logged
  const lastRateLoggedRef = useRef<number>(1);

  // Debounce the progress handler with a shorter delay
  const debouncedProgress = useMemo(
    () => debounce((status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;
      onPlaybackStatusUpdate(status);
    }, 100), // Reduced from 250ms to 100ms for better responsiveness
    []
  );

  // Remove debounce from handleScreenTap for immediate response
  const handleScreenTap = useCallback((event: any) => {
    const now = Date.now();
    const tapX = event.nativeEvent.locationX;
    
    // Handle double tap
    if (now - lastTapRef.current < 300 && Math.abs(tapX - lastTapXRef.current) < 40) {
      // Double tap detected
      if (tapX < dimensions.width / 2) {
        // Left side - rewind
        if (videoRef.current) {
          videoRef.current.setPositionAsync(Math.max(0, currentTime - 10) * 1000);
        }
      } else {
        // Right side - forward
        if (videoRef.current) {
          videoRef.current.setPositionAsync(Math.min(duration, currentTime + 10) * 1000);
        }
      }
      return;
    }
    
    // Update last tap info
    lastTapRef.current = now;
    lastTapXRef.current = tapX;
    
    // Handle single tap - toggle controls
    if (showControls) {
      setShowControls(false);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
    } else {
      if (videoRef.current && currentPositionRef.current > 0) {
        setCurrentTime(currentPositionRef.current);
      }
      setShowControls(true);
      
      // Auto-hide controls after delay
      if (isPlaying) {
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
          controlsTimeoutRef.current = null;
        }, 3000);
      }
    }
  }, [showControls, isPlaying, currentTime, duration, dimensions.width]);

  // Clean up timeouts
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Update controls visibility based on playing state
  useEffect(() => {
    if (showControls && isPlaying && !isSeeking) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        controlsTimeoutRef.current = null;
      }, 3000);
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, isPlaying, isSeeking]);

  // Memoize the video style to prevent unnecessary re-renders
  const videoStyle = useMemo(() => [
    styles.video, 
    isFullscreen && { 
      width: dimensions.width, 
      height: dimensions.height,
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }
  ], [isFullscreen, dimensions.width, dimensions.height]);

  useEffect(() => {
    ////console.log(`[DEBUG] VideoPlayer: External quality changing state changed to ${externalQualityChanging}`);
    if (externalQualityChanging) {
      wasPlayingBeforeQualityChange.current = isPlaying;
      setIsQualityChanging(true);
      setSavedPosition(savedQualityPosition);
      
      // Add a safety timeout to ensure we don't stay in quality changing state forever
      const safetyTimeout = setTimeout(() => {
        if (isQualityChanging) {
          ////console.log('[DEBUG] VideoPlayer: Safety timeout reached, resetting quality changing state');
          setIsQualityChanging(false);
        }
      }, 3500); // Slightly longer than the parent component's timeout (2.9s)
      
      return () => {
        clearTimeout(safetyTimeout);
      };
    }
  }, [externalQualityChanging, savedQualityPosition]);

  useEffect(() => {
    if (sourceRef.current.uri !== source.uri) {
      ////console.log(`[DEBUG] VideoPlayer: Source URI changed from ${sourceRef.current.uri} to ${source.uri}`);
      
      sourceRef.current = source;
      
      if (!isQualityChanging && currentTime > 0) {
        //////console.log(`[DEBUG] VideoPlayer: Detected quality change, saving position: ${currentTime}`);
        wasPlayingBeforeQualityChange.current = isPlaying;
        setIsQualityChanging(true);
        setSavedPosition(currentTime);
      }
    }
  }, [source.uri]);

  useEffect(() => {
    initialPositionRef.current = initialPosition;
    
    if (videoRef.current && initialPosition > 0 && isReady) {
      videoRef.current.setPositionAsync(initialPosition * 1000)
        .catch(() => {});
    }
  }, [initialPosition, isReady]);

  // Optimize initial position seeking
  useEffect(() => {
    if (videoRef.current && initialPositionRef.current > 0 && !isReady) {
      const seekToInitialPosition = async () => {
        try {
          // Directly seek to initial position without pausing first
          await videoRef.current?.setPositionAsync(initialPositionRef.current * 1000);
          
          if (isPlaying) {
            await videoRef.current?.playAsync();
          }
          
          setIsReady(true);
        } catch (error) {
          console.error('[DEBUG] VideoPlayer: Error seeking to initial position:', error);
          setIsReady(true);
        }
      };
      
      // Reduce timeout for faster initial seeking
      setTimeout(seekToInitialPosition, 500);
    }
  }, []);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = async () => {
    try {
      if (isOrientationChangingRef.current) {
        return;
      }
      
      // Set this flag immediately to prevent multiple rapid calls
      isOrientationChangingRef.current = true;
      
      // Update UI state immediately for better responsiveness
      const newIsFullscreen = !isFullscreen;
      setIsFullscreen(newIsFullscreen);
      
      if (onFullscreenChange) {
        onFullscreenChange(newIsFullscreen);
      }
      
      if (!newIsFullscreen) {
        // Going back to portrait
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        if (Platform.OS === 'android') {
          await NavigationBar.setVisibilityAsync('visible');
        }
        StatusBar.setHidden(false);
        
        const { width } = Dimensions.get('window');
        setDimensions({
          width: width,
          height: (width * 9) / 16
        });
      } else {
        // Going to landscape
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        if (Platform.OS === 'android') {
          await NavigationBar.setVisibilityAsync('hidden');
        }
        StatusBar.setHidden(true);
        
        const { width, height } = Dimensions.get('screen');
        setDimensions({
          width: width,
          height: height
        });
      }
      
      // Clear any existing timeout
      if (orientationChangeTimeoutRef.current) {
        clearTimeout(orientationChangeTimeoutRef.current);
      }
      
      // Set a shorter timeout to reset the flag
      orientationChangeTimeoutRef.current = setTimeout(() => {
        isOrientationChangingRef.current = false;
        orientationChangeTimeoutRef.current = null;
      }, 500); // Reduced from 1000ms to 500ms
      
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
      isOrientationChangingRef.current = false;
    }
  };

  const togglePlayPause = async () => {
    if (isInPlayPauseOperationRef.current) {
      return;
    }
    
    isInPlayPauseOperationRef.current = true;
    
    try {
      // Update UI state immediately for better responsiveness
      const newIsPlaying = !isPlaying;
      setIsPlaying(newIsPlaying);
      
      if (videoRef.current) {
        if (newIsPlaying) {
          videoRef.current.playAsync().catch(error => {
            console.error('Error playing:', error);
            setIsPlaying(false); // Revert state on error
          });
        } else {
          videoRef.current.pauseAsync().catch(error => {
            console.error('Error pausing:', error);
            setIsPlaying(true); // Revert state on error
          });
        }
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
      setIsPlaying(!isPlaying); // Revert state on error
    } finally {
      // Use a shorter timeout to reset the operation flag
      setTimeout(() => {
        isInPlayPauseOperationRef.current = false;
      }, 50); // Reduced from 100ms to 50ms
    }
  };

  const handleSeek = async (value: number) => {
    if (isInSeekOperationRef.current) {
      return;
    }
    
    // Reduce the throttling time for more responsive seeking
    const now = Date.now();
    if (now - lastSeekTimeRef.current < 100) { // Reduced from 150ms to 100ms
      return;
    }
    
    lastSeekTimeRef.current = now;
    isInSeekOperationRef.current = true;
    
    // Set seeking state and update time immediately for better UI feedback
    setIsSeeking(true);
    setCurrentTime(value);
    
    try {
      if (videoRef.current) {
        const wasPlaying = isPlaying;
        const validPosition = Math.max(0, Math.min(value, duration));
        
        // Update refs immediately
        currentPositionRef.current = validPosition;
        lastPositionRef.current = validPosition;
        
        // Perform the seek operation without pausing first for faster response
        await videoRef.current.setPositionAsync(validPosition * 1000);
        
        // Resume playback if it was playing before
        if (wasPlaying) {
          videoRef.current.playAsync().catch(() => {});
        }
      }
    } catch (error) {
      console.error('Error seeking:', error);
    } finally {
      setIsSeeking(false);
      // Use a shorter timeout to reset the operation flag
      setTimeout(() => {
        isInSeekOperationRef.current = false;
      }, 50); // Reduced from 100ms to 50ms
    }
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    // Reduce update frequency for better performance
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 100 && !status.didJustFinish) { // Reduced from 200ms to 100ms
      return;
    }
    
    lastUpdateTimeRef.current = now;

    if (status.isLoaded) {
      const newPosition = status.positionMillis / 1000;
      const videoDuration = status.durationMillis ? status.durationMillis / 1000 : 0;
      
      // Update current position reference
      currentPositionRef.current = newPosition;
      
      // Only update UI when not seeking to avoid jitter
      if (!isSeeking) {
        setCurrentTime(newPosition);
      }
      
      // Call onProgress with current time and duration - only if significant change
      if (onProgress && !isSeeking && !isQualityChanging && 
          (Math.abs(newPosition - lastPositionRef.current) > 0.5 || status.didJustFinish)) {
        onProgress(newPosition, videoDuration);
      }
      
      // Simplified position tracking
      lastPositionRef.current = newPosition;
      
      // Check if we're near the end
      if (duration > 0 && newPosition > duration - 3) {
        isAtEndRef.current = true;
      }
      
      // Update duration if it changed significantly
      if (status.durationMillis && Math.abs((status.durationMillis / 1000) - duration) > 1) {
        setDuration(status.durationMillis / 1000);
      }
      
      // Ensure video keeps playing during buffering - optimized to reduce unnecessary calls
      if (isPlaying && !status.isPlaying && status.isBuffering && !isSeeking && !isQualityChanging && !isInPlayPauseOperationRef.current) {
        isInPlayPauseOperationRef.current = true;
        
        // Try to resume playback
        videoRef.current?.playAsync()
          .catch(err => console.error('Error resuming playback during buffering:', err))
          .finally(() => {
            setTimeout(() => {
              isInPlayPauseOperationRef.current = false;
            }, 100);
          });
      }
      // Only update playing state from video if we're not buffering and it actually changed
      else if (!status.isBuffering && !isSeeking && !isQualityChanging && isPlaying !== status.isPlaying) {
        setIsPlaying(status.isPlaying);
      }
      
      // Handle intro/outro skipping - only update state when needed
      if (intro && newPosition >= intro.start && newPosition < intro.end) {
        if (!showSkipIntro) {
          setShowSkipIntro(true);
        }
      } else if (showSkipIntro) {
        setShowSkipIntro(false);
      }

      if (outro && newPosition >= outro.start && newPosition < outro.end) {
        if (!showSkipOutro) {
          setShowSkipOutro(true);
        }
      } else if (showSkipOutro) {
        setShowSkipOutro(false);
      }
      
      // Call position change callback - only if significant change
      if (onPositionChange && !isSeeking && !isQualityChanging && 
          (Math.abs(newPosition - lastPositionRef.current) > 0.5 || status.didJustFinish)) {
        onPositionChange(newPosition);
      }

      // Call end callback if needed
      if (status.didJustFinish && onEnd) {
        onEnd();
      }
    }
  };

  useEffect(() => {
    if (showControls && isPlaying) {
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 4000);
      setControlsTimeout(timeout);
      
      return () => {
        if (timeout) clearTimeout(timeout);
      };
    }
  }, [showControls, isPlaying]);

  useEffect(() => {
    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
      if (orientationChangeTimeoutRef.current) {
        clearTimeout(orientationChangeTimeoutRef.current);
      }
      ScreenOrientation.unlockAsync();
      StatusBar.setHidden(false);
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('visible');
      }
    };
  }, []);

  useEffect(() => {
    if (onFullscreenChange) {
      onFullscreenChange(isFullscreen);
    }
  }, [isFullscreen, onFullscreenChange]);

  const handleFullscreenUpdate = async ({ fullscreenUpdate }: { fullscreenUpdate: number }) => {
    try {
      if (isOrientationChangingRef.current && fullscreenUpdate !== 3) {
        //console.log('[DEBUG] VideoPlayer: Orientation change in progress, ignoring update:', fullscreenUpdate);
        return;
      }
      
      isOrientationChangingRef.current = true;
      
      switch (fullscreenUpdate) {
        case 0:
          setIsFullscreen(true);
          if (Platform.OS === 'android') {
            await NavigationBar.setVisibilityAsync('hidden');
          }
          break;
        case 1:
          break;
        case 2:
          break;
        case 3:
          setIsFullscreen(false);
          await Promise.all([
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP),
            Platform.OS === 'android' ? NavigationBar.setVisibilityAsync('visible') : Promise.resolve(),
          ]);
          break;
      }
      
      if (orientationChangeTimeoutRef.current) {
        clearTimeout(orientationChangeTimeoutRef.current);
      }
      
      orientationChangeTimeoutRef.current = setTimeout(() => {
        isOrientationChangingRef.current = false;
        orientationChangeTimeoutRef.current = null;
      }, 1000);
      
    } catch (error) {
      console.error('Error handling fullscreen update:', error);
      isOrientationChangingRef.current = false;
    }
  };

  const skipForward = async () => {
    if (videoRef.current) {
      try {
        const newPosition = Math.min(duration, currentTime + 5);
        
        await videoRef.current.setPositionAsync(newPosition * 1000);
        setCurrentTime(newPosition);
        
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
        const newPosition = Math.max(0, currentTime - 5);
        
        await videoRef.current.setPositionAsync(newPosition * 1000);
        setCurrentTime(newPosition);
        
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
      if (!status.isLoaded) return;
      
      const videoDuration = status.durationMillis ? status.durationMillis / 1000 : 0;
      setDuration(videoDuration);
      
      isAtEndRef.current = false;
      
      // Fast path for normal loads - avoid unnecessary operations
      if (!isQualityChanging && initialPositionRef.current <= 0 && isReady) {
        if (isPlaying && videoRef.current) {
          videoRef.current.playAsync().catch(() => {});
        }
        
        if (onLoad) {
          onLoad(status);
        }
        return;
      }
      
      // Handle quality change
      if (isQualityChanging && savedPosition > 0) {
        // Set safety timeout to ensure we don't get stuck in quality changing state
        const qualityChangeSafetyTimeout = setTimeout(() => {
          if (isQualityChanging) {
            setIsQualityChanging(false);
            
            if (isPlaying && videoRef.current) {
              videoRef.current.playAsync().catch(() => {});
            }
          }
        }, 2000); // Reduced from 2500ms
        
        if (videoRef.current) {
          try {
            // Seek to saved position
            const targetPosition = savedPosition > videoDuration - 10 ? 0 : savedPosition;
            await videoRef.current.setPositionAsync(targetPosition * 1000);
            
            // Play if needed
            if (wasPlayingBeforeQualityChange.current || isPlaying) {
              await videoRef.current.playAsync();
              setIsPlaying(true);
            }
            
            clearTimeout(qualityChangeSafetyTimeout);
            setIsQualityChanging(false);
          } catch (error) {
            console.error('[DEBUG] VideoPlayer: Error seeking after quality change:', error);
            clearTimeout(qualityChangeSafetyTimeout);
            setIsQualityChanging(false);
            
            if (isPlaying && videoRef.current) {
              videoRef.current.playAsync().catch(() => {});
            }
          }
        }
      }
      // Handle initial position
      else if (initialPositionRef.current > 0 && !isReady) {
        if (videoRef.current) {
          try {
            // Seek to initial position
            const targetPosition = initialPositionRef.current > videoDuration - 10 ? 0 : initialPositionRef.current;
            await videoRef.current.setPositionAsync(targetPosition * 1000);
            
            // Play if needed
            if (isPlaying) {
              await videoRef.current.playAsync();
            }
            
            setIsReady(true);
          } catch (error) {
            console.error('[DEBUG] VideoPlayer: Error setting resume position:', error);
            setIsReady(true);
            
            if (isPlaying && videoRef.current) {
              videoRef.current.playAsync().catch(() => {});
            }
          }
        } else {
          setIsPlaying(true);
          setIsReady(true);
        }
      } else {
        // For normal loads with no position to restore
        if (isPlaying && videoRef.current) {
          videoRef.current.playAsync().catch(() => {});
        }
      }
      
      if (onLoad) {
        onLoad(status);
      }
    } catch (error) {
      console.error('[DEBUG] VideoPlayer: Error in handleLoad:', error);
      setIsQualityChanging(false);
      setIsReady(true);
      
      if (isPlaying && videoRef.current) {
        videoRef.current.playAsync().catch(() => {});
      }
    }
  };

  useEffect(() => {
    // Only log if the rate has actually changed from what we last logged
    if (rate !== lastRateLoggedRef.current) {
      //console.log(`[DEBUG] VideoPlayer: Setting playback rate to ${rate}x`);
      lastRateLoggedRef.current = rate;
    }
    
    if (videoRef.current) {
      videoRef.current.setRateAsync(rate, true);
    }
  }, [rate]);

  // Add a ref to track the current rate to avoid redundant calls
  const currentRateRef = useRef<number>(rate);

  useEffect(() => {
    // Only set the rate if it's different from the current rate
    if (videoRef.current && currentRateRef.current !== rate) {
      //console.log(`[DEBUG] VideoPlayer: Setting playback rate to ${rate}x`);
      videoRef.current.setRateAsync(rate, true)
        .then(() => {
          //console.log(`[DEBUG] VideoPlayer: Successfully set playback rate to ${rate}x`);
          currentRateRef.current = rate; // Update the ref after successful change
          if (onPlaybackRateChange) {
            onPlaybackRateChange(rate);
          }
        })
        .catch(error => {
          console.error(`[DEBUG] VideoPlayer: Error setting playback rate to ${rate}x:`, error);
        });
    } else if (currentRateRef.current !== rate) {
      // Update the ref even if videoRef is not available yet
      currentRateRef.current = rate;
    }
  }, [rate, onPlaybackRateChange]);

  useEffect(() => {
    const dimensionsChangeHandler = ({ window, screen }: { window: { width: number; height: number }, screen: { width: number; height: number } }) => {
      const isLandscapeOrientation = window.width > window.height;
      
      if (isLandscapeOrientation === isFullscreen) {
        if (isFullscreen) {
          setDimensions({
            width: screen.width,
            height: screen.height
          });
        } else {
          setDimensions({
            width: window.width,
            height: (window.width * 9) / 16
          });
        }
      }
    };

    const subscription = Dimensions.addEventListener('change', dimensionsChangeHandler);

    dimensionsChangeHandler({ 
      window: Dimensions.get('window'),
      screen: Dimensions.get('screen')
    });

    return () => {
      subscription.remove();
    };
  }, [isFullscreen]);

  // Add a useEffect to ensure currentTime is properly initialized
  useEffect(() => {
    // Initialize currentTime from initialPosition if available
    if (initialPositionRef.current > 0) {
      setCurrentTime(initialPositionRef.current);
      currentPositionRef.current = initialPositionRef.current;
    }
  }, []);

  // Add a periodic check to ensure the video keeps playing during buffering
  useEffect(() => {
    if (!isPlaying) return; // Only run this effect when we want to be playing
    
    // Create an interval to check if the video should be playing but has paused
    const playCheckInterval = setInterval(() => {
      if (isPlaying && videoRef.current && !isInPlayPauseOperationRef.current && !isSeeking && !isQualityChanging) {
        // Force play to ensure we don't stay paused during buffering
        videoRef.current.getStatusAsync().then(status => {
          if (status.isLoaded && !status.isPlaying && status.isBuffering) {
            videoRef.current?.playAsync().catch(() => {
              // Ignore errors - this is just a periodic check
            });
          }
        }).catch(() => {
          // Ignore errors in status check
        });
      }
    }, 2000); // Check less frequently (every 2 seconds instead of every 1 second)
    
    return () => {
      clearInterval(playCheckInterval);
    };
  }, [isPlaying, isSeeking, isQualityChanging]);

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
      <Pressable 
        style={[styles.videoWrapper, { backgroundColor: '#000' }]} 
        onPress={handleScreenTap}
        onTouchStart={(e) => {
          // Store initial touch position for gesture detection
          lastTapXRef.current = e.nativeEvent.locationX;
        }}
      >
        <Video
          ref={videoRef}
          source={source.uri ? source : undefined}
          style={videoStyle}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={isPlaying}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          useNativeControls={false}
          onFullscreenUpdate={handleFullscreenUpdate}
          onLoad={handleLoad}
          progressUpdateIntervalMillis={250}
          positionMillis={isQualityChanging ? savedPosition * 1000 : undefined}
          rate={rate}
          shouldCorrectPitch={true}
          isMuted={false}
        />
        
        {showControls && (
          <ControlsOverlay
            showControls={showControls}
            isPlaying={isPlaying}
            isFullscreen={isFullscreen}
            currentTime={currentTime}
            duration={duration}
            isBuffering={false}
            title={title}
            onPlayPress={togglePlayPause}
            onFullscreenPress={toggleFullscreen}
            onSeek={handleSeek}
          />
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
});

export default React.memo(VideoPlayer); 