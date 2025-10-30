import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Dimensions, ScrollView, Pressable, StatusBar, TextInput, BackHandler, Platform, Linking, Modal, Alert, Animated, Image, Easing } from 'react-native';
import { useLocalSearchParams, router, Stack, useNavigation } from 'expo-router';
import { useTheme } from '../../../hooks/useTheme';
import Video from 'react-native-video';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useWatchHistoryStore, WatchHistoryItem } from '../../../store/watchHistoryStore';
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
import { mediaSessionService, MediaSessionData } from '../../../services/mediaSessionService';
import AsyncStorage from '@react-native-async-storage/async-storage';

type StreamSource = {
  url: string;
  quality: string;
  isM3U8: boolean;
};

type Subtitle = {
  title: string;
  language: string;
  lang: string;
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

// Add this type definition near the top with other types
type EpisodeItemProps = {
  episode: APIEpisode;
  isCurrentEpisode: boolean;
  onPress: () => void;
  mode: 'sub' | 'dub';
};

// Add the EpisodeItem component definition before the main WatchEpisode component
const EpisodeItem = React.memo(({ episode, isCurrentEpisode, onPress, mode }: EpisodeItemProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.episodeCard,
        isCurrentEpisode && styles.currentEpisodeCard,
        pressed && styles.pressedEpisodeCard,
        episode.isFiller && styles.fillerEpisodeCard
      ]}
    >
      <LinearGradient
        colors={isCurrentEpisode ? 
          ['#f4511e22', '#f4511e11', '#f4511e00'] : 
          ['transparent', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.episodeGradient}
      >
        <View style={styles.episodeContent}>
          {/* Episode Number Circle */}
          <View style={[
            styles.episodeNumberContainer,
            isCurrentEpisode && styles.currentEpisodeNumberContainer
          ]}>
            <Text style={[
              styles.episodeNumber,
              isCurrentEpisode && styles.currentEpisodeNumber
            ]}>
              {episode.number}
            </Text>
          </View>

          {/* Episode Info */}
          <View style={styles.episodeInfo}>
            <Text 
              style={[
                styles.episodeTitle,
                isCurrentEpisode && styles.currentEpisodeTitle
              ]} 
              numberOfLines={2}
            >
              {episode.title || `Episode ${episode.number}`}
            </Text>
            
            {/* Badges */}
            <View style={styles.badgeContainer}>
              {mode === 'dub' && episode.isDubbed && (
                <View style={styles.dubBadge}>
                  <MaterialIcons name="record-voice-over" size={12} color="#4CAF50" />
                  <Text style={styles.dubBadgeText}>DUB</Text>
                </View>
              )}
              {episode.isFiller && (
                <View style={styles.fillerBadge}>
                  <MaterialIcons name="info-outline" size={12} color="#f4511e" />
                  <Text style={styles.fillerBadgeText}>FILLER</Text>
                </View>
              )}
            </View>
          </View>

          {/* Right Icon */}
          <View style={styles.episodeRightIcon}>
            {isCurrentEpisode ? (
              <MaterialIcons name="play-circle-filled" size={24} color="#f4511e" />
            ) : (
              <MaterialIcons name="play-circle-outline" size={24} color="#666" />
            )}
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
});

// Add this type near the top with other type definitions
type Quality = {
  url: string;
  quality: string;
};

// Add this utility function at the top of the file
const extractQualities = async (m3u8Url: string, headers?: {[key: string]: string}): Promise<Quality[]> => {
  try {
    console.log('Extracting qualities from:', m3u8Url);
    // Use the same headers as the video source to bypass Cloudflare
    const response = await fetch(m3u8Url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': headers?.Referer || 'https://megacloud.blog/',
        ...headers
      }
    });
    const manifest = await response.text();
    console.log('M3U8 manifest first 500 chars:', manifest.substring(0, 500));
    const qualities: Quality[] = [];
    
    // Parse m3u8 manifest
    const lines = manifest.split('\n');
    let currentQuality = '';
    
    for (const line of lines) {
      if (line.includes('#EXT-X-STREAM-INF')) {
        console.log('Found stream info line:', line);
        // Extract resolution/bandwidth info
        const resolution = line.match(/RESOLUTION=(\d+x\d+)/)?.[1];
        const bandwidth = line.match(/BANDWIDTH=(\d+)/)?.[1];
        
        if (resolution) {
          const height = resolution.split('x')[1];
          currentQuality = `${height}p`;
          console.log('Found resolution quality:', currentQuality);
        } else if (bandwidth) {
          // Fallback to bandwidth if no resolution
          const bw = Math.floor(parseInt(bandwidth) / 1000);
          currentQuality = `${bw}k`;
          console.log('Found bandwidth quality:', currentQuality);
        }
      } else if (line.trim() && !line.startsWith('#') && currentQuality) {
        // This is a stream URL
        let streamUrl;
        try {
          streamUrl = new URL(line.trim(), m3u8Url).href;
        } catch {
          // If URL construction fails, use the line as is if it's already a full URL
          streamUrl = line.trim().startsWith('http') ? line.trim() : m3u8Url.replace(/[^/]*$/, line.trim());
        }
        qualities.push({
          url: streamUrl,
          quality: currentQuality
        });
        console.log('Added quality:', currentQuality, 'URL:', streamUrl.substring(0, 100) + '...');
        currentQuality = '';
      }
    }

    // Add the original/auto quality
    qualities.push({
      url: m3u8Url,
      quality: 'auto'
    });

    console.log('Final qualities array:', qualities.map(q => ({ quality: q.quality, urlPreview: q.url.substring(0, 50) + '...' })));

    return qualities.sort((a, b) => {
      // Sort qualities with highest first, but keep auto at top
      if (a.quality === 'auto') return -1;
      if (b.quality === 'auto') return 1;
      // Handle quality strings that might not be pure numbers
      const aNum = parseInt(a.quality);
      const bNum = parseInt(b.quality);
      if (isNaN(aNum) || isNaN(bNum)) return 0;
      return bNum - aNum;
    });

  } catch (error) {
    console.error('Error parsing m3u8:', error);
    console.log('Falling back to auto quality only');
    return [{
      url: m3u8Url,
      quality: 'auto'
    }];
  }
};

// Add this function to get episodes for a specific batch
const getEpisodesForBatch = (episodes: APIEpisode[], batchNumber: number) => {
  const batchStart = (batchNumber - 1) * 50 + 1;
  const batchEnd = batchNumber * 50;
  
  return episodes
    .filter(episode => episode.number >= batchStart && episode.number <= batchEnd)
    .sort((a, b) => a.number - b.number);
};

// Add this function to sort episodes by batches
const sortEpisodesByBatches = (episodes: APIEpisode[], episodeId: string) => {
  // For now, just return episodes sorted by number
  // This can be enhanced later for better batch organization
  return episodes.sort((a, b) => a.number - b.number);
};

// Add this function to get all available batches
const getAvailableBatches = (episodes: APIEpisode[]) => {
  if (episodes.length === 0) return [];
  
  const maxEpisodeNumber = Math.max(...episodes.map(ep => ep.number));
  const totalBatches = Math.ceil(maxEpisodeNumber / 50);
  
  return Array.from({ length: totalBatches }, (_, i) => i + 1);
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

// Add these components after your existing component definitions and before WatchEpisode
const SkeletonLoader = React.memo(() => {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startShimmerAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnimation, {
            toValue: 1,
            duration: 1000,
            easing: Easing.linear,
            useNativeDriver: true
          }),
          Animated.timing(shimmerAnimation, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true
          })
        ])
      ).start();
    };

    startShimmerAnimation();
  }, []);

  const translateX = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 400]
  });

  const shimmerStyle = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ translateX }]
  };

  return (
    <View style={styles.skeletonContainer}>
      {/* Video Player Skeleton */}
      <View style={[styles.skeletonVideo, { overflow: 'hidden' }]}>
        <Animated.View style={shimmerStyle} />
      </View>

      {/* Controls Skeleton */}
      <View style={styles.skeletonControls}>
        <View style={styles.skeletonControlsRow}>
          {[1, 2, 3, 4].map((_, index) => (
            <View key={index} style={[styles.skeletonControlButton, { overflow: 'hidden' }]}>
              <Animated.View style={shimmerStyle} />
            </View>
          ))}
        </View>
      </View>

      {/* Anime Info Skeleton */}
      <View style={[styles.skeletonAnimeInfo, { overflow: 'hidden' }]}>
        <View style={styles.skeletonAnimeInfoHeader}>
          <View style={[styles.skeletonAnimeImage, { overflow: 'hidden' }]}>
            <Animated.View style={shimmerStyle} />
          </View>
          <View style={styles.skeletonAnimeDetails}>
            <View style={[styles.skeletonTitle, { overflow: 'hidden' }]}>
              <Animated.View style={shimmerStyle} />
            </View>
            <View style={[styles.skeletonSubtitle, { overflow: 'hidden' }]}>
              <Animated.View style={shimmerStyle} />
            </View>
          </View>
        </View>
      </View>

      {/* Episodes List Skeleton */}
      <View style={styles.skeletonEpisodesList}>
        <View style={[styles.skeletonEpisodesHeader, { overflow: 'hidden' }]}>
          <Animated.View style={shimmerStyle} />
        </View>
        {[1, 2, 3, 4, 5].map((_, index) => (
          <View key={index} style={[styles.skeletonEpisodeItem, { overflow: 'hidden' }]}>
            <Animated.View style={shimmerStyle} />
          </View>
        ))}
      </View>
    </View>
  );
});

// Add this new component for download quality options
const DownloadQualityModal = React.memo(({ visible, onClose, downloadOptions }: { 
  visible: boolean; 
  onClose: () => void; 
  downloadOptions: { url: string; quality: string }[] | null;
}) => {
  const openInBrowser = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Cannot open URL", "Your device cannot open this download link.");
      }
    } catch (error) {
      console.error("Error opening URL:", error);
      Alert.alert("Error", "Failed to open download link.");
    }
  };

  if (!downloadOptions || downloadOptions.length === 0) return null;
  
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
            <Text style={styles.modalTitle}>Select Download Quality</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.qualityOptionsContainer}>
            {downloadOptions.map((option, index) => (
              <TouchableOpacity 
                key={index}
                style={styles.qualityOptionButton}
                onPress={() => {
                  openInBrowser(option.url);
                  // Optional: Close modal after selecting
                  // onClose();
                }}
              >
                <MaterialIcons name="file-download" size={24} color="#f4511e" />
                <Text style={styles.qualityOptionText}>{option.quality}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <Text style={styles.modalFooterText}>Downloads will open in your browser</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
});

// Optimize the main WatchEpisode component
export default function WatchEpisode() {
  const { theme, hasBackgroundMedia } = useTheme();
  const { episodeId, animeId, episodeNumber, title, episodeTitle, category, resumeTime } = useLocalSearchParams();
  const categoryAsSubOrDub = (typeof category === 'string' ? category : 'sub') as 'sub' | 'dub';
  const [mode, setMode] = useState<'sub' | 'dub'>(categoryAsSubOrDub);
  const videoRef = useRef<VideoRef>(null);
  const [streamingUrl, setStreamingUrl] = useState<string | null>(null);
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string>('auto');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  // Change default server to softSub
  const [selectedServer, setSelectedServer] = useState<'softSub' | 'hardSub' | 'zen'>('softSub');
  const [isChangingServer, setIsChangingServer] = useState(false);
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
  const [wasFullscreenBeforeNavigation, setWasFullscreenBeforeNavigation] = useState(false);
  const [isNavigatingEpisode, setIsNavigatingEpisode] = useState(false);
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
  // Add this state near other state declarations in WatchEpisode component
  const [isAnimeInfoVisible, setIsAnimeInfoVisible] = useState(false);
  const [newServerAnimeId, setNewServerAnimeId] = useState<string | null>(null);
  const [newServerDownloadUrl, setNewServerDownloadUrl] = useState<string | null>(null);
  const [checkingNewServerDownload, setCheckingNewServerDownload] = useState(false);
  // Add this state after other state declarations
  const [lastServerPosition, setLastServerPosition] = useState<number>(0);
  const [downloadOptions, setDownloadOptions] = useState<{ url: string; quality: string }[] | null>(null);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<number>(1);
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [mediaSessionActive, setMediaSessionActive] = useState(false);
  const [notificationRestored, setNotificationRestored] = useState(false);

  // Load preferred language and set initial batch based on current episode
  useEffect(() => {
    const loadPreferredLanguage = async () => {
      try {
        const pref = await AsyncStorage.getItem('preferredLanguage');
        if (pref === 'sub' || pref === 'dub') {
          setMode(pref);
        }
      } catch {}
    };
    loadPreferredLanguage();

    const currentEpisodeNumber = Number(episodeNumber) || 1;
    const currentBatch = Math.ceil(currentEpisodeNumber / 50);
    setSelectedBatch(currentBatch);
  }, [episodeNumber]);

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
    fetchEpisodeData(false); // Initial load, not a server change
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

    // Initialize media session
    const initializeMediaSession = async () => {
      try {
        const episodeTitleText = episodeTitle as string || `Episode ${episodeNumber}`;
        const animeTitleText = animeInfo?.title || (title as string) || 'Unknown Anime';
        
        const success = await mediaSessionService.startMediaSession({
          title: episodeTitleText,
          episodeTitle: episodeTitleText,
          animeTitle: animeTitleText,
          isPlaying: isPlaying,
          currentTime: currentTime,
          duration: duration,
          hasPrevious: currentEpisodeIndex > 0,
          hasNext: currentEpisodeIndex < episodes.length - 1,
        });
        setMediaSessionActive(success);
      } catch (error) {
        console.error('Failed to initialize media session:', error);
      }
    };

    initializeMediaSession();
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
      
      // Unlock orientation when component unmounts
      ScreenOrientation.unlockAsync().catch((error) => {
        console.error('🔔 Failed to unlock orientation on cleanup:', error);
      });
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

  // Modify the fetchEpisodeData function to handle server selection
  const fetchEpisodeData = async (isServerChange = false, newEpisodeId?: string) => {
    // Only set main loading state if this is not a server change
    if (!isServerChange) {
      setLoading(true);
    }
    setError(null);
    setVideoError(null);
    setRetryCount(0);
    setIsChangingServer(true);
    
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
      
      let currentCategory = mode;
      
      // If animeId is not provided (e.g., from a shared URL), parse the full URL for anime id only
      if (!animeId && typeof episodeId === 'string') {
        const parts = episodeId.split('$');
        const extractedAnimeId = parts[0];
        
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
            const filteredByCategory = allEpisodes.filter(ep => currentCategory === 'dub' ? ep.isDubbed : ep.isSubbed);
            setFilteredEpisodes(sortEpisodesByBatches(filteredByCategory, episodeId));
            const index = filteredByCategory.findIndex(ep => ep.id === episodeId);
            setCurrentEpisodeIndex(index);
          }
        }
      }
      
      // Get episode sources with the correct category
      const episodeIdToUse = newEpisodeId || episodeId;
      const cleanEpisodeId = (episodeIdToUse as string).split('$category=')[0];
      
      // Update media session with new episode info if this is a seamless transition
      if (newEpisodeId && isFullscreen) {
        const targetEpisode = episodes.find(ep => ep.id === newEpisodeId);
        if (targetEpisode) {
          const episodeTitleText = targetEpisode.title || `Episode ${targetEpisode.number}`;
          const animeTitleText = animeInfo?.title || (title as string) || 'Unknown Anime';
          
          // Update media session immediately for seamless transition
          if (mediaSessionActive) {
            mediaSessionService.updateMediaSession({
              title: episodeTitleText,
              episodeTitle: episodeTitleText,
              animeTitle: animeTitleText,
              isPlaying: isPlaying,
              currentTime: 0, // Reset to 0 for new episode
              duration: 0, // Will be updated when video loads
              hasPrevious: episodes.findIndex(ep => ep.id === newEpisodeId) > 0,
              hasNext: episodes.findIndex(ep => ep.id === newEpisodeId) < episodes.length - 1,
            });
          }
        }
      }

      // Handle different servers
      let sources;
      if (selectedServer === 'softSub') {
        // Original API source (Zoro/SoftSub) - COMMENTED OUT TEMPORARILY
        // sources = await animeAPI.getEpisodeSources(
        //   cleanEpisodeId,
        //   currentCategory === 'dub'
        // );
        
        // NEW IFRAME-BASED SOFTSUB SERVER
        try {
          const category = currentCategory === 'dub' ? 'dub' : 'sub';
          // Parse episodeId to get the episode number ID
          let episodeNumPart = '';
          if (typeof episodeId === 'string' && episodeId.includes('$episode$')) {
            const parts = episodeId.split('$episode$');
            episodeNumPart = parts[1]?.split('$')[0]; // Get the episode ID number
          } else {
            // For old format, we need to extract episode number differently
            const parts = (episodeId as string).split('$ep=');
            if (parts.length > 1) {
              episodeNumPart = parts[1]?.split('$')[0];
            }
          }
          
          if (!episodeNumPart) {
            throw new Error('Could not extract episode ID from episodeId');
          }
          
          console.log('SoftSub episode ID:', episodeNumPart);
          
          // Create the wrapper URL for SoftSub iframe
          let wrapperUrl = `https://anisurge.me/softsub-player/${episodeNumPart}?category=${category}`;
          
          // Add start_at parameter for resume functionality
          const resumePos = lastServerPosition > 0 ? lastServerPosition : resumePosition;
          if (resumePos > 0) {
            wrapperUrl += `&start_at=${Math.floor(resumePos)}`;
            console.log(`Adding start_at parameter: ${Math.floor(resumePos)} seconds`);
          }
          
          console.log('SoftSub wrapper URL:', wrapperUrl);
          
          // Set the video sources using the wrapper URL (similar to Zen server)
          sources = {
            sources: [{
              url: wrapperUrl,
              quality: 'HD',
              isM3U8: false, // This is an embedded player, not direct stream
              isZenEmbedded: true // Flag to indicate this is an embedded player
            }],
            subtitles: [], // Subtitles are handled by the embedded player
            download: null // No direct download for iframe-based player
          };
          
          console.log(`Using SoftSub wrapper player with episode ID: ${episodeNumPart}`);
        } catch (error) {
          console.error('Error setting up SoftSub wrapper:', error);
          throw new Error(`Failed to load SoftSub server: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else if (selectedServer === 'hardSub') {
        // HardSub server implementation
        try {
          // First we need the anime's MAL ID or AniList ID
          let malId = null;
          let anilistId = null;
          
          // Check if we already have anime info with the IDs
          if (animeInfo) {
            // Try to get MAL ID - may be in different properties depending on API response structure
            if ((animeInfo as any).malID) malId = (animeInfo as any).malID;
            else if ((animeInfo as any).mal_id) malId = (animeInfo as any).mal_id;
            else if ((animeInfo as any).mappings && (animeInfo as any).mappings.mal) malId = (animeInfo as any).mappings.mal;
            
            // Try to get AniList ID - may be in different properties
            if ((animeInfo as any).alID) anilistId = (animeInfo as any).alID;
            else if ((animeInfo as any).al_id) anilistId = (animeInfo as any).al_id;
            else if ((animeInfo as any).anilist_id) anilistId = (animeInfo as any).anilist_id;
            else if ((animeInfo as any).mappings && (animeInfo as any).mappings.al) anilistId = (animeInfo as any).mappings.al;
          }
          
          // If we don't have the IDs yet, fetch the anime details
          if ((!malId && !anilistId) && animeId) {
            console.log("Fetching anime details to get MAL/AniList ID");
            const animeDetails = await animeAPI.getAnimeDetails(animeId as string);
            
            // Try to get MAL ID from different possible property names
            if ((animeDetails as any).malID) malId = (animeDetails as any).malID;
            else if ((animeDetails as any).mal_id) malId = (animeDetails as any).mal_id;
            else if ((animeDetails as any).mappings && (animeDetails as any).mappings.mal) malId = (animeDetails as any).mappings.mal;
            
            // Try to get AniList ID from different possible property names
            if ((animeDetails as any).alID) anilistId = (animeDetails as any).alID;
            else if ((animeDetails as any).al_id) anilistId = (animeDetails as any).al_id;
            else if ((animeDetails as any).anilist_id) anilistId = (animeDetails as any).anilist_id;
            else if ((animeDetails as any).mappings && (animeDetails as any).mappings.al) anilistId = (animeDetails as any).mappings.al;
          }
          
          if (!malId && !anilistId) {
            throw new Error("Neither MAL ID nor AniList ID available for this anime");
          }
          
          // Log the IDs we found
          console.log(`Using MAL ID: ${malId}, AniList ID: ${anilistId}`);
          
          // Step 1: Get the episode list from animepahe - try MAL ID first, then fall back to AniList ID
          let response;
          let episodes;
          
          try {
            if (malId) {
              response = await fetch(
                `https://alt.anisurge.me/anime/episodes/mal/${malId}?provider=animepahe`
              );
              
              if (response.ok) {
                episodes = await response.json();
                console.log(`Found ${episodes.length} episodes using MAL ID ${malId}`);
              }
            }
          } catch (error) {
            console.error("Error fetching with MAL ID:", error);
          }
          
          // If MAL ID failed or wasn't available, try AniList ID
          if (!episodes && anilistId) {
            try {
              response = await fetch(
                `https://alt.anisurge.me/anime/episodes/anilist/${anilistId}?provider=animepahe`
              );
              
              if (response.ok) {
                episodes = await response.json();
                console.log(`Found ${episodes.length} episodes using AniList ID ${anilistId}`);
              }
            } catch (error) {
              console.error("Error fetching with AniList ID:", error);
            }
          }
          
          if (!episodes || episodes.length === 0) {
            throw new Error("No episodes found for this anime in animepahe");
          }
          
          // Convert episode number to numeric value for comparison
          const numericEpisodeNumber = Number(episodeNumber);
          console.log(`Looking for episode number: ${numericEpisodeNumber}`);
          
          // Log the available episode numbers for debugging
          console.log("Available episode numbers:", episodes.map((ep: any) => ep.number));
          
          // Find the matching episode by number
          // For multi-season anime, we need to handle the case where animepahe treats episodes as continuous
          // but our app expects episode numbers to start from 1 for each season
          let targetEpisode;
          
          // First, try to find exact match (for single season anime)
          targetEpisode = episodes.find(
            (ep: any) => Number(ep.number) === numericEpisodeNumber
          );
          
          // If no exact match found, try to find by relative position (for multi-season anime)
          if (!targetEpisode && episodes.length > 0) {
            // Get the minimum episode number from animepahe
            const minEpisodeNumber = Math.min(...episodes.map((ep: any) => Number(ep.number)));
            console.log(`Minimum episode number in animepahe: ${minEpisodeNumber}`);
            
            // Calculate the relative episode number (1-based index within this season)
            const relativeEpisodeNumber = numericEpisodeNumber;
            console.log(`Looking for relative episode number: ${relativeEpisodeNumber}`);
            
            // Find episode by relative position (1-based index)
            if (relativeEpisodeNumber > 0 && relativeEpisodeNumber <= episodes.length) {
              // Sort episodes by number to ensure correct order
              const sortedEpisodes = episodes.sort((a: any, b: any) => Number(a.number) - Number(b.number));
              targetEpisode = sortedEpisodes[relativeEpisodeNumber - 1];
              console.log(`Found episode by relative position: ${targetEpisode.number} (relative: ${relativeEpisodeNumber})`);
            }
          }
          
          if (!targetEpisode) {
            throw new Error(`Episode ${episodeNumber} not found in animepahe (out of ${episodes.length} episodes). Available episodes: ${episodes.map((ep: any) => ep.number).join(', ')}`);
          }
          
          console.log(`Found target episode:`, targetEpisode);
          
          // Step 2: Get the streaming sources for this episode
          const sourcesResponse = await fetch(
            `https://con.anisurge.me/anime/animepahe/watch?episodeId=${targetEpisode.id}`
          );
          
          if (!sourcesResponse.ok) {
            throw new Error(`Failed to fetch sources: ${sourcesResponse.status}`);
          }
          
          sources = await sourcesResponse.json();
          console.log("Sources response:", JSON.stringify(sources).substring(0, 200) + "...");
          
          // Filter sources based on dub preference if needed
          if (currentCategory === 'dub') {
            if (sources.sources) {
              sources.sources = sources.sources.filter((source: any) => 
                source.isDub === true || 
                (source.quality && source.quality.toLowerCase().includes('eng'))
              );
            }
          } else {
            if (sources.sources) {
              sources.sources = sources.sources.filter((source: any) => 
                source.isDub !== true && 
                (!source.quality || !source.quality.toLowerCase().includes('eng'))
              );
            }
          }
          
          if (!sources.sources || sources.sources.length === 0) {
            throw new Error(`No ${currentCategory} sources found for episode ${episodeNumber}`);
          }
          
          console.log(`Found ${sources.sources.length} sources for ${currentCategory}`);
        } catch (error) {
          console.error('Error fetching hardSub sources:', error);
          throw new Error(`Failed to load HardSub server: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else if (selectedServer === 'zen') {
        // Zen server implementation
        try {
          // First we need the anime's AniList ID
          let anilistId = null;
          
          // Check if we already have anime info with the AniList ID
          if (animeInfo) {
            // Try to get AniList ID - may be in different properties
            if ((animeInfo as any).alID) anilistId = (animeInfo as any).alID;
            else if ((animeInfo as any).al_id) anilistId = (animeInfo as any).al_id;
            else if ((animeInfo as any).anilist_id) anilistId = (animeInfo as any).anilist_id;
            else if ((animeInfo as any).mappings && (animeInfo as any).mappings.al) anilistId = (animeInfo as any).mappings.al;
          }
          
          // If we don't have the AniList ID yet, fetch the anime details
          if (!anilistId && animeId) {
            console.log("Fetching anime details to get AniList ID for Zen server");
            const animeDetails = await animeAPI.getAnimeDetails(animeId as string);
            
            // Try to get AniList ID from different possible property names
            if ((animeDetails as any).alID) anilistId = (animeDetails as any).alID;
            else if ((animeDetails as any).al_id) anilistId = (animeDetails as any).al_id;
            else if ((animeDetails as any).anilist_id) anilistId = (animeDetails as any).anilist_id;
            else if ((animeDetails as any).mappings && (animeDetails as any).mappings.al) anilistId = (animeDetails as any).mappings.al;
          }
          
          if (!anilistId) {
            throw new Error("AniList ID not available for this anime on Zen server");
          }
          
          console.log(`Using AniList ID: ${anilistId} for Zen server`);
          
          // Get the episode data from zencloud.cc
          const episodeResponse = await fetch(
            `https://zencloud.cc/videos/raw?anilist_id=${anilistId}&episode=${episodeNumber}`
          );
          
          if (!episodeResponse.ok) {
            throw new Error(`Failed to fetch episode data: ${episodeResponse.status}`);
          }
          
          const episodeData = await episodeResponse.json();
          console.log("Zen episode data:", episodeData);
          
          if (!episodeData.data || episodeData.data.length === 0) {
            throw new Error(`Episode ${episodeNumber} not found on Zen server`);
          }
          
          const episodeInfo = episodeData.data[0];
          const accessId = episodeInfo.access_id;
          
          if (!accessId) {
            throw new Error("No access ID found for this episode on Zen server");
          }
          
          console.log(`Found access ID: ${accessId}`);
          
          // Use the wrapper URL with parameters and start_at support
          const audioParam = currentCategory === 'dub' ? '1' : '0'; // a=1 for dub, a=0 for sub
          let wrapperUrl = `https://anisurge.me/zen-player/${accessId}?a=${audioParam}&autoPlay=true`;
          
          // Add start_at parameter for resume functionality
          const resumePos = lastServerPosition > 0 ? lastServerPosition : resumePosition;
          if (resumePos > 0) {
            wrapperUrl += `&start_at=${Math.floor(resumePos)}`;
            console.log(`Adding start_at parameter: ${Math.floor(resumePos)} seconds`);
          }
          
          console.log('Zen server wrapper URL:', wrapperUrl);
          
          // Set the video sources using the wrapper URL
          sources = {
            sources: [{
              url: wrapperUrl,
              quality: 'HD',
              isM3U8: false, // This is an embedded player, not direct stream
              isZenEmbedded: true // Flag to indicate this is Zen's embedded player
            }],
            subtitles: [], // Subtitles are handled by the embedded player
            download: `https://zencloud.cc/d/${accessId}` // Add Zen server download URL
          };
          
          console.log(`Using Zen server embedded player with access ID: ${accessId}`);
        } catch (error) {
          console.error('Error fetching Zen sources:', error);
          throw new Error(`Failed to load Zen server: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      if (!sources || !sources.sources || sources.sources.length === 0) {
        const serverName = selectedServer === 'softSub' ? 'SoftSub' : selectedServer === 'hardSub' ? 'HardSub' : 'Zen';
        setVideoError(`No streaming sources available from ${serverName} server. Please try another server.`);
        setLoading(false);
        return; // Continue loading the page but with video error
      }

      // Process subtitles from the API response (but skip if already processed by embedded servers)
      if (selectedServer === 'softSub' && sources.tracks && Array.isArray(sources.tracks)) {
        const processedSubtitles = sources.tracks.map((track: any) => ({
          title: track.lang || 'Unknown',
          language: track.lang || 'Unknown',
          lang: track.lang || 'Unknown', // Add lang property for VideoPlayer compatibility
          url: track.url
        }));
        console.log('Setting subtitles from tracks:', processedSubtitles);
        setSubtitles(processedSubtitles);
      } else if (sources.subtitles && Array.isArray(sources.subtitles) && selectedServer !== 'zen' && selectedServer !== 'softSub') {
        const processedSubtitles = sources.subtitles.map((sub: any) => ({
          title: sub.kind || 'Unknown',
          language: sub.kind || 'Unknown',
          lang: sub.kind || 'Unknown', // Add lang property for VideoPlayer compatibility
          url: sub.url
        }));
        console.log('Setting subtitles:', processedSubtitles);
        setSubtitles(processedSubtitles);
      } else if ((selectedServer === 'zen' || selectedServer === 'softSub') && sources.subtitles && Array.isArray(sources.subtitles)) {
        // For embedded servers (Zen and SoftSub), subtitles are already properly parsed - just set them directly
        setSubtitles(sources.subtitles);
      }

      // Transform the sources data to match VideoResponse type
      const videoResponseData: VideoResponse = {
        headers: sources.headers || {},
        sources: sources.sources.map((source: any) => ({
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
        // If download is an array (from hardSub), store all options
        if (Array.isArray(sources.download) && sources.download.length > 0) {
          setDownloadOptions(sources.download);
          // Still set a default URL for compatibility
          setDownloadUrl(sources.download[0].url);
        } else {
          // For softSub (single URL)
          setDownloadUrl(sources.download);
          setDownloadOptions(null);
        }
      } else {
        setDownloadUrl(null);
        setDownloadOptions(null);
      }

      // Get the m3u8 or embed URL
      const videoSource = sources.sources[0];
      try {
        console.log('[Player] Stream URL (embed or m3u8):', videoSource?.url);
      } catch {}
      setVideoHeaders(sources.headers || {});

      // Extract qualities from m3u8
      if (videoSource.url.includes('.m3u8')) {
        const availableQualities = await extractQualities(videoSource.url, sources.headers);
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
      const serverName = selectedServer === 'softSub' ? 'SoftSub' : selectedServer === 'hardSub' ? 'HardSub' : 'Zen';
      setVideoError(`Failed to load episode from ${serverName} server. Please try another server or try again later.`);
    } finally {
      // Only set main loading to false if this is not a server change
      if (!isServerChange) {
        setLoading(false);
      }
      setIsChangingServer(false);
    }
  };

  // Add a useEffect to refetch when server changes
  useEffect(() => {
    if (!loading) {
      // Save current position before switching servers
      if (currentTime > 0) {
        setLastServerPosition(currentTime);
        console.log(`Saving position ${currentTime} before switching servers`);
      }
      fetchEpisodeData(true); // Pass true to indicate this is a server change
    }
  }, [selectedServer]);

  // Refetch when language mode changes and persist preference
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem('preferredLanguage', mode);
      } catch {}
      // Save position before switching language
      if (currentTime > 0) {
        setLastServerPosition(currentTime);
      }
      await fetchEpisodeData(false);
    })();
  }, [mode]);

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
        coverImage: data.image || data.image, // Map image to coverImage
        description: data.description,
        type: data.type,
        status: data.status,
        genres: data.genres
      };
      setAnimeInfo(processedData);
      
      // Fetch new server anime ID using AniList ID
      if ((data as any).alID) {
        try {
          const response = await fetch(`https://www.anisurge.me/api/anime/${(data as any).alID}`);
          const newServerData = await response.json();
          if (newServerData && newServerData.id) {
            setNewServerAnimeId(newServerData.id);
          }
        } catch (error) {
          console.error('Failed to fetch new server anime ID:', error);
        }
      }
      
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

  // Add this function near other event handlers
  const handleServerChange = (newServer: 'softSub' | 'hardSub' | 'zen') => {
    if (newServer === selectedServer) return;
    
    // Save current position before switching
    if (currentTime > 0) {
      setLastServerPosition(currentTime);
      console.log(`Saving position ${currentTime} before switching to ${newServer}`);
    }
    
    // Change server - the useEffect will handle fetching new data
    setSelectedServer(newServer);
  };

  // Add this check in handleVideoLoad to use lastServerPosition
  const handleVideoLoad = async () => {
    // Determine which position to use
    const positionToUse = lastServerPosition > 0 ? lastServerPosition : resumePosition;
    
    if (videoRef.current && positionToUse > 0 && !isVideoReady) {
      try {
        console.log(`handleVideoLoad: seeking to ${positionToUse} seconds`);
        // Add a delay to ensure the video is ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // First pause to ensure seeking works properly
        await videoRef.current.pauseAsync();
        
        // Then seek to the position
        await videoRef.current.setPositionAsync(positionToUse * 1000);
        
        // Finally play
        await videoRef.current.playAsync();
        
        setIsVideoReady(true);
        console.log('Video successfully seeked to resume position');
        
        // Reset lastServerPosition after using it
        if (lastServerPosition > 0) {
          setLastServerPosition(0);
        }
      } catch (err) {
        logger.error('Error seeking to position:', err as string);
        // Try again with a longer delay if it failed
        if (!isVideoReady) {
          setTimeout(async () => {
            try {
              if (videoRef.current) {
                await videoRef.current.setPositionAsync(positionToUse * 1000);
                await videoRef.current.playAsync();
                setIsVideoReady(true);
                
                // Reset lastServerPosition after using it
                if (lastServerPosition > 0) {
                  setLastServerPosition(0);
                }
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
    debounce(async (data: VideoProgress) => {
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
          const historyItem: WatchHistoryItem = {
            id: actualAnimeId,
            name: animeInfo.title || 'Unknown Anime',
            img: animeInfo.image || '',
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
          logger.debug('Saving history item:', JSON.stringify(historyItem));
          
          // Save progress to history
          await (addToHistory as (item: WatchHistoryItem) => Promise<void>)(historyItem);
          
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
      if (currentTime > 0 && duration > 0) {
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
          name: (animeInfo?.title || (animeInfo as any)?.info?.title || (title as string) || 'Unknown Anime') as string,
          img: (animeInfo?.image || (animeInfo as any)?.info?.image || '') as string,
          episodeId: typeof episodeId === 'string' ? episodeId : episodeId[0],
          episodeNumber: Number(episodeNumber),
          timestamp: now,
          progress: Number(currentTime), // Ensure it's a number
          duration: Number(duration), // Ensure it's a number
          lastWatched: now,
          subOrDub: mode
        });
      }

      // Stop media session when component unmounts
      if (mediaSessionActive) {
        mediaSessionService.stopMediaSession();
      }
    };
  }, [currentTime, duration, animeInfo, animeId, episodeId, episodeNumber, category, addToHistory, mediaSessionActive]);

  // Update media session when playback state changes
  useEffect(() => {
    if (mediaSessionActive && animeInfo) {
      const episodeTitleText = episodeTitle as string || `Episode ${episodeNumber}`;
      const animeTitleText = animeInfo.title || (title as string) || 'Unknown Anime';
      
      mediaSessionService.updateMediaSession({
        title: episodeTitleText,
        episodeTitle: episodeTitleText,
        animeTitle: animeTitleText,
        isPlaying: isPlaying,
        currentTime: currentTime,
        duration: duration,
        hasPrevious: currentEpisodeIndex > 0,
        hasNext: currentEpisodeIndex < episodes.length - 1,
      });
    }
  }, [mediaSessionActive, animeInfo, episodeTitle, episodeNumber, title, isPlaying, currentTime, duration, currentEpisodeIndex, episodes.length]);

  // Handle previous episode navigation
  const handlePreviousEpisode = useCallback(async () => {
    console.log('🔔 handlePreviousEpisode called, currentEpisodeIndex:', currentEpisodeIndex);
    console.log('🔔 isNavigating.current:', isNavigating.current);
    console.log('🔔 isFullscreen:', isFullscreen);
    
    if (isNavigating.current) {
      console.log('🔔 Already navigating, skipping');
      return;
    }
    
    if (currentEpisodeIndex > 0) {
      console.log('🔔 Navigating to previous episode');
      isNavigating.current = true;
      setIsNavigatingEpisode(true);
      
      const prevEpisode = episodes[currentEpisodeIndex - 1];
      console.log('🔔 Previous episode:', prevEpisode);
      
      // If in fullscreen, do seamless transition without any routing
      if (isFullscreen) {
        console.log('🔔 Seamless fullscreen transition to previous episode');
        
        // Update current episode index first
        setCurrentEpisodeIndex(currentEpisodeIndex - 1);
        
        // Reset video state for new episode
        setStreamingUrl(null);
        setVideoUrl(null);
        setVideoData(null);
        setIsVideoReady(false);
        setResumePosition(0);
        setLastServerPosition(0);
        
        // Fetch new episode data using the previous episode's ID
        await fetchEpisodeData(false, prevEpisode.id);
        
        // Reset navigation state
        isNavigating.current = false;
        setIsNavigatingEpisode(false);
        
        console.log('🔔 Seamless transition completed');
      } else {
        // Normal navigation for non-fullscreen mode
        router.push({
          pathname: "/anime/watch/[episodeId]",
          params: {
            episodeId: prevEpisode.id,
            animeId: animeId as string,
            episodeNumber: prevEpisode.number,
            title: animeInfo?.title || (title as string) || 'Unknown Anime',
            episodeTitle: prevEpisode.title || `Episode ${prevEpisode.number}`,
            category: mode,
            resumeTime: "0" // Force start from beginning
          }
        });
      }
    } else {
      console.log('🔔 No previous episode available');
    }
  }, [currentEpisodeIndex, episodes, router, animeId, animeInfo, title, category, isFullscreen, fetchEpisodeData]);

  // Handle next episode navigation
  const handleNextEpisode = useCallback(async () => {
    console.log('🔔 handleNextEpisode called, currentEpisodeIndex:', currentEpisodeIndex);
    console.log('🔔 episodes.length:', episodes.length);
    console.log('🔔 isNavigating.current:', isNavigating.current);
    console.log('🔔 isFullscreen:', isFullscreen);
    
    if (isNavigating.current) {
      console.log('🔔 Already navigating, skipping');
      return;
    }
    
    if (currentEpisodeIndex < episodes.length - 1) {
      console.log('🔔 Navigating to next episode');
      isNavigating.current = true;
      setIsNavigatingEpisode(true);
      
      const nextEpisode = episodes[currentEpisodeIndex + 1];
      console.log('🔔 Next episode:', nextEpisode);
      
      // If in fullscreen, do seamless transition without any routing
      if (isFullscreen) {
        console.log('🔔 Seamless fullscreen transition to next episode');
        
        // Update current episode index first
        setCurrentEpisodeIndex(currentEpisodeIndex + 1);
        
        // Reset video state for new episode
        setStreamingUrl(null);
        setVideoUrl(null);
        setVideoData(null);
        setIsVideoReady(false);
        setResumePosition(0);
        setLastServerPosition(0);
        
        // Fetch new episode data using the next episode's ID
        await fetchEpisodeData(false, nextEpisode.id);
        
        // Reset navigation state
        isNavigating.current = false;
        setIsNavigatingEpisode(false);
        
        console.log('🔔 Seamless transition completed');
      } else {
        // Normal navigation for non-fullscreen mode
        router.push({
          pathname: "/anime/watch/[episodeId]",
          params: {
            episodeId: nextEpisode.id,
            animeId: animeId as string,
            episodeNumber: nextEpisode.number,
            title: animeInfo?.title || (title as string) || 'Unknown Anime',
            episodeTitle: nextEpisode.title || `Episode ${nextEpisode.number}`,
            category: mode,
            resumeTime: "0" // Force start from beginning
          }
        });
      }
    } else {
      console.log('🔔 No next episode available');
    }
  }, [currentEpisodeIndex, episodes, router, animeId, animeInfo, title, category, isFullscreen, fetchEpisodeData]);

  // Set up notification listener
  useEffect(() => {
    console.log('🔔 Setting up notification listener with callbacks:', {
      hasPrevious: currentEpisodeIndex > 0,
      hasNext: currentEpisodeIndex < episodes.length - 1,
      currentEpisodeIndex,
      episodesLength: episodes.length
    });

    const notificationListener = mediaSessionService.setupNotificationListener(
      () => {
        console.log('🔔 Previous episode callback triggered');
        handlePreviousEpisode();
      },
      () => {
        console.log('🔔 Next episode callback triggered');
        handleNextEpisode();
      }
    );

    return () => {
      notificationListener.remove();
    };
  }, [handlePreviousEpisode, handleNextEpisode, currentEpisodeIndex, episodes.length]);

  // Periodic check to restore notification if it was dismissed
  useEffect(() => {
    if (!mediaSessionActive) return;

    const checkInterval = setInterval(async () => {
      const isActive = await mediaSessionService.checkNotificationStatus();
      if (!isActive && !notificationRestored) {
        console.log('Notification was dismissed, restoring...');
        const restored = await mediaSessionService.restoreNotification();
        if (restored) {
          setNotificationRestored(true);
          // Reset the flag after 5 seconds
          setTimeout(() => setNotificationRestored(false), 5000);
        }
      }
    }, 10000); // Check every 10 seconds

    return () => {
      clearInterval(checkInterval);
    };
  }, [mediaSessionActive, notificationRestored]);

  // Live time updates for notification (every 5 seconds)
  useEffect(() => {
    if (!mediaSessionActive || !animeInfo) return;

    const timeUpdateInterval = setInterval(() => {
      const episodeTitleText = episodeTitle as string || `Episode ${episodeNumber}`;
      const animeTitleText = animeInfo.title || (title as string) || 'Unknown Anime';
      
      mediaSessionService.updateMediaSession({
        title: episodeTitleText,
        episodeTitle: episodeTitleText,
        animeTitle: animeTitleText,
        isPlaying: isPlaying,
        currentTime: currentTime,
        duration: duration,
        hasPrevious: currentEpisodeIndex > 0,
        hasNext: currentEpisodeIndex < episodes.length - 1,
      });
    }, 5000); // Update every 5 seconds for live time

    return () => {
      clearInterval(timeUpdateInterval);
    };
  }, [mediaSessionActive, animeInfo, episodeTitle, episodeNumber, title, isPlaying, currentTime, duration, currentEpisodeIndex, episodes.length]);

  // Manual restore notification function
  const handleRestoreNotification = async () => {
    try {
      const restored = await mediaSessionService.restoreNotification();
      if (restored) {
        setNotificationRestored(true);
        setTimeout(() => setNotificationRestored(false), 3000);
      }
    } catch (error) {
      console.error('Failed to restore notification:', error);
    }
  };

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

  // Create stable onProgress callback
  const handleVideoProgress = useCallback(async (currentTime: number, videoDuration: number) => {
    // Update local state
    setCurrentTime(currentTime);
    setDuration(videoDuration);

    // Debug incoming progress
    try { console.log('[Progress] time:', currentTime, 'duration:', videoDuration); } catch {}

    // Save progress if we have valid data
    if (currentTime > 0 && videoDuration > 0) {
      const now = Date.now();

      // Save progress every 2 seconds or if position changed significantly
      if (now - lastProgressUpdateRef.current >= 2000 || Math.abs(currentTime - lastProgressValueRef.current) > 5) {
        // Build safe history item even if animeInfo hasn't loaded yet
        const safeTitle = (animeInfo?.title || (title as string) || 'Unknown Anime') as string;
        const safeImage = (animeInfo?.image || (animeInfo as any)?.info?.image || '') as string;
        const epId = (typeof episodeId === 'string' ? episodeId : episodeId[0]) as string;
        const epNum = Number(episodeNumber) || 0;

        // Resolve actual anime id if it's missing in params
        let actualAnimeId = animeId as string;
        if ((!actualAnimeId || typeof actualAnimeId !== 'string') && typeof episodeId === 'string') {
          const withoutCategory = (episodeId as string).split('$category=')[0];
          if (withoutCategory.includes('$episode$')) {
            actualAnimeId = withoutCategory.split('$episode$')[0];
          } else if (withoutCategory.includes('$ep=')) {
            actualAnimeId = withoutCategory.split('$ep=')[0];
          } else {
            actualAnimeId = (episodeId as string).split('$')[0];
          }
        }

        const historyItem: WatchHistoryItem = {
          id: actualAnimeId,
          name: safeTitle,
          img: safeImage,
          episodeId: epId,
          episodeNumber: epNum,
          timestamp: now,
          progress: Math.max(0, Math.floor(currentTime)),
          duration: Math.max(0, Math.floor(videoDuration)),
          lastWatched: now,
          subOrDub: mode
        };

        try {
          console.log('[History] saving progress:', historyItem);
          await (addToHistory as (item: WatchHistoryItem) => Promise<void>)(historyItem);
          lastProgressUpdateRef.current = now;
          lastProgressValueRef.current = currentTime;
        } catch (err) {
          console.error('[History] save failed:', err);
        }
      }
    } else {
      try { console.log('[Progress] Skipped save due to invalid times'); } catch {}
    }
  }, [animeInfo, title, animeId, episodeId, episodeNumber, mode, addToHistory]);

  // Memoize video props
  const videoPlayerProps = useMemo(() => {
    // Get current episode info for display
    const currentEpisode = episodes[currentEpisodeIndex];
    const currentEpisodeTitle = currentEpisode?.title || `Episode ${currentEpisode?.number || episodeNumber}`;
    
    return {
      source: { 
        uri: streamingUrl || '',
        headers: videoHeaders,
        isZenEmbedded: selectedServer === 'zen' || selectedServer === 'softSub', // Flag for embedded players (Zen and SoftSub)
        textTracks: subtitles.length > 0 ? subtitles
          .filter(track => {
            const langToCheck = track.lang || track.language || track.title || '';
            return !langToCheck.toLowerCase().includes('thumbnails');
          })
          .map((track, index) => ({
            title: track.lang || track.language || track.title || 'Unknown',
            language: (track.lang || track.language || track.title || 'en').toLowerCase().substring(0, 2),
            type: 'text/vtt',
            uri: track.url,
          })) : []
      },
      title: currentEpisodeTitle,
      initialPosition: lastServerPosition > 0 ? lastServerPosition : resumePosition, // Use lastServerPosition if available, otherwise resumePosition
      rate: playbackSpeed,
      onPlaybackRateChange: handlePlaybackSpeedChange,
      onProgress: handleVideoProgress,
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
      // Episode navigation props
      onPreviousEpisode: handlePreviousEpisode,
      onNextEpisode: handleNextEpisode,
      hasPreviousEpisode: currentEpisodeIndex > 0,
      hasNextEpisode: currentEpisodeIndex < episodes.length - 1
    };
  }, [
    streamingUrl,
    videoHeaders,
    episodes,
    currentEpisodeIndex,
    episodeNumber,
    resumePosition,
    lastServerPosition,
    playbackSpeed,
    handleVideoProgress,
    isFullscreen,
    playerDimensions,
    videoData,
    isQualityChanging,
    savedPosition,
    qualities,
    selectedQuality,
    subtitles,
    handleSkipIntro,
    handleSkipOutro,
    selectedServer,
    handlePreviousEpisode,
    handleNextEpisode
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
        const timeoutId = setTimeout(() => {
          //console.log('[DEBUG] Quality change: 2.9 second timeout reached, making button clickable again');
          setIsQualityChanging(false);
        }, 2900);
        
        // Clean up timeout if component unmounts
        return () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        };
      } catch (error) {
        console.error('[DEBUG] Error during quality change:', error);
        // Even on error, wait a moment before making the button clickable again
        // to prevent rapid clicking causing multiple errors
        const timeoutId = setTimeout(() => {
          setIsQualityChanging(false);
        }, 1000);
        
        // Clean up timeout if component unmounts
        return () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        };
      }
    }
  };

  // Update the useEffect that initializes filtered episodes
  useEffect(() => {
    const categoryFilteredEpisodes = episodes.filter(ep => mode === 'dub' ? ep.isDubbed : ep.isSubbed);
    const batchEpisodes = getEpisodesForBatch(categoryFilteredEpisodes, selectedBatch);
    setFilteredEpisodes(batchEpisodes);
  }, [episodes, episodeId, mode, selectedBatch]);

  // Update the search handler to maintain sub/dub filtering and batch selection
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const categoryFilteredEpisodes = episodes.filter(ep => mode === 'dub' ? ep.isDubbed : ep.isSubbed);
    
    if (!query.trim()) {
      const batchEpisodes = getEpisodesForBatch(categoryFilteredEpisodes, selectedBatch);
      setFilteredEpisodes(batchEpisodes);
      return;
    }
    
    const filtered = categoryFilteredEpisodes
      .filter(episode => 
        episode.number.toString().includes(query) ||
        episode.title?.toLowerCase().includes(query.toLowerCase())
      );
    setFilteredEpisodes(filtered);
  };

  // Add this useEffect to scroll to current episode when list changes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (episodeListRef.current && filteredEpisodes.length > 0) {
      // Small delay to ensure the list has rendered
      timeoutId = setTimeout(() => {
        episodeListRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [filteredEpisodes]);

  // Consolidated cleanup effect
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
  }, [navigation]);

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

  // Reset navigation state when component mounts or episodeId changes
  useEffect(() => {
    isNavigating.current = false;
  }, [episodeId]);

  // Restore fullscreen mode after episode navigation
  useEffect(() => {
    if (wasFullscreenBeforeNavigation && !isNavigatingEpisode && videoData) {
      console.log('🔔 Restoring fullscreen mode after navigation');
      
      // Small delay to ensure video is loaded
      const timer = setTimeout(async () => {
        try {
          setIsFullscreen(true);
          
          // Ensure orientation is locked to landscape
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
          console.log('🔔 Fullscreen restored and orientation locked');
          
          // Reset the flag
          setWasFullscreenBeforeNavigation(false);
          setIsNavigatingEpisode(false);
        } catch (error) {
          console.error('🔔 Failed to restore fullscreen:', error);
          setWasFullscreenBeforeNavigation(false);
          setIsNavigatingEpisode(false);
        }
      }, 1000); // 1 second delay to ensure video is ready
      
      return () => clearTimeout(timer);
    }
  }, [wasFullscreenBeforeNavigation, isNavigatingEpisode, videoData]);

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
      const timeoutId = setTimeout(() => {
        handleSeek(resumePosition);
        setIsVideoReady(true);
      }, 300);
      
      // Clean up timeout if component unmounts
      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
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

  // Fetch new server download URL for the current episode
  useEffect(() => {
    let isMounted = true;
    
    const fetchNewServerDownloadUrl = async () => {
      setNewServerDownloadUrl(null);
      if (!newServerAnimeId || !episodeNumber) return;
      setCheckingNewServerDownload(true);
      try {
        const response = await fetch(`https://anisurge.me/api/server/${newServerAnimeId}-${episodeNumber}`);
        const data = await response.json();
        if (isMounted && data.download_url) {
          setNewServerDownloadUrl(data.download_url);
        } else if (isMounted) {
          setNewServerDownloadUrl(null);
        }
      } catch (err) {
        if (isMounted) {
          setNewServerDownloadUrl(null);
        }
      } finally {
        if (isMounted) {
          setCheckingNewServerDownload(false);
        }
      }
    };
    
    fetchNewServerDownloadUrl();
    
    return () => {
      isMounted = false;
    };
  }, [newServerAnimeId, episodeNumber]);

  // Update the handleDownload function
  const handleDownload = useCallback(async () => {
    // For Zen server - open directly in browser
    if (selectedServer === 'zen' && downloadUrl) {
      try {
        await Linking.openURL(downloadUrl);
        return;
      } catch (error) {
        console.error('Failed to open download URL in browser:', error);
        // Fall back to WebView if browser fails
        setShowDownloadPopup(true);
        return;
      }
    }
    
    // For HardSub server with multiple download options
    if (selectedServer === 'hardSub' && downloadOptions && downloadOptions.length > 0) {
      setShowDownloadOptions(true);
      return;
    }
    
    // For SoftSub server or fallback to old behavior
    if (newServerDownloadUrl) {
      setDownloadUrl(newServerDownloadUrl);
      setShowDownloadPopup(true);
      return;
    }
    
    // Legacy fallback
    if (videoData?.download) {
      setDownloadUrl(videoData.download);
      setShowDownloadPopup(true);
    }
  }, [videoData, newServerDownloadUrl, selectedServer, downloadOptions, downloadUrl]);

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
          headerShown: !isFullscreen ? 'true' : 'false'
        });
      });
    }
  }, [isFullscreen]);

  // Define a VideoErrorDisplay component
  const VideoErrorDisplay = React.memo(({ error, onRetry }: { error: string, onRetry: () => void }) => {
    return (
      <View style={styles.videoErrorContainer}>
        <View style={styles.videoErrorContent}>
          <MaterialIcons name="error-outline" size={48} color="#f4511e" />
          <Text style={styles.videoErrorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen 
          options={{
            headerShown: true,
            title: 'Loading...',
            statusBarStyle: 'light',
            statusBarTranslucent: true,
            headerStyle: {
              backgroundColor: '#000',
            },
            headerTintColor: '#fff',
          }} 
        />
        <SkeletonLoader />
      </View>
    );
  }

  // We're no longer showing error screen for the whole page, so remove this check
  // and continue with the normal page render

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
          { backgroundColor: hasBackgroundMedia ? 'transparent' : theme.colors.background },
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
          {/* Show video player or error based on videoError state */}
          {videoError ? (
            <View style={[styles.video, { backgroundColor: '#111' }]}>
              <VideoErrorDisplay 
                error={videoError} 
                onRetry={() => {
                  setRetryCount(0);
                  setVideoError(null);
                  fetchEpisodeData(false); // Not a server change, so pass false
                }} 
              />
            </View>
          ) : (
            <VideoPlayer {...videoPlayerProps} />
          )}
          
          {!isFullscreen && (
            <>
              {/* Clean Action Buttons - Replace "You are watching Episode X" */}
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.actionButton, currentEpisodeIndex === 0 && styles.disabledButton]}
                  onPress={handlePreviousEpisode}
                  disabled={currentEpisodeIndex === 0}
                >
                  <MaterialIcons name="skip-previous" size={20} color={currentEpisodeIndex === 0 ? "#666" : "#fff"} />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={handleDownload}
                >
                  <MaterialIcons name="file-download" size={20} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => setIsAnimeInfoVisible(!isAnimeInfoVisible)}
                >
                  <MaterialIcons name="info" size={20} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={handleShowComments}
                >
                  <MaterialIcons name="comment" size={20} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionButton, notificationRestored && styles.restoredButton]}
                  onPress={handleRestoreNotification}
                >
                  <MaterialIcons 
                    name={notificationRestored ? "check" : "notifications"} 
                    size={20} 
                    color={notificationRestored ? "#4CAF50" : "#fff"} 
                  />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionButton, currentEpisodeIndex === episodes.length - 1 && styles.disabledButton]}
                  onPress={handleNextEpisode}
                  disabled={currentEpisodeIndex === episodes.length - 1}
                >
                  <MaterialIcons name="skip-next" size={20} color={currentEpisodeIndex === episodes.length - 1 ? "#666" : "#fff"} />
                </TouchableOpacity>
              </View>

              {/* Clean Server Selector */}
              <View style={styles.serverSelectorClean}>
                <Text style={styles.serverSelectorLabel}>Server:</Text>
                <View style={styles.serverButtonsClean}>
                  <TouchableOpacity
                    style={[styles.serverButtonClean, selectedServer === 'softSub' && styles.selectedServerButtonClean]}
                    onPress={() => handleServerChange('softSub')}
                    disabled={isChangingServer}
                  >
                    <Text style={[styles.serverButtonTextClean, selectedServer === 'softSub' && styles.selectedServerTextClean]}>
                      SoftSub
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.serverButtonClean, selectedServer === 'zen' && styles.selectedServerButtonClean]}
                    onPress={() => handleServerChange('zen')}
                    disabled={isChangingServer}
                  >
                    <Text style={[styles.serverButtonTextClean, selectedServer === 'zen' && styles.selectedServerTextClean]}>
                      Zen
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.serverButtonClean, selectedServer === 'hardSub' && styles.selectedServerButtonClean]}
                    onPress={() => handleServerChange('hardSub')}
                    disabled={isChangingServer}
                  >
                    <Text style={[styles.serverButtonTextClean, selectedServer === 'hardSub' && styles.selectedServerTextClean]}>
                      HardSub
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              

              {/* Anime Info Section */}
              {isAnimeInfoVisible && (
                <AnimeInfo 
                  animeInfo={animeInfo} 
                  onNavigateToAnime={() => {
                    router.push({
                      pathname: "/anime/[id]",
                      params: { id: animeId }
                    });
                  }}
                />
              )}

              {/* Clean Episode Grid */}
              <View style={styles.episodeGridContainer}>
                <View style={styles.episodeGridHeader}>
                  <TouchableOpacity 
                    style={styles.episodeRangeContainer}
                    onPress={() => setShowLangDropdown(!showLangDropdown)}
                  >
                    <Text style={styles.episodeRangeText}>{mode === 'dub' ? 'DUB' : 'SUB'}</Text>
                    <MaterialIcons name={showLangDropdown ? "keyboard-arrow-up" : "keyboard-arrow-right"} size={16} color="#666" />
                  </TouchableOpacity>
                  <View style={styles.episodeGridControls}>
                    <TouchableOpacity 
                      style={styles.episodeRangeContainer}
                      onPress={() => setShowBatchDropdown(!showBatchDropdown)}
                    >
                      <MaterialIcons name="list" size={16} color="#666" />
                      <Text style={styles.episodeRangeText}>
                        {(() => {
                          const batchStart = (selectedBatch - 1) * 50 + 1;
                          const batchEnd = Math.min(selectedBatch * 50, episodes.length);
                          return `BATCH ${selectedBatch}: ${batchStart}-${batchEnd}`;
                        })()}
                      </Text>
                      <MaterialIcons 
                        name={showBatchDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                        size={16} 
                        color="#666" 
                      />
                    </TouchableOpacity>
                    <View style={styles.episodeGridSearch}>
                      <MaterialIcons name="search" size={16} color="#666" />
                      <TextInput
                        style={styles.episodeGridSearchInput}
                        placeholder="Number of Ep"
                        placeholderTextColor="#666"
                        value={searchQuery}
                        onChangeText={handleSearch}
                      />
                    </View>
                  </View>
                </View>

              {/* Language Dropdown */}
              {showLangDropdown && (
                <View style={styles.batchDropdownContainer}>
                  <ScrollView style={styles.batchDropdownScroll} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity
                      style={styles.batchDropdownItem}
                      onPress={() => {
                        setMode(mode === 'dub' ? 'sub' : 'dub');
                        setShowLangDropdown(false);
                      }}
                    >
                      <Text style={styles.batchDropdownText}>
                        {mode === 'dub' ? 'SUB' : 'DUB'}
                      </Text>
                      <MaterialIcons name="keyboard-arrow-right" size={16} color="#666" />
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              )}

              {/* Batch Dropdown */}
                {showBatchDropdown && (
                  <View style={styles.batchDropdownContainer}>
                    <ScrollView style={styles.batchDropdownScroll} showsVerticalScrollIndicator={false}>
                      {getAvailableBatches(episodes).map((batchNumber) => {
                        const batchStart = (batchNumber - 1) * 50 + 1;
                        const batchEnd = Math.min(batchNumber * 50, episodes.length);
                        const isSelected = batchNumber === selectedBatch;
                        
                        return (
                          <TouchableOpacity
                            key={batchNumber}
                            style={[
                              styles.batchDropdownItem,
                              isSelected && styles.selectedBatchDropdownItem
                            ]}
                            onPress={() => {
                              setSelectedBatch(batchNumber);
                              setShowBatchDropdown(false);
                            }}
                          >
                            <Text style={[
                              styles.batchDropdownText,
                              isSelected && styles.selectedBatchDropdownText
                            ]}>
                              Batch {batchNumber}: {batchStart}-{batchEnd}
                            </Text>
                            {isSelected && (
                              <MaterialIcons name="check" size={16} color="#f4511e" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                <ScrollView 
                  style={styles.episodeGridScroll}
                  contentContainerStyle={styles.episodeGridContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.episodeGrid}>
                    {filteredEpisodes.map((episode) => (
                      <TouchableOpacity
                        key={episode.id}
                        style={[
                          styles.episodeGridItem,
                          episode.id === episodeId && styles.currentEpisodeGridItem
                        ]}
                        onPress={() => {
                          router.push({
                            pathname: "/anime/watch/[episodeId]",
                            params: {
                              episodeId: episode.id,
                              animeId: animeId,
                              episodeNumber: episode.number,
                              title: episode.title || `Episode ${episode.number}`,
                              category: category,
                              resumeTime: "0"
                            }
                          });
                        }}
                      >
                        <Text style={[
                          styles.episodeGridNumber,
                          episode.id === episodeId && styles.currentEpisodeGridNumber
                        ]}>
                          {episode.number}
                        </Text>
                        {episode.id === episodeId && (
                          <View style={styles.currentEpisodeIndicator}>
                            <MaterialIcons name="play-arrow" size={12} color="#f4511e" />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </>
          )}
        </View>
      </VideoPlayerContext.Provider>
      
      {/* Keep the original WebView download popup for SoftSub */}
      <DownloadPopup
        visible={showDownloadPopup}
        onClose={() => setShowDownloadPopup(false)}
        downloadUrl={downloadUrl}
      />
      
      {/* Add the new download quality options modal */}
      <DownloadQualityModal
        visible={showDownloadOptions}
        onClose={() => setShowDownloadOptions(false)}
        downloadOptions={downloadOptions}
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
  serverButtonOld: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#333',
    borderRadius: 8,
    marginRight: 8,
  },
  selectedButtonOld: {
    backgroundColor: '#f4511e',
  },
  serverTextOld: {
    color: '#fff',
    fontSize: 14,
  },
  selectedTextOld: {
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
  episodeListOld: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 8,
  },
  episodeListScrollOld: {  // Rename to avoid duplicate
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
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  currentEpisodeCard: {
    backgroundColor: '#2a2a2a',
    borderColor: '#f4511e33',
    borderWidth: 1,
  },
  pressedEpisodeCard: {
    opacity: 0.7,
  },
  fillerEpisodeCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#f4511e',
  },
  episodeGradient: {
    width: '100%',
  },
  episodeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  episodeNumberContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  currentEpisodeNumberContainer: {
    backgroundColor: '#f4511e11',
    borderColor: '#f4511e',
  },
  currentEpisodeNumber: {
    color: '#f4511e',
    fontWeight: '700',
  },
  currentEpisodeTitle: {
    color: '#fff',
    opacity: 1,
    fontWeight: '600',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  dubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF5011',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  dubBadgeText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  fillerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4511e11',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  fillerBadgeText: {
    color: '#f4511e',
    fontSize: 12,
    fontWeight: '600',
  },
  episodeRightIcon: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
  animeInfoToggle: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  animeInfoToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  animeInfoToggleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Add new skeleton styles
  skeletonContainer: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  skeletonVideo: {
    width: '100%',
    aspectRatio: 16/9,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginBottom: 16,
  },
  skeletonControls: {
    marginBottom: 16,
  },
  skeletonControlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  skeletonControlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
  },
  skeletonAnimeInfo: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  skeletonAnimeInfoHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  skeletonAnimeImage: {
    width: 100,
    height: 150,
    backgroundColor: '#222',
    borderRadius: 8,
  },
  skeletonAnimeDetails: {
    flex: 1,
    gap: 8,
  },
  skeletonTitle: {
    height: 24,
    backgroundColor: '#222',
    borderRadius: 4,
    width: '80%',
  },
  skeletonSubtitle: {
    height: 16,
    backgroundColor: '#222',
    borderRadius: 4,
    width: '60%',
  },
  skeletonEpisodesList: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  skeletonEpisodesHeader: {
    height: 24,
    backgroundColor: '#222',
    borderRadius: 4,
    width: '40%',
    marginBottom: 8,
  },
  skeletonEpisodeItem: {
    height: 64,
    backgroundColor: '#222',
    borderRadius: 8,
  },
  // Add new styles for video error display
  videoErrorContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  videoErrorContent: {
    alignItems: 'center',
    padding: 20,
    width: '80%',
    maxWidth: 320,
  },
  videoErrorText: {
    color: '#fff',
    textAlign: 'center',
    marginVertical: 16,
    fontSize: 16,
  },
  // Add styles for server selector
  serverSelectorContainer: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  serverSelectorTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  serverButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  selectedServerButtonOld: {
    backgroundColor: '#f4511e',
  },
  loadingServerButtonOld: {
    opacity: 0.7,
  },
  serverButtonTextOld: {
    color: '#999',
    fontWeight: '600',
  },
  selectedServerButtonTextOld: {
    color: '#fff',
  },
  serverButtonLoaderOld: {
    marginLeft: 8,
  },
  qualityOptionsContainer: {
    padding: 16,
    maxHeight: 400,
  },
  qualityOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  qualityOptionText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 16,
    flex: 1,
  },
  modalFooter: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  modalFooterText: {
    color: '#999',
    fontSize: 14,
  },
  // New clean UI styles
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#2a2a2a',
    minWidth: 40,
  },
  disabledButton: {
    backgroundColor: '#1a1a1a',
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  disabledText: {
    color: '#666',
  },
  serverSelectorClean: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  serverSelectorLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 12,
  },
  serverButtonsClean: {
    flexDirection: 'row',
    gap: 8,
  },
  serverButtonClean: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#2a2a2a',
  },
  selectedServerButtonClean: {
    backgroundColor: '#f4511e',
  },
  serverButtonTextClean: {
    color: '#999',
    fontSize: 12,
    fontWeight: '500',
  },
  selectedServerTextClean: {
    color: '#fff',
  },
  episodeGridContainer: {
    backgroundColor: 'rgba(26, 26, 26, 0.5)',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  episodeGridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  episodeGridTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  episodeGridControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  episodeRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#2a2a2a',
  },
  episodeRangeText: {
    color: '#666',
    fontSize: 12,
  },
  episodeGridSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    width: 100,
  },
  episodeGridSearchInput: {
    color: '#fff',
    fontSize: 10,
    paddingHorizontal: 4,
    flex: 1,
  },
  episodeGridScroll: {
    maxHeight: 300,
  },
  episodeGridContent: {
    paddingBottom: 80, // increased to prevent overlap with bottom controls/nav
  },
  episodeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  episodeGridItem: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  currentEpisodeGridItem: {
    backgroundColor: '#f4511e',
  },
  episodeGridNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  currentEpisodeGridNumber: {
    color: '#fff',
    fontWeight: '700',
  },
  currentEpisodeIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Batch dropdown styles
  batchDropdownContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    maxHeight: 120,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  batchDropdownScroll: {
    maxHeight: 120,
  },
  batchDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  selectedBatchDropdownItem: {
    backgroundColor: '#f4511e11',
  },
  batchDropdownText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedBatchDropdownText: {
    color: '#f4511e',
    fontWeight: '600',
  },
  restoredButton: {
    backgroundColor: '#4CAF5011',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
});
