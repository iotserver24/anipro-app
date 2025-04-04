import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Pressable,
  Platform,
  Animated,
} from "react-native";
// import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { MaterialIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as ScreenOrientation from "expo-screen-orientation";
import { LinearGradient } from "expo-linear-gradient";
import * as NavigationBar from "expo-navigation-bar";
import { debounce } from "lodash";
import Video, { ResizeMode, type VideoRef, TextTrackType, SelectedTrackType, ISO639_1 } from "react-native-video";
import FullScreenChz from "react-native-fullscreen-chz";
import ControlsOverlay from './ControlsOverlay';

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
  onLoad?: (data: any) => void;
  onQualityChange?: (quality: string) => void;
  rate?: number;
  onPlaybackRateChange?: (rate: number) => void;
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
  onSkipIntro?: () => void;
  onSkipOutro?: () => void;
  isQualityChanging?: boolean;
  savedQualityPosition?: number;
  qualities?: Quality[];
  selectedQuality?: string;
  subtitles?: Subtitle[];
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

// Add this component before the main VideoPlayer component
const SkipButtons = React.memo(({ 
  currentTime, 
  intro, 
  outro, 
  onSkipIntro, 
  onSkipOutro 
}: { 
  currentTime: number; 
  intro?: { start: number; end: number }; 
  outro?: { start: number; end: number }; 
  onSkipIntro?: () => void; 
  onSkipOutro?: () => void; 
}) => {
  const showIntroButton = intro && currentTime >= intro.start && currentTime < intro.end;
  const showOutroButton = outro && currentTime >= outro.start && currentTime < outro.end;

  if (!showIntroButton && !showOutroButton) return null;

  return (
    <View style={styles.skipButtonsContainer}>
      {showIntroButton && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkipIntro}
          activeOpacity={0.7}
        >
          <Text style={styles.skipButtonText}>Skip Intro</Text>
        </TouchableOpacity>
      )}
      {showOutroButton && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkipOutro}
          activeOpacity={0.7}
        >
          <Text style={styles.skipButtonText}>Skip Outro</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

// Add Quality type definition
type Quality = {
  url: string;
  quality: string;
};

// Update the Subtitle type definition
type Subtitle = {
  url: string;
  lang: string;
};

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
  qualities = [],
  selectedQuality = 'auto',
  onQualityChange,
  subtitles = [],
}) => {
  // Add console log to debug subtitles
  useEffect(() => {
    console.log('Received subtitles:', subtitles);
  }, [subtitles]);

  // Refs
  const videoRef = useRef<VideoRef>(null);
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
    width: Dimensions.get("window").width,
    height: (Dimensions.get("window").width * 9) / 16,
  });
  const [isReady, setIsReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [controlsOpacity] = useState(new Animated.Value(1)); // Initialize with visible controls
  const [tapFeedbackVisible, setTapFeedbackVisible] = useState(false);
  const [tapFeedbackPosition, setTapFeedbackPosition] = useState({ x: 0, y: 0 });
  const tapFeedbackOpacity = useState(new Animated.Value(0))[0];
  const [playbackSpeed, setPlaybackSpeed] = useState(rate);

  // Add quality-related state
  const [availableQualities, setAvailableQualities] = useState<Quality[]>(qualities);
  const [currentQuality, setCurrentQuality] = useState<string>(selectedQuality);

  // Update subtitle handling to set English as default
  const [selectedSubtitle, setSelectedSubtitle] = useState<string | undefined>(() => {
    const englishSub = subtitles.find(sub => sub.lang === 'English');
    return englishSub ? englishSub.lang : undefined;
  });

  // Add position tracking for subtitle changes
  const currentPositionRef = useRef<number>(0);

  // Optimize playback status updates with debounce
  const debouncedOnProgress = useMemo(
    () =>
      debounce((position: number, duration: number) => {
        if (onProgress) {
          onProgress(position, duration);
        }
      }, 250),
    [onProgress]
  );

  const debouncedOnPositionChange = useMemo(
    () =>
      debounce((position: number) => {
        if (onPositionChange) {
          onPositionChange(position);
        }
      }, 250),
    [onPositionChange]
  );

  // Update progress handler to track position
  const handleProgress = useCallback(
    (data: {
      currentTime: number;
      playableDuration: number;
      seekableDuration: number;
    }) => {
      if (isSeekingRef.current || isQualityChanging) return;

      const newPosition = data.currentTime;
      currentPositionRef.current = newPosition; // Store current position

      // Batch state updates
      requestAnimationFrame(() => {
        setCurrentTime(newPosition);
      });

      // Use debounced callbacks for progress and position updates
      debouncedOnProgress(newPosition, duration);
      debouncedOnPositionChange(newPosition);
    },
    [
      duration,
      debouncedOnProgress,
      debouncedOnPositionChange,
      isQualityChanging,
    ]
  );

  // Optimize screen tap handler
  const handleScreenTap = useCallback((event: any) => {
    // Immediately respond to tap without waiting
    const now = Date.now();
    const tapX = event.nativeEvent.locationX;

    // Handle double tap (for seek) with immediate feedback
    if (now - lastTapRef.current < 300 && Math.abs(tapX - lastTapXRef.current) < 40) {
      // Provide immediate visual feedback
      if (tapX < dimensions.width / 2) {
        // Update UI immediately before starting the seek
        setCurrentTime(Math.max(0, currentTime - 10));
        handleSeek(Math.max(0, currentTime - 10));
      } else {
        // Update UI immediately before starting the seek
        setCurrentTime(Math.min(duration, currentTime + 10));
        handleSeek(Math.min(duration, currentTime + 10));
      }
      return;
    }

    // Store last tap info
    lastTapRef.current = now;
    lastTapXRef.current = tapX;

    // Toggle controls visibility with animation for smoother transition
    Animated.timing(controlsOpacity, {
      toValue: showControls ? 0 : 1,
      duration: 150, // Fast animation for responsiveness
      useNativeDriver: true,
    }).start();

    // Toggle state after a very brief delay to allow animation to start
    setShowControls(!showControls);

    // Clear existing timeout
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }

    // Set auto-hide timeout if showing controls while playing
    if (!showControls && isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        Animated.timing(controlsOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start(() => {
          setShowControls(false);
        });
      }, 3000);
    }

    // Visual feedback for tap
    setTapFeedbackPosition({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY });
    setTapFeedbackVisible(true);
    tapFeedbackOpacity.setValue(0.7);
    Animated.timing(tapFeedbackOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setTapFeedbackVisible(false);
    });
  }, [showControls, isPlaying, currentTime, duration, dimensions.width, controlsOpacity, tapFeedbackOpacity]);

  // Optimize seek handler
  const handleSeek = useCallback(async (value: number) => {
    if (!videoRef.current) return;

    try {
      isSeekingRef.current = true;

      // Update UI immediately
      setCurrentTime(value);

      // Perform the seek operation
      videoRef.current.seek(value);

      // Release the seeking lock more quickly
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 10); // Much shorter delay
    } catch (error) {
      console.error("Error seeking:", error);
      isSeekingRef.current = false;
    }
  }, []);

  // Create an optimized play/pause toggle function
  const togglePlayPause = useCallback(() => {
    // IMPORTANT: Just update the state directly - no async operations!
    setIsPlaying(prev => !prev);
  }, []);

  // Add animated values for smooth transitions
  const containerWidthAnim = useRef(new Animated.Value(Dimensions.get("window").width)).current;
  const containerHeightAnim = useRef(new Animated.Value((Dimensions.get("window").width * 9) / 16)).current;

  // Updated fullscreen toggle with better exit transition
  const toggleFullscreen = useCallback(async () => {
    try {
      if (isOrientationChangingRef.current) return;
      isOrientationChangingRef.current = true;

      const newIsFullscreen = !isFullscreen;
      
      // For exiting fullscreen, we need special handling
      if (!newIsFullscreen) {
        // Calculate the dimensions we'll need after exiting fullscreen
        const windowWidth = Dimensions.get("window").width;
        const windowHeight = (windowWidth * 9) / 16; // 16:9 aspect ratio
        
        // First animate container size to window size
        // This creates a smooth transition before rotation
        Animated.parallel([
          Animated.timing(containerWidthAnim, {
            toValue: windowWidth,
            duration: 150,
            useNativeDriver: false
          }),
          Animated.timing(containerHeightAnim, {
            toValue: windowHeight,
            duration: 150,
            useNativeDriver: false
          })
        ]).start();

        // First disable fullscreen APIs but keep orientation in landscape temporarily
        FullScreenChz.disable();
        if (Platform.OS === 'android') {
          await NavigationBar.setVisibilityAsync('visible');
        }
        
        // Small delay to let container resize animate before rotation
        await new Promise(resolve => setTimeout(resolve, 170));
        
        // Now change orientation
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP
        );
        
        // Restore status bar
        StatusBar.setHidden(false, 'fade');
        
        // Update UI state after everything is done
        setIsFullscreen(newIsFullscreen);
        if (onFullscreenChange) {
          onFullscreenChange(newIsFullscreen);
        }

        // Update dimensions state after animation completes
        setDimensions({
          width: windowWidth,
          height: windowHeight
        });
      } else {
        // For entering fullscreen, the original approach works well
        // Update UI state immediately for better responsiveness
        setIsFullscreen(newIsFullscreen);
        
        // Notify parent of fullscreen change immediately
        if (onFullscreenChange) {
          onFullscreenChange(newIsFullscreen);
        }
        
        // First change orientation before other changes
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE
        );
        
        // Hide status bar after orientation change
        StatusBar.setHidden(true, 'fade');
        
        // Then handle fullscreen API and navigation bar
        FullScreenChz.enable();
        
        if (Platform.OS === 'android') {
          await NavigationBar.setVisibilityAsync('hidden');
        }

        // Update animated values after rotation
        const screenWidth = Dimensions.get("screen").width;
        const screenHeight = Dimensions.get("screen").height;
        containerWidthAnim.setValue(screenWidth);
        containerHeightAnim.setValue(screenHeight);
      }

      // Reset flag after orientation is done changing
      setTimeout(() => {
        isOrientationChangingRef.current = false;
      }, 300); // Ensure orientation change completes
    } catch (error) {
      console.error("Error toggling fullscreen:", error);
      isOrientationChangingRef.current = false;
      
      // In case of error, ensure UI state matches actual state
      if (isFullscreen) {
        try {
          FullScreenChz.disable();
          StatusBar.setHidden(false, 'fade');
          ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          if (Platform.OS === 'android') {
            NavigationBar.setVisibilityAsync('visible');
          }
        } catch (e) {
          console.error("Error during fullscreen error recovery:", e);
        }
      }
    }
  }, [isFullscreen, onFullscreenChange, containerWidthAnim, containerHeightAnim]);

  // Set up and tear down
  useEffect(() => {
    // Auto-hide controls after delay if playing
    if (showControls && isPlaying) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        // Animate the controls fading out
        Animated.timing(controlsOpacity, {
          toValue: 0,
          duration: 150, // Fast animation for smoother feel
          useNativeDriver: true,
        }).start(() => {
          setShowControls(false);
        });
      }, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, isPlaying, controlsOpacity]);

  // Clean up on component unmount
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ screen }) => {
      // Just update dimensions, don't do any other state changes here
      setDimensions({ width: screen.width, height: screen.height });
    });
    
    return () => {
      subscription?.remove();
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }

      // Reset orientation when component unmounts - ensure this happens even if errors occur
      try {
        ScreenOrientation.unlockAsync();
        StatusBar.setHidden(false);
        if (Platform.OS === "android") {
          NavigationBar.setVisibilityAsync("visible");
        }
        FullScreenChz.disable();
      } catch (error) {
        console.error("Error cleaning up VideoPlayer:", error);
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
    if (rate !== playbackSpeed) {
      setPlaybackSpeed(rate);
    }
  }, [rate]);

  // Add playback speed change handler
  const handlePlaybackSpeedChange = useCallback((newSpeed: number) => {
    setPlaybackSpeed(newSpeed);
    // Notify parent component
    if (onPlaybackRateChange) {
      onPlaybackRateChange(newSpeed);
    }
  }, [onPlaybackRateChange]);

  // Handle screen dimension changes
  useEffect(() => {
    const dimensionsChangeHandler = ({
      screen,
      window,
    }: {
      screen: { width: number; height: number };
      window: { width: number; height: number };
    }) => {
      // Use requestAnimationFrame for smoother transitions
      requestAnimationFrame(() => {
        if (isFullscreen) {
          // In fullscreen mode, use screen dimensions
          const maxDim = Math.max(screen.width, screen.height);
          const minDim = Math.min(screen.width, screen.height);

          setDimensions({
            width: maxDim,
            height: minDim,
          });

          // Update animated values
          containerWidthAnim.setValue(maxDim);
          containerHeightAnim.setValue(minDim);
        } else {
          // In normal mode, force 16:9 aspect ratio
          const height = (window.width * 9) / 16;
          setDimensions({
            width: window.width,
            height: height,
          });

          // Update animated values
          containerWidthAnim.setValue(window.width);
          containerHeightAnim.setValue(height);
        }
      });
    };

    // Subscribe to dimension changes
    const subscription = Dimensions.addEventListener(
      "change",
      dimensionsChangeHandler
    );

    // Force an immediate update
    dimensionsChangeHandler({
      screen: Dimensions.get("screen"),
      window: Dimensions.get("window"),
    });

    return () => {
      subscription.remove();
    };
  }, [isFullscreen, containerWidthAnim, containerHeightAnim]);

  // Initial position seeking
  useEffect(() => {
    const seekToInitialPosition = () => {
      if (videoRef.current && initialPosition > 0 && !isReady) {
        videoRef.current.seek(initialPosition);
        setIsReady(true);
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
        if (videoRef.current) {
          videoRef.current.seek(savedQualityPosition);
        }
      }, 300);

      return () => clearTimeout(timeout);
    }
  }, [isQualityChanging, savedQualityPosition]);

  // Handle video load
  const handleLoad = (data: { duration: number; currentTime: number }) => {
    const videoDuration = data.duration;
    setDuration(videoDuration);

    // Reset end of video flag on new load
    didCompletePlaybackRef.current = false;

    // Initial seek if needed
    if (isQualityChanging && savedQualityPosition > 0) {
      videoRef.current?.seek(savedQualityPosition);
      setCurrentTime(savedQualityPosition);
    } else if (initialPosition > 0 && !isReady) {
      videoRef.current?.seek(initialPosition);
      setCurrentTime(initialPosition);
      setIsReady(true);
    }

    // Call parent's onLoad callback
    if (onLoad) {
      onLoad(data);
    }
  };

  // Handle end of video
  const handleEnd = () => {
    if (!didCompletePlaybackRef.current) {
      didCompletePlaybackRef.current = true;
      if (onEnd) {
        onEnd();
      }
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

  // Handle buffering state
  const handleBuffer = ({ isBuffering }: { isBuffering: boolean }) => {
    setIsBuffering(isBuffering);
  };

  // Simplify video style without CSS transitions
  const videoStyle = useMemo(
    () => [
      styles.video,
      isFullscreen 
        ? {
            position: "absolute" as const,
            top: 0,
            left: 0,
            width: dimensions.width,
            height: dimensions.height,
            backgroundColor: "#000",
          }
        : {
            width: dimensions.width,
            height: dimensions.height,
            backgroundColor: "#000",
          }
    ],
    [isFullscreen, dimensions]
  );

  // Add effect to sync quality props with state
  useEffect(() => {
    if (qualities && qualities.length > 0) {
      setAvailableQualities(qualities);
    }
  }, [qualities]);

  useEffect(() => {
    if (selectedQuality !== currentQuality) {
      setCurrentQuality(selectedQuality);
    }
  }, [selectedQuality]);

  // Add quality change handler
  const handleQualityChange = useCallback((newQuality: string) => {
    setCurrentQuality(newQuality);
    // Notify parent component
    if (onQualityChange) {
      onQualityChange(newQuality);
    }
  }, [onQualityChange]);

  // Handle subtitle selection with position maintenance
  const handleSubtitleChange = useCallback((lang: string | null) => {
    console.log('Changing subtitle to:', lang);
    setSelectedSubtitle(lang || undefined);
    
    // Small delay to let subtitle change process before seeking
    setTimeout(() => {
      if (videoRef.current && currentPositionRef.current > 0) {
        videoRef.current.seek(currentPositionRef.current);
      }
    }, 100);
  }, []);

  // Update selected subtitle track with logging
  const selectedSubtitleTrack = useMemo(() => {
    if (!selectedSubtitle) return undefined;
    const subtitle = subtitles.find(s => s.lang === selectedSubtitle);
    console.log('Selected subtitle track:', subtitle);
    return subtitle ? {
      title: subtitle.lang,
      language: subtitle.lang.toLowerCase(),
      type: TextTrackType.VTT,
      uri: subtitle.url
    } : undefined;
  }, [selectedSubtitle, subtitles]);

  // Add a cleanup function to normalize orientation
  const normalizeOrientation = async () => {
    try {
      await ScreenOrientation.unlockAsync();
      StatusBar.setHidden(false);
      FullScreenChz.disable();
      if (Platform.OS === "android") {
        await NavigationBar.setVisibilityAsync("visible");
      }
    } catch (error) {
      console.error("Error normalizing orientation:", error);
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }

      // Normalize orientation when component unmounts
      normalizeOrientation();
    };
  }, []);

  // Update useEffect for subtitle initialization
  useEffect(() => {
    console.log('Received subtitles:', subtitles);
    // Set English as default if available and no subtitle is selected
    if (!selectedSubtitle && subtitles.length > 0) {
      const englishSub = subtitles.find(sub => sub.lang === 'English');
      if (englishSub) {
        handleSubtitleChange(englishSub.lang);
      }
    }
  }, [subtitles]);

  return (
    <Animated.View
      style={[
        styles.container,
        isFullscreen && styles.fullscreenContainer,
        style,
        {
          width: containerWidthAnim,
          height: containerHeightAnim,
          backgroundColor: "#000",
          aspectRatio: isFullscreen ? undefined : 16 / 9,
        },
      ]}
    >
      <Pressable
        style={[styles.videoWrapper]}
        onPress={handleScreenTap}
        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        android_ripple={{ color: 'transparent' }}
      >
        <Video
          ref={videoRef}
          source={source.uri ? source : undefined}
          style={videoStyle}
          resizeMode={ResizeMode.CONTAIN}
          paused={!isPlaying}
          onProgress={handleProgress}
          onLoad={handleLoad}
          onEnd={handleEnd}
          onBuffer={handleBuffer}
          rate={playbackSpeed}
          repeat={false}
          muted={false}
          controls={false}
          progressUpdateInterval={250}
          textTracks={selectedSubtitleTrack ? [selectedSubtitleTrack] : undefined}
          selectedTextTrack={selectedSubtitleTrack ? {
            type: SelectedTrackType.LANGUAGE,
            value: selectedSubtitleTrack.language
          } : undefined}
        />
        {isBuffering && (
          <View style={styles.bufferingContainer}>
            <ActivityIndicator size="large" color="#f4511e" />
          </View>
        )}
        
        {/* Always show skip buttons regardless of showControls state */}
        <SkipButtons
          currentTime={currentTime}
          intro={intro}
          outro={outro}
          onSkipIntro={handleSkipIntro}
          onSkipOutro={handleSkipOutro}
        />
        
        {/* Always render controls but adjust opacity */}
        <Animated.View 
          style={[styles.controlsContainer, { opacity: controlsOpacity }]}
          pointerEvents={showControls ? 'auto' : 'none'}
        >
          <ControlsOverlay
            showControls={true}
            isPlaying={isPlaying}
            isFullscreen={isFullscreen}
            currentTime={currentTime}
            duration={duration}
            title={title || ""}
            onPlayPress={togglePlayPause}
            onFullscreenPress={toggleFullscreen}
            onSeek={handleSeek}
            playbackSpeed={playbackSpeed}
            onPlaybackSpeedChange={handlePlaybackSpeedChange}
            qualities={availableQualities}
            selectedQuality={currentQuality}
            onQualityChange={handleQualityChange}
            isQualityChanging={isQualityChanging}
            subtitles={subtitles}
            selectedSubtitle={selectedSubtitle}
            onSubtitleChange={handleSubtitleChange}
          />
        </Animated.View>

        {tapFeedbackVisible && (
          <Animated.View 
            style={[
              styles.tapFeedback, 
              { 
                opacity: tapFeedbackOpacity,
                left: tapFeedbackPosition.x - 10, // Center the 20px wide element
                top: tapFeedbackPosition.y - 10, // Center the 20px tall element
              }
            ]} 
          />
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000",
    overflow: "hidden",
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    elevation: 999, // For Android
    backgroundColor: '#000',
  },
  videoWrapper: {
    flex: 1,
    backgroundColor: "#000",
  },
  video: {
    flex: 1,
    backgroundColor: "#000",
  },
  bufferingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  topBar: {
    paddingHorizontal: 12,
    paddingTop: 32,
    paddingBottom: 16,
  },
  topBarContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skipButtonsContainer: {
    position: 'absolute',
    top: 60,
    right: 16,
    alignItems: 'flex-end',
    zIndex: 10, // Ensure it's above other elements
  },
  skipButton: {
    backgroundColor: 'rgba(244, 81, 30, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  centerControls: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 50,
  },
  playPauseButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  skipBackwardButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  skipForwardButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomControls: {
    padding: 12,
    paddingTop: 16,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  timeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "500",
    width: 40,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  slider: {
    flex: 1,
    marginHorizontal: 6,
    height: 32,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  rightControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 3,
  },
  settingsButton: {
    padding: 8,
    marginLeft: 'auto',
  },
  tapFeedback: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
});

export default VideoPlayer;