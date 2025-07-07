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
import AsyncStorage from '@react-native-async-storage/async-storage';

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
const SkipButtons = ({ 
  position, 
  intro, 
  outro, 
  onSkipIntro, 
  onSkipOutro 
}: { 
  position: number;
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
  onSkipIntro?: () => void;
  onSkipOutro?: () => void;
}) => {
  const showIntroButton = useMemo(() => {
    if (!intro) return false;
    return position >= intro.start && position < intro.end;
  }, [position, intro]);

  const showOutroButton = useMemo(() => {
    if (!outro) return false;
    return position >= outro.start && position < outro.end;
  }, [position, outro]);

  if (!showIntroButton && !showOutroButton) return null;

  return (
    <View style={styles.skipButtonsContainer}>
      {showIntroButton && intro && (
        <Pressable 
          style={styles.skipButton}
          onPress={onSkipIntro}
          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
        >
          <MaterialIcons name="double-arrow" size={20} color="white" />
          <Text style={styles.skipButtonText}>Skip Intro</Text>
        </Pressable>
      )}
      {showOutroButton && outro && (
        <Pressable 
          style={styles.skipButton}
          onPress={onSkipOutro}
          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
        >
          <MaterialIcons name="double-arrow" size={20} color="white" />
          <Text style={styles.skipButtonText}>Skip Outro</Text>
        </Pressable>
      )}
    </View>
  );
};

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
    // Immediately toggle controls visibility
    setShowControls(prev => !prev);

    // Handle double tap logic
    const now = Date.now();
    const tapX = event.nativeEvent.locationX;

    if (now - lastTapRef.current < 300 && Math.abs(tapX - lastTapXRef.current) < 40) {
      if (tapX < dimensions.width / 2) {
        handleSeek(Math.max(0, currentTime - 10));
      } else {
        handleSeek(Math.min(duration, currentTime + 10));
      }
      return;
    }

    lastTapRef.current = now;
    lastTapXRef.current = tapX;

    // Clear existing timeout
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    // Set auto-hide timeout only if showing controls
    if (!showControls && isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [showControls, isPlaying, currentTime, duration, dimensions.width]);

  // Optimize controls visibility effect
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (showControls && isPlaying && !isFullscreen) {
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [showControls, isPlaying, isFullscreen]);

  // Add separate effect for fullscreen controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (showControls && isPlaying && isFullscreen) {
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [showControls, isPlaying, isFullscreen]);

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

  // Clean up on component unmount
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ screen }) => {
      // Just update dimensions, don't do any other state changes here
      setDimensions({ width: screen.width, height: screen.height });
    });
    
    return () => {
      // Clean up all timeouts
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }

      // Clean up event listeners
      subscription?.remove();

      // Clean up animated values
      controlsOpacity.stopAnimation();
      tapFeedbackOpacity.stopAnimation();
      containerWidthAnim.stopAnimation();
      containerHeightAnim.stopAnimation();

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
  }, [controlsOpacity, tapFeedbackOpacity, containerWidthAnim, containerHeightAnim]);

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

  // Handle screen dimension changes - consolidated and optimized
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

  // Initial position seeking - with proper cleanup
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const seekToInitialPosition = () => {
      if (videoRef.current && initialPosition > 0 && !isReady) {
        videoRef.current.seek(initialPosition);
        setIsReady(true);
      }
    };

    // Slight delay to ensure video is loaded
    timeoutId = setTimeout(seekToInitialPosition, 300);
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [initialPosition, isReady]);

  // Save position during quality changes - with proper cleanup
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isQualityChanging && videoRef.current && savedQualityPosition > 0) {
      timeoutId = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.seek(savedQualityPosition);
        }
      }, 300);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
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
    const timeoutId = setTimeout(() => {
      if (videoRef.current && currentPositionRef.current > 0) {
        videoRef.current.seek(currentPositionRef.current);
      }
    }, 100);
    
    // Clean up timeout if component unmounts
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
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

  // Consolidated cleanup on component unmount - REMOVE DUPLICATE
  // useEffect(() => {
  //   return () => {
  //     if (controlsTimeoutRef.current) {
  //       clearTimeout(controlsTimeoutRef.current);
  //     }

  //     // Normalize orientation when component unmounts
  //     normalizeOrientation();
  //   };
  // }, []);

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
  }, [subtitles, selectedSubtitle, handleSubtitleChange]);

  // Subtitle settings state
  const [subtitleSettings, setSubtitleSettings] = useState({
    fontSize: 16,
    paddingBottom: 60,
  });
  const [showSubtitleSettings, setShowSubtitleSettings] = useState(false);

  // Load subtitle settings from AsyncStorage on mount
  useEffect(() => {
    let isMounted = true;
    
    AsyncStorage.getItem('subtitleSettings').then((json) => {
      if (isMounted && json) {
        setSubtitleSettings(JSON.parse(json));
      }
    });
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Save subtitle settings to AsyncStorage
  const saveSubtitleSettings = async (settings: typeof subtitleSettings) => {
    setSubtitleSettings(settings);
    await AsyncStorage.setItem('subtitleSettings', JSON.stringify(settings));
  };

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
        hitSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
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
          maxBitRate={2000000}
          bufferConfig={{
            minBufferMs: 15000,
            maxBufferMs: 30000,
            bufferForPlaybackMs: 2500,
            bufferForPlaybackAfterRebufferMs: 5000
          }}
          textTracks={selectedSubtitleTrack ? [selectedSubtitleTrack] : undefined}
          selectedTextTrack={selectedSubtitleTrack ? {
            type: SelectedTrackType.LANGUAGE,
            value: selectedSubtitleTrack.language
          } : undefined}
          subtitleStyle={{
            fontSize: subtitleSettings.fontSize,
            paddingBottom: subtitleSettings.paddingBottom,
            opacity: 0.7,
          }}
        />
        {isBuffering && (
          <View style={styles.bufferingContainer}>
            <ActivityIndicator size="large" color="#f4511e" />
          </View>
        )}
      </Pressable>

      {/* Subtitle Settings Modal */}
      {showSubtitleSettings && (
        <View style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)', // 30% opacity
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
        }}>
          <View style={{ backgroundColor: '#222', borderRadius: 16, padding: 24, width: 320 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Subtitle Settings</Text>
            <Text style={{ color: '#fff', marginBottom: 8 }}>Font Size: {subtitleSettings.fontSize}</Text>
            <Slider
              minimumValue={10}
              maximumValue={32}
              step={1}
              value={subtitleSettings.fontSize}
              onValueChange={v => setSubtitleSettings(s => ({ ...s, fontSize: v }))}
              minimumTrackTintColor="#f4511e"
              maximumTrackTintColor="#888"
              thumbTintColor="#f4511e"
            />
            <Text style={{ color: '#fff', marginTop: 16, marginBottom: 8 }}>Padding Bottom: {subtitleSettings.paddingBottom}</Text>
            <Slider
              minimumValue={0}
              maximumValue={120}
              step={1}
              value={subtitleSettings.paddingBottom}
              onValueChange={v => setSubtitleSettings(s => ({ ...s, paddingBottom: v }))}
              minimumTrackTintColor="#f4511e"
              maximumTrackTintColor="#888"
              thumbTintColor="#f4511e"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24 }}>
              <TouchableOpacity onPress={() => setShowSubtitleSettings(false)} style={{ marginRight: 16 }}>
                <Text style={{ color: '#f4511e', fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { saveSubtitleSettings(subtitleSettings); setShowSubtitleSettings(false); }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Move SkipButtons outside of Pressable but inside the main container */}
      <SkipButtons
        position={currentTime}
        intro={intro}
        outro={outro}
        onSkipIntro={handleSkipIntro}
        onSkipOutro={handleSkipOutro}
      />
        
      {/* Always render controls but manage visibility through opacity */}
      <View 
        style={[
          styles.controlsContainer,
          { opacity: showControls ? 1 : 0 },
          { pointerEvents: showControls ? 'auto' : 'none' }
        ]}
      >
        <ControlsOverlay
          showControls={showControls}
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
          onSubtitleSettingsPress={() => setShowSubtitleSettings(true)}
        />
      </View>

      {tapFeedbackVisible && (
        <Animated.View 
          style={[
            styles.tapFeedback, 
            { 
              opacity: tapFeedbackOpacity,
              left: tapFeedbackPosition.x - 10,
              top: tapFeedbackPosition.y - 10,
            }
          ]} 
        />
      )}
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
    top: 80,
    right: 20,
    alignItems: 'flex-end',
    zIndex: 999,
    elevation: 999,
    width: 'auto',
  },
  skipButton: {
    backgroundColor: 'rgba(244, 81, 30, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    flexDirection: 'row',
    gap: 8,
  },
  skipButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
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