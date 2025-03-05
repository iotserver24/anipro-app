import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Dimensions, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Video, AVPlaybackStatus, ResizeMode, VideoFullscreenUpdate } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useWatchHistoryStore } from '../../../store/watchHistoryStore';
import * as ScreenOrientation from 'expo-screen-orientation';

type Server = {
  serverName: string;
  serverId: number;
};

type StreamSource = {
  url: string;
  isM3U8: boolean;
  quality?: string;
};

type Subtitle = {
  url: string;
  lang: string;
};

type Progress = {
  currentTime: number;
  playableDuration: number;
  seekableDuration: number;
};

type Episode = {
  episodeId: string;
  episodeNo: number;
  name: string;
  filler: boolean;
};

// Add VideoPlayerProps type definition
type VideoPlayerProps = {
  source: {
    uri: string;
    headers?: any;
    type?: string;
  };
  style?: any;
  paused?: boolean;
  subtitleUrl?: string;
  onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void;
  isLoading?: boolean;
  isPlaying?: boolean;
  onError?: (error: any) => void;
};

const VideoPlayer = React.forwardRef((props: VideoPlayerProps, ref) => {
  const handleFullscreenUpdate = async ({ fullscreenUpdate }: { fullscreenUpdate: VideoFullscreenUpdate }) => {
    try {
      if (fullscreenUpdate === VideoFullscreenUpdate.PLAYER_WILL_PRESENT) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
      } else if (fullscreenUpdate === VideoFullscreenUpdate.PLAYER_WILL_DISMISS) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      }
    } catch (error) {
      console.error('Error updating screen orientation:', error);
    }
  };

  // Create textTracks array with proper structure
  const textTracks = props.subtitleUrl ? [{
    uri: props.subtitleUrl,
    language: "en",
    title: "English",
    type: "text/vtt",
  }] : [];

  return (
    <View style={styles.videoWrapper}>
      <Video
        ref={ref}
        source={{
          uri: props.source.uri,
          headers: props.source.headers,
          type: props.source.type
        }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        useNativeControls
        shouldPlay={!props.paused}
        onPlaybackStatusUpdate={props.onPlaybackStatusUpdate}
        onFullscreenUpdate={handleFullscreenUpdate}
        presentFullscreenPlayer
        textTracks={textTracks}
        selectedTextTrack={{
          type: "title",
          value: "English"
        }}
        onLoad={(status) => {
          console.log('Video loaded with status:', {
            duration: status.durationMillis,
            textTracks: status.textTracks,
            selectedTrack: status.selectedTextTrack
          });
        }}
        onError={(error) => {
          console.log('Video Error:', error);
          props.onError && props.onError(error);
        }}
      />
      {props.isLoading && !props.isPlaying && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#f4511e" />
        </View>
      )}
    </View>
  );
});

