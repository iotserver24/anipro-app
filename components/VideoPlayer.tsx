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

interface ControlsOverlayProps {
  showControls: boolean;
  isPlaying: boolean;
  isFullscreen: boolean;
  currentTime: number;
  duration: number;
  title: string;
  onPlayPress: () => void;
  onFullscreenPress: () => void;
  onSeek: (value: number) => void;
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
  onSkipIntro?: () => void;
  onSkipOutro?: () => void;
}

// Memoize the controls overlay component
const ControlsOverlay = React.memo(({
  showControls,
  isPlaying,
  isFullscreen,
  currentTime,
  duration,
  title,
  onPlayPress,
  onFullscreenPress,
  onSeek,
  intro,
  outro,
  onSkipIntro,
  onSkipOutro
}: ControlsOverlayProps) => {
  // Format time function
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Skip button logic
  const shouldShowIntroButton = intro && currentTime >= intro.start && currentTime < intro.end;
  const shouldShowOutroButton = outro && currentTime >= outro.start && currentTime < outro.end;

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
        <View style={styles.topBarContent}>
          <View style={styles.titleContainer}>
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
          </View>
          
          {/* Skip Intro/Outro buttons */}
          <View style={styles.skipButtonsContainer}>
            {shouldShowIntroButton && (
              <TouchableOpacity
                style={styles.skipButton}
                onPress={onSkipIntro}
              >
                <Text style={styles.skipButtonText}>Skip Intro</Text>
              </TouchableOpacity>
            )}
            {shouldShowOutroButton && (
              <TouchableOpacity
                style={styles.skipButton}
                onPress={onSkipOutro}
              >
                <Text style={styles.skipButtonText}>Skip Outro</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      <View style={styles.centerControls}>
        <TouchableOpacity 
          style={styles.skipBackwardButton}
          onPress={() => onSeek(Math.max(0, currentTime - 5))}
        >
          <MaterialIcons
            name="replay-5"
            size={28}
            color="white"
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.playPauseButton}
          onPress={onPlayPress}
        >
          <MaterialIcons
            name={isPlaying ? 'pause' : 'play-arrow'}
            size={32}
            color="white"
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.skipForwardButton}
          onPress={() => onSeek(Math.min(duration, currentTime + 5))}
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
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={duration > 0 ? duration : 1}
            value={currentTime}
            onSlidingComplete={onSeek}
            minimumTrackTintColor="#f4511e"
            maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
            thumbTintColor="#f4511e"
          />
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={onPlayPress}
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
              onPress={onFullscreenPress}
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
  // Optimize re-renders by comparing only what matters
  return (
    prevProps.showControls === nextProps.showControls &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.isFullscreen === nextProps.isFullscreen &&
    Math.floor(prevProps.currentTime) === Math.floor(nextProps.currentTime) &&
    prevProps.duration === nextProps.duration
  );
});

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
  rate = 1.0,
  onPlaybackRateChange,
  intro,
  outro,
  onSkipIntro,
  onSkipOutro,
  isQualityChanging = false,
  savedQualityPosition = 0,
}) => {
  // Refs
  const videoRef = useRef<Video>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<number>(0);
  const lastTapXRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);
  const didCompletePlaybackRef = useRef<boolean>(false);
  const isOrientationChangingRef = useRef<boolean>(false);

  // State
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dimensions, setDimensions] = useState({
    width: Dimensions.get('window').width,
    height: (Dimensions.get('window').width * 9) / 16
  });
  const [isReady, setIsReady] = useState(false);

  // Optimize playback status updates with debounce
  const debouncedOnProgress = useMemo(
    () => debounce((position: number, duration: number) => {
      if (onProgress) {
        onProgress(position, duration);
      }
    }, 250),
    [onProgress]
  );

  const debouncedOnPositionChange = useMemo(
    () => debounce((position: number) => {
      if (onPositionChange) {
        onPositionChange(position);
      }
    }, 250),
    [onPositionChange]
  );

  // Optimize playback status update handler
  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    const newPosition = status.positionMillis / 1000;
    const videoDuration = status.durationMillis ? status.durationMillis / 1000 : 0;
    
    // Batch state updates
    if (!isSeekingRef.current) {
      requestAnimationFrame(() => {
        setCurrentTime(newPosition);
      });
    }
    
    if (duration !== videoDuration && videoDuration > 0) {
      requestAnimationFrame(() => {
        setDuration(videoDuration);
      });
    }
    
    // Handle playback end
    if (status.didJustFinish && !didCompletePlaybackRef.current) {
      didCompletePlaybackRef.current = true;
      if (onEnd) {
        onEnd();
      }
    }
    
    // Use debounced callbacks for progress and position updates
    if (!isSeekingRef.current && !isQualityChanging) {
      debouncedOnProgress(newPosition, videoDuration);
      debouncedOnPositionChange(newPosition);
    }
  }, [duration, debouncedOnProgress, debouncedOnPositionChange, onEnd, isQualityChanging]);

  // Optimize screen tap handler
  const handleScreenTap = useCallback((event: any) => {
    const now = Date.now();
    const tapX = event.nativeEvent.locationX;
    
    // Handle double tap (for seek)
    if (now - lastTapRef.current < 300 && Math.abs(tapX - lastTapXRef.current) < 40) {
      if (tapX < dimensions.width / 2) {
        handleSeek(Math.max(0, currentTime - 10));
      } else {
        handleSeek(Math.min(duration, currentTime + 10));
      }
      return;
    }
    
    // Store last tap info
    lastTapRef.current = now;
    lastTapXRef.current = tapX;
    
    // Immediately update controls visibility
    setShowControls(prevShowControls => !prevShowControls);
    
    // Clear existing timeout
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
    
    // Set auto-hide timeout if showing controls while playing
    if (!showControls && isPlaying) {
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
    }
  }, [showControls, isPlaying, currentTime, duration, dimensions.width]);

  // Optimize seek handler
  const handleSeek = useCallback(async (value: number) => {
    if (!videoRef.current) return;
    
    try {
      isSeekingRef.current = true;
      const wasPlaying = isPlaying;
      
      // Update UI immediately for better feedback
      requestAnimationFrame(() => {
        setCurrentTime(value);
      });
      
      // Pause while seeking for smoother experience
      if (wasPlaying) {
        await videoRef.current.pauseAsync();
      }
      
      // Perform seek
      await videoRef.current.setPositionAsync(value * 1000);
      
      // Resume playback if it was playing before
      if (wasPlaying) {
        await videoRef.current.playAsync();
      }
    } catch (error) {
      console.error('Error seeking:', error);
    } finally {
      // Small delay before releasing seeking lock to prevent jumps
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 50);
    }
  }, [isPlaying]);

  // Optimize play/pause toggle
  const togglePlayPause = useCallback(async () => {
    try {
      const newIsPlaying = !isPlaying;
      requestAnimationFrame(() => {
        setIsPlaying(newIsPlaying);
      });
      
      if (videoRef.current) {
        if (newIsPlaying) {
          await videoRef.current.playAsync();
        } else {
          await videoRef.current.pauseAsync();
        }
      }
        } catch (error) {
      console.error('Error toggling play/pause:', error);
      // Revert state on error
      requestAnimationFrame(() => {
        setIsPlaying(!isPlaying);
      });
    }
  }, [isPlaying]);

  // Optimize fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    try {
      if (isOrientationChangingRef.current) return;
      
      isOrientationChangingRef.current = true;
      const newIsFullscreen = !isFullscreen;
      
      requestAnimationFrame(() => {
      setIsFullscreen(newIsFullscreen);
      });
      
      if (newIsFullscreen) {
        // Go to landscape
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        if (Platform.OS === 'android') {
          await NavigationBar.setVisibilityAsync('hidden');
        }
        StatusBar.setHidden(true);
        
        const { width, height } = Dimensions.get('screen');
        requestAnimationFrame(() => {
          setDimensions({
            width: width,
            height: height
          });
        });
      } else {
        // Go to portrait
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        if (Platform.OS === 'android') {
          await NavigationBar.setVisibilityAsync('visible');
        }
        StatusBar.setHidden(false);
        
        const { width } = Dimensions.get('window');
        requestAnimationFrame(() => {
        setDimensions({
          width: width,
          height: (width * 9) / 16
        });
        });
      }
      
      // Reset flag after a delay
      setTimeout(() => {
        isOrientationChangingRef.current = false;
      }, 500);
      
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
      isOrientationChangingRef.current = false;
    }
  }, [isFullscreen]);

  // Set up and tear down
  useEffect(() => {
    // Auto-hide controls after delay if playing
    if (showControls && isPlaying) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
      
      return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
    }
    };
  }, [showControls, isPlaying]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      // Reset orientation when component unmounts
      ScreenOrientation.unlockAsync().catch(console.error);
      StatusBar.setHidden(false);
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('visible').catch(console.error);
      }
    };
  }, []);

  // Notify of fullscreen changes
  useEffect(() => {
    if (onFullscreenChange) {
      onFullscreenChange(isFullscreen);
    }
  }, [isFullscreen, onFullscreenChange]);

  // Update playback rate when prop changes
  useEffect(() => {
    if (videoRef.current && rate > 0) {
      videoRef.current.setRateAsync(rate, true).catch(console.error);
    }
  }, [rate]);

  // Handle screen dimension changes
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

  // Initial position seeking
  useEffect(() => {
    const seekToInitialPosition = async () => {
      if (videoRef.current && initialPosition > 0 && !isReady) {
        try {
          await videoRef.current.setPositionAsync(initialPosition * 1000);
          setIsReady(true);
        } catch (error) {
          console.error('Error seeking to initial position:', error);
          setIsReady(true);
        }
      }
    };

    // Slight delay to ensure video is loaded
    const timeout = setTimeout(seekToInitialPosition, 300);
    return () => clearTimeout(timeout);
  }, [initialPosition]);

  // Save position during quality changes
  useEffect(() => {
    if (isQualityChanging && videoRef.current && savedQualityPosition > 0) {
      const timeout = setTimeout(() => {
        videoRef.current?.setPositionAsync(savedQualityPosition * 1000)
          .then(() => {
            // Resume playback if it was playing before
            if (isPlaying) {
              videoRef.current?.playAsync().catch(console.error);
            }
          })
          .catch(console.error);
              }, 300);
      
      return () => clearTimeout(timeout);
    }
  }, [isQualityChanging, savedQualityPosition, isPlaying]);

  // Handle video load
  const handleLoad = async (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    
    const videoDuration = status.durationMillis ? status.durationMillis / 1000 : 0;
    setDuration(videoDuration);
    
    // Reset end of video flag on new load
    didCompletePlaybackRef.current = false;
    
    // Seek to initial position or quality change position
    if (isQualityChanging && savedQualityPosition > 0) {
      try {
        await videoRef.current?.setPositionAsync(savedQualityPosition * 1000);
        setCurrentTime(savedQualityPosition);
        
        if (isPlaying) {
          await videoRef.current?.playAsync();
        }
      } catch (error) {
        console.error('Error seeking after quality change:', error);
      }
    } else if (initialPosition > 0 && !isReady) {
      try {
        await videoRef.current?.setPositionAsync(initialPosition * 1000);
        setCurrentTime(initialPosition);
        
        if (isPlaying) {
          await videoRef.current?.playAsync();
        }
        
        setIsReady(true);
      } catch (error) {
        console.error('Error seeking to initial position:', error);
        setIsReady(true);
      }
    }
    
    // Call parent's onLoad callback
    if (onLoad) {
      onLoad(status);
    }
  };

  // Handle skipping intro
  const handleSkipIntro = useCallback(async () => {
    if (intro && videoRef.current) {
      await handleSeek(intro.end);
      if (onSkipIntro) {
        onSkipIntro();
      }
    }
  }, [intro, onSkipIntro]);

  // Handle skipping outro
  const handleSkipOutro = useCallback(async () => {
    if (outro && videoRef.current) {
      await handleSeek(outro.end);
      if (onSkipOutro) {
        onSkipOutro();
      }
    }
  }, [outro, onSkipOutro]);

  // Memoize video style
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
      >
        <Video
          ref={videoRef}
          source={source.uri ? source : undefined}
          style={videoStyle}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={isPlaying}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          useNativeControls={false}
          onLoad={handleLoad}
          progressUpdateIntervalMillis={250}
          positionMillis={isQualityChanging ? savedQualityPosition * 1000 : undefined}
          rate={rate}
          shouldCorrectPitch={true}
          isMuted={false}
          isLooping={false}
        />
        
        {showControls && (
          <ControlsOverlay
            showControls={showControls}
            isPlaying={isPlaying}
            isFullscreen={isFullscreen}
            currentTime={currentTime}
            duration={duration}
            title={title || ''}
            onPlayPress={togglePlayPause}
            onFullscreenPress={toggleFullscreen}
            onSeek={handleSeek}
            intro={intro}
            outro={outro}
            onSkipIntro={handleSkipIntro}
            onSkipOutro={handleSkipOutro}
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
  topBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  titleText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  skipButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  skipButton: {
    backgroundColor: '#f4511e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  skipButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
  },
  skipForwardButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
});

export default React.memo(VideoPlayer); 