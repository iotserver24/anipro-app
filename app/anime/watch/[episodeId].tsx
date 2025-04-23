import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Dimensions, ScrollView, Pressable, StatusBar, TextInput, BackHandler, Platform, Linking, Modal, Alert, Animated, Image } from 'react-native';
import { useLocalSearchParams, router, Stack, useNavigation } from 'expo-router';
import Video from 'react-native-video';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useWatchHistoryStore } from '../../../store/watchHistoryStore';
import * as ScreenOrientation from 'expo-screen-orientation';
import { animeAPI } from '../../../services/api';
import VideoPlayer from '../../../components/VideoPlayer';
import { LinearGradient } from 'expo-linear-gradient';
import { logger } from '../../../utils/logger';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';
import * as NavigationBar from 'expo-navigation-bar';
import { WebView } from 'react-native-webview';
import { debounce } from 'lodash';
import CommentModal from '../../../components/CommentModal';

type StreamSource = {
  url: string;
  quality: string;
  isM3U8: boolean;
};

type Subtitle = {
  title: string;
  language: string;
  url: string;
};

type APIEpisode = {
  id: string;
  number: number;
  title: string;
  isSubbed: boolean;
  isDubbed: boolean;
  url: string;
  isFiller: boolean;
};

// Add these type definitions at the top of the file with other types
type OnProgressData = {
  currentTime: number;
  playableDuration: number;
  seekableDuration: number;
};

type OnLoadData = {
  duration: number;
  naturalSize: {
    width: number;
    height: number;
  };
};

type OnBufferData = {
  isBuffering: boolean;
};

// Update VideoRef type
type VideoRef = {
  seek: (seconds: number) => void;
  pauseAsync: () => Promise<void>;
  setPositionAsync: (position: number) => Promise<void>;
  playAsync: () => Promise<void>;
  play: () => Promise<void>;
};

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
  onPlaybackRateChange?: (rate: number) => void;
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
  onSkipIntro?: () => void;
  onSkipOutro?: () => void;
  isQualityChanging?: boolean;
  savedQualityPosition?: number;
  qualities: Quality[];
  selectedQuality: string;
  onQualityChange: (quality: string) => void;
  subtitles: Subtitle[];
};

// Update video event types
type VideoProgress = {
  currentTime: number;
  playableDuration: number;
  seekableDuration: number;
  isBuffering: boolean;
  isPlaying: boolean;
  didJustFinish: boolean;
};

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
  sources: {
    url: string;
    isM3U8: boolean;
  }[];
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
  download?: string;
};

// Add types for video controls
interface ControlsOverlayProps {
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
}

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
  if (!showControls) return null;

  const formatTime = (seconds: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.controlsOverlay}>
      <View style={styles.topControls}>
        <Text style={styles.title}>{title}</Text>
      </View>
      
      <View style={styles.centerControls}>
        {isBuffering ? (
          <ActivityIndicator size="large" color="#f4511e" />
        ) : (
          <TouchableOpacity onPress={onPlayPress}>
            <MaterialIcons 
              name={isPlaying ? 'pause' : 'play-arrow'} 
              size={40} 
              color="white" 
            />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.bottomControls}>
        <Text style={styles.time}>{formatTime(currentTime)}</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration}
          value={currentTime}
          onSlidingComplete={onSeek}
          minimumTrackTintColor="#f4511e"
          maximumTrackTintColor="rgba(255,255,255,0.3)"
        />
        <Text style={styles.time}>{formatTime(duration)}</Text>
        <TouchableOpacity onPress={onFullscreenPress}>
          <MaterialIcons 
            name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'} 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const EpisodeItem = React.memo(({ episode, onPress, onLongPress, mode, isCurrentEpisode }: {
  episode: APIEpisode;
  onPress: () => void;
  onLongPress: () => void;
  mode: 'sub' | 'dub';
  isCurrentEpisode: boolean;
}) => (
  <TouchableOpacity
    style={[
      {
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 8,
      },
      episode.isFiller && {
        borderLeftWidth: 3,
        borderLeftColor: '#f4511e',
      },
      isCurrentEpisode && {
        backgroundColor: '#333',
      }
    ]}
    onPress={onPress}
    onLongPress={onLongPress}
  >
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
    }}>
      <View style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#222',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      }}>
        <Text style={{
          color: '#fff',
          fontSize: 16,
          fontWeight: '500',
        }}>{episode.number}</Text>
      </View>
      <View style={{
        flex: 1,
        marginRight: 12,
      }}>
        <Text style={{
          color: '#999',
          fontSize: 14,
          marginTop: 4,
        }} numberOfLines={1}>
          {episode.title}
        </Text>
        <View style={{
          flexDirection: 'row',
          gap: 8,
        }}>
          {mode === 'dub' && episode.isDubbed && (
            <Text style={{
              color: '#4CAF50',
              fontSize: 12,
              fontWeight: '600',
            }}>DUB</Text>
          )}
          {episode.isFiller && (
            <Text style={{
              color: '#f4511e',
              fontSize: 12,
              fontWeight: '600',
            }}>FILLER</Text>
          )}
        </View>
      </View>
      {isCurrentEpisode && (
        <MaterialIcons name="play-circle-filled" size={24} color="#f4511e" />
      )}
    </View>
  </TouchableOpacity>
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

// Memoize the EpisodeControls component
const EpisodeControls = React.memo(({ 
  currentEpisodeIndex, 
  episodes, 
  onPrevious, 
  onNext, 
  onDownload,
  onComments,
  downloadUrl
}: { 
  currentEpisodeIndex: number; 
  episodes: APIEpisode[];
  onPrevious: () => void;
  onNext: () => void;
  onDownload: () => void;
  onComments: () => void;
  downloadUrl: string | null;
}) => {
  const hasPrevious = currentEpisodeIndex > 0;
  const hasNext = currentEpisodeIndex < episodes.length - 1;
  const hasDownload = !!downloadUrl;

  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 8,
      backgroundColor: '#1a1a1a',
      marginBottom: 12,
      borderRadius: 8,
      gap: 24,
    }}>
      <TouchableOpacity 
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(0,0,0,0.3)',
          opacity: hasPrevious ? 1 : 0.5,
        }}
        onPress={onPrevious}
        disabled={!hasPrevious}
      >
        <MaterialIcons name="skip-previous" size={22} color="white" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(0,0,0,0.3)',
          opacity: hasDownload ? 1 : 0.5,
        }}
        onPress={onDownload}
        disabled={!hasDownload}
      >
        <MaterialIcons name="file-download" size={22} color="white" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(0,0,0,0.3)',
        }}
        onPress={onComments}
      >
        <MaterialIcons name="comment" size={22} color="white" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(0,0,0,0.3)',
          opacity: hasNext ? 1 : 0.5,
        }}
        onPress={onNext}
        disabled={!hasNext}
      >
        <MaterialIcons name="skip-next" size={22} color="white" />
      </TouchableOpacity>
    </View>
  );
});

// Add a context provider to pass down video player state
const VideoPlayerContext = React.createContext<{
  currentEpisodeIndex: number;
  episodes: APIEpisode[];
  animeId: string;
  animeInfo: any;
  category: string;
  videoData: any;
  router: any;
}>({
  currentEpisodeIndex: 0,
  episodes: [],
  animeId: '',
  animeInfo: null,
  category: 'sub',
  videoData: null,
  router: null
});

const useVideoPlayerContext = () => React.useContext(VideoPlayerContext);

// Add this component after your other component definitions
const DownloadPopup = ({ visible, onClose, downloadUrl }: { 
  visible: boolean; 
  onClose: () => void; 
  downloadUrl: string | null;
}) => {
  if (!downloadUrl) return null;
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Download Episode</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <WebView
            source={{ uri: downloadUrl }}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#f4511e" />
              </View>
            )}
            userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
          />
        </View>
      </View>
    </Modal>
  );
};

// Add this component after other component definitions and before the main WatchEpisode component
const AnimeInfo = React.memo(({ 
  animeInfo, 
  onNavigateToAnime 
}: { 
  animeInfo: any; 
  onNavigateToAnime: () => void;
}) => {
  if (!animeInfo) return null;

  return (
    <TouchableOpacity 
      onPress={onNavigateToAnime}
      style={styles.animeInfoContainer}
    >
      <View style={styles.animeInfoContent}>
        <View style={styles.animeCoverContainer}>
          {animeInfo.image ? (
            <Image 
              source={{ uri: animeInfo.image }} 
              style={styles.animeCover}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.animeCover, styles.animeCoverPlaceholder]}>
              <MaterialIcons name="image" size={32} color="#666" />
            </View>
          )}
        </View>
        <View style={styles.animeDetails}>
          <Text style={styles.animeTitle} numberOfLines={1}>
            {animeInfo.title}
          </Text>
          <View style={styles.animeTypeTag}>
            <Text style={styles.animeTypeText}>
              {animeInfo.type}
            </Text>
          </View>
          <Text style={styles.animeDescription} numberOfLines={3}>
            {animeInfo.description}
          </Text>
          <View style={styles.animeMetaInfo}>
            <Text style={styles.animeStatus}>
              {animeInfo.status}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// Optimize the main WatchEpisode component
export default function WatchEpisode() {
  const { episodeId, animeId, episodeNumber, title, episodeTitle, category, resumeTime } = useLocalSearchParams();
  const categoryAsSubOrDub = (typeof category === 'string' ? category : 'sub') as 'sub' | 'dub';
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
  const [resumePosition, setResumePosition] = useState(
    resumeTime ? parseFloat(resumeTime as string) : 0
  );
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
  const [showDownloadPopup, setShowDownloadPopup] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  // Add a ref to track navigation state
  const isNavigating = useRef(false);
  // Add a ref to track the last progress update to throttle history updates
  const lastProgressUpdateRef = useRef<number>(0);
  // Add a ref to track the last progress value to avoid duplicate updates
  const lastProgressValueRef = useRef<number>(0);
  
  // Add state for UI loading
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const [showSkeletonUI, setShowSkeletonUI] = useState(true);

  useEffect(() => {
    // Mark page as loaded immediately to render UI first
    setIsPageLoaded(true);
    setShowSkeletonUI(true);
    
    // Delay API requests until after UI renders
    const timer = setTimeout(() => {
      if (resumeTime) {
        const parsedTime = parseFloat(resumeTime as string);
        setResumePosition(parsedTime);
      }
      
      // Fetch data
      fetchAnimeInfo();
      fetchEpisodeData();
      
      // Count anime episode view
      try {
        fetch('https://anisurge.me/api/anime-count', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (err) {
        console.error('Error updating anime count:', err);
      }
    }, 100); // Short delay to ensure UI renders first
    
    return () => clearTimeout(timer);
  }, [episodeId, animeId]);

  useEffect(() => {
    // If resumeTime is provided, use it directly and skip getting from history
    if (resumeTime) {
      const parsedTime = parseFloat(resumeTime as string);
      //console.log(`[DEBUG] Setting resume position from resumeTime param: ${parsedTime}`);
      setResumePosition(parsedTime);
      return;
    }
    
    const getResumePosition = async () => {
      try {
        const history = await useWatchHistoryStore.getState().getHistory();
        const lastWatch = history.find(item => item.episodeId === episodeId);
        if (lastWatch?.progress && lastWatch.progress > 0) {
          //console.log(`[DEBUG] Setting resume position from history: ${lastWatch.progress}`);
          setResumePosition(lastWatch.progress);
        }
      } catch (err) {
        console.error('Error getting resume position:', err);
      }
    };
    getResumePosition();
  }, [episodeId, resumeTime]);

  useEffect(() => {
    // Only use savedProgress if resumeTime wasn't provided
    if (!resumeTime && savedProgress > 0) {
      //console.log(`[DEBUG] Setting resume position from savedProgress: ${savedProgress}`);
      setResumePosition(savedProgress); // Keep in seconds
    }
  }, [savedProgress, resumeTime]);

  useEffect(() => {
    fetchEpisodeData();
    if (animeId) {
      fetchAnimeInfo();
    }

    // Count anime episode when page loads
    try {
      fetch('https://anisurge.me/api/anime-count', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (err) {
      console.error('Error updating anime count:', err);
    }
  }, [episodeId, animeId]);

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

  // Add useEffect to handle keep awake
  useEffect(() => {
    const enableKeepAwake = async () => {
      try {
        activateKeepAwake();
      } catch (error: unknown) {
        if (error instanceof Error) {
          logger.error('Failed to activate keep awake:', error.message);
        } else {
          logger.error('Failed to activate keep awake:', String(error));
        }
      }
    };

    enableKeepAwake();

    // Cleanup function to deactivate keep awake when leaving the screen
    return () => {
      deactivateKeepAwake();
    };
  }, []);

  const fetchWithRetry = async (url: string, retries = 3, delay = 2000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      } catch (error) {
        //console.log(`Attempt ${i + 1} failed:`, error);
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  // Add a function to determine if we should use the resume position
  const shouldUseResumePosition = (resumePos: number, duration: number): boolean => {
    // If resume position is very close to the end (within 10 seconds of the end), don't use it
    if (duration > 0 && resumePos > 0 && duration - resumePos < 10) {
      //console.log(`[DEBUG] Ignoring resume position ${resumePos} because it's too close to the end of ${duration}`);
      return false;
    }
    // If resume position is greater than duration, don't use it
    if (duration > 0 && resumePos > duration) {
      //console.log(`[DEBUG] Ignoring resume position ${resumePos} because it's greater than duration ${duration}`);
      return false;
    }
    // If resume position is very small (less than 10 seconds), don't use it for auto-navigation
    if (resumePos < 10 && isNavigating.current) {
      //console.log(`[DEBUG] Ignoring small resume position ${resumePos} after navigation`);
      return false;
    }
    return true;
  };

  // Modify the fetchEpisodeData function to reset resume position when needed
  const fetchEpisodeData = async () => {
    setLoading(true);
    setError(null);
    setRetryCount(0);
    
    try {
      // Reset video state
      setStreamingUrl(null);
      setSources([]);
      setSubtitles([]);
      setIsBuffering(false);
      setIsPlaying(true);
      
      // Reset resume position if we just navigated
      if (isNavigating.current) {
        setResumePosition(0);
        isNavigating.current = false;
      }
      
      let currentCategory = categoryAsSubOrDub;
      
      // If animeId is not provided (e.g., from a shared URL), parse the full URL
      if (!animeId && typeof episodeId === 'string') {
        const parts = episodeId.split('$');
        const extractedAnimeId = parts[0];
        
        // Extract category if present
        const categoryParam = parts.find(part => part.startsWith('category='));
        if (categoryParam) {
          const extractedCategory = categoryParam.split('=')[1];
          if (extractedCategory === 'sub' || extractedCategory === 'dub') {
            currentCategory = extractedCategory;
          }
        }
        
        if (extractedAnimeId) {
          const animeData = await animeAPI.getAnimeDetails(extractedAnimeId);
          
          // Set anime info
          const processedData = {
            ...animeData,
            title: animeData.title,
            image: animeData.image,
            description: animeData.description,
            type: animeData.type,
            status: animeData.status,
            genres: animeData.genres
          };
          setAnimeInfo(processedData);
          
          // Set episodes and filter by current category
          if (animeData.episodes) {
            const allEpisodes = animeData.episodes as APIEpisode[];
            setEpisodes(allEpisodes);
            const filteredByCategory = allEpisodes.filter(ep => 
              currentCategory === 'dub' ? ep.isDubbed : ep.isSubbed
            );
            setFilteredEpisodes(sortEpisodesByProximity(filteredByCategory, episodeId));
            const index = filteredByCategory.findIndex(ep => ep.id === episodeId);
            setCurrentEpisodeIndex(index);
          }
        }
      }
      
      // Get episode sources with the correct category
      const cleanEpisodeId = (episodeId as string).split('$category=')[0];
      const sources = await animeAPI.getEpisodeSources(
        cleanEpisodeId,
        currentCategory === 'dub'
      );
      
      if (!sources || !sources.sources || sources.sources.length === 0) {
        throw new Error('No streaming sources available');
      }

      // Process subtitles from the API response
      if (sources.subtitles && Array.isArray(sources.subtitles)) {
        const processedSubtitles = sources.subtitles.map(sub => ({
          url: sub.url,
          lang: sub.lang
        }));
        console.log('Setting subtitles:', processedSubtitles);
        setSubtitles(processedSubtitles);
      }

      // Transform the sources data to match VideoResponse type
      const videoResponseData: VideoResponse = {
        headers: sources.headers || {},
        sources: sources.sources.map(source => ({
          url: source.url,
          isM3U8: source.isM3U8 || false
        })),
        subtitles: sources.subtitles || [],
        intro: sources.intro,
        outro: sources.outro,
        download: sources.download
      };

      // Set the full video data from the API response
      setVideoData(videoResponseData);
      
      // Set download URL if available
      if (sources.download) {
        setDownloadUrl(sources.download);
      }

      // Get the m3u8 URL
      const videoSource = sources.sources[0];
      setVideoHeaders(sources.headers || {});

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
      logger.error('Error fetching episode:', error as string);
      setError('Failed to load episode. Please try again.');
    } finally {
      setLoading(false);
      setShowSkeletonUI(false);
    }
  };

  const fetchAnimeInfo = async () => {
    try {
      // Extract the actual anime ID from the episode ID if animeId is not provided
      let actualAnimeId = animeId as string;
      if (!actualAnimeId && typeof episodeId === 'string') {
        // For new format: no-longer-allowed-in-another-world-19247$episode$126001$category=dub
        const withoutCategory = episodeId.split('$category=')[0];
        if (withoutCategory.includes('$episode$')) {
          // New format
          actualAnimeId = withoutCategory.split('$episode$')[0];
        } else if (withoutCategory.includes('$ep=')) {
          // Old format
          actualAnimeId = withoutCategory.split('$ep=')[0];
        } else {
          // Fallback - use everything before first $
          actualAnimeId = episodeId.split('$')[0];
        }
      }
      
      // Now fetch anime details with the correct ID
      const data = await animeAPI.getAnimeDetails(actualAnimeId);
      
      // Ensure we have the required fields and map image to coverImage
      const processedData = {
        ...data,
        title: data.title,
        coverImage: data.image || data.info?.image, // Map image to coverImage
        description: data.description,
        type: data.type,
        status: data.status,
        genres: data.genres
      };
      setAnimeInfo(processedData);
      
      // Save to history immediately to ensure we have the correct info
      const now = Date.now();
      addToHistory({
        id: actualAnimeId,
        name: processedData.title,
        img: processedData.coverImage || '', // Use the mapped coverImage
        episodeId: episodeId as string,
        episodeNumber: Number(episodeNumber) || 0,
        timestamp: now,
        progress: 0,
        duration: 0,
        lastWatched: now,
        subOrDub: categoryAsSubOrDub
      });

      if (data.episodes) {
        // Type cast to ensure compatibility
        setEpisodes(data.episodes as APIEpisode[]);
        const index = data.episodes.findIndex(ep => ep.id === episodeId);
        setCurrentEpisodeIndex(index);
      }
    } catch (error) {
      logger.error('Error fetching anime info:', error as string);
    }
  };

  const handleVideoLoad = async () => {
    if (videoRef.current && resumePosition > 0 && !isVideoReady) {
      try {
        //console.log(`handleVideoLoad: seeking to ${resumePosition} seconds`);
        // Add a delay to ensure the video is ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // First pause to ensure seeking works properly
        await videoRef.current.pauseAsync();
        
        // Then seek to the position
        await videoRef.current.setPositionAsync(resumePosition * 1000);
        
        // Finally play
        await videoRef.current.playAsync();
        
        setIsVideoReady(true);
        //console.log('Video successfully seeked to resume position');
      } catch (err) {
        logger.error('Error seeking to position:', err as string);
        // Try again with a longer delay if it failed
        if (!isVideoReady) {
          setTimeout(async () => {
            try {
              if (videoRef.current) {
                await videoRef.current.setPositionAsync(resumePosition * 1000);
                await videoRef.current.playAsync();
                setIsVideoReady(true);
              }
            } catch (retryErr) {
              logger.error('Error on retry seeking:', retryErr as string);
            }
          }, 1000);
        }
      }
    }
  };

  // Memoize handlers
  const handleProgress = useMemo(() => 
    debounce((data: VideoProgress) => {
      const newTime = data.currentTime;
      const newDuration = data.seekableDuration;
      
      setCurrentTime(newTime);
      setDuration(newDuration);
      
      // Save progress if we have valid data
      if (animeInfo && newTime > 0 && newDuration > 0) {
        const now = Date.now();
        
        // Save progress every 2 seconds or if position changed significantly
        if (now - lastProgressUpdateRef.current >= 2000 || 
            Math.abs(newTime - lastProgressValueRef.current) > 5) {
          
          // Extract the actual anime ID
          let actualAnimeId = animeId as string;
          if (!actualAnimeId && typeof episodeId === 'string') {
            // For new format: no-longer-allowed-in-another-world-19247$episode$126001$category=dub
            const withoutCategory = episodeId.split('$category=')[0];
            if (withoutCategory.includes('$episode$')) {
              // New format
              actualAnimeId = withoutCategory.split('$episode$')[0];
            } else if (withoutCategory.includes('$ep=')) {
              // Old format
              actualAnimeId = withoutCategory.split('$ep=')[0];
            } else {
              // Fallback - use everything before first $
              actualAnimeId = episodeId.split('$')[0];
            }
          }
          
          // Ensure all fields are valid before saving
          const historyItem = {
            id: actualAnimeId,
            name: animeInfo.title || animeInfo.info?.title || 'Unknown Anime',
            img: animeInfo.image || animeInfo.info?.image || '',
            episodeId: typeof episodeId === 'string' ? episodeId : episodeId[0],
            episodeNumber: Number(episodeNumber) || 0,
            timestamp: now,
            progress: Math.max(0, Math.floor(newTime)), // Ensure positive integer
            duration: Math.max(0, Math.floor(newDuration)), // Ensure positive integer
            lastWatched: now,
            subOrDub: (typeof category === 'string' && (category === 'sub' || category === 'dub')) ? 
              category as 'sub' | 'dub' : 'sub'
          };
          
          // Log the history item for debugging
          logger.debug('Saving history item:', historyItem);
          
          // Save progress to history
          addToHistory(historyItem);
          
          // Update last progress values
          lastProgressUpdateRef.current = now;
          lastProgressValueRef.current = newTime;
        }
      }
    }, 1000), // Increased debounce from 500ms to 1000ms
    [animeInfo, animeId, episodeId, episodeNumber, category, addToHistory]
  );

  // Add cleanup effect to save final progress
  useEffect(() => {
    return () => {
      // Save progress when component unmounts
      if (currentTime > 0 && duration > 0 && animeInfo) {
        //console.log(`[DEBUG] Saving final progress - Time: ${currentTime}, Duration: ${duration}`);
        const now = Date.now();
        
        // Extract the actual anime ID
        let actualAnimeId = animeId as string;
        if (!actualAnimeId && typeof episodeId === 'string') {
          // For new format: no-longer-allowed-in-another-world-19247$episode$126001$category=dub
          const withoutCategory = episodeId.split('$category=')[0];
          if (withoutCategory.includes('$episode$')) {
            // New format
            actualAnimeId = withoutCategory.split('$episode$')[0];
          } else if (withoutCategory.includes('$ep=')) {
            // Old format
            actualAnimeId = withoutCategory.split('$ep=')[0];
          } else {
            // Fallback - use everything before first $
            actualAnimeId = episodeId.split('$')[0];
          }
        }
        
        addToHistory({
          id: actualAnimeId,
          name: animeInfo.title || animeInfo.info?.title || 'Unknown Anime',
          img: animeInfo.image || animeInfo.info?.image || '',
          episodeId: typeof episodeId === 'string' ? episodeId : episodeId[0],
          episodeNumber: Number(episodeNumber),
          timestamp: now,
          progress: Number(currentTime), // Ensure it's a number
          duration: Number(duration), // Ensure it's a number
          lastWatched: now,
          subOrDub: (typeof category === 'string' ? category : 'sub') as 'sub' | 'dub'
        });
      }
    };
  }, [currentTime, duration, animeInfo, animeId, episodeId, episodeNumber, category, addToHistory]);

  // Define handleSeek before it's used in useEffect
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
        logger.error('Error seeking:', error as string);
      }
    }
  };

  // Now the useEffect for intro/outro skipping
  useEffect(() => {
    if (isSeeking || isQualityChanging || !videoData?.intro) return;

    // Get current time from the currentTime state
    const currentVideoTime = currentTime;

    // Handle intro/outro skipping if available
    if (currentVideoTime >= videoData.intro.start && currentVideoTime <= videoData.intro.end) {
      handleSeek(videoData.intro.end);
    }
  }, [isSeeking, isQualityChanging, videoData, currentTime, handleSeek]);

  // Add a useEffect to initialize the progress refs
  useEffect(() => {
    lastProgressUpdateRef.current = 0;
    lastProgressValueRef.current = 0;
  }, [episodeId]);

  const onVideoEnd = () => {
    // Add a check to prevent auto-shifting if we're already navigating
    if (isNavigating.current) {
      //console.log(`[DEBUG] Already navigating, ignoring onVideoEnd`);
      return;
    }
    
    if (currentEpisodeIndex < episodes.length - 1) {
      //console.log(`[DEBUG] Video ended, navigating to next episode`);
      isNavigating.current = true;
      const nextEpisode = episodes[currentEpisodeIndex + 1];
      router.push({
        pathname: "/anime/watch/[episodeId]",
        params: {
          episodeId: nextEpisode.id,
          animeId: animeId as string,
          episodeNumber: nextEpisode.number,
          title: animeInfo?.title || (title as string) || 'Unknown Anime',
          episodeTitle: nextEpisode.title || `Episode ${nextEpisode.number}`,
          category: category,
          resumeTime: "0" // Force start from beginning
        }
      });
    }
  };

  const onSliderValueChange = (value: number) => {
    if (videoRef.current) {
      videoRef.current.setPositionAsync(value * 1000);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handlePlaybackSpeedChange = (speed: number) => {
    // Only update if the speed is actually changing
    if (speed !== playbackSpeed) {
      //console.log(`[DEBUG] Changing playback speed to ${speed}x`);
      setPlaybackSpeed(speed);
      // The VideoPlayer component will handle the actual speed change
      // through the rate prop and useEffect
    }
  };

  const handleVideoError = (error: any) => {
    //console.log('Video playback error:', error);
    setError('Video playback failed. Please try refreshing the page.');
  };

  const handleFullscreenChange = (fullscreenState: boolean) => {
    setIsFullscreen(fullscreenState);
  };

  // Add skip handlers
  const handleSkipIntro = useCallback(() => {
    if (videoData?.intro && videoRef.current) {
      videoRef.current.setPositionAsync(videoData.intro.end * 1000);
    }
  }, [videoData?.intro]);

  const handleSkipOutro = useCallback(() => {
    if (videoData?.outro && videoRef.current) {
      videoRef.current.setPositionAsync(videoData.outro.end * 1000);
    }
  }, [videoData?.outro]);

  // Memoize video props
  const videoPlayerProps = useMemo(() => ({
    source: { 
      uri: streamingUrl,
      headers: videoHeaders
    },
    title: episodeTitle as string,
    initialPosition: resumePosition,
    rate: playbackSpeed,
    onPlaybackRateChange: handlePlaybackSpeedChange,
    onProgress: (currentTime: number, videoDuration: number) => {
      // Update local state
      setCurrentTime(currentTime);
      setDuration(videoDuration);
      
      // Save progress if we have valid data
      if (animeInfo && currentTime > 0 && videoDuration > 0) {
        const now = Date.now();
        
        // Save progress every 2 seconds or if position changed significantly
        if (now - lastProgressUpdateRef.current >= 2000 || 
            Math.abs(currentTime - lastProgressValueRef.current) > 5) {
          
          // Ensure all fields are valid before saving
          const historyItem = {
            id: animeId as string,
            name: animeInfo.title || animeInfo.info?.title || 'Unknown Anime',
            img: animeInfo.image || animeInfo.info?.image || '',
            episodeId: typeof episodeId === 'string' ? episodeId : episodeId[0],
            episodeNumber: Number(episodeNumber) || 0,
            timestamp: now,
            progress: Math.max(0, Math.floor(currentTime)), // Ensure positive integer
            duration: Math.max(0, Math.floor(videoDuration)), // Ensure positive integer
            lastWatched: now,
            subOrDub: (typeof category === 'string' && (category === 'sub' || category === 'dub')) ? 
              category as 'sub' | 'dub' : 'sub'
          };
          
          // Log the history item for debugging
          logger.debug('Saving history item:', historyItem);
          
          // Save progress to history
          addToHistory(historyItem);
        }
      }
    },
    onEnd: onVideoEnd,
    onFullscreenChange: handleFullscreenChange,
    style: isFullscreen ? 
      { width: playerDimensions.width, height: playerDimensions.height, backgroundColor: '#000' } : 
      { width: '100%', aspectRatio: 16/9, backgroundColor: '#000' },
    intro: videoData?.intro,
    outro: videoData?.outro,
    onSkipIntro: handleSkipIntro,
    onSkipOutro: handleSkipOutro,
    isQualityChanging: isQualityChanging,
    savedQualityPosition: savedPosition,
    qualities: qualities,
    selectedQuality: selectedQuality,
    onQualityChange: handleQualityChange,
    subtitles: subtitles
  }), [
    streamingUrl,
    videoHeaders,
    episodeTitle,
    resumePosition,
    playbackSpeed,
    isFullscreen,
    playerDimensions,
    videoData,
    isQualityChanging,
    savedPosition,
    animeInfo,
    animeId,
    episodeId,
    episodeNumber,
    category,
    addToHistory,
    qualities,
    selectedQuality,
    subtitles,
    handleSkipIntro,
    handleSkipOutro
  ]);

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

  // Update the dimension change listener
  useEffect(() => {
    const dimensionsChangeHandler = ({ window }: { window: { width: number; height: number } }) => {
      if (isFullscreen) {
        // In fullscreen/landscape mode
        setPlayerDimensions({
          width: Math.max(window.width, window.height), // Always use the larger dimension as width in fullscreen
          height: Math.min(window.width, window.height)  // Always use the smaller dimension as height in fullscreen
        });
      } else {
        // In portrait mode
        setPlayerDimensions({
          width: window.width,
          height: window.width * (9/16)
        });
      }
    };

    const subscription = Dimensions.addEventListener('change', dimensionsChangeHandler);

    // Force an immediate update when fullscreen state changes
    dimensionsChangeHandler({ window: Dimensions.get('window') });

    return () => {
      subscription.remove();
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
        videoRef.current.setPositionAsync(Math.max(0, currentTime - 5) * 1000);
      }
    } else {
      // Tap right side, skip forward 5 seconds
      if (videoRef.current) {
        videoRef.current.setPositionAsync(Math.min(duration, currentTime + 5) * 1000);
      }
    }
  };

  // Update the quality change handler
  const handleQualityChange = async (quality: string) => {
    const selectedSource = qualities.find(q => q.quality === quality);
    if (selectedSource) {
      try {
        // Don't change quality if it's already selected
        if (selectedQuality === quality) {
          //console.log(`[DEBUG] Quality ${quality} already selected, skipping change`);
          return;
        }
        
        // Save current position and playback state before changing quality
        const currentPos = currentTime;
        const wasPlaying = isPlaying;
        
        //console.log(`[DEBUG] Quality change: Saving position ${currentPos} and playback state ${wasPlaying}`);
        
        // Set quality changing state first
        setIsQualityChanging(true);
        setSavedPosition(currentPos);
        
        // Pause video while changing quality to prevent issues
        if (videoRef.current && wasPlaying) {
          try {
            await videoRef.current.pauseAsync();
          } catch (error) {
            console.error('[DEBUG] Error pausing video before quality change:', error);
          }
        }
        
        // Update quality selection immediately
        setSelectedQuality(quality);
        
        // Force a small delay to ensure state updates are processed
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Update video URL - this will trigger the VideoPlayer to reload
        //console.log(`[DEBUG] Quality change: Changing URL to ${selectedSource.url}`);
        setVideoUrl(selectedSource.url);
        setStreamingUrl(selectedSource.url);
        
        // Always reset quality changing state after 2.9 seconds to ensure button becomes clickable again
        // regardless of whether the quality change was successful or not
        setTimeout(() => {
          //console.log('[DEBUG] Quality change: 2.9 second timeout reached, making button clickable again');
          setIsQualityChanging(false);
        }, 2900);
      } catch (error) {
        console.error('[DEBUG] Error during quality change:', error);
        // Even on error, wait a moment before making the button clickable again
        // to prevent rapid clicking causing multiple errors
        setTimeout(() => {
          setIsQualityChanging(false);
        }, 1000);
      }
    }
  };

  // Update the useEffect that initializes filtered episodes
  useEffect(() => {
    const sortedEpisodes = sortEpisodesByProximity(
      episodes.filter(ep => categoryAsSubOrDub === 'dub' ? ep.isDubbed : ep.isSubbed),
      episodeId as string
    );
    setFilteredEpisodes(sortedEpisodes);
  }, [episodes, episodeId, categoryAsSubOrDub]);

  // Update the search handler to maintain sub/dub filtering
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredEpisodes(sortEpisodesByProximity(
        episodes.filter(ep => categoryAsSubOrDub === 'dub' ? ep.isDubbed : ep.isSubbed),
        episodeId as string
      ));
      return;
    }
    
    const filtered = episodes
      .filter(ep => categoryAsSubOrDub === 'dub' ? ep.isDubbed : ep.isSubbed)
      .filter(episode => 
        episode.number.toString().includes(query) ||
        episode.title?.toLowerCase().includes(query.toLowerCase())
      );
    setFilteredEpisodes(filtered);
  };

  // Add this useEffect to scroll to current episode when list changes
  useEffect(() => {
    if (episodeListRef.current && filteredEpisodes.length > 0) {
      // Small delay to ensure the list has rendered
      setTimeout(() => {
        episodeListRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  }, [filteredEpisodes]);

  // Add cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup function
      setVideoUrl(null);
      setStreamingUrl(null);
      setPaused(true);
      setIsVideoReady(false);
      deactivateKeepAwake();
      
      // Reset orientation to portrait
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      ).catch(console.error);
      
      StatusBar.setHidden(false);
      navigation.setOptions({
        headerShown: true
      });
    };
  }, []);

  // Add back handler effect
  useEffect(() => {
    const backAction = () => {
      if (isFullscreen) {
        // If fullscreen, exit fullscreen first
        setIsFullscreen(false);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [isFullscreen]);

  // Update the navigation effect
  useEffect(() => {
    // Add navigation listener for cleanup
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      // Cleanup when navigating away
      setVideoUrl(null);
      setStreamingUrl(null);
      setPaused(true);
      setIsVideoReady(false);
      
      // Reset orientation
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      ).catch(console.error);
    });

    return () => {
      unsubscribe();
    };
  }, [navigation]);

  // Add cleanup effect for orientation
  useEffect(() => {
    const cleanup = async () => {
      try {
        // Reset to portrait when component unmounts
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        if (Platform.OS === 'android') {
          await NavigationBar.setVisibilityAsync('visible');
        }
        StatusBar.setHidden(false);
      } catch (error) {
        console.error('Error in cleanup:', error);
      }
    };

    return () => {
      cleanup();
    };
  }, []);

  // Handle previous episode navigation
  const handlePreviousEpisode = useCallback(() => {
    if (isNavigating.current) return;
    
    if (currentEpisodeIndex > 0) {
      isNavigating.current = true;
      const prevEpisode = episodes[currentEpisodeIndex - 1];
      router.push({
        pathname: "/anime/watch/[episodeId]",
        params: {
          episodeId: prevEpisode.id,
          animeId: animeId as string,
          episodeNumber: prevEpisode.number,
          title: animeInfo?.title || (title as string) || 'Unknown Anime',
          episodeTitle: prevEpisode.title || `Episode ${prevEpisode.number}`,
          category: category,
          resumeTime: "0" // Force start from beginning
        }
      });
    }
  }, [currentEpisodeIndex, episodes, router, animeId, animeInfo, title, category]);

  // Handle next episode navigation
  const handleNextEpisode = useCallback(() => {
    if (isNavigating.current) return;
    
    if (currentEpisodeIndex < episodes.length - 1) {
      isNavigating.current = true;
      const nextEpisode = episodes[currentEpisodeIndex + 1];
      router.push({
        pathname: "/anime/watch/[episodeId]",
        params: {
          episodeId: nextEpisode.id,
          animeId: animeId as string,
          episodeNumber: nextEpisode.number,
          title: animeInfo?.title || (title as string) || 'Unknown Anime',
          episodeTitle: nextEpisode.title || `Episode ${nextEpisode.number}`,
          category: category,
          resumeTime: "0" // Force start from beginning
        }
      });
    }
  }, [currentEpisodeIndex, episodes, router, animeId, animeInfo, title, category]);

  // Reset navigation state when component mounts or episodeId changes
  useEffect(() => {
    isNavigating.current = false;
  }, [episodeId]);

  // Modify the handleLoad function to check if we should use the resume position
  const handleLoad = (status: VideoProgress) => {
    if (!status) return;
    
    // Set duration
    const videoDuration = status.seekableDuration;
    setDuration(videoDuration);
    
    //console.log(`[DEBUG] VideoPlayer: Video loaded, duration: ${videoDuration}`);
    
    // Only use resume position if it makes sense
    if (resumePosition > 0 && !isVideoReady && shouldUseResumePosition(resumePosition, videoDuration)) {
      //console.log(`[DEBUG] VideoPlayer: Seeking to resumePosition: ${resumePosition}`);
      // Use a timeout to ensure the video is ready
      setTimeout(() => {
        handleSeek(resumePosition);
        setIsVideoReady(true);
      }, 300);
    } else if (isPlaying) {
      // Start from beginning
      if (resumePosition > 0 && !shouldUseResumePosition(resumePosition, videoDuration)) {
        //console.log(`[DEBUG] VideoPlayer: Starting from beginning instead of resume position`);
        handleSeek(0);
      }
      // Ensure we're playing if we should be
      videoRef.current?.play().catch((error: Error) => {
        console.error('[DEBUG] VideoPlayer: Error playing after load:', error);
      });
    }
  };

  // Handle download button press
  const handleDownload = useCallback(() => {
    if (videoData?.download) {
      setDownloadUrl(videoData.download);
      setShowDownloadPopup(true);
    }
  }, [videoData]);

  // Handle comment button press
  const handleShowComments = useCallback(() => {
    // Pause the video when opening comments
    if (isPlaying) {
      setIsPlaying(false);
    }
    setShowCommentsModal(true);
  }, [isPlaying]);

  // Add this to hide header in fullscreen mode - optimize for responsiveness
  useEffect(() => {
    // Update params immediately when fullscreen changes
    if (router && router.setParams) {
      requestAnimationFrame(() => {
        router.setParams({
          headerShown: !isFullscreen
        });
      });
    }
  }, [isFullscreen]);

  // Add a skeleton loading UI
  const renderSkeletonUI = () => {
    return (
      <View style={styles.container}>
        {/* Skeleton Video Player */}
        <View style={[styles.video, {backgroundColor: '#1a1a1a'}]}>
          <View style={styles.skeletonPlayButton}>
            <MaterialIcons name="play-circle-outline" size={64} color="#2a2a2a" />
          </View>
        </View>
        
        {/* Skeleton Controls */}
        <View style={{padding: 16}}>
          {/* Skeleton Title */}
          <View style={styles.skeletonTitle} />
          
          {/* Skeleton Episode Info */}
          <View style={styles.skeletonEpisodeInfo} />
          
          {/* Skeleton Episode List Title */}
          <View style={[styles.skeletonText, {marginTop: 24, marginBottom: 16}]} />
          
          {/* Skeleton Audio Status */}
          <View style={styles.skeletonAudioStatus} />
          
          {/* Skeleton Search Bar */}
          <View style={[styles.searchContainer, {backgroundColor: '#2a2a2a', height: 40, marginVertical: 16}]} />
          
          {/* Skeleton Episode List */}
          <View style={{gap: 8, marginTop: 16}}>
            {[...Array(5)].map((_, i) => (
              <View key={i} style={styles.skeletonEpisode} />
            ))}
          </View>
        </View>
      </View>
    );
  };

  // Render loading state, error state, or content
  if (!isPageLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f4511e" />
      </View>
    );
  }

  if (showSkeletonUI && loading) {
    return renderSkeletonUI();
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            setError(null);
            setShowSkeletonUI(true);
            fetchEpisodeData();
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: !isFullscreen,
          title: animeInfo?.title ? 
            (episodeTitle ? `${animeInfo.title} - ${episodeTitle}` : animeInfo.title) : 
            (title as string || 'Watch Anime'),
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

      <VideoPlayerContext.Provider value={{
        currentEpisodeIndex,
        episodes,
        animeId: animeId as string,
        animeInfo,
        category: categoryAsSubOrDub,
        videoData,
        router
      }}>
        <View style={[
          styles.container,
          isFullscreen && {
            ...styles.fullscreenContainer,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#000',
            zIndex: 9999,
          }
        ]}>
          {/* This makes the Status Bar translucent in fullscreen mode */}
          {isFullscreen && Platform.OS === 'ios' && (
            <StatusBar translucent backgroundColor="transparent" />
          )}
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#f4511e" />
              <Text style={styles.loadingText}>Loading video...</Text>
            </View>
          ) : (
            <>
              {/* Video Player */}
              <TouchableOpacity
                activeOpacity={1}
                style={[isFullscreen ? styles.fullscreenVideo : styles.video]}
                onPress={handleSingleTap}
                onPress={(event) => {
                  // Get the X location of the press within the component
                  const locationX = event.nativeEvent.locationX;
                  
                  if (lastTap && Date.now() - lastTap < DOUBLE_TAP_DELAY) {
                    // Double tap detected
                    handleDoubleTap(locationX);
                    setLastTap(null); // Reset last tap after handling double tap
                  } else {
                    // Single tap - set last tap and schedule a future check
                    setLastTap(Date.now());
                    // After DOUBLE_TAP_DELAY, if no second tap occurred, handle single tap
                    setTimeout(() => {
                      if (lastTap && Date.now() - lastTap >= DOUBLE_TAP_DELAY) {
                        handleSingleTap();
                        setLastTap(null); // Reset last tap after handling
                      }
                    }, DOUBLE_TAP_DELAY);
                  }
                }}
              >
                <VideoPlayer {...videoPlayerProps} />
              </TouchableOpacity>

              <ScrollView style={styles.controls}>
                {/* Episodes */}
                <View style={styles.episodeSection}>
                  <Text style={styles.sectionTitle}>
                    {categoryAsSubOrDub === 'dub' ? 'Dubbed Episodes' : 'Subbed Episodes'}
                  </Text>
                  
                  {/* Remove the audio selector and replace with a simple status indicator */}
                  <View style={styles.audioStatusContainer}>
                    <MaterialIcons 
                      name={categoryAsSubOrDub === 'dub' ? "record-voice-over" : "subtitles"} 
                      size={20} 
                      color="#f4511e" 
                    />
                    <Text style={styles.audioStatusText}>
                      {categoryAsSubOrDub === 'dub' ? 'English Dub' : 'Original with Subtitles'}
                      {' '}({filteredEpisodes.length} episodes)
                    </Text>
                  </View>

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
                        <EpisodeItem
                          key={episode.id}
                          episode={episode}
                          onPress={() => {
                            router.push({
                              pathname: "/anime/watch/[episodeId]",
                              params: {
                                episodeId: episode.id,
                                animeId: animeId,
                                episodeNumber: episode.number,
                                title: episode.title || `Episode ${episode.number}`,
                                category: category,
                                resumeTime: "0" // Force start from beginning
                              }
                            });
                          }}
                          onLongPress={() => {
                            // Implement long press action
                          }}
                          mode={categoryAsSubOrDub}
                          isCurrentEpisode={episode.id === episodeId}
                        />
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.footerContainer}>
                    <Text style={styles.footerText}>
                      made with ❤️ by AniSurge Team
                    </Text>
                  </View>
                </View>
              </ScrollView>
            </>
          )}
        </View>
      </VideoPlayerContext.Provider>
      <DownloadPopup
        visible={showDownloadPopup}
        onClose={() => setShowDownloadPopup(false)}
        downloadUrl={downloadUrl}
      />

      {/* Comments Modal - using the same modal as in [id].tsx */}
      <CommentModal
        visible={showCommentsModal}
        onClose={() => {
          setShowCommentsModal(false);
          // Resume video playback when closing comments if it was playing before
          if (!isPlaying) {
            setIsPlaying(true);
          }
        }}
        animeId={animeId as string}
        animeTitle={animeInfo?.title || (title as string)}
      />
    </>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    zIndex: 1000,
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  fullscreenVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
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
  topControls: {
    padding: 16,
  },
  title: {
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
  time: {
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
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    alignSelf: 'center',
    minWidth: 120,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  episodeList: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 8,
  },
  episodeListScroll: {  // Rename to avoid duplicate
    flex: 1,
  },
  currentEpisodeItem: {
    backgroundColor: '#333',
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
  
  episodeListContent: {
    paddingVertical: 8,
  },
  episodeCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  fillerEpisodeCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#f4511e',
  },
  episodeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  episodeNumberContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  episodeBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  fillerBadge: {
    color: '#f4511e',
    fontSize: 12,
    fontWeight: '600',
  },
  dubBadge: {
    color: '#4CAF50', 
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#222',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  webView: {
    flex: 1,
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  qualityChanging: {
    backgroundColor: '#f4511e55',
    borderColor: '#f4511e',
  },
  footerContainer: {
    marginTop: 16,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  audioStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  audioStatusText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  audioSelector: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  audioOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 8,
  },
  selectedAudio: {
    backgroundColor: '#f4511e',
  },
  audioText: {
    color: '#666',
    fontSize: 14,
  },
  selectedAudioText: {
    color: '#fff',
  },
  animeInfoContainer: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  animeInfoContent: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  animeCoverContainer: {
    width: 100,
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  animeCover: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  animeCoverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  animeDetails: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  animeTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  animeTypeTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#f4511e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 8,
  },
  animeTypeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  animeDescription: {
    color: '#999',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  animeMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  animeStatus: {
    color: '#666',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 16,
  },
  episodesHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  skeletonPlayButton: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonTitle: {
    width: '80%',
    height: 24,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    marginBottom: 12,
    opacity: 0.7,
  },
  skeletonEpisodeInfo: {
    width: '60%',
    height: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    marginTop: 8,
    marginBottom: 16,
    opacity: 0.7,
  },
  skeletonText: {
    width: '40%',
    height: 18,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    opacity: 0.7,
  },
  skeletonAudioStatus: {
    width: '70%',
    height: 40,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginBottom: 16,
    opacity: 0.7,
  },
  skeletonEpisode: {
    width: '100%',
    height: 56,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginBottom: 8,
    opacity: 0.7,
  },
});