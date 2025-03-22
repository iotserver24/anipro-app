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
} from "react-native";
// import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { MaterialIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as ScreenOrientation from "expo-screen-orientation";
import { LinearGradient } from "expo-linear-gradient";
import * as NavigationBar from "expo-navigation-bar";
import { debounce } from "lodash";
import Video, { ResizeMode, type VideoRef } from "react-native-video";
import FullScreenChz from "react-native-fullscreen-chz";

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
const ControlsOverlay = React.memo(
  ({
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
    onSkipOutro,
  }: ControlsOverlayProps) => {
    // Format time function
    const formatTime = (seconds: number) => {
      if (isNaN(seconds) || seconds === Infinity) return "00:00";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    };

    // Skip button logic
    const shouldShowIntroButton =
      intro && currentTime >= intro.start && currentTime < intro.end;
    const shouldShowOutroButton =
      outro && currentTime >= outro.start && currentTime < outro.end;

    if (!showControls) return null;

    return (
      <View
        style={styles.controlsOverlay}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.7)", "transparent"]}
          style={styles.topBar}
        >
          <View style={styles.topBarContent}>
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
            <MaterialIcons name="replay-5" size={28} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playPauseButton}
            onPress={onPlayPress}
          >
            <MaterialIcons
              name={isPlaying ? "pause" : "play-arrow"}
              size={32}
              color="white"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipForwardButton}
            onPress={() => onSeek(Math.min(duration, currentTime + 5))}
          >
            <MaterialIcons name="forward-5" size={28} color="white" />
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.7)"]}
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
                name={isPlaying ? "pause" : "play-arrow"}
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
                  name={isFullscreen ? "fullscreen-exit" : "fullscreen"}
                  size={20}
                  color="white"
                />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  },
  (prevProps, nextProps) => {
    // Optimize re-renders by comparing only what matters
    return (
      prevProps.showControls === nextProps.showControls &&
      prevProps.isPlaying === nextProps.isPlaying &&
      prevProps.isFullscreen === nextProps.isFullscreen &&
      Math.floor(prevProps.currentTime) === Math.floor(nextProps.currentTime) &&
      prevProps.duration === nextProps.duration
    );
  }
);

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

  // Optimize playback status update handler
  const handleProgress = useCallback(
    (data: {
      currentTime: number;
      playableDuration: number;
      seekableDuration: number;
    }) => {
      if (isSeekingRef.current || isQualityChanging) return;

      const newPosition = data.currentTime;

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
  const handleScreenTap = useCallback(
    (event: any) => {
      const now = Date.now();
      const tapX = event.nativeEvent.locationX;

      // Handle double tap (for seek)
      if (
        now - lastTapRef.current < 300 &&
        Math.abs(tapX - lastTapXRef.current) < 40
      ) {
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
      setShowControls((prevShowControls) => !prevShowControls);

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
    },
    [showControls, isPlaying, currentTime, duration, dimensions.width]
  );

  // Optimize seek handler
  const handleSeek = useCallback(async (value: number) => {
    if (!videoRef.current) return;

    try {
      isSeekingRef.current = true;

      // Update UI immediately for better feedback
      requestAnimationFrame(() => {
        setCurrentTime(value);
      });

      // Perform seek - react-native-video uses seek method
      videoRef.current.seek(value);

      // Small delay before releasing seeking lock to prevent jumps
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 50);
    } catch (error) {
      console.error("Error seeking:", error);
      isSeekingRef.current = false;
    }
  }, []);

  // Optimize play/pause toggle
  const togglePlayPause = useCallback(async () => {
    try {
      const newIsPlaying = !isPlaying;
      requestAnimationFrame(() => {
        setIsPlaying(newIsPlaying);
      });

      if (videoRef.current) {
        if (newIsPlaying) {
          videoRef.current.resume();
        } else {
          videoRef.current.pause();
        }
      }
    } catch (error) {
      console.error("Error toggling play/pause:", error);
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

      if (newIsFullscreen) {
        // Go to landscape - do this first for smoother transition
        StatusBar.setHidden(true);
        FullScreenChz.enable();
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE
        );
        setIsFullscreen(true);
        // await NavigationBar.setVisibilityAsync("hidden");
        // await Promise.all([
        //   ScreenOrientation.lockAsync(
        //     ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT
        //   ),
        //   Platform.OS === "android"
        //     ? NavigationBar.setVisibilityAsync("hidden")
        //     : Promise.resolve(),
        //   StatusBar.setHidden(true, "fade"),
        // ]);
        // // Get screen dimensions after orientation change
        // const { width: screenWidth, height: screenHeight } =
        //   Dimensions.get("screen");

        // // Set dimensions immediately
        // setDimensions({
        //   width: Math.max(screenWidth, screenHeight),
        //   height: Math.min(screenWidth, screenHeight),
        // });

        // Update state after dimensions are set
        setIsFullscreen(true);
      } else {
        // Update state first when exiting
        StatusBar.setHidden(false);
        // await NavigationBar.setVisibilityAsync("visible");
        FullScreenChz.disable();
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP
        );
        setIsFullscreen(false);

        // Go to portrait
        // await Promise.all([
        //   ScreenOrientation.lockAsync(
        //     ScreenOrientation.OrientationLock.PORTRAIT_UP
        //   ),
        //   Platform.OS === "android"
        //     ? NavigationBar.setVisibilityAsync("visible")
        //     : Promise.resolve(),
        //   StatusBar.setHidden(false, "fade"),
        // ]);

        // // Force a small delay to ensure orientation change is complete
        // await new Promise((resolve) => setTimeout(resolve, 50));

        // // Get window dimensions and calculate 16:9 aspect ratio
        // const { width: windowWidth } = Dimensions.get("window");
        // const height = (windowWidth * 9) / 16;

        // // Set dimensions with exact 16:9 ratio
        // setDimensions({
        //   width: windowWidth,
        //   height: height,
        // });
      }

      // Notify parent of fullscreen change
      if (onFullscreenChange) {
        onFullscreenChange(newIsFullscreen);
      }

      // Reset flag after shorter delay
      setTimeout(() => {
        isOrientationChangingRef.current = false;
      }, 250);
    } catch (error) {
      console.error("Error toggling fullscreen:", error);
      // Reset state and flag on error
      setIsFullscreen(isFullscreen);
      isOrientationChangingRef.current = false;
    }
  }, [isFullscreen, onFullscreenChange]);

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
    const subscription = Dimensions.addEventListener("change", ({ screen }) => {
      setDimensions({ width: screen.width, height: screen.height });
    });
    return () => {
      subscription?.remove();
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }

      // Reset orientation when component unmounts
      ScreenOrientation.unlockAsync().catch(console.error);
      StatusBar.setHidden(false);
      if (Platform.OS === "android") {
        NavigationBar.setVisibilityAsync("visible").catch(console.error);
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
  // useEffect(() => {
  //   if (videoRef.current && rate > 0) {
  //     videoRef.current.setRateAsync(rate, true).catch(console.error);
  //   }
  // }, [rate]);

  // Handle screen dimension changes
  useEffect(() => {
    const dimensionsChangeHandler = ({
      screen,
      window,
    }: {
      screen: { width: number; height: number };
      window: { width: number; height: number };
    }) => {
      if (isFullscreen) {
        // In fullscreen mode, use screen dimensions
        const maxDim = Math.max(screen.width, screen.height);
        const minDim = Math.min(screen.width, screen.height);

        setDimensions({
          width: maxDim,
          height: minDim,
        });
      } else {
        // In normal mode, force 16:9 aspect ratio
        const height = (window.width * 9) / 16;
        setDimensions({
          width: window.width,
          height: height,
        });
      }
    };

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
  }, [isFullscreen]);

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

  // Memoize video style with absolute positioning in fullscreen
  const videoStyle = useMemo(
    () => [
      styles.video,
      isFullscreen && {
        position: "absolute" as const,
        top: 0,
        left: 0,
        width: dimensions.width,
        height: dimensions.height,
        backgroundColor: "#000",
      },
    ],
    [isFullscreen, dimensions]
  );

  return (
    <View
      style={[
        styles.container,
        isFullscreen && styles.fullscreenContainer,
        style,
        {
          width: dimensions.width,
          height: dimensions.height,
          backgroundColor: "#000",
          aspectRatio: isFullscreen ? undefined : 16 / 9,
        },
      ]}
    >
      <Pressable
        style={[
          styles.videoWrapper,
          {
            backgroundColor: "#000",
            aspectRatio: isFullscreen ? undefined : 16 / 9,
          },
        ]}
        onPress={handleScreenTap}
      >
        <Video
          ref={videoRef}
          source={source.uri ? source : undefined}
          style={[
            videoStyle,
            {
              aspectRatio: isFullscreen ? undefined : 16 / 9,
            },
          ]}
          resizeMode={ResizeMode.CONTAIN}
          paused={!isPlaying}
          onProgress={handleProgress}
          onLoad={handleLoad}
          onEnd={handleEnd}
          onBuffer={handleBuffer}
          rate={rate}
          repeat={false}
          muted={false}
          controls={false}
          // fullscreen={isFullscreen}
          progressUpdateInterval={250}
        />
        {isBuffering && (
          <View style={styles.bufferingContainer}>
            <ActivityIndicator size="large" color="#f4511e" />
          </View>
        )}
        {showControls && (
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
    backgroundColor: "#000",
    overflow: "hidden",
  },
  fullscreenContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    elevation: 999, // Added for Android
    backgroundColor: "#000",
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
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.3)",
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
    flexDirection: "row",
    gap: 8,
  },
  skipButton: {
    backgroundColor: "#f4511e",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  skipButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  centerControls: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 50,
  },
  playPauseButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 3,
  },
});

export default React.memo(VideoPlayer);