export default function WatchAnime() {
  const { episodeId, animeId, episodeNumber, title, category } = useLocalSearchParams();
  const videoRef = useRef(null);
  const [servers, setServers] = useState<{ sub: Server[], dub: Server[] }>({ sub: [], dub: [] });
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [streamingUrl, setStreamingUrl] = useState<string | null>(null);
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState<Progress>({
    currentTime: 0,
    playableDuration: 0,
    seekableDuration: 0
  });
  const [showControls, setShowControls] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);
  const controlsTimeout = useRef<NodeJS.Timeout>();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const { addToHistory, updateProgress } = useWatchHistoryStore();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [animeInfo, setAnimeInfo] = useState<any>(null);
  const [lastSaveTime, setLastSaveTime] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [resumePosition, setResumePosition] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    fetchServers();
  }, [episodeId]);

  useEffect(() => {
    if (selectedServer) {
      fetchStreamingSources();
    }
  }, [selectedServer]);

  useEffect(() => {
    fetchEpisodes();
  }, [animeId]);

  useEffect(() => {
    if (animeId) {
      fetchAnimeInfo();
    }
  }, [animeId]);

  useEffect(() => {
    if (animeInfo && streamingUrl && duration > 0) {
      addToHistory({
        id: animeId as string,
        name: animeInfo.info?.name || 'Unknown Anime',
        img: animeInfo.info?.img || '',
        episodeId: episodeId as string,
        episodeNumber: Number(episodeNumber),
        timestamp: Date.now(),
        progress: currentTime,
        duration: duration
      });
    }
  }, [animeInfo, streamingUrl, duration]);

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

  const fetchServers = async () => {
    try {
      setError(null);
      setLoading(true);
      
      console.log('Raw episodeId:', episodeId);
      
      const formattedEpisodeId = episodeId as string;
      console.log('Formatted episodeId:', formattedEpisodeId);
      
      const response = await fetchWithRetry(
        `https://anime-api-app-nu.vercel.app/aniwatch/servers?id=${formattedEpisodeId}`
      );
      
      console.log('Servers response:', response);
      
      if (!response) throw new Error('No server data received');
      
      setServers({
        sub: response.sub || [],
        dub: response.dub || []
      });
      
      const serverList = category === 'dub' ? response.dub : response.sub;
      if (serverList && serverList.length > 0) {
        // Prefer megacloud server if available
        const megacloudServer = serverList.find(s => s.serverName.toLowerCase() === 'megacloud');
        setSelectedServer(megacloudServer || serverList[0]);
      } else {
        throw new Error(`No ${category} servers available`);
      }
    } catch (error) {
      console.error('Error fetching servers:', error);
      setError(error instanceof Error ? error.message : 'Failed to load servers');
    } finally {
      setLoading(false);
    }
  };

  const fetchStreamingSources = async () => {
    if (!selectedServer) return;
    
    try {
      setError(null);
      setLoading(true);
      
      const formattedEpisodeId = episodeId as string;
      
      console.log('Fetching sources with:', {
        episodeId: formattedEpisodeId,
        server: selectedServer.serverName,
        category
      });
      
      const response = await fetchWithRetry(
        `https://anime-api-app-nu.vercel.app/aniwatch/episode-srcs?id=${formattedEpisodeId}&server=${selectedServer.serverName}&category=${category}`,
        3,
        3000
      );
      
      console.log('Sources response:', response);
      
      if (!response || !response.sources || response.sources.length === 0) {
        // If current server fails, try the next available server
        const currentServerList = category === 'dub' ? servers.dub : servers.sub;
        const currentIndex = currentServerList.findIndex(s => s.serverId === selectedServer.serverId);
        const nextServer = currentServerList[currentIndex + 1];
        
        if (nextServer) {
          console.log('Trying next server:', nextServer.serverName);
          setSelectedServer(nextServer);
          return; // The useEffect will trigger another fetch
        }
        
        throw new Error('No streaming sources available');
      }

      // Find the default English subtitle or any English subtitle
      const englishSubtitle = response.tracks?.find(track => 
        track.default && track.label?.toLowerCase().includes('english')
      ) || response.tracks?.find(track => 
        track.label?.toLowerCase().includes('english')
      );

      if (englishSubtitle) {
        console.log('Found English subtitle:', englishSubtitle);
        // Make sure the subtitle URL is properly formatted
        const subtitleUrl = englishSubtitle.file.startsWith('http') 
          ? englishSubtitle.file 
          : `https:${englishSubtitle.file}`;
        
        setSubtitles([{
          url: subtitleUrl,
          lang: 'en'
        }]);
        setSelectedSubtitle('en'); // Auto-select English subtitle
      } else {
        console.log('No English subtitles found');
        setSubtitles([]);
        setSelectedSubtitle(null);
      }

      setSources(response.sources);
      setStreamingUrl(response.sources[0]?.url || null);
      setSelectedQuality(response.sources[0]?.quality || null);
      
    } catch (error) {
      console.error('Error fetching sources:', error);
      setError(error instanceof Error ? error.message : 'Failed to load video sources');
      
      // If all servers fail, show a more specific error
      const currentServerList = category === 'dub' ? servers.dub : servers.sub;
      const isLastServer = currentServerList.findIndex(s => s.serverId === selectedServer.serverId) === currentServerList.length - 1;
      
      if (isLastServer) {
        setError('All servers failed. Please try again later.');
      } else {
        // Try next server automatically
        const currentIndex = currentServerList.findIndex(s => s.serverId === selectedServer.serverId);
        const nextServer = currentServerList[currentIndex + 1];
        if (nextServer) {
          console.log('Automatically trying next server:', nextServer.serverName);
          setSelectedServer(nextServer);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchEpisodes = async () => {
    try {
      const response = await fetchWithRetry(
        `https://anime-api-app-nu.vercel.app/aniwatch/episodes/${animeId}`
      );
      
      if (response && Array.isArray(response.episodes)) {
        setEpisodes(response.episodes);
        // Find current episode index
        const index = response.episodes.findIndex(
          (ep: Episode) => ep.episodeId === episodeId
        );
        setCurrentEpisodeIndex(index);
      }
    } catch (error) {
      console.error('Error fetching episodes:', error);
    }
  };

  const fetchAnimeInfo = async () => {
    try {
      const response = await fetchWithRetry(
        `https://anime-api-app-nu.vercel.app/aniwatch/anime/${animeId}`
      );
      setAnimeInfo(response);
    } catch (error) {
      console.error('Error fetching anime info:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h ? `${h}:` : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleControls = () => {
    setShowControls(prev => !prev);
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    if (!showControls) {
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const handleVideoLoad = async () => {
    if (videoRef.current && resumePosition > 0 && !isVideoReady) {
      try {
        await videoRef.current.setPositionAsync(resumePosition * 1000); // Convert to milliseconds
        setIsVideoReady(true);
      } catch (err) {
        console.error('Error seeking to position:', err);
      }
    }
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      const newTime = status.positionMillis / 1000;
      const newDuration = status.durationMillis ? status.durationMillis / 1000 : 0;
      
      setCurrentTime(newTime);
      setDuration(newDuration);
      setIsBuffering(status.isBuffering || false);
      setIsPlaying(status.isPlaying);

      // Handle video load completion
      if (!isVideoReady && status.isLoaded) {
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
      if (status.didJustFinish) {
        onVideoEnd();
      }
    }
  };

  const onSliderValueChange = (value: number) => {
    if (videoRef.current) {
      videoRef.current.seek(value);
    }
  };

  const togglePlayPause = async () => {
    if (videoRef.current) {
      try {
        if (paused) {
          await videoRef.current.playAsync();
        } else {
          await videoRef.current.pauseAsync();
        }
        setPaused(!paused);
      } catch (error) {
        console.error('Error toggling play/pause:', error);
      }
    }
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
          title: nextEpisode.name,
          category: category
        }
      });
    }
  };

  const handlePlaybackSpeedChange = async (speed: number) => {
    if (videoRef.current) {
      try {
        await (videoRef.current as any).setStatusAsync({
          rate: speed,
          shouldCorrectPitch: true
        });
        setPlaybackSpeed(speed);
      } catch (error) {
        console.error('Error changing playback speed:', error);
      }
    }
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

  console.log('Rendering video with:', {
    streamingUrl,
    subtitleUrl: subtitles[0]?.url,
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
              fetchStreamingSources();
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
        {streamingUrl ? (
          <VideoPlayer
            ref={videoRef}
            source={{
              uri: streamingUrl,
              headers: {
                'Referer': 'https://aniwatch.to/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36'
              },
              type: 'application/x-mpegURL'
            }}
            style={styles.video}
            paused={paused}
            rate={playbackSpeed}
            isLoading={isBuffering}
            isPlaying={isPlaying}
            subtitleUrl={subtitles[0]?.url}
            selectedSubtitle={selectedSubtitle}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onError={handleVideoError}
          />
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f4511e" />
          </View>
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
                    selectedSubtitle === sub.lang && styles.selectedButton
                  ]}
                  onPress={() => setSelectedSubtitle(sub.lang)}
                >
                  <Text style={[
                    styles.subtitleText,
                    selectedSubtitle === sub.lang && styles.selectedText
                  ]}>
                    {sub.lang}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {episodes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Episodes</Text>
            <View style={styles.episodeList}>
              {episodes.map((episode, index) => (
                <TouchableOpacity
                  key={episode.episodeId}
                  style={[
                    styles.episodeItem,
                    episode.episodeId === episodeId && styles.currentEpisode
                  ]}
                  onPress={() => {
                    router.replace({
                      pathname: "/anime/watch/[episodeId]",
                      params: {
                        episodeId: episode.episodeId,
                        animeId: animeId as string,
                        episodeNumber: episode.episodeNo,
                        title: episode.name,
                        category: category
                      }
                    });
                  }}
                >
                  <View style={styles.episodeInfo}>
                    <Text style={styles.episodeNumber}>Episode {episode.episodeNo}</Text>
                    <Text style={styles.episodeName} numberOfLines={1}>
                      {episode.name}
                    </Text>
                  </View>
                  {episode.episodeId === episodeId && (
                    <MaterialIcons name="play-circle-filled" size={24} color="#f4511e" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
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
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'space-between',
  },
  topControls: {
    padding: 16,
  },
  centerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  titleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    marginHorizontal: 8,
  },
  slider: {
    flex: 1,
    height: 40,
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
    width: '100%',
    height: Dimensions.get('window').width * (9/16),
    backgroundColor: 'black',
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captions: {
    fontSize: 20,
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.5)',
    textAlign: 'center',
  },
}); 