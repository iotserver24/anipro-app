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
  const isBufferingRef = useRef<boolean>(false);
  const isHandlingBufferingRef = useRef<boolean>(false);

  useEffect(() => {
    console.log(`[DEBUG] VideoPlayer: External quality changing state changed to ${externalQualityChanging}`);
    if (externalQualityChanging) {
      wasPlayingBeforeQualityChange.current = isPlaying;
      setIsQualityChanging(true);
      setSavedPosition(savedQualityPosition);
      
      // Add a safety timeout to ensure we don't stay in quality changing state forever
      const safetyTimeout = setTimeout(() => {
        if (isQualityChanging) {
          console.log('[DEBUG] VideoPlayer: Safety timeout reached, resetting quality changing state');
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
      console.log(`[DEBUG] VideoPlayer: Source URI changed from ${sourceRef.current.uri} to ${source.uri}`);
      
      sourceRef.current = source;
      
      if (!isQualityChanging && currentTime > 0) {
        console.log(`[DEBUG] VideoPlayer: Detected quality change, saving position: ${currentTime}`);
        wasPlayingBeforeQualityChange.current = isPlaying;
        setIsQualityChanging(true);
        setSavedPosition(currentTime);
      }
    }
  }, [source.uri]);

  useEffect(() => {
    console.log(`[DEBUG] VideoPlayer: initialPosition changed to ${initialPosition}`);
    initialPositionRef.current = initialPosition;
    
    if (videoRef.current && initialPosition > 0 && isReady) {
      console.log(`[DEBUG] VideoPlayer: Seeking to new initialPosition: ${initialPosition}`);
      videoRef.current.setPositionAsync(initialPosition * 1000)
        .catch(error => console.error('[DEBUG] VideoPlayer: Error seeking to new position:', error));
    }
  }, [initialPosition]);

  useEffect(() => {
    if (videoRef.current && initialPositionRef.current > 0 && !isReady) {
      const seekToInitialPosition = async () => {
        try {
          console.log(`[DEBUG] VideoPlayer: Attempting to seek to initial position: ${initialPositionRef.current}`);
          
          await videoRef.current?.pauseAsync();
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
          await videoRef.current?.setPositionAsync(initialPositionRef.current * 1000);
          
          await new Promise(resolve => setTimeout(resolve, 100));
          
          if (isPlaying) {
            await videoRef.current?.playAsync();
          }
          
          setIsReady(true);
          console.log('[DEBUG] VideoPlayer: Successfully seeked to initial position');
        } catch (error) {
          console.error('[DEBUG] VideoPlayer: Error seeking to initial position:', error);
        }
      };
      
      setTimeout(seekToInitialPosition, 1000);
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
        
        const { width, height } = Dimensions.get('screen');
        setDimensions({
          width: width,
          height: height
        });
      }
      
      if (orientationChangeTimeoutRef.current) {
        clearTimeout(orientationChangeTimeoutRef.current);
      }
      
      orientationChangeTimeoutRef.current = setTimeout(() => {
        isOrientationChangingRef.current = false;
        orientationChangeTimeoutRef.current = null;
      }, 1000);
      
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
      isOrientationChangingRef.current = false;
    }
  };

  const togglePlayPause = async () => {
    if (isInPlayPauseOperationRef.current) {
      console.log('[DEBUG] VideoPlayer: Play/pause operation in progress, ignoring request');
      return;
    }
    
    isInPlayPauseOperationRef.current = true;
    
    try {
      if (videoRef.current) {
        if (isPlaying) {
          await videoRef.current.pauseAsync();
        } else {
          await videoRef.current.playAsync();
        }
        setIsPlaying(!isPlaying);
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    } finally {
      setTimeout(() => {
        isInPlayPauseOperationRef.current = false;
      }, 300);
    }
  };

  const handleSeek = async (value: number) => {
    if (isInSeekOperationRef.current) {
      console.log('[DEBUG] VideoPlayer: Seek operation in progress, ignoring request');
      return;
    }
    
    const now = Date.now();
    if (now - lastSeekTimeRef.current < 300) {
      console.log('[DEBUG] VideoPlayer: Seeking too frequently, ignoring request');
      return;
    }
    
    lastSeekTimeRef.current = now;
    isInSeekOperationRef.current = true;
    setIsSeeking(true);
    
    try {
      if (videoRef.current) {
        const wasPlaying = isPlaying;
        if (wasPlaying) {
          await videoRef.current.pauseAsync();
        }
        
        const validPosition = Math.max(0, Math.min(value, duration));
        if (validPosition !== value) {
          console.log(`[DEBUG] VideoPlayer: Adjusted seek position from ${value} to ${validPosition}`);
        }
        
        await videoRef.current.setPositionAsync(validPosition * 1000);
        setCurrentTime(validPosition);
        currentPositionRef.current = validPosition;
        lastPositionRef.current = validPosition;
        
        if (wasPlaying) {
          await new Promise(resolve => setTimeout(resolve, 50));
          await videoRef.current.playAsync();
        }
      }
    } catch (error) {
      console.error('Error seeking:', error);
    } finally {
      setIsSeeking(false);
      setTimeout(() => {
        isInSeekOperationRef.current = false;
      }, 300);
    }
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 250 && !status.didJustFinish) {
      return;
    }
    
    lastUpdateTimeRef.current = now;

    if (status.isLoaded) {
      const newPosition = status.positionMillis / 1000;
      currentPositionRef.current = newPosition;
      
      if (!isSeeking && !isQualityChanging && lastPositionRef.current > 0) {
        const positionDiff = newPosition - lastPositionRef.current;
        
        if (positionDiff < -5 && Math.abs(positionDiff) > 5 && !isInSeekOperationRef.current) {
          console.log(`[DEBUG] VideoPlayer: Detected unexpected backward jump from ${lastPositionRef.current} to ${newPosition}`);
          
          if (lastPositionRef.current > duration * 0.9 && !isAtEndRef.current) {
            console.log(`[DEBUG] VideoPlayer: Preventing loop, continuing playback`);
          }
        }
      }
      
      lastPositionRef.current = newPosition;
      
      if (duration > 0 && newPosition > duration - 3) {
        isAtEndRef.current = true;
      }
      
      if (!isSeeking && !isQualityChanging && Math.abs(currentTime - newPosition) > 0.5) {
        setCurrentTime(newPosition);
      }
      
      if (status.durationMillis && Math.abs((status.durationMillis / 1000) - duration) > 1) {
        setDuration(status.durationMillis / 1000);
      }
      
      const newIsBuffering = status.isBuffering && !status.isPlaying;
      if (isBufferingRef.current !== newIsBuffering) {
        isBufferingRef.current = newIsBuffering;
        
        if (newIsBuffering) {
          if (!isHandlingBufferingRef.current) {
            isHandlingBufferingRef.current = true;
            
            if (bufferingTimeoutRef.current) {
              clearTimeout(bufferingTimeoutRef.current);
            }
            
            bufferingTimeoutRef.current = setTimeout(() => {
              setIsBuffering(true);
              setShowBufferingIndicator(true);
              bufferingTimeoutRef.current = null;
              
              setTimeout(() => {
                isHandlingBufferingRef.current = false;
              }, 500);
            }, 300);
          }
        } else {
          if (bufferingTimeoutRef.current) {
            clearTimeout(bufferingTimeoutRef.current);
            bufferingTimeoutRef.current = null;
          }
          
          setIsBuffering(false);
          setShowBufferingIndicator(false);
          isHandlingBufferingRef.current = false;
        }
      }
      
      if (!status.isBuffering && !isSeeking && !isQualityChanging && isPlaying !== status.isPlaying) {
        setIsPlaying(status.isPlaying);
      }

      if (status.isBuffering && !status.isPlaying && isPlaying && videoRef.current && !isSeeking && !isQualityChanging) {
        if (!isInPlayPauseOperationRef.current) {
          isInPlayPauseOperationRef.current = true;
          
          videoRef.current.playAsync()
            .catch(err => console.error('Error resuming playback:', err))
            .finally(() => {
              setTimeout(() => {
                isInPlayPauseOperationRef.current = false;
              }, 300);
            });
        }
      }

      if (onProgress && !isSeeking && !isQualityChanging) {
        onProgress(
          newPosition,
          status.durationMillis ? status.durationMillis / 1000 : 0
        );
      }

      if (onPositionChange && !isSeeking && !isQualityChanging) {
        onPositionChange(newPosition);
      }

      if (status.didJustFinish && onEnd) {
        onEnd();
      }

      const shouldShowSkipIntro = intro && newPosition >= intro.start && newPosition < intro.end;
      if (shouldShowSkipIntro !== showSkipIntro) {
        setShowSkipIntro(shouldShowSkipIntro);
      }

      const shouldShowSkipOutro = outro && newPosition >= outro.start && newPosition < outro.end;
      if (shouldShowSkipOutro !== showSkipOutro) {
        setShowSkipOutro(shouldShowSkipOutro);
      }
    }
  };

  const handleScreenTap = () => {
    if (showControls) {
      setShowControls(false);
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    } else {
      setShowControls(true);
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 4000);
      setControlsTimeout(timeout);
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

  useEffect(() => {
    if (onFullscreenChange) {
      onFullscreenChange(isFullscreen);
    }
  }, [isFullscreen, onFullscreenChange]);

  const handleFullscreenUpdate = async ({ fullscreenUpdate }: { fullscreenUpdate: number }) => {
    try {
      if (isOrientationChangingRef.current && fullscreenUpdate !== 3) {
        console.log('[DEBUG] VideoPlayer: Orientation change in progress, ignoring update:', fullscreenUpdate);
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
      if (status.isLoaded) {
        const videoDuration = status.durationMillis ? status.durationMillis / 1000 : 0;
        setDuration(videoDuration);
        
        console.log(`[DEBUG] VideoPlayer: Video loaded, duration: ${videoDuration}`);
        
        isAtEndRef.current = false;
        
        // Set a safety timeout to ensure quality changing state is reset
        // This will be cleared if the normal flow completes successfully
        let qualityChangeSafetyTimeout: NodeJS.Timeout | null = null;
        
        if (isQualityChanging && savedPosition > 0) {
          console.log(`[DEBUG] VideoPlayer: Quality change detected, seeking to saved position: ${savedPosition}`);
          
          // Set safety timeout to ensure we don't get stuck in quality changing state
          qualityChangeSafetyTimeout = setTimeout(() => {
            if (isQualityChanging) {
              console.log('[DEBUG] VideoPlayer: Safety timeout in handleLoad reached, resetting quality changing state');
              setIsQualityChanging(false);
            }
          }, 2500); // Shorter than the parent component's timeout (2.9s)
          
          if (videoRef.current) {
            try {
              if (savedPosition > videoDuration - 10) {
                console.log(`[DEBUG] VideoPlayer: Saved position ${savedPosition} is too close to the end, starting from beginning`);
                await videoRef.current.pauseAsync();
                await new Promise(resolve => setTimeout(resolve, 100));
                await videoRef.current.setPositionAsync(0);
              } else {
                await videoRef.current.pauseAsync();
                await new Promise(resolve => setTimeout(resolve, 100));
                await videoRef.current.setPositionAsync(savedPosition * 1000);
              }
              
              await new Promise(resolve => setTimeout(resolve, 100));
              
              if (wasPlayingBeforeQualityChange.current) {
                await videoRef.current.playAsync();
                setIsPlaying(true);
              }
              
              // Clear the safety timeout since we've successfully completed the quality change
              if (qualityChangeSafetyTimeout) {
                clearTimeout(qualityChangeSafetyTimeout);
                qualityChangeSafetyTimeout = null;
              }
              
              setIsQualityChanging(false);
              console.log('[DEBUG] VideoPlayer: Quality change position restored successfully');
            } catch (error) {
              console.error('[DEBUG] VideoPlayer: Error seeking after quality change:', error);
              
              // Clear the safety timeout since we're handling the error
              if (qualityChangeSafetyTimeout) {
                clearTimeout(qualityChangeSafetyTimeout);
                qualityChangeSafetyTimeout = null;
              }
              
              setIsQualityChanging(false);
            }
          }
        }
        else if (initialPositionRef.current > 0 && !isReady) {
          if (videoRef.current) {
            console.log(`[DEBUG] VideoPlayer: Initial load: seeking to ${initialPositionRef.current} seconds`);
            try {
              if (initialPositionRef.current > videoDuration - 10) {
                console.log(`[DEBUG] VideoPlayer: Initial position ${initialPositionRef.current} is too close to the end, starting from beginning`);
                await videoRef.current.pauseAsync();
                await new Promise(resolve => setTimeout(resolve, 200));
                await videoRef.current.setPositionAsync(0);
              } else {
                await videoRef.current.pauseAsync();
                await new Promise(resolve => setTimeout(resolve, 200));
                await videoRef.current.setPositionAsync(initialPositionRef.current * 1000);
              }
              
              await new Promise(resolve => setTimeout(resolve, 100));
              
              if (isPlaying) {
                await videoRef.current.playAsync();
              }
              
              setIsReady(true);
              console.log(`[DEBUG] VideoPlayer: Initial position restored to ${initialPositionRef.current}`);
            } catch (error) {
              console.error('[DEBUG] VideoPlayer: Error setting resume position:', error);
              setIsReady(true);
            }
          } else {
            setIsPlaying(true);
            setIsReady(true);
          }
        }
        
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

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.setRateAsync(rate, true);
    }
  }, [rate]);

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
        />
        
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
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'transparent']}
              style={styles.topBar}
            >
              <Text style={styles.titleText} numberOfLines={1}>
                {title}
              </Text>
            </LinearGradient>

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

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.bottomControls}
            >
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

            {showSkipIntro && (
              <TouchableOpacity 
                style={styles.skipButton}
                onPress={(e) => {
                  e.stopPropagation();
                  if (videoRef.current && intro) {
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

            {showSkipOutro && (
              <TouchableOpacity 
                style={styles.skipButton}
                onPress={(e) => {
                  e.stopPropagation();
                  if (videoRef.current && outro) {
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