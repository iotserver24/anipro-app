import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Dimensions, ScrollView, Pressable, StatusBar, TextInput, BackHandler, Platform, Linking, Modal } from 'react-native';
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
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'space-between',
    }}>
      {/* Title bar */}
      <View style={{ padding: 16 }}>
        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>{title}</Text>
      </View>

      {/* Center play/pause button */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ color: 'white', marginRight: 16, fontSize: 14 }}>
            {formatTime(currentTime)}
          </Text>
          <Slider
            style={{ flex: 1, marginHorizontal: 8 }}
            value={currentTime}
            maximumValue={duration}
            minimumValue={0}
            onValueChange={onSeek}
            minimumTrackTintColor="#f4511e"
            maximumTrackTintColor="rgba(255,255,255,0.5)"
            thumbTintColor="#f4511e"
          />
          <Text style={{ color: 'white', marginRight: 16, fontSize: 14 }}>
            {formatTime(duration)}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
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

// Add this component after the VideoPlayer and before the speed controls
const EpisodeControls = ({ 
  currentEpisodeIndex, 
  episodes, 
  onPrevious, 
  onNext, 
  onDownload,
  downloadUrl
}: { 
  currentEpisodeIndex: number; 
  episodes: APIEpisode[];
  onPrevious: () => void;
  onNext: () => void;
  onDownload: () => void;
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
          opacity: hasNext ? 1 : 0.5,
        }}
        onPress={onNext}
        disabled={!hasNext}
      >
        <MaterialIcons name="skip-next" size={22} color="white" />
      </TouchableOpacity>
    </View>
  );
};

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

// Add the WatchEpisode component as a default export
export default function WatchEpisode() {
  const { episodeId, animeId, episodeNumber, title, category, resumeTime } = useLocalSearchParams();
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

  useEffect(() => {
    // If resumeTime is provided, use it directly and skip getting from history
    if (resumeTime) {
      const parsedTime = parseFloat(resumeTime as string);
      console.log(`[DEBUG] Setting resume position from resumeTime param: ${parsedTime}`);
      setResumePosition(parsedTime);
      return;
    }
    
    const getResumePosition = async () => {
      try {
        const history = await useWatchHistoryStore.getState().getHistory();
        const lastWatch = history.find(item => item.episodeId === episodeId);
        if (lastWatch?.progress && lastWatch.progress > 0) {
          console.log(`[DEBUG] Setting resume position from history: ${lastWatch.progress}`);
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
      console.log(`[DEBUG] Setting resume position from savedProgress: ${savedProgress}`);
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
      fetch('https://app.animeverse.cc/api/anime-count', {
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
      } catch (error) {
        logger.error('Failed to activate keep awake:', error);
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

      // Set the full video data from the API response
      setVideoData(sources);
      
      // Set download URL if available
      if (sources.download) {
        setDownloadUrl(sources.download);
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
        title: data.title,
        image: data.image,
        description: data.description,
        type: data.type,
        status: data.status,
        genres: data.genres
      };
      setAnimeInfo(processedData);
      
      // Save to history immediately to ensure we have the correct info
      const now = Date.now();
      addToHistory({
        id: animeId as string,
        name: processedData.title,
        img: processedData.image,
        episodeId: episodeId as string,
        episodeNumber: Number(episodeNumber),
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
      logger.error('Error fetching anime info:', error);
    }
  };

  const handleVideoLoad = async () => {
    if (videoRef.current && resumePosition > 0 && !isVideoReady) {
      try {
        console.log(`handleVideoLoad: seeking to ${resumePosition} seconds`);
        // Add a delay to ensure the video is ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // First pause to ensure seeking works properly
        await videoRef.current.pauseAsync();
        
        // Then seek to the position
        await videoRef.current.setPositionAsync(resumePosition * 1000);
        
        // Finally play
        await videoRef.current.playAsync();
        
        setIsVideoReady(true);
        console.log('Video successfully seeked to resume position');
      } catch (err) {
        logger.error('Error seeking to position:', err);
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
              logger.error('Error on retry seeking:', retryErr);
            }
          }, 1000);
        }
      }
    }
  };

  const handleProgress = (data: VideoProgress) => {
    if (!isSeeking && !isQualityChanging) {
      const newTime = data.currentTime;
      const newDuration = data.seekableDuration;
      
      setCurrentTime(newTime);
      setDuration(newDuration);
      
      // Save progress every 3 seconds and only if we have valid progress
      const now = Date.now();
      if (now - lastSaveTime >= 3000 && animeInfo && newTime > 0) {
        setLastSaveTime(now);
        
        // Save progress
        addToHistory({
          id: animeId as string,
          name: animeInfo.title || animeInfo.info?.title || 'Unknown Anime',
          img: animeInfo.image || animeInfo.info?.image || '',
          episodeId: typeof episodeId === 'string' ? episodeId : episodeId[0],
          episodeNumber: Number(episodeNumber),
          timestamp: now,
          progress: newTime,
          duration: newDuration,
          lastWatched: now,
          subOrDub: (typeof category === 'string' ? category : 'sub') as 'sub' | 'dub'
        });
      }
    }

    // Handle intro/outro skipping if available
    if (videoData?.intro && data.currentTime >= videoData.intro.start && data.currentTime <= videoData.intro.end) {
      handleSeek(videoData.intro.end);
    }
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

  const onSliderValueChange = (value: number) => {
    if (videoRef.current) {
      videoRef.current.setPositionAsync(value * 1000);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handlePlaybackSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    // The VideoPlayer component will handle the actual speed change
    // through the rate prop and useEffect
  };

  const handleVideoError = (error: any) => {
    console.log('Video playback error:', error);
    setError('Video playback failed. Please try refreshing the page.');
  };

  const handleFullscreenChange = async (fullscreen: boolean) => {
    try {
      // Set state first for immediate UI response
      setIsFullscreen(fullscreen);
      
      // Update navigation options
      navigation.setOptions({
        headerShown: !fullscreen,
        statusBarHidden: fullscreen
      });

      // Update status bar
      StatusBar.setHidden(fullscreen);
      
      // Handle orientation and navigation bar
      if (fullscreen) {
        // Enter fullscreen - landscape mode
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        if (Platform.OS === 'android') {
          await NavigationBar.setVisibilityAsync('hidden');
        }
        
        // Update player dimensions immediately
        const { width, height } = Dimensions.get('window');
        setPlayerDimensions({
          width: Math.max(width, height), // Ensure we use the larger dimension as width
          height: Math.min(width, height)
        });
      } else {
        // Exit fullscreen - portrait mode
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        if (Platform.OS === 'android') {
          await NavigationBar.setVisibilityAsync('visible');
        }
        
        // Update player dimensions
        const { width } = Dimensions.get('window');
        setPlayerDimensions({
          width: width,
          height: width * (9/16)
        });
      }
    } catch (error) {
      console.error('Error handling fullscreen change:', error);
    }
  };

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
      uri: videoUrl || '',
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
      console.log(`onLoad called, resumePosition: ${resumePosition}, isVideoReady: ${isVideoReady}`);
      if (resumePosition > 0 && !isVideoReady) {
        console.log(`Seeking to resumePosition: ${resumePosition}`);
        // Use a timeout to ensure the video is ready
        setTimeout(() => {
          handleSeek(resumePosition);
          setIsVideoReady(true);
        }, 300);
      }
    },
    onPlayPause: togglePlayPause,
    onSeek: handleSeek,
    onFullscreen: handleFullscreenChange,
    onFullscreenChange: setIsFullscreen,
    onPlaybackRateChange: handlePlaybackSpeedChange,
    bufferConfig: {
      minBufferMs: 15000,
      maxBufferMs: 50000,
      bufferForPlaybackMs: 2500,
      bufferForPlaybackAfterRebufferMs: 5000
    },
    progressUpdateInterval: 1000,
    intro: videoData?.intro,
    outro: videoData?.outro,
    onSkipIntro: () => {
      if (videoRef.current && videoData?.intro) {
        videoRef.current.setPositionAsync(videoData.intro.end * 1000);
      }
    },
    onSkipOutro: () => {
      if (videoRef.current && videoData?.outro) {
        videoRef.current.setPositionAsync(videoData.outro.end * 1000);
      }
    },
    isQualityChanging: isQualityChanging,
    savedQualityPosition: savedPosition
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
          console.log(`[DEBUG] Quality ${quality} already selected, skipping change`);
          return;
        }
        
        // Save current position and playback state before changing quality
        const currentPos = currentTime;
        const wasPlaying = isPlaying;
        
        console.log(`[DEBUG] Quality change: Saving position ${currentPos} and playback state ${wasPlaying}`);
        
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
        console.log(`[DEBUG] Quality change: Changing URL to ${selectedSource.url}`);
        setVideoUrl(selectedSource.url);
        setStreamingUrl(selectedSource.url);
        
        // The VideoPlayer component will handle seeking to the saved position
        // and restoring the playback state after the video loads
        
        // Set a timeout to reset quality changing state if something goes wrong
        setTimeout(() => {
          if (isQualityChanging) {
            console.log('[DEBUG] Quality change: Timeout reached, resetting quality changing state');
            setIsQualityChanging(false);
          }
        }, 5000); // Reduced from 10 seconds to 5 seconds
      } catch (error) {
        console.error('[DEBUG] Error during quality change:', error);
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

  // Update the handleLoad function
  const handleLoad = (status: VideoProgress) => {
    if (!status) return;
    
    // Set duration
    const videoDuration = status.seekableDuration;
    setDuration(videoDuration);
    
    console.log(`[DEBUG] VideoPlayer: Video loaded, duration: ${videoDuration}`);
    
    // Handle initial position
    if (resumePosition > 0 && !isVideoReady) {
      console.log(`[DEBUG] VideoPlayer: Seeking to resumePosition: ${resumePosition}`);
      // Use a timeout to ensure the video is ready
      setTimeout(() => {
        handleSeek(resumePosition);
        setIsVideoReady(true);
      }, 300);
    } else if (isPlaying) {
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

  // Handle previous episode navigation
  const handlePreviousEpisode = useCallback(() => {
    if (currentEpisodeIndex > 0) {
      const prevEpisode = episodes[currentEpisodeIndex - 1];
      router.push({
        pathname: "/anime/watch/[episodeId]",
        params: {
          episodeId: prevEpisode.id,
          animeId: animeId as string,
          episodeNumber: prevEpisode.number,
          title: prevEpisode.title || `Episode ${prevEpisode.number}`,
          category: category
        }
      });
    }
  }, [currentEpisodeIndex, episodes, router, animeId, category]);

  // Handle next episode navigation
  const handleNextEpisode = useCallback(() => {
    if (currentEpisodeIndex < episodes.length - 1) {
      const nextEpisode = episodes[currentEpisodeIndex + 1];
      router.push({
        pathname: "/anime/watch/[episodeId]",
        params: {
          episodeId: nextEpisode.id,
          animeId: animeId as string,
          episodeNumber: nextEpisode.number,
          title: nextEpisode.title || `Episode ${nextEpisode.number}`,
          category: category
        }
      });
    }
  }, [currentEpisodeIndex, episodes, router, animeId, category]);

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
          isFullscreen && styles.fullscreenContainer
        ]}>
          <VideoPlayer
            source={{ 
              uri: videoUrl || '',
              headers: videoHeaders || {}
            }}
            title={title as string}
            initialPosition={resumePosition}
            onProgress={(currentTime, duration) => {
              if (!isSeeking) {
                setCurrentTime(currentTime);
                setDuration(duration);
                
                // Save progress every 5 seconds
                if (Math.floor(currentTime) % 5 === 0 && currentTime > 0) {
                  console.log(`[DEBUG] Saving progress: ${currentTime}/${duration}`);
                  if (animeInfo?.info || animeInfo) {
                    addToHistory({
                      id: animeId as string,
                      name: animeInfo.info?.title || animeInfo.title || animeInfo.name || 'Unknown Anime',
                      img: animeInfo.info?.image || animeInfo.image || animeInfo.img || '',
                      episodeId: typeof episodeId === 'string' ? episodeId : episodeId[0],
                      episodeNumber: Number(episodeNumber),
                      timestamp: Date.now(),
                      progress: currentTime,
                      duration: duration,
                      lastWatched: Date.now(),
                      subOrDub: (typeof category === 'string' ? category : 'sub') as 'sub' | 'dub'
                    });
                  }
                }
              }
            }}
            onEnd={onVideoEnd}
            onFullscreenChange={handleFullscreenChange}
            style={isFullscreen ? 
              { width: playerDimensions.width, height: playerDimensions.height, backgroundColor: '#000' } : 
              { width: '100%', aspectRatio: 16/9, backgroundColor: '#000' }
            }
            intro={videoData?.intro}
            outro={videoData?.outro}
            isQualityChanging={isQualityChanging}
            savedQualityPosition={savedPosition}
          />
          
          {!isFullscreen && (
            <>
              <EpisodeControls
                currentEpisodeIndex={currentEpisodeIndex}
                episodes={episodes}
                onPrevious={handlePreviousEpisode}
                onNext={handleNextEpisode}
                onDownload={handleDownload}
                downloadUrl={videoData?.download || null}
              />
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
                          selectedQuality === q.quality && styles.selectedQuality,
                          isQualityChanging && selectedQuality === q.quality && styles.qualityChanging
                        ]}
                        onPress={() => handleQualityChange(q.quality)}
                        disabled={isQualityChanging || selectedQuality === q.quality}
                      >
                        <Text style={styles.qualityText}>
                          {q.quality}
                          {isQualityChanging && selectedQuality === q.quality && '...'}
                        </Text>
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
                                category: category
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
    backgroundColor: '#000',
    zIndex: 999,
    width: '100%',
    height: '100%',
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
  episodeListScroll: {  // Rename to avoid duplicate
    flex: 1,
  },
  currentEpisodeItem: {  // Rename to avoid duplicate
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
}); 