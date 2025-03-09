import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Dimensions, ScrollView, Pressable, StatusBar, TextInput } from 'react-native';
import { useLocalSearchParams, router, Stack, useNavigation } from 'expo-router';
import Video, { 
  OnLoadData, 
  OnProgressData, 
  OnBufferData
} from 'react-native-video';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useWatchHistoryStore } from '../../../store/watchHistoryStore';
import * as ScreenOrientation from 'expo-screen-orientation';
import { animeAPI } from '../../../services/api';
import VideoPlayer from '../../../components/VideoPlayer';
import { LinearGradient } from 'expo-linear-gradient';
import { logger } from '../../../utils/logger';

type StreamSource = {
  url: string;
  quality: string;
  isM3U8: boolean;
};

type Subtitle = {
  url: string;
  lang: string;
};

type APIEpisode = {
  id: string;
  number: number;
  title: string;
  isSubbed: boolean;
  isDubbed: boolean;
  url: string;
  episodeId?: string;
  episodeNo?: number;
};

// Update VideoRef type
type VideoRef = typeof Video;

// Update VideoPlayerProps type
type VideoPlayerProps = {
  source: {
    uri: string | null;
    headers?: {
      Referer: string;
      'User-Agent': string;
    };
  };
  style?: any;
  paused?: boolean;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'none';
  onProgress?: (data: OnProgressData) => void;
  onError?: (error: any) => void;
  onLoad?: (data: OnLoadData) => void;
  onBuffer?: (data: OnBufferData) => void;
  rate?: number;
  textTracks?: Array<{
    title: string;
    language: string;
    type: string;
    uri: string;
  }>;
  selectedTextTrack?: {
    type: 'system' | 'disabled' | 'title' | 'language' | 'index';
    value: string | number;
  };
  subtitleUrl?: string;
  onPlayPause?: () => void;
  onSeek?: (value: number) => void;
  onFullscreen?: () => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
};

// Update video event types
type VideoProgress = OnProgressData;
type LoadError = {
  error: string | {
    what: string;
    extra: number;
  };
};

// Add these types at the top
type Progress = {
  currentTime: number;
  playableDuration: number;
  seekableDuration: number;
};

type Server = {
  name: string;
  url: string;
};

// Add these types
type VideoSource = {
  url: string;
  isM3U8: boolean;
};

type VideoResponse = {
  headers: {
    Referer: string;
  };
  sources: VideoSource[];
  subtitles: {
    kind: string;
    url: string;
  }[];
  intro?: {
    start: number;
    end: number;
  };
  outro?: {
    start: number;
    end: number;
  };
};

// Add types for video controls
type ControlsOverlayProps = {
  showControls: boolean;
  isPlaying: boolean;
  isFullscreen: boolean;
  currentTime: number;
  duration: number;
  isBuffering: boolean;
  title: string;
  onPlayPress: () => void;
  onFullscreenPress: () => void;
  onSeek: (value: number) => void;
};

// Add ControlsOverlay component
const ControlsOverlay = ({
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
  const formatTime = (seconds: number) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return showControls ? (
    <View style={styles.controlsOverlay}>
      {/* Title bar */}
      <View style={styles.titleBar}>
        <Text style={styles.titleText}>{title}</Text>
      </View>

      {/* Center play/pause button */}
      <View style={styles.centerControls}>
        {isBuffering ? (
          <ActivityIndicator size="large" color="#f4511e" />
        ) : (
          <TouchableOpacity onPress={onPlayPress}>
            <MaterialIcons 
              name={isPlaying ? "pause" : "play-arrow"} 
              size={40} 
              color="white" 
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        <View style={styles.progressRow}>
          <Text style={styles.timeText}>
            {formatTime(currentTime)}
          </Text>
          <Slider
            style={styles.slider}
            value={currentTime}
            maximumValue={duration}
            minimumValue={0}
            onValueChange={onSeek}
            minimumTrackTintColor="#f4511e"
            maximumTrackTintColor="rgba(255,255,255,0.5)"
            thumbTintColor="#f4511e"
          />
          <Text style={styles.timeText}>
            {formatTime(duration)}
          </Text>
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity onPress={onFullscreenPress}>
            <MaterialIcons
              name={isFullscreen ? "fullscreen-exit" : "fullscreen"}
              size={24}
              color="white"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ) : null;
};

const EpisodeList = React.memo(({ episodes, currentEpisodeId, onEpisodePress }: {
  episodes: APIEpisode[];
  currentEpisodeId: string;
  onEpisodePress: (episode: APIEpisode) => void;
}) => (
  <View style={styles.episodeList}>
    {episodes.map((episode) => (
      <TouchableOpacity
        key={episode.id}
        style={[
          styles.episodeItem,
          episode.id === currentEpisodeId && styles.currentEpisode
        ]}
        onPress={() => onEpisodePress(episode)}
      >
        <View style={styles.episodeInfo}>
          <Text style={styles.episodeNumber}>Episode {episode.number}</Text>
          <Text style={styles.episodeTitle} numberOfLines={1}>
            {episode.title}
          </Text>
        </View>
        {episode.id === currentEpisodeId && (
          <MaterialIcons name="play-circle-filled" size={24} color="#f4511e" />
        )}
      </TouchableOpacity>
    ))}
  </View>
));

// Add this type near the top with other type definitions
type Quality = {
  url: string;
  quality: string;
};

// Add this utility function at the top of the file
const extractQualities = async (m3u8Url: string): Promise<Quality[]> => {
  try {
    const response = await fetch(m3u8Url);
    const manifest = await response.text();
    const qualities: Quality[] = [];
    
    // Parse m3u8 manifest
    const lines = manifest.split('\n');
    let currentQuality = '';
    
    for (const line of lines) {
      if (line.includes('#EXT-X-STREAM-INF')) {
        // Extract resolution/bandwidth info
        const resolution = line.match(/RESOLUTION=(\d+x\d+)/)?.[1];
        const bandwidth = line.match(/BANDWIDTH=(\d+)/)?.[1];
        
        if (resolution) {
          const height = resolution.split('x')[1];
          currentQuality = `${height}p`;
        } else if (bandwidth) {
          // Fallback to bandwidth if no resolution
          const bw = Math.floor(parseInt(bandwidth) / 1000);
          currentQuality = `${bw}k`;
        }
      } else if (line.trim() && !line.startsWith('#') && currentQuality) {
        // This is a stream URL
        const streamUrl = new URL(line, m3u8Url).href;
        qualities.push({
          url: streamUrl,
          quality: currentQuality
        });
        currentQuality = '';
      }
    }

    // Add the original/auto quality
    qualities.push({
      url: m3u8Url,
      quality: 'auto'
    });

    return qualities.sort((a, b) => {
      // Sort qualities with highest first, but keep auto at top
      if (a.quality === 'auto') return -1;
      if (b.quality === 'auto') return 1;
      return parseInt(b.quality) - parseInt(a.quality);
    });

  } catch (error) {
    console.error('Error parsing m3u8:', error);
    return [{
      url: m3u8Url,
      quality: 'auto'
    }];
  }
};

// Add this function to sort episodes relative to current episode
const sortEpisodesByProximity = (episodes: APIEpisode[], currentEpisodeId: string) => {
  const currentIndex = episodes.findIndex(ep => ep.id === currentEpisodeId);
  if (currentIndex === -1) return episodes;

  // Split episodes into before and after current
  const beforeCurrent = episodes.slice(0, currentIndex);
  const afterCurrent = episodes.slice(currentIndex + 1);
  const current = episodes[currentIndex];

  // Combine in order: after current, current, before current
  return [current, ...afterCurrent, ...beforeCurrent];
};

export default function WatchAnime() {
  const { episodeId, animeId, episodeNumber, title, category } = useLocalSearchParams();
  const videoRef = useRef<VideoRef>(null);
  const [streamingUrl, setStreamingUrl] = useState<string | null>(null);
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string>('auto');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState<Progress>({
    currentTime: 0,
    playableDuration: 0,
    seekableDuration: 0
  });
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [selectedSubtitle, setSelectedSubtitle] = useState<Subtitle | null>(null);
  const [episodes, setEpisodes] = useState<APIEpisode[]>([]);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const { addToHistory, updateProgress } = useWatchHistoryStore();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [animeInfo, setAnimeInfo] = useState<any>(null);
  const [lastSaveTime, setLastSaveTime] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [resumePosition, setResumePosition] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(() => {
    if (!videoData?.sources) return null;
    return videoData.sources[0]?.url || null;
  });
  const [videoHeaders, setVideoHeaders] = useState<{[key: string]: string}>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoData, setVideoData] = useState<VideoResponse | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [playerDimensions, setPlayerDimensions] = useState({
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').width * (9/16)
  });
  const [lastTap, setLastTap] = useState<number | null>(null);
  const DOUBLE_TAP_DELAY = 300; // milliseconds
  const [qualities, setQualities] = useState<Quality[]>([]);
  const history = useWatchHistoryStore(state => state.history);
  const savedProgress = useMemo(() => {
    const historyItem = history.find(item => item.episodeId === episodeId);
    return historyItem?.progress || 0; // Keep in seconds
  }, [history, episodeId]);
  const [isQualityChanging, setIsQualityChanging] = useState(false);
  const [savedPosition, setSavedPosition] = useState(0);
  const [filteredEpisodes, setFilteredEpisodes] = useState<APIEpisode[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const episodeListRef = useRef<ScrollView>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    if (savedProgress > 0) {
      setResumePosition(savedProgress); // Keep in seconds
    }
  }, [savedProgress]);

  useEffect(() => {
    fetchEpisodeData();
    if (animeId) {
      fetchAnimeInfo();
    }
  }, [episodeId, animeId]);

  useEffect(() => {
    const getResumePosition = async () => {
      try {
        const history = await useWatchHistoryStore.getState().getHistory();
        const lastWatch = history.find(item => item.episodeId === episodeId);
        if (lastWatch?.progress) {
          setResumePosition(lastWatch.progress);
        }
      } catch (err) {
        console.error('Error getting resume position:', err);
      }
    };
    getResumePosition();
  }, [episodeId]);

  useEffect(() => {
    const setupOrientation = async () => {
      try {
        // Set initial orientation to portrait
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      } catch (error) {
        console.error('Failed to lock orientation:', error);
      }
    };
    
    setupOrientation();
    
    // Cleanup function
    return () => {
      // Ensure we're back in portrait mode when leaving
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(error => {
        console.error('Failed to reset orientation:', error);
      });
    };
  }, []);

  useEffect(() => {
    // Hide bottom tab bar when entering this screen
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({
        tabBarStyle: { display: 'none' }
      });
    }

    return () => {
      // Show bottom tab bar when leaving this screen
      if (parent) {
        parent.setOptions({
          tabBarStyle: { display: 'flex' }
        });
      }
    };
  }, []);

  const fetchWithRetry = async (url: string, retries = 3, delay = 2000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.log(`Attempt ${i + 1} failed:`, error);
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  const fetchEpisodeData = async () => {
    try {
      setLoading(true);
      setError(null);

      const sources = await animeAPI.getEpisodeSources(
        episodeId as string, 
        category === 'dub'
      );
      
      if (!sources || !sources.sources || sources.sources.length === 0) {
        throw new Error('No streaming sources available');
      }

      // Get the m3u8 URL
      const videoSource = sources.sources[0];
      setVideoHeaders(sources.headers);

      // Extract qualities from m3u8
      if (videoSource.url.includes('.m3u8')) {
        const availableQualities = await extractQualities(videoSource.url);
        setQualities(availableQualities);
        
        // Set default quality (auto)
        const defaultQuality = availableQualities[0]; // 'auto' quality
        setSelectedQuality(defaultQuality.quality);
        setVideoUrl(defaultQuality.url);
        setStreamingUrl(defaultQuality.url);
      } else {
        // Fallback for non-m3u8 sources
        setQualities([{ url: videoSource.url, quality: 'auto' }]);
        setSelectedQuality('auto');
        setVideoUrl(videoSource.url);
        setStreamingUrl(videoSource.url);
      }

    } catch (error) {
      logger.error('Error fetching episode:', error);
      setError('Failed to load episode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnimeInfo = async () => {
    try {
      const data = await animeAPI.getAnimeDetails(animeId as string);
      
      // Ensure we have the required fields
      const processedData = {
        ...data,
        info: {
          ...data.info,
          title: data.title || data.name || data.info?.title || data.info?.name || 'Unknown Anime',
          image: data.image || data.img || data.info?.image || data.info?.img || '',
        }
      };
      setAnimeInfo(processedData);
      
      // Save to history immediately to ensure we have the correct info
      addToHistory({
        id: animeId as string,
        name: processedData.info.title,
        img: processedData.info.image,
        episodeId: episodeId as string,
        episodeNumber: Number(episodeNumber),
        timestamp: 0,
        progress: 0,
        duration: 0,
        lastWatched: Date.now(),
        subOrDub: category || 'sub'
      });

      if (data.episodes) {
        setEpisodes(data.episodes);
        const index = data.episodes.findIndex(ep => ep.id === episodeId);
        setCurrentEpisodeIndex(index);
      }
    } catch (error) {
      logger.error('Error fetching anime info:', error);
    }
  };

  const handleVideoLoad = async () => {
    if (videoRef.current && resumePosition > 0 && !isVideoReady) {
      try {
        videoRef.current.seek(resumePosition);
        setIsVideoReady(true);
      } catch (err) {
        logger.error('Error seeking to position:', err);
      }
    }
  };

  const handlePlaybackStatusUpdate = (data: VideoProgress) => {
    const newTime = data.currentTime;
    const newDuration = data.seekableDuration;
    
    setCurrentTime(newTime);
    setDuration(newDuration);
    setIsBuffering(data.isBuffering);
    setIsPlaying(!data.paused);

    // Handle video load completion
    if (!isVideoReady && newDuration > 0) {
      handleVideoLoad();
    }
    
    // Save progress every 5 seconds while playing
    const now = Date.now();
    if (now - lastSaveTime >= 5000) {
      setLastSaveTime(now);
      if (animeInfo && newDuration > 0) {
        addToHistory({
          id: animeId as string,
          name: animeInfo.info?.name || 'Unknown Anime',
          img: animeInfo.info?.img || '',
          episodeId: episodeId as string,
          episodeNumber: Number(episodeNumber),
          timestamp: now,
          progress: newTime,
          duration: newDuration,
          lastWatched: now,
          subOrDub: category || 'sub'
        });
      }
    }
    
    // Auto play next episode when current one ends
    if (newTime >= newDuration - 0.5) {
      onVideoEnd();
    }
  };

  const onSliderValueChange = (value: number) => {
    if (videoRef.current) {
      videoRef.current.seek(value);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const onVideoEnd = () => {
    if (currentEpisodeIndex < episodes.length - 1) {
      const nextEpisode = episodes[currentEpisodeIndex + 1];
      router.push({
        pathname: "/anime/watch/[episodeId]",
        params: {
          episodeId: nextEpisode.id,
          animeId: animeId as string,
          episodeNumber: nextEpisode.number,
          title: nextEpisode.title,
          category: category
        }
      });
    }
  };

  const handlePlaybackSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  const handleVideoError = (error: any) => {
    console.log('Video playback error:', error);
    setError('Video playback failed. Please try refreshing the page.');
  };

  const handleFullscreenToggle = async () => {
    if (isFullscreen) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      setIsFullscreen(false);
      StatusBar.setHidden(false); // Show status bar
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      setIsFullscreen(true);
      StatusBar.setHidden(true); // Hide status bar
    }
  };

  const handleProgress = (data: OnProgressData) => {
    if (!isSeeking) {
      setCurrentTime(data.currentTime);
      setDuration(data.seekableDuration);
      
      // Save progress every 5 seconds
      if (Math.floor(data.currentTime) % 5 === 0) {
        if (animeInfo?.info) {
          addToHistory({
            id: animeId as string,
            name: animeInfo.info.title || animeInfo.title || animeInfo.name || 'Unknown Anime',
            img: animeInfo.info.image || animeInfo.image || animeInfo.img || '',
            episodeId: episodeId as string,
            episodeNumber: Number(episodeNumber),
            timestamp: Date.now(),
            progress: data.currentTime,
            duration: data.seekableDuration,
            lastWatched: Date.now(),
            subOrDub: category || 'sub'
          });
        }
      }
    }

    // Handle intro/outro skipping
    if (videoData?.intro && data.currentTime >= videoData.intro.start && data.currentTime <= videoData.intro.end) {
      handleSeek(videoData.intro.end);
    }
  };

  // Fetch video data
  useEffect(() => {
    const fetchVideoData = async () => {
      try {
        const response = await animeAPI.getVideoSource(episodeId);
        setVideoData(response);
      } catch (error) {
        logger.error('Error fetching video:', error);
      }
    };
    
    fetchVideoData();
  }, [episodeId]);

  // Update useEffect to set videoUrl when videoData changes
  useEffect(() => {
    if (videoData?.sources && videoData.sources.length > 0) {
      setVideoUrl(videoData.sources[0].url);
    }
  }, [videoData]);

  // Video control handlers
  const handleSeek = async (value: number) => {
    if (videoRef.current) {
      const wasPlaying = isPlaying;
      try {
        await videoRef.current.setPositionAsync(value * 1000);
        setCurrentTime(value);
        
        if (wasPlaying) {
          await new Promise(resolve => setTimeout(resolve, 50));
          await videoRef.current.playAsync();
          setIsPlaying(true);
        }
      } catch (error) {
        logger.error('Error seeking:', error);
      }
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Update video props
  const videoProps = {
    source: { 
      uri: videoUrl || null,
      headers: videoHeaders || {}
    },
    rate: playbackSpeed,
    paused: !isPlaying,
    resizeMode: "contain",
    onProgress: handleProgress,
    onBuffer: ({ isBuffering }: { isBuffering: boolean }) => {
      setIsBuffering(isBuffering);
    },
    onError: handleVideoError,
    onLoad: (data: OnLoadData) => {
      setDuration(data.duration);
      setLoading(false);
      if (resumePosition > 0 && !isVideoReady) {
        handleSeek(resumePosition);
        setIsVideoReady(true);
      }
    },
    onPlayPause: togglePlayPause,
    onSeek: handleSeek,
    onFullscreen: handleFullscreenToggle,
    onFullscreenChange: setIsFullscreen
  };

  // Add control visibility timeout
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showControls && isPlaying) {
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [showControls, isPlaying]);

  // Update the fullscreen handlers
  const enterFullscreen = async () => {
    try {
      // Lock to landscape orientation
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      
      // Update state
      setIsFullscreen(true);
      
      // Update video dimensions
      const { width, height } = Dimensions.get('window');
      setPlayerDimensions({
        width: height, // Swap width/height for landscape
        height: width
      });
    } catch (error) {
      logger.error('Failed to enter fullscreen:', error);
    }
  };

  const exitFullscreen = async () => {
    try {
      // Lock to portrait orientation
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      
      // Update state
      setIsFullscreen(false);
      
      // Reset video dimensions
      const { width } = Dimensions.get('window');
      setPlayerDimensions({
        width: width,
        height: width * (9/16)
      });
    } catch (error) {
      logger.error('Failed to exit fullscreen:', error);
    }
  };

  // Add dimension change listener
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const { width, height } = window;
      if (isFullscreen) {
        setPlayerDimensions({
          width: height,
          height: width
        });
      } else {
        setPlayerDimensions({
          width: width,
          height: width * (9/16)
        });
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [isFullscreen]);

  const handleSingleTap = () => {
    setShowControls(!showControls);
  };

  const handleDoubleTap = (locationX: number) => {
    const screenWidth = Dimensions.get('window').width;
    if (locationX < screenWidth / 2) {
      // Tap left side, rewind 5 seconds
      if (videoRef.current) {
        videoRef.current.seek(Math.max(0, currentTime - 5));
      }
    } else {
      // Tap right side, skip forward 5 seconds
      if (videoRef.current) {
        videoRef.current.seek(Math.min(duration, currentTime + 5));
      }
    }
  };

  // Update the quality change handler
  const handleQualityChange = async (quality: string) => {
    const selectedSource = qualities.find(q => q.quality === quality);
    if (selectedSource) {
      try {
        // Save current position and playback state before quality change
        const currentPos = currentTime;
        const wasPlaying = isPlaying;
        
        setIsQualityChanging(true);
        setSavedPosition(currentPos);
        logger.info('Saving position before quality change:', currentPos);

        // Update quality
        setSelectedQuality(quality);
        setVideoUrl(selectedSource.url);
        setStreamingUrl(selectedSource.url);

        // Set a timeout to reset quality changing state if onLoad doesn't fire
        setTimeout(() => {
          if (isQualityChanging) {
            setIsQualityChanging(false);
            logger.warn('Quality change timeout reached');
          }
        }, 10000);

      } catch (error) {
        logger.error('Error during quality change:', error);
        setIsQualityChanging(false);
      }
    }
  };

  // Update the search handler to maintain the sorting
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredEpisodes(sortEpisodesByProximity(episodes, episodeId as string));
      return;
    }
    
    const filtered = episodes.filter(episode => 
      episode.number.toString().includes(query) ||
      episode.title?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredEpisodes(filtered);
  };

  // Update the useEffect that initializes filtered episodes
  useEffect(() => {
    const sortedEpisodes = sortEpisodesByProximity(episodes, episodeId as string);
    setFilteredEpisodes(sortedEpisodes);
  }, [episodes, episodeId]);

  // Add this useEffect to scroll to current episode when list changes
  useEffect(() => {
    if (episodeListRef.current && filteredEpisodes.length > 0) {
      // Small delay to ensure the list has rendered
      setTimeout(() => {
        episodeListRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  }, [filteredEpisodes]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f4511e" />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setRetryCount(0);
              setError(null);
              fetchEpisodeData();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      {/* Configure the header visibility */}
      <Stack.Screen 
        options={{
          headerShown: !isFullscreen,
          title: title as string,
          statusBarHidden: isFullscreen,
          statusBarStyle: 'light',
          statusBarTranslucent: true,
          headerStyle: {
            backgroundColor: '#000',
          },
          headerTintColor: '#fff',
          animation: 'fade',
          presentation: 'card',
        }} 
      />

      <View style={[
        styles.container,
        isFullscreen && { marginTop: 0 } // Remove any top margin in fullscreen
      ]}>
        <VideoPlayer
          source={{ 
            uri: videoUrl || null,
            headers: videoHeaders || {}
          }}
          title={title as string}
          initialPosition={resumePosition}
          onLoad={async (status) => {
            try {
              if (isQualityChanging && videoRef.current) {
                // Add a small delay to ensure video is ready
                await new Promise(resolve => setTimeout(resolve, 100));
                await videoRef.current.setPositionAsync(savedPosition * 1000);
                setIsQualityChanging(false);
                logger.info('Successfully seeked to position after quality change:', savedPosition);
              }
            } catch (error) {
              logger.error('Error seeking after quality change:', error);
              setIsQualityChanging(false);
            }
          }}
          onError={(error) => {
            logger.error('Video player error:', error);
            setIsQualityChanging(false);
          }}
          onProgress={(currentTime, duration) => {
            // Save progress every 5 seconds (currentTime is already in seconds)
            if (Math.floor(currentTime) % 5 === 0) {
              if (animeInfo?.info) {
                addToHistory({
                  id: animeId as string,
                  name: animeInfo.info.title || animeInfo.title || animeInfo.name || 'Unknown Anime',
                  img: animeInfo.info.image || animeInfo.image || animeInfo.img || '',
                  episodeId: episodeId as string,
                  episodeNumber: Number(episodeNumber),
                  timestamp: Date.now(),
                  progress: currentTime, // Store in seconds
                  duration: duration,
                  lastWatched: Date.now(),
                  subOrDub: category || 'sub'
                });
              }
            }
          }}
          onEnd={onVideoEnd}
          style={isFullscreen ? styles.fullscreenVideo : {}}
          onFullscreenChange={(fullscreen) => setIsFullscreen(fullscreen)}
        />
        
        {!isFullscreen && (
          <ScrollView style={styles.controls}>
            {/* Quality Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quality</Text>
              <View style={styles.qualityOptions}>
                {qualities.map((q) => (
                  <TouchableOpacity
                    key={q.quality}
                    style={[
                      styles.qualityButton,
                      selectedQuality === q.quality && styles.selectedQuality
                    ]}
                    onPress={() => handleQualityChange(q.quality)}
                  >
                    <Text style={styles.qualityText}>{q.quality}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Playback Speed */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Playback Speed</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(speed => (
                  <TouchableOpacity
                    key={speed}
                    style={[
                      styles.speedButton,
                      playbackSpeed === speed && styles.selectedButton
                    ]}
                    onPress={() => handlePlaybackSpeedChange(speed)}
                  >
                    <Text style={[
                      styles.speedText,
                      playbackSpeed === speed && styles.selectedText
                    ]}>
                      {speed}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Subtitles */}
            {subtitles.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Subtitles</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[
                      styles.subtitleButton,
                      !selectedSubtitle && styles.selectedButton
                    ]}
                    onPress={() => setSelectedSubtitle(null)}
                  >
                    <Text style={[
                      styles.subtitleText,
                      !selectedSubtitle && styles.selectedText
                    ]}>
                      Off
                    </Text>
                  </TouchableOpacity>
                  {subtitles.map((sub, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.subtitleButton,
                        selectedSubtitle?.language === sub.language && styles.selectedButton
                      ]}
                      onPress={() => setSelectedSubtitle(sub)}
                    >
                      <Text style={[
                        styles.subtitleText,
                        selectedSubtitle?.language === sub.language && styles.selectedText
                      ]}>
                        {sub.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Episodes */}
            <View style={styles.episodeSection}>
              <Text style={styles.sectionTitle}>Episodes</Text>
              
              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={24} color="#666" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search episodes..."
                  placeholderTextColor="#666"
                  value={searchQuery}
                  onChangeText={handleSearch}
                />
              </View>

              {/* Episode List */}
              <View style={styles.episodeListContainer}>
                <ScrollView
                  ref={episodeListRef}
                  style={styles.episodeList}
                  contentContainerStyle={styles.episodeListContent}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {filteredEpisodes.map((episode) => (
                    <TouchableOpacity
                      key={episode.id}
                      style={[
                        styles.episodeItem,
                        episode.id === episodeId && styles.currentEpisode
                      ]}
                      onPress={() => {
                        router.push({
                          pathname: "/anime/watch/[episodeId]",
                          params: {
                            episodeId: episode.id,
                            animeId: animeId,
                            episodeNumber: episode.number,
                            title: animeInfo?.info?.title || 'Unknown Anime',
                            category: category
                          }
                        });
                      }}
                    >
                      <View style={styles.episodeInfo}>
                        <Text style={styles.episodeNumber}>
                          Episode {episode.number}
                        </Text>
                        {episode.title && (
                          <Text style={styles.episodeTitle} numberOfLines={1}>
                            {episode.title}
                          </Text>
                        )}
                        {/* Add relative position indicator */}
                        {episode.id === episodeId ? (
                          <Text style={styles.currentIndicator}>Currently Playing</Text>
                        ) : (
                          <Text style={styles.episodePosition}>
                            {episode.number > Number(episodeNumber) ? 'Next' : 'Previous'}
                          </Text>
                        )}
                      </View>
                      {episode.id === episodeId && (
                        <MaterialIcons name="play-circle-filled" size={24} color="#f4511e" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    backgroundColor: '#000',
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  videoWrapper: {
    flex: 1,
    backgroundColor: '#000',
  },
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,  // This overlays on top of video
    backgroundColor: 'transparent',
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
  },
  titleBar: {
    padding: 16,
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
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  timeText: {
    color: 'white',
    marginRight: 16,
    fontSize: 14,
  },
  slider: {
    flex: 1,
    marginHorizontal: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    flex: 1,
  },
  fullscreenVideo: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
  },
  controls: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  serverButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#333',
    borderRadius: 8,
    marginRight: 8,
  },
  selectedButton: {
    backgroundColor: '#f4511e',
  },
  serverText: {
    color: '#fff',
    fontSize: 14,
  },
  selectedText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#f4511e',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  episodeList: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 8,
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    minHeight: 56,
  },
  currentEpisode: {
    backgroundColor: '#333',
  },
  episodeInfo: {
    flex: 1,
    marginRight: 12,
  },
  episodeNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  episodeTitle: {
    color: '#999',
    fontSize: 14,
    marginTop: 4,
  },
  currentIndicator: {
    color: '#f4511e',
    fontSize: 12,
    marginTop: 4,
  },
  episodePosition: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  speedButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#333',
    borderRadius: 8,
    marginRight: 8,
  },
  speedText: {
    color: '#fff',
    fontSize: 14,
  },
  subtitleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#333',
    borderRadius: 8,
    marginRight: 8,
  },
  subtitleText: {
    color: '#fff',
    fontSize: 14,
  },
  qualityOptions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualityButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#333',
    borderRadius: 8,
    marginRight: 8,
  },
  qualityText: {
    color: '#fff',
    fontSize: 14,
  },
  selectedQuality: {
    backgroundColor: '#f4511e',
  },
  episodeSection: {
    marginTop: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  
  episodeListContainer: {
    height: 350,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
  },
  
  episodeList: {
    flex: 1,
  },
  
  episodeListContent: {
    paddingVertical: 8,
  },
}); 