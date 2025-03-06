import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Dimensions, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
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

// Update the VideoPlayer component
const VideoPlayer = React.forwardRef<VideoRef, VideoPlayerProps>((props, ref) => {
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);

  // Add control timeout
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showControls && isPlaying) {
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [showControls, isPlaying]);

  // Memoize handlers to prevent unnecessary re-renders
  const handleControlsPress = useCallback(() => {
    setShowControls(!showControls);
  }, [showControls]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
    if (props.onPlayPause) {
      props.onPlayPause();
    }
  }, [isPlaying, props.onPlayPause]);

  const handleProgress = useCallback((data: OnProgressData) => {
    setCurrentTime(data.currentTime);
    setDuration(data.seekableDuration);
    
    // Only call onProgress every 5 seconds
    if (Math.floor(data.currentTime) % 5 === 0) {
      if (props.onProgress) {
        props.onProgress(data);
      }
    }
  }, [props.onProgress]);

  return (
    <View style={styles.videoWrapper}>
      <Video
        ref={ref}
        {...props}
        style={styles.video}
        paused={!isPlaying}
        onProgress={handleProgress}
        onBuffer={({isBuffering}) => setIsBuffering(isBuffering)}
      />

      <TouchableOpacity 
        activeOpacity={1}
        onPress={handleControlsPress}
        style={StyleSheet.absoluteFill}
      >
        {showControls && (
          <View style={styles.controlsOverlay}>
            <View style={styles.controlsRow}>
              <TouchableOpacity onPress={handlePlayPause} style={styles.controlButton}>
                <MaterialIcons 
                  name={isPlaying ? "pause" : "play-arrow"} 
                  size={32} 
                  color="white" 
                />
              </TouchableOpacity>
              
              <Text style={styles.timeText}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Text>

              <Slider
                style={styles.slider}
                value={currentTime}
                maximumValue={duration}
                minimumValue={0}
                onValueChange={(value) => {
                  if (props.onSeek) {
                    props.onSeek(value);
                  }
                }}
                minimumTrackTintColor="#f4511e"
                maximumTrackTintColor="rgba(255,255,255,0.5)"
                thumbTintColor="#f4511e"
              />
            </View>
          </View>
        )}

        {isBuffering && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#f4511e" />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
});

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
          <Text style={styles.episodeName} numberOfLines={1}>
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

export default function WatchAnime() {
  const { episodeId, animeId, episodeNumber, title, category } = useLocalSearchParams();
  const videoRef = useRef<VideoRef>(null);
  const [servers, setServers] = useState<{ sub: Server[], dub: Server[] }>({ sub: [], dub: [] });
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
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
      // Set initial orientation to portrait
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
    
    setupOrientation();
    
    // Cleanup function to unlock orientation when component unmounts
    return () => {
      ScreenOrientation.unlockAsync();
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

      console.log('Episode ID:', episodeId);

      const sources = await animeAPI.getEpisodeSources(
        episodeId as string, 
        category === 'dub'
      );
      
      console.log('API Response:', sources);

      if (!sources || !sources.sources || sources.sources.length === 0) {
        throw new Error('No streaming sources available');
      }

      // Set video URL from first source
      const videoSource = sources.sources[0];
      setVideoUrl(videoSource.url);
      setVideoHeaders(sources.headers);
      setStreamingUrl(videoSource.url);  // For compatibility

    } catch (error) {
      console.error('Error fetching episode:', error);
      setError('Failed to load episode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnimeInfo = async () => {
    try {
      const data = await animeAPI.getAnimeDetails(animeId as string);
      setAnimeInfo(data);
      
      if (data.episodes) {
        setEpisodes(data.episodes);
        const index = data.episodes.findIndex(ep => ep.id === episodeId);
        setCurrentEpisodeIndex(index);
      }
    } catch (error) {
      console.error('Error fetching anime info:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleVideoLoad = async () => {
    if (videoRef.current && resumePosition > 0 && !isVideoReady) {
      try {
        videoRef.current.seek(resumePosition);
        setIsVideoReady(true);
      } catch (err) {
        console.error('Error seeking to position:', err);
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
          duration: newDuration
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
      router.replace({
        pathname: "/anime/watch/[episodeId]",
        params: {
          episodeId: nextEpisode.episodeId,
          animeId: animeId as string,
          episodeNumber: nextEpisode.episodeNo,
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
    
    // Try next server if available
    const currentServerList = category === 'dub' ? servers.dub : servers.sub;
    const currentIndex = currentServerList.findIndex(s => s.serverId === selectedServer?.serverId);
    const nextServer = currentServerList[currentIndex + 1];
    
    if (nextServer && retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setSelectedServer(nextServer);
      setStreamingUrl(null); // Clear current URL to trigger new load
    } else {
      setError('Video playback failed. Please try refreshing the page.');
    }
  };

  const handleFullscreen = async () => {
    if (isFullscreen) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      setIsFullscreen(false);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      setIsFullscreen(true);
    }
  };

  const handleProgress = (data: OnProgressData) => {
    setCurrentTime(data.currentTime);
    setDuration(data.seekableDuration);
    
    // Save progress every 5 seconds
    if (Math.floor(data.currentTime) % 5 === 0) {
      // Save to watch history
      if (animeInfo) {
        addToHistory({
          animeId: animeId as string,
          episodeId: episodeId as string,
          timestamp: data.currentTime,
          duration: data.seekableDuration
        });
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
        console.error('Error fetching video:', error);
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
  const handleSeek = (value: number) => {
    if (videoRef.current) {
      videoRef.current.seek(value);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Update video props
  const videoProps = {
    source: { 
      uri: videoUrl,
      headers: videoHeaders
    },
    rate: playbackSpeed,
    paused: !isPlaying,
    resizeMode: "contain",
    onProgress: handleProgress,
    onBuffer: ({ isBuffering }: { isBuffering: boolean }) => {
      setIsBuffering(isBuffering);
    },
    onError: (error: any) => {
      console.error('Video playback error:', error);
      setError('Video playback failed');
      setLoading(false);
    },
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
    onFullscreen: handleFullscreen
  };

  console.log('Rendering video with:', {
    streamingUrl,
    subtitleUrl: subtitles[0]?.uri,
    selectedServer
  });

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
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        {videoUrl && (
          <VideoPlayer
            ref={videoRef}
            style={styles.video}
            {...videoProps}
          />
        )}
      </View>

      <ScrollView style={styles.controls}>
        {/* Server Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servers</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(category === 'dub' ? servers.dub : servers.sub).map((server) => (
              <TouchableOpacity
                key={server.serverId}
                style={[
                  styles.serverButton,
                  selectedServer?.serverId === server.serverId && styles.selectedButton
                ]}
                onPress={() => setSelectedServer(server)}
              >
                <Text style={[
                  styles.serverText,
                  selectedServer?.serverId === server.serverId && styles.selectedText
                ]}>
                  {server.serverName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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

        {episodes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Episodes</Text>
            <EpisodeList
              episodes={episodes}
              currentEpisodeId={episodeId}
              onEpisodePress={(episode) => {
                router.replace({
                  pathname: "/anime/watch/[episodeId]",
                  params: {
                    episodeId: episode.episodeId,
                    animeId: animeId as string,
                    episodeNumber: episode.episodeNo,
                    title: episode.title,
                    category: category
                  }
                });
              }}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    width: width,
    height: width * (9/16),
    backgroundColor: '#000',
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlButton: {
    padding: 8,
    marginRight: 16,
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
  titleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  video: {
    flex: 1,
  },
  videoFullscreen: {
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
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
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
    fontSize: 14,
    fontWeight: 'bold',
  },
  episodeName: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
}); 