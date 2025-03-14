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
import { useVideoPlayer, VideoView } from 'expo-video';
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
  onLoad?: (status: any) => void;
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

// Add type definitions for video events
interface VideoProgress {
  currentTime: number;
  playableDuration: number;
  seekableDuration: number;
}

interface VideoError {
  error: {
    errorString?: string;
    errorException?: string;
    errorStackTrace?: string;
    errorCode?: string;
    error?: string;
    code?: number;
    localizedDescription?: string;
    localizedFailureReason?: string;
    localizedRecoverySuggestion?: string;
    domain?: string;
  };
  target?: number;
}

interface VideoBuffer {
  isBuffering: boolean;
}

// Update VideoPlayerStatus to use PlaybackStatus
interface VideoPlayerStatus {
  isBuffering: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  didJustFinish: boolean;
}

// Add VideoPlayerEvents interface
interface VideoPlayerEvents {
  statusUpdate: VideoPlayerStatus;
  error: VideoError;
  load: void;
  unload: void;
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
  isQualityChanging: externalQualityChanging = false,
  savedQualityPosition = 0,
}: VideoPlayerProps) => {
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
<<<<<<< HEAD
  const orientationChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isOrientationChangingRef = useRef(false);
=======

  // Create video player instance
  const player = useVideoPlayer(source.uri, player => {
    player.loop = false;
    if (initialPosition > 0) {
      player.currentTime = initialPosition;
    }
  });

  // Handle video progress
  useEffect(() => {
    if (player) {
      const interval = setInterval(() => {
        if (player.currentTime !== undefined && player.duration !== undefined) {
          setCurrentTime(player.currentTime);
          setDuration(player.duration);
          if (onProgress) {
            onProgress(player.currentTime, player.duration);
          }
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [player, onProgress]);

  // Handle video end
  useEffect(() => {
    if (player && player.currentTime === player.duration && player.duration > 0) {
      setIsPlaying(false);
      if (onEnd) {
        onEnd();
      }
    }
  }, [player, onEnd]);

  // Handle video load
  useEffect(() => {
    if (player && player.duration !== undefined && player.duration > 0) {
      setDuration(player.duration);
      if (onLoad) {
        onLoad({
          duration: player.duration,
          currentTime: player.currentTime || 0,
          isBuffering: false
        });
      }
    }
  }, [player, onLoad]);

  // Handle buffering state
  useEffect(() => {
    if (player) {
      const handleStatusUpdate = (status: VideoPlayerStatus) => {
        if (status.isBuffering) {
          setIsBuffering(true);
          setShowBufferingIndicator(true);
          if (bufferingTimeoutRef.current) {
            clearTimeout(bufferingTimeoutRef.current);
          }
          bufferingTimeoutRef.current = setTimeout(() => {
            setShowBufferingIndicator(false);
          }, 1000);
        } else {
          setIsBuffering(false);
          setShowBufferingIndicator(false);
        }
        
        // Update playing state
        setIsPlaying(status.isPlaying);
        
        // Handle end of video
        if (status.didJustFinish && onEnd) {
          onEnd();
        }
      };

      // Use type assertion to fix the linter error
      player.addListener('status' as keyof VideoPlayerEvents, handleStatusUpdate);

      return () => {
        player.removeListener('status' as keyof VideoPlayerEvents, handleStatusUpdate);
      };
    }
  }, [player, onEnd]);

  // Handle intro/outro skip
  useEffect(() => {
    if (player && currentTime !== undefined) {
      if (intro && currentTime >= intro.start && currentTime <= intro.end) {
        setShowSkipIntro(true);
      } else {
        setShowSkipIntro(false);
      }

      if (outro && currentTime >= outro.start && currentTime <= outro.end) {
        setShowSkipOutro(true);
      } else {
        setShowSkipOutro(false);
      }
    }
  }, [player, currentTime, intro, outro]);

  // Handle skip intro/outro
  const handleSkipIntro = () => {
    if (player && intro) {
      player.currentTime = intro.end;
      if (onSkipIntro) {
        onSkipIntro();
      }
    }
  };

  const handleSkipOutro = () => {
    if (player && outro) {
      player.currentTime = outro.end;
      if (onSkipOutro) {
        onSkipOutro();
      }
    }
  };
>>>>>>> 39b20cccc9bcbbccffc5cc6cba0bc145748e41f5

  // Update when external quality changing state changes
  useEffect(() => {
    console.log(`[DEBUG] VideoPlayer: External quality changing state changed to ${externalQualityChanging}`);
    if (externalQualityChanging) {
      wasPlayingBeforeQualityChange.current = isPlaying;
      setIsQualityChanging(true);
      setSavedPosition(savedQualityPosition);
    }
  }, [externalQualityChanging, savedQualityPosition]);

  // Track source changes to detect quality changes
  useEffect(() => {
<<<<<<< HEAD
    // If the source URI changed
    if (sourceRef.current.uri !== source.uri) {
      console.log(`[DEBUG] VideoPlayer: Source URI changed from ${sourceRef.current.uri} to ${source.uri}`);
      
      // Update the source ref immediately
      sourceRef.current = source;
      
      // If we're not already handling a quality change, treat this as a quality change
      if (!isQualityChanging && currentTime > 0) {
=======
    if (sourceRef.current.uri !== source.uri) {
      console.log(`[DEBUG] VideoPlayer: Source URI changed from ${sourceRef.current.uri} to ${source.uri}`);
      
      if (!isQualityChanging) {
>>>>>>> 39b20cccc9bcbbccffc5cc6cba0bc145748e41f5
        console.log(`[DEBUG] VideoPlayer: Detected quality change, saving position: ${currentTime}`);
        wasPlayingBeforeQualityChange.current = isPlaying;
        setIsQualityChanging(true);
        setSavedPosition(currentTime);
      }
<<<<<<< HEAD
    }
  }, [source.uri]);
=======
      
      sourceRef.current = source;
    }
  }, [source, source.uri]);
>>>>>>> 39b20cccc9bcbbccffc5cc6cba0bc145748e41f5

  // Update initialPositionRef when initialPosition changes
  useEffect(() => {
    console.log(`[DEBUG] VideoPlayer: initialPosition changed to ${initialPosition}`);
    initialPositionRef.current = initialPosition;
    
<<<<<<< HEAD
    // If we already have a video reference and the position changes, seek to it
    if (videoRef.current && initialPosition > 0 && isReady) {
      console.log(`[DEBUG] VideoPlayer: Seeking to new initialPosition: ${initialPosition}`);
      videoRef.current.setPositionAsync(initialPosition * 1000)
        .catch(error => console.error('[DEBUG] VideoPlayer: Error seeking to new position:', error));
    }
  }, [initialPosition]);

  // Add a useEffect to handle video loading and seeking
  useEffect(() => {
    if (videoRef.current && initialPositionRef.current > 0 && !isReady) {
      const seekToInitialPosition = async () => {
        try {
          console.log(`[DEBUG] VideoPlayer: Attempting to seek to initial position: ${initialPositionRef.current}`);
          await videoRef.current?.pauseAsync();
          await videoRef.current?.setPositionAsync(initialPositionRef.current * 1000);
          await videoRef.current?.playAsync();
          setIsReady(true);
          console.log('[DEBUG] VideoPlayer: Successfully seeked to initial position');
        } catch (error) {
          console.error('[DEBUG] VideoPlayer: Error seeking to initial position:', error);
        }
      };
      
      // Delay seeking to ensure video is loaded
      setTimeout(seekToInitialPosition, 1000);
    }
  }, []);
=======
    if (player && initialPosition > 0 && isReady) {
      console.log(`[DEBUG] VideoPlayer: Seeking to new initialPosition: ${initialPosition}`);
      player.currentTime = initialPosition;
    }
  }, [initialPosition]);
>>>>>>> 39b20cccc9bcbbccffc5cc6cba0bc145748e41f5

  // Format time in MM:SS format
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle fullscreen toggle with debounce
  const toggleFullscreen = async () => {
    try {
      // Prevent rapid orientation changes
      if (isOrientationChangingRef.current) {
        console.log('[DEBUG] VideoPlayer: Orientation change in progress, ignoring request');
        return;
      }
      
      isOrientationChangingRef.current = true;
      
      if (isFullscreen) {
        setIsFullscreen(false);
        if (onFullscreenChange) {
          onFullscreenChange(false);
        }
        
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
        setIsFullscreen(true);
        if (onFullscreenChange) {
          onFullscreenChange(true);
        }
        
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        if (Platform.OS === 'android') {
          await NavigationBar.setVisibilityAsync('hidden');
        }
        StatusBar.setHidden(true);
        
<<<<<<< HEAD
        // Get screen dimensions for fullscreen mode
        const { width, height } = Dimensions.get('screen');
        setDimensions({
          width: width,
          height: height
=======
        const { width, height } = Dimensions.get('window');
        setDimensions({
          width: Math.max(width, height),
          height: Math.min(width, height)
>>>>>>> 39b20cccc9bcbbccffc5cc6cba0bc145748e41f5
        });
      }
      
      // Add a delay before allowing another orientation change
      if (orientationChangeTimeoutRef.current) {
        clearTimeout(orientationChangeTimeoutRef.current);
      }
      
      orientationChangeTimeoutRef.current = setTimeout(() => {
        isOrientationChangingRef.current = false;
        orientationChangeTimeoutRef.current = null;
      }, 1000); // 1 second debounce
      
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
      isOrientationChangingRef.current = false;
    }
  };

  // Handle play/pause toggle
  const togglePlayPause = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Handle seeking
  const handleSeek = (value: number) => {
    if (player) {
      player.currentTime = value;
      setCurrentTime(value);
      if (onPositionChange) {
        onPositionChange(value);
      }
    }
  };

  // Handle screen tap - improve the tap handler
  const handleScreenTap = () => {
    console.log(`[DEBUG] VideoPlayer: Screen tapped, current controls state: ${showControls}`);
    
    // Toggle controls visibility
    const newControlsState = !showControls;
    console.log(`[DEBUG] VideoPlayer: Setting controls visibility to ${newControlsState}`);
    setShowControls(newControlsState);
    
    // Clear any existing timeout
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
      setControlsTimeout(null);
    }
    
    // Only set a new timeout if showing controls
    if (newControlsState) {
      const timeout = setTimeout(() => {
        console.log(`[DEBUG] VideoPlayer: Auto-hiding controls after timeout`);
        setShowControls(false);
      }, 5000); // Longer timeout for better usability
      
<<<<<<< HEAD
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

  // Communicate fullscreen state
  useEffect(() => {
    if (onFullscreenChange) {
      onFullscreenChange(isFullscreen);
    }
  }, [isFullscreen, onFullscreenChange]);

  // Add handler for fullscreen updates with debounce
  const handleFullscreenUpdate = async ({ fullscreenUpdate }: { fullscreenUpdate: number }) => {
    try {
      // Prevent rapid orientation changes
      if (isOrientationChangingRef.current && fullscreenUpdate !== 3) { // Always allow exit fullscreen
        console.log('[DEBUG] VideoPlayer: Orientation change in progress, ignoring update:', fullscreenUpdate);
        return;
      }
      
      isOrientationChangingRef.current = true;
      
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
      
      // Add a delay before allowing another orientation change
      if (orientationChangeTimeoutRef.current) {
        clearTimeout(orientationChangeTimeoutRef.current);
      }
      
      orientationChangeTimeoutRef.current = setTimeout(() => {
        isOrientationChangingRef.current = false;
        orientationChangeTimeoutRef.current = null;
      }, 1000); // 1 second debounce
      
    } catch (error) {
      console.error('Error handling fullscreen update:', error);
      isOrientationChangingRef.current = false;
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
        // Set duration first
        const videoDuration = status.durationMillis ? status.durationMillis / 1000 : 0;
        setDuration(videoDuration);
        
        console.log(`[DEBUG] VideoPlayer: Video loaded, duration: ${videoDuration}`);
        
        // Handle quality change position - OPTIMIZED VERSION
        if (isQualityChanging && savedPosition > 0) {
          console.log(`[DEBUG] VideoPlayer: Quality change detected, seeking to saved position: ${savedPosition}`);
          
          // Immediately seek to the saved position without delays
          if (videoRef.current) {
            try {
              // Set position immediately
              await videoRef.current.setPositionAsync(savedPosition * 1000);
              
              // Restore previous playback state
              if (wasPlayingBeforeQualityChange.current) {
                await videoRef.current.playAsync();
                setIsPlaying(true);
              }
              
              setIsQualityChanging(false);
              console.log('[DEBUG] VideoPlayer: Quality change position restored successfully');
            } catch (error) {
              console.error('[DEBUG] VideoPlayer: Error seeking after quality change:', error);
              setIsQualityChanging(false);
            }
          }
        }
        // Handle initial position
        else if (initialPositionRef.current > 0 && !isReady) {
          if (videoRef.current) {
            console.log(`[DEBUG] VideoPlayer: Initial load: seeking to ${initialPositionRef.current} seconds`);
            try {
              // Set position immediately
              await videoRef.current.setPositionAsync(initialPositionRef.current * 1000);
              
              // Play if needed
              if (isPlaying) {
                await videoRef.current.playAsync();
              }
              
              setIsReady(true);
              console.log(`[DEBUG] VideoPlayer: Initial position restored to ${initialPositionRef.current}`);
            } catch (error) {
              console.error('[DEBUG] VideoPlayer: Error setting resume position:', error);
              setIsReady(true); // Mark as ready anyway to prevent repeated attempts
            }
          } else {
            setIsPlaying(true);
            setIsReady(true);
          }
        }
        
        // Call parent's onLoad handler
        if (onLoad) {
          onLoad(status);
        }
      }
    } catch (error) {
      console.error('[DEBUG] VideoPlayer: Error in handleLoad:', error);
      setIsQualityChanging(false);
      setIsReady(true);
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
    const dimensionsChangeHandler = ({ window, screen }: { window: { width: number; height: number }, screen: { width: number; height: number } }) => {
      // Determine if this is a landscape orientation
      const isLandscapeOrientation = window.width > window.height;
      
      // Only update dimensions if the orientation matches the fullscreen state
      // This prevents unnecessary dimension changes during orientation transitions
      if (isLandscapeOrientation === isFullscreen) {
        if (isFullscreen) {
          // In fullscreen/landscape mode - use screen dimensions to get full screen
          setDimensions({
            width: screen.width,
            height: screen.height
          });
        } else {
          // In portrait mode
          setDimensions({
            width: window.width,
            height: (window.width * 9) / 16
          });
        }
      }
    };

    const subscription = Dimensions.addEventListener('change', dimensionsChangeHandler);

    // Force an immediate update
    dimensionsChangeHandler({ 
      window: Dimensions.get('window'),
      screen: Dimensions.get('screen')
    });

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
      <Pressable style={[styles.videoWrapper, { backgroundColor: '#000' }]} onPress={handleScreenTap}>
        <Video
          ref={videoRef}
          source={source.uri ? source : undefined}
          style={[
            styles.video, 
            isFullscreen && { 
              width: dimensions.width, 
              height: dimensions.height,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }
          ]}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={isPlaying}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          useNativeControls={false}
          onFullscreenUpdate={handleFullscreenUpdate}
          onLoad={handleLoad}
          progressUpdateIntervalMillis={500}
          positionMillis={isQualityChanging ? savedPosition * 1000 : undefined}
          rate={rate}
          isMuted={false}
=======
      setControlsTimeout(timeout);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        activeOpacity={1}
        style={[styles.videoContainer, { width: dimensions.width, height: dimensions.height }]}
        onPress={() => {
          console.log('[DEBUG] VideoPlayer: TouchableOpacity pressed');
          handleScreenTap();
        }}
      >
        <VideoView
          player={player}
          style={[styles.video, { width: dimensions.width, height: dimensions.height }]}
          allowsFullscreen
          allowsPictureInPicture
          nativeControls={false}
>>>>>>> 39b20cccc9bcbbccffc5cc6cba0bc145748e41f5
        />
        
        {showBufferingIndicator && (
          <View style={styles.bufferingContainer}>
            <View style={styles.bufferingIndicator}>
              <ActivityIndicator size="large" color="#f4511e" />
              <Text style={styles.bufferingText}>Buffering...</Text>
            </View>
          </View>
        )}

        {showControls ? (
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
            style={styles.controlsGradient}
          >
            <View style={styles.controlsContainer}>
              {/* Title bar at top */}
              <View style={styles.topControls}>
                <Text style={styles.title} numberOfLines={1}>{title}</Text>
                <TouchableOpacity 
                  onPress={toggleFullscreen}
                  style={styles.iconButton}
                >
                  <MaterialIcons
                    name={isFullscreen ? "fullscreen-exit" : "fullscreen"}
                    size={28}
                    color="white"
                  />
                </TouchableOpacity>
              </View>
              
              {/* Center play button */}
              <View style={styles.centerControls}>
                <TouchableOpacity 
                  onPress={togglePlayPause}
                  style={styles.playPauseButton}
                >
                  <MaterialIcons
                    name={isPlaying ? "pause" : "play-arrow"}
                    size={50}
                    color="white"
                  />
                </TouchableOpacity>
              </View>

              {/* Bottom controls */}
              <View style={styles.bottomControls}>
                {/* Progress bar and time */}
                <View style={styles.progressContainer}>
                  <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                  <Slider
                    style={styles.slider}
                    value={currentTime}
                    minimumValue={0}
                    maximumValue={duration || 0.01}
                    onValueChange={handleSeek}
                    minimumTrackTintColor="#f4511e"
                    maximumTrackTintColor="rgba(255,255,255,0.3)"
                    thumbTintColor="#fff"
                  />
                  <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>
                
                {/* Bottom control buttons */}
                <View style={styles.controlButtonsRow}>
                  {/* Play/pause button */}
                  <TouchableOpacity
                    onPress={togglePlayPause}
                    style={styles.iconButton}
                  >
                    <MaterialIcons
                      name={isPlaying ? "pause" : "play-arrow"}
                      size={32}
                      color="white"
                    />
                  </TouchableOpacity>
                  
                  {/* Spacer */}
                  <View style={{flex: 1}} />
                  
                  {/* Fullscreen button */}
                  <TouchableOpacity
                    onPress={toggleFullscreen}
                    style={styles.iconButton}
                  >
                    <MaterialIcons
                      name={isFullscreen ? "fullscreen-exit" : "fullscreen"}
                      size={32}
                      color="white"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </LinearGradient>
        ) : (
          <TouchableOpacity 
            style={styles.tapForControlsContainer}
            onPress={handleScreenTap}
          >
            <View style={styles.tapForControlsIndicator}>
              <MaterialIcons name="touch-app" size={20} color="white" />
              <Text style={styles.tapForControlsText}>Tap for controls</Text>
            </View>
          </TouchableOpacity>
        )}

        {showSkipIntro && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipIntro}
          >
            <MaterialIcons name="fast-forward" size={18} color="white" />
            <Text style={styles.skipButtonText}>Skip Intro</Text>
          </TouchableOpacity>
        )}

        {showSkipOutro && (
          <TouchableOpacity
            style={[styles.skipButton, {backgroundColor: 'rgba(0,0,0,0.7)'}]}
            onPress={handleSkipOutro}
          >
            <MaterialIcons name="fast-forward" size={18} color="white" />
            <Text style={styles.skipButtonText}>Skip Outro</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    position: 'relative',
    backgroundColor: '#000',
  },
  video: {
    backgroundColor: '#000',
  },
  bufferingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  bufferingIndicator: {
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    alignItems: 'center',
  },
  bufferingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 14,
  },
  controlsGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    justifyContent: 'space-between',
  },
  controlsContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    padding: 8,
  },
  bottomControls: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    padding: 12,
  },
  centerControls: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  slider: {
    flex: 1,
    marginHorizontal: 8,
    height: 40,
  },
  timeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 16,
  },
  controlButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  skipButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#f4511e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  skipButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  iconButton: {
    padding: 8,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  playPauseButton: {
    padding: 16,
    borderRadius: 40,
    backgroundColor: 'rgba(244,81,30,0.8)',
  },
  tapForControlsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  tapForControlsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
  },
  tapForControlsText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default VideoPlayer; 