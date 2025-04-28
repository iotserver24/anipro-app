import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, FlatList, Alert, TextInput, ActivityIndicator, Platform, Animated, SectionList, Share, Dimensions, ToastAndroid, Linking, Easing } from 'react-native';
import { router, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import { DownloadOptionsModal } from '../../components/DownloadOptionsModal';
import { DownloadStatus } from '../../types/downloads';
import EpisodeItem from '../../components/EpisodeItem';
import { useMyListStore } from '../../store/myListStore';
import { animeAPI } from '../../services/api';
import CommentModal from '../../components/CommentModal';
import { useWatchHistoryStore, WatchHistoryItem } from '../../store/watchHistoryStore';

type AnimeInfo = {
  info: {
    name: string;
    img: string;
    description: string;
    episodes: {
      sub: number;
      dub: number;
      total?: number;
    };
    rating?: string;
    japaneseTitle?: string;
  };
  moreInfo: {
    [key: string]: string | string[];
  };
  recommendations?: {
    id: string;
    title: string;
    image: string;
    type: string;
    episodes: number;
  }[];
  relations?: {
    id: string;
    title: string;
    image: string;
    type: string;
    episodes: number;
    relationType: string;
  }[];
  malID?: string;
  alID?: string;
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

const { width, height } = Dimensions.get('window');

const RecommendationItem = ({ anime }: { 
  anime: {
    id: string;
    title: string;
    image: string;
    type: string;
    episodes: number;
  }
}) => (
  <TouchableOpacity 
    style={styles.recommendationCard}
    onPress={() => router.push(`/anime/${anime.id}`)}
  >
    <Image 
      source={{ uri: anime.image }} 
      style={styles.recommendationImage}
    />
    <View style={styles.recommendationInfo}>
      <Text style={styles.recommendationTitle} numberOfLines={2}>
        {anime.title}
      </Text>
      <View style={styles.recommendationMeta}>
        <Text style={styles.recommendationType}>{anime.type}</Text>
        <Text style={styles.recommendationEpisodes}>
          {anime.episodes} eps
        </Text>
      </View>
    </View>
  </TouchableOpacity>
);

const RelatedAnimeItem = ({ anime }: { 
  anime: {
    id: string;
    title: string;
    image: string;
    type: string;
    episodes: number;
    relationType: string;
  }
}) => (
  <TouchableOpacity 
    style={styles.recommendationCard}
    onPress={() => router.push(`/anime/${anime.id}`)}
  >
    <Image 
      source={{ uri: anime.image }} 
      style={styles.recommendationImage}
    />
    <View style={styles.recommendationInfo}>
      <Text style={styles.recommendationTitle} numberOfLines={2}>
        {anime.title}
      </Text>
      <View style={styles.recommendationMeta}>
        <Text style={styles.relationType}>{anime.relationType}</Text>
        <Text style={styles.recommendationType}>{anime.type}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

interface AnimeData {
  id: string;
  title: string;
  japaneseTitle: string;
  image: string;
  description: string;
  type: string;
  url: string;
  subOrDub: 'sub' | 'dub' | 'both';
  hasSub: boolean;
  hasDub: boolean;
  genres: string[];
  status: string;
  season: string;
  totalEpisodes: number;
  episodes: APIEpisode[];
  rating?: string;
  recommendations?: {
    id: string;
    title: string;
    image: string;
    type: string;
    episodes: number;
  }[];
  relations?: {
    id: string;
    title: string;
    image: string;
    type: string;
    episodes: number;
    relationType: string;
  }[];
}

export default function AnimeDetails() {
  const { id } = useLocalSearchParams();
  const [animeData, setAnimeData] = useState<AnimeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [episodeList, setEpisodeList] = useState<APIEpisode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<'sub' | 'dub'>('sub');
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'number' | 'name'>('number');
  const EPISODES_PER_PAGE = 24;
  const [downloads, setDownloads] = useState<DownloadStatus>({});
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedEpisodeData, setSelectedEpisodeData] = useState<{
    sourceData: any;
    episodeInfo: APIEpisode | null;
  }>({
    sourceData: null,
    episodeInfo: null
  });
  const { isBookmarked, addAnime, removeAnime } = useMyListStore();
  const { history } = useWatchHistoryStore();
  const [showRelated, setShowRelated] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'episodes' | 'related' | 'recommendations'>('episodes');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const bookmarkButtonScale = useRef(new Animated.Value(1)).current;
  const playButtonScale = useRef(new Animated.Value(1)).current;
  const shimmerAnimation = useRef(new Animated.Value(0)).current;
  
  // Add new state for skeleton loading
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  const router = useRouter();

  // Define all useCallback hooks at the top to maintain consistent hook order
  
  // Enhanced animation for bookmark button for better feedback
  const animateBookmarkButton = useCallback(() => {
    // Reset the scale before starting animation to ensure it runs even if pressed multiple times
    bookmarkButtonScale.setValue(1);
    
    // Use sequence to create a more responsive feel - faster compression, quick bounce
    Animated.sequence([
      // Quick press down animation
      Animated.timing(bookmarkButtonScale, {
        toValue: 0.85,
        duration: 50, // Faster compression for more immediate feedback
        useNativeDriver: true,
      }),
      // Quick bounce back
      Animated.timing(bookmarkButtonScale, {
        toValue: 1.08,
        duration: 80,
        useNativeDriver: true,
      }),
      // Settle to normal size
      Animated.timing(bookmarkButtonScale, {
        toValue: 1,
        duration: 70,
        useNativeDriver: true,
      }),
    ]).start();
  }, [bookmarkButtonScale]);

  // Function to show feedback when adding/removing from My List
  const showFeedbackMessage = useCallback((message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    }
    // For iOS we could add a custom toast component, but omitting for simplicity
  }, []);

  // Handle download callback
  const handleDownload = useCallback(async (episode: APIEpisode) => {
    try {
      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) {
          Alert.alert('Permission Required', 'Storage permission is required to download episodes');
          return;
        }
      }

      console.log('Starting download for:', {
        episodeId: episode.id,
        episodeNo: episode.number,
        name: episode.title
      });

      console.log('Fetching episode sources from:', `https://con.anisurge.me/anime/zoro/watch/${episode.id}${selectedMode === 'dub' ? '?dub=true' : ''}`);
      const response = await fetch(
        `https://anime-api-app-nu.vercel.app/aniwatch/episode-srcs?id=${episode.id}&server=megacloud&category=${selectedMode}`
      );
      const data = await response.json();
      console.log('Source data received:', data);
      
      if (!data.sources || data.sources.length === 0) {
        throw new Error('No download source available');
      }

      // Instead of proceeding with direct download, show the download modal
      setSelectedEpisodeData({
        sourceData: data,
        episodeInfo: episode
      });
      setShowDownloadModal(true);

    } catch (error) {
      console.error('Error fetching episode sources:', error);
      Alert.alert(
        'Error',
        'Failed to fetch episode sources. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [selectedMode]);

  // Handle episode share callback
  const handleEpisodeShare = useCallback(async (episode: APIEpisode) => {
    if (!animeData) return;
    
    try {
      const shareUrl = `https://anisurge.me/share/${encodeURIComponent(episode.id)}$category=${selectedMode}`;
      const emojiType = selectedMode === 'sub' ? '🗣️' : '🎙️';
      const message = `📺 ${animeData.info.name}\n${emojiType} Episode ${episode.number}${episode.title ? `: ${episode.title}` : ''}\n\n${episode.isFiller ? '⚠️ Filler Episode\n\n' : ''}🔥 Watch now on AniSurge!\n\n${shareUrl}`;
      
      await Share.share({
        message,
        title: `${animeData.info.name} - Episode ${episode.number}`,
        url: shareUrl
      });
    } catch (error) {
      console.error('Error sharing episode:', error);
    }
  }, [animeData, selectedMode]);

  // Handle share callback
  const handleShare = useCallback(async () => {
    if (!animeData) return;
    
    try {
      const shareUrl = `https://anisurge.me/share/${encodeURIComponent(id as string)}`;
      const episodeInfo = `${animeData.info.episodes.sub > 0 ? `🗣️ ${animeData.info.episodes.sub} Sub Episodes` : ''}${animeData.info.episodes.dub > 0 ? `\n🎙️ ${animeData.info.episodes.dub} Dub Episodes` : ''}`;
      const message = `📺 ${animeData.info.name}\n\n${episodeInfo}\n\n${animeData.info.description?.slice(0, 150)}...\n\n🔥 Watch now on AniSurge!\n\n${shareUrl}`;
      
      await Share.share({
        message,
        title: animeData.info.name,
        url: shareUrl
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, [animeData, id]);

  // Update the add to list button onPress handler for better responsiveness
  const handleMyListAction = useCallback(() => {
    // Get the current state before any changes
    const isCurrentlyBookmarked = isBookmarked(id as string);
    const actionText = isCurrentlyBookmarked ? 'Removed from' : 'Added to';
    
    // Trigger animation immediately for instantaneous visual feedback
    animateBookmarkButton();
    
    // For best performance, we can show the feedback message first
    // This makes the action feel even more responsive
    showFeedbackMessage(`${actionText} My List`);
    
    // Use optimized approach for better performance
    if (animeData) {
      // For removal, no need to await - the UI will update immediately
      if (isCurrentlyBookmarked) {
        // Use setTimeout with 0ms to move this operation off the main thread
        // This makes the UI feel more responsive
        setTimeout(() => {
          removeAnime(id as string);
        }, 0);
      } else {
        // For adding, no need to await - just pass the data and let it handle optimistically
        setTimeout(() => {
          addAnime({
            id: id as string,
            name: animeData.info.name,
            img: animeData.info.img,
            addedAt: Date.now()
          });
        }, 0);
      }
    }
  }, [animeData, id, isBookmarked, animateBookmarkButton, showFeedbackMessage, addAnime, removeAnime]);

  // Tab change handler
  const handleTabChange = useCallback((tab: 'episodes' | 'related' | 'recommendations') => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setSelectedTab(tab);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  }, [fadeAnim]);

  // Memoized tab button component for better performance
  const TabButton = useCallback(({ 
    tab, 
    icon, 
    label, 
    isAvailable = true 
  }: { 
    tab: 'episodes' | 'related' | 'recommendations', 
    icon: string, 
    label: string,
    isAvailable?: boolean
  }) => {
    if (!isAvailable) return null;

    return (
      <TouchableOpacity 
        style={[styles.tab, selectedTab === tab && styles.selectedTab]}
        onPress={() => handleTabChange(tab)}
        activeOpacity={0.7}
        delayPressIn={0}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialIcons 
          name={icon as any} 
          size={24} 
          color={selectedTab === tab ? '#f4511e' : '#666'} 
        />
        <Text style={[styles.tabText, selectedTab === tab && styles.selectedTabText]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }, [selectedTab, handleTabChange]);

  // TabBar component
  const TabBar = useCallback(() => (
    <View style={styles.tabBar}>
      <TabButton tab="episodes" icon="playlist-play" label="Episodes" />
      
      <TabButton 
        tab="related" 
        icon="link" 
        label="Related" 
        isAvailable={Boolean(animeData?.relations && animeData.relations.length > 0)}
      />
      
      <TabButton 
        tab="recommendations" 
        icon="recommend" 
        label="For You" 
        isAvailable={Boolean(animeData?.recommendations && animeData.recommendations.length > 0)}
      />
    </View>
  ), [animeData, TabButton]);

  // Define renderEpisode with useCallback for consistency
  const renderEpisode = useCallback(({ item }: { item: APIEpisode }) => (
    <EpisodeItem
      episode={item}
      mode={selectedMode}
      animeTitle={animeData?.info.name || ''}
      onPress={() => {
        router.push({
          pathname: "/anime/watch/[episodeId]",
          params: {
            episodeId: item.id,
            animeId: id,
            episodeNumber: item.number,
            title: animeData?.info.name || 'Unknown Anime',
            episodeTitle: item.title || `Episode ${item.number}`,
            category: selectedMode
          }
        });
      }}
      onLongPress={() => handleDownload(item)}
      onShare={() => handleEpisodeShare(item)}
    />
  ), [animeData, id, selectedMode, handleDownload, handleEpisodeShare]);

  // Function to find last watched episode for this anime
  const getLastWatchedEpisode = useCallback(() => {
    // Make sure history is loaded and id is valid
    if (!history || !id) return null;
    
    // Filter by current anime id and current selected mode (sub/dub)
    const animeHistory = history.filter(item => 
      item.id === id && item.subOrDub === selectedMode
    );
    
    // Sort by lastWatched (most recent first)
    if (animeHistory.length > 0) {
      return animeHistory.sort((a, b) => b.lastWatched - a.lastWatched)[0];
    }
    
    return null;
  }, [history, id, selectedMode]);

  // Handle start/resume button animation
  const animatePlayButton = useCallback(() => {
    // Reset the scale before starting animation
    playButtonScale.setValue(1);
    
    // Use sequence for smooth animation
    Animated.sequence([
      // Quick press down
      Animated.timing(playButtonScale, {
        toValue: 0.9,
        duration: 50, 
        useNativeDriver: true,
      }),
      // Bounce back
      Animated.timing(playButtonScale, {
        toValue: 1.08,
        duration: 100,
        useNativeDriver: true,
      }),
      // Return to normal
      Animated.timing(playButtonScale, {
        toValue: 1,
        duration: 70,
        useNativeDriver: true,
      }),
    ]).start();
  }, [playButtonScale]);

  // Handle start/resume action
  const handleStartResume = useCallback(() => {
    if (!animeData || !episodeList || episodeList.length === 0) {
      // Can't start if no episodes
      if (Platform.OS === 'android') {
        ToastAndroid.show('No episodes available', ToastAndroid.SHORT);
      }
      return;
    }

    // Animate button for visual feedback
    animatePlayButton();
    
    // Find last watched episode for this anime
    const lastWatched = getLastWatchedEpisode();
    
    // Filter episodes for the current mode (sub/dub)
    const filteredEpisodes = episodeList.filter(episode => 
      selectedMode === 'dub' ? episode.isDubbed : episode.isSubbed
    );

    if (filteredEpisodes.length === 0) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(`No ${selectedMode} episodes available`, ToastAndroid.SHORT);
      }
      return;
    }
    
    let targetEpisode: APIEpisode;
    
    if (lastWatched) {
      // Resume: Find the episode in the current list
      const episodeToResume = filteredEpisodes.find(ep => ep.id === lastWatched.episodeId);
      
      // If found, use it; otherwise use the episode with matching number
      if (episodeToResume) {
        targetEpisode = episodeToResume;
      } else {
        // Try to find by episode number
        const episodeByNumber = filteredEpisodes.find(ep => ep.number === lastWatched.episodeNumber);
        
        // If found, use it; otherwise default to first episode
        targetEpisode = episodeByNumber || filteredEpisodes[0];
      }
      
      // Show feedback
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Resuming episode ${targetEpisode.number}`, ToastAndroid.SHORT);
      }
    } else {
      // Start from beginning
      targetEpisode = filteredEpisodes[0];
      
      // Show feedback
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Starting from episode ${targetEpisode.number}`, ToastAndroid.SHORT);
      }
    }
    
    // Navigate to the watch page
    setTimeout(() => {
      router.push({
        pathname: "/anime/watch/[episodeId]",
        params: {
          episodeId: targetEpisode.id,
          animeId: id,
          episodeNumber: targetEpisode.number,
          title: animeData?.info.name || 'Unknown Anime',
          episodeTitle: targetEpisode.title || `Episode ${targetEpisode.number}`,
          category: selectedMode
        }
      });
    }, 100);
  }, [animeData, episodeList, id, selectedMode, getLastWatchedEpisode, animatePlayButton]);

  // Effects and other functions after all hooks

  useEffect(() => {
    // Mark page as loaded immediately to show skeleton UI
    setIsPageLoaded(true);
    
    // Use setTimeout to defer API requests until after the UI is rendered
    if (id) {
      const timer = setTimeout(() => {
        fetchAnimeDetails();
      }, 100); // Short delay to ensure UI renders first
      
      return () => clearTimeout(timer);
    }
  }, [id]);

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

  const fetchAnimeDetails = async () => {
    try {
      console.log('Fetching anime details for ID:', id);
      console.log('API URL:', `https://con.anisurge.me/anime/zoro/info?id=${id}`);
      
      // Fetch data in parallel for better performance
      const data = await animeAPI.getAnimeDetails(id as string);
      console.log('Anime details response:', data);
      
      // Transform the API response to match the expected structure
      const transformedData = {
        info: {
          name: data.title,
          img: data.image,
          description: data.description,
          episodes: {
            sub: data.hasSub ? data.totalEpisodes : 0,
            dub: data.hasDub ? data.totalEpisodes : 0,
            total: data.totalEpisodes
          },
          rating: 'N/A', // API doesn't provide rating
          japaneseTitle: data.japaneseTitle
        },
        moreInfo: {
          'Status': data.status,
          'Type': data.type,
          'Season': data.season,
          'Genres': data.genres.join(', '),
          'Japanese Title': data.japaneseTitle,
          'MAL ID': data.malID,
          'AniList ID': data.alID
        },
        recommendations: data.recommendations?.map(rec => ({
          id: rec.id,
          title: rec.title,
          image: rec.image,
          type: rec.type,
          episodes: rec.episodes
        })),
        relations: data.relatedAnime?.map(rel => ({
          id: rel.id,
          title: rel.title,
          image: rel.image,
          type: rel.type,
          episodes: rel.episodes,
          relationType: 'Related'
        })) || [] // Ensure we have an empty array if no related anime
      };
      
      setAnimeData(transformedData);
      setEpisodeList(data.episodes || []);
    } catch (error) {
      console.error('Error fetching anime details:', error);
      // Show error toast
      if (Platform.OS === 'android') {
        ToastAndroid.show('Failed to load anime details. Please try again.', ToastAndroid.SHORT);
      }
    } finally {
      setLoading(false);
      setEpisodesLoading(false);
    }
  };

  const getFilteredEpisodes = () => {
    if (!episodeList) return [];
    
    return episodeList.filter(episode => 
      selectedMode === 'dub' ? episode.isDubbed : episode.isSubbed
    );
  };

  const getPaginatedEpisodes = () => {
    const filteredEpisodes = getFilteredEpisodes().filter(episode => {
      if (!searchQuery) return true;
      
      if (searchMode === 'number') {
        return episode.number.toString().includes(searchQuery);
      } else {
        return episode.title.toLowerCase().includes(searchQuery.toLowerCase());
      }
    });

    const totalPages = Math.ceil(filteredEpisodes.length / EPISODES_PER_PAGE);
    const startIndex = (currentPage - 1) * EPISODES_PER_PAGE;
    const paginatedEpisodes = filteredEpisodes.slice(startIndex, startIndex + EPISODES_PER_PAGE);

    return { paginatedEpisodes, totalPages };
  };

  const toggleMoreInfo = () => {
    setShowMoreInfo(!showMoreInfo);
    Animated.spring(animatedHeight, {
      toValue: showMoreInfo ? 0 : 1,
      useNativeDriver: false,
      friction: 8,
      tension: 40
    }).start();
  };

  const renderAnimeHeader = () => (
    <View style={styles.headerContainer}>
      <Image 
        source={{ uri: animeData?.info.img }} 
        style={styles.backgroundImage}
        blurRadius={3}
      />
      
      <LinearGradient
        colors={['rgba(18, 18, 18, 0.3)', '#121212']}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.posterContainer}>
            <Image 
              source={{ uri: animeData?.info.img }} 
              style={styles.posterImage}
            />
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.animeTitle}>
              {animeData?.info.name}
            </Text>
            
            <View style={styles.metaInfo}>
              {animeData?.info.rating && (
                <View style={styles.ratingBadge}>
                  <MaterialIcons name="star" size={16} color="#f4511e" />
                  <Text style={styles.ratingText}>{animeData.info.rating}</Text>
                </View>
              )}
              <View style={styles.statusBadge}>
                <MaterialIcons 
                  name={
                    animeData?.moreInfo.Status === 'Completed' ? 'check-circle' : 
                    animeData?.moreInfo.Status === 'Ongoing' ? 'play-circle' : 
                    'schedule'
                  } 
                  size={16} 
                  color="#f4511e" 
                />
                <Text style={styles.statusText}>
                  {animeData?.moreInfo.Status || 'Unknown'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderTabContent = () => {
    const content = (() => {
      switch (selectedTab) {
        case 'episodes':
          return (
            <View style={styles.tabContent}>
              {/* Audio Selector */}
              <View style={styles.audioSelector}>
                <TouchableOpacity 
                  style={[styles.audioOption, selectedMode === 'sub' && styles.selectedAudio]}
                  onPress={() => setSelectedMode('sub')}
                >
                  <MaterialIcons 
                    name="subtitles" 
                    size={20} 
                    color={selectedMode === 'sub' ? '#fff' : '#666'} 
                  />
                  <Text style={[styles.audioText, selectedMode === 'sub' && styles.selectedAudioText]}>
                    Sub ({animeData?.info.episodes.sub || 0})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.audioOption, selectedMode === 'dub' && styles.selectedAudio]}
                  onPress={() => setSelectedMode('dub')}
                >
                  <MaterialIcons 
                    name="record-voice-over" 
                    size={20} 
                    color={selectedMode === 'dub' ? '#fff' : '#666'} 
                  />
                  <Text style={[styles.audioText, selectedMode === 'dub' && styles.selectedAudioText]}>
                    Dub ({animeData?.info.episodes.dub || 0})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                  <MaterialIcons name="search" size={20} color="#666" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={`Search by ${searchMode === 'number' ? 'episode number' : 'episode name'}...`}
                    placeholderTextColor="#666"
                    value={searchQuery}
                    onChangeText={text => {
                      setSearchQuery(text);
                      setCurrentPage(1);
                    }}
                  />
                  {searchQuery !== '' && (
                    <TouchableOpacity 
                      onPress={() => {
                        setSearchQuery('');
                        setCurrentPage(1);
                      }}
                    >
                      <MaterialIcons name="close" size={20} color="#666" />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity 
                  style={[styles.searchModeButton, searchMode === 'number' && styles.activeModeButton]}
                  onPress={() => setSearchMode(mode => mode === 'number' ? 'name' : 'number')}
                >
                  <MaterialIcons 
                    name={searchMode === 'number' ? 'format-list-numbered' : 'text-format'} 
                    size={20} 
                    color={searchMode === 'number' ? '#fff' : '#666'} 
                  />
                </TouchableOpacity>
              </View>

              {/* Episodes List */}
              {episodesLoading ? (
                <ActivityIndicator size="large" color="#f4511e" style={styles.episodesLoader} />
              ) : (
                <>
                  <FlatList
                    data={getPaginatedEpisodes().paginatedEpisodes}
                    renderItem={renderEpisode}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.episodesList}
                    maxToRenderPerBatch={10}
                    windowSize={10}
                    removeClippedSubviews={true}
                    initialNumToRender={10}
                    ListEmptyComponent={() => (
                      <Text style={styles.noEpisodesText}>
                        {searchQuery ? 'No episodes match your search' : 'No episodes available'}
                      </Text>
                    )}
                  />

                  {/* Pagination */}
                  {getPaginatedEpisodes().totalPages > 1 && (
                    <View style={styles.pagination}>
                      <TouchableOpacity 
                        style={[styles.pageButton, currentPage === 1 && styles.disabledButton]}
                        onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <MaterialIcons name="chevron-left" size={24} color={currentPage === 1 ? '#666' : '#fff'} />
                      </TouchableOpacity>
                      
                      <Text style={styles.pageInfo}>
                        Page {currentPage} of {getPaginatedEpisodes().totalPages}
                      </Text>
                      
                      <TouchableOpacity 
                        style={[styles.pageButton, currentPage === getPaginatedEpisodes().totalPages && styles.disabledButton]}
                        onPress={() => setCurrentPage(p => Math.min(getPaginatedEpisodes().totalPages, p + 1))}
                        disabled={currentPage === getPaginatedEpisodes().totalPages}
                      >
                        <MaterialIcons name="chevron-right" size={24} color={currentPage === getPaginatedEpisodes().totalPages ? '#666' : '#fff'} />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </View>
          );
        
        case 'related':
          return (
            <View style={styles.tabContent}>
              <View style={styles.relatedContainer}>
                {/* Commenting out the related anime mapping for now
                <ScrollView 
                  contentContainerStyle={styles.gridContainer}
                  showsVerticalScrollIndicator={false}
                >
                  {animeData?.relations?.map((anime) => (
                    <RelatedAnimeItem key={anime.id} anime={anime} />
                  ))}
                </ScrollView>
                */}
                <View style={styles.underWorkingContainer}>
                  <View style={styles.underWorkingMessage}>
                    <Text style={styles.underWorkingText}>Under Working</Text>
                    <Text style={styles.underWorkingSubText}>We are working on this to make it working like that</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        
        case 'recommendations':
          return (
            <View style={styles.tabContent}>
              <ScrollView 
                contentContainerStyle={styles.gridContainer}
                showsVerticalScrollIndicator={false}
              >
                {animeData?.recommendations?.map((anime) => (
                  <RecommendationItem key={anime.id} anime={anime} />
                ))}
              </ScrollView>
            </View>
          );
      }
    })();

    return (
      <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
        {content}
      </Animated.View>
    );
  };

  const renderContent = () => {
    if (!animeData) return null;

    const sections = [
      {
        title: 'header',
        data: [null],
        renderItem: () => renderAnimeHeader()
      },
      {
        title: 'info',
        data: [null],
        renderItem: () => (
          <View style={styles.section}>
            {/* Start/Resume button positioned above synopsis */}
            <Animated.View style={[styles.playButtonContainer, { transform: [{ scale: playButtonScale }] }]}>
              <TouchableOpacity 
                style={styles.watchNowButton}
                onPress={handleStartResume}
                activeOpacity={0.7}
              >
                <MaterialIcons name="play-circle-filled" size={18} color="#fff" />
                <Text style={styles.watchNowText}>
                  {getLastWatchedEpisode() ? 'Resume Watching' : 'Start Watching'}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Synopsis */}
            <View style={styles.synopsisContainer}>
              <Text style={styles.sectionTitle}>Synopsis</Text>
              
              {/* Japanese Title */}
              {animeData?.info.japaneseTitle && (
                <Text style={styles.japaneseTitle}>{animeData.info.japaneseTitle}</Text>
              )}

              {/* External Links */}
              <View style={styles.externalLinks}>
                {animeData?.malID && (
                  <TouchableOpacity 
                    style={styles.externalButton}
                    onPress={() => Linking.openURL(`https://myanimelist.net/anime/${animeData.malID}`)}
                  >
                    <Text style={styles.externalButtonText}>MAL</Text>
                  </TouchableOpacity>
                )}
                {animeData?.alID && (
                  <TouchableOpacity 
                    style={styles.externalButton}
                    onPress={() => Linking.openURL(`https://anilist.co/anime/${animeData.alID}`)}
                  >
                    <Text style={styles.externalButtonText}>AniList</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.description} numberOfLines={showMoreInfo ? undefined : 3}>
                {animeData?.info.description}
              </Text>
              {!showMoreInfo && (
                <LinearGradient
                  colors={['transparent', '#121212']}
                  style={styles.gradientOverlay}
                >
                  <View>
                    <TouchableOpacity style={styles.moreInfoButton} onPress={toggleMoreInfo}>
                      <Text style={styles.moreInfoText}>More Info</Text>
                      <MaterialIcons name="keyboard-arrow-down" size={20} color="#f4511e" />
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              )}
            </View>

            {/* More Info Grid */}
            <Animated.View 
              style={[
                styles.moreInfoContent,
                {
                  maxHeight: animatedHeight.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 500]
                  })
                }
              ]}
            >
              <View style={styles.infoGrid}>
                {Object.entries(animeData?.moreInfo || {}).map(([key, value]) => {
                  // Special handling for MAL and AniList IDs
                  if (key === 'MAL ID') {
                    return (
                      <View key={key} style={styles.infoItem}>
                        <Text style={styles.infoLabel}>MyAnimeList</Text>
                        <TouchableOpacity 
                          style={styles.infoLinkButton}
                          onPress={() => Linking.openURL(`https://myanimelist.net/anime/${value}`)}
                        >
                          <Text style={styles.infoLinkButtonText}>View on MAL</Text>
                          <MaterialIcons name="open-in-new" size={14} color="#f4511e" />
                        </TouchableOpacity>
                      </View>
                    );
                  }
                  if (key === 'AniList ID') {
                    return (
                      <View key={key} style={styles.infoItem}>
                        <Text style={styles.infoLabel}>AniList</Text>
                        <TouchableOpacity 
                          style={styles.infoLinkButton}
                          onPress={() => Linking.openURL(`https://anilist.co/anime/${value}`)}
                        >
                          <Text style={styles.infoLinkButtonText}>View on AniList</Text>
                          <MaterialIcons name="open-in-new" size={14} color="#f4511e" />
                        </TouchableOpacity>
                      </View>
                    );
                  }
                  // Regular info items
                  return (
                    <View key={key} style={styles.infoItem}>
                      <Text style={styles.infoLabel}>{key}</Text>
                      <Text style={styles.infoValue}>{value}</Text>
                    </View>
                  );
                })}
              </View>
              {showMoreInfo && (
                <TouchableOpacity style={styles.showLessButton} onPress={toggleMoreInfo}>
                  <MaterialIcons name="keyboard-arrow-up" size={24} color="#f4511e" />
                </TouchableOpacity>
              )}
            </Animated.View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              {/* My List Button */}
              <Animated.View style={{ transform: [{ scale: bookmarkButtonScale }], flex: 1 }}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={handleMyListAction}
                  activeOpacity={0.7}
                  delayPressIn={0}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons 
                    name={isBookmarked(id as string) ? "bookmark" : "bookmark-outline"} 
                    size={22} 
                    color="#f4511e" 
                  />
                  <Text style={styles.actionText}>
                    {isBookmarked(id as string) ? 'In My List' : 'Add to List'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>

              {/* Comments Button */}
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {
                  if (Platform.OS === 'android') {
                    ToastAndroid.show('Opening comments...', ToastAndroid.SHORT);
                  }
                  setTimeout(() => setShowCommentsModal(true), 0);
                }}
                activeOpacity={0.7}
                delayPressIn={0}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="comment" size={22} color="#f4511e" />
                <Text style={styles.actionText}>Comments</Text>
              </TouchableOpacity>

              {/* Share Button */}
              <TouchableOpacity 
                style={[styles.actionButton, styles.shareButton]}
                onPress={() => {
                  if (Platform.OS === 'android') {
                    ToastAndroid.show('Opening share options...', ToastAndroid.SHORT);
                  }
                  setTimeout(() => handleShare(), 0);
                }}
                activeOpacity={0.7}
                delayPressIn={0}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="share" size={20} color="#f4511e" />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>

              {/* Share to Chat Button (full width, under the above row) */}
              {/* <TouchableOpacity
                style={[styles.actionButton, { marginTop: 8, width: '100%', alignSelf: 'center' }]}
                onPress={() => {
                  if (!animeData) return;
                  
                  router.push({
                    pathname: '/chat',
                    params: {
                      shareAnime: JSON.stringify({
                        id: id as string,
                        title: animeData.info.name,
                        image: animeData.info.img,
                        type: animeData.moreInfo.Type || 'Unknown',
                        episodes: animeData.info.episodes.total || 0
                      })
                    }
                  });
                }}
                activeOpacity={0.7}
                delayPressIn={0}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="send" size={20} color="#f4511e" />
                <Text style={styles.actionText}>Share to Chat</Text>
              </TouchableOpacity> */}
            </View>
          </View>
        )
      },
      {
        title: 'content',
        data: [null],
        renderItem: () => (
          <View style={styles.section}>
            <TabBar />
            {renderTabContent()}
          </View>
        )
      }
    ];

    return (
      <SectionList
        sections={sections}
        renderItem={({ section }) => section.renderItem()}
        keyExtractor={(item, index) => index.toString()}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={undefined}
      />
    );
  };

  // Render a skeleton loading UI
  const renderSkeletonUI = () => {
    const translateX = shimmerAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [-200, 400]
    });

    const shimmerStyle = {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      transform: [{ translateX }]
    };

    return (
      <ScrollView style={styles.container}>
        {/* Header Skeleton */}
        <View style={styles.skeletonHeader}>
          <View style={[styles.skeletonImage, { overflow: 'hidden' }]}>
            <Animated.View style={shimmerStyle} />
          </View>
          <View style={styles.skeletonHeaderContent}>
            <View style={[styles.skeletonTitle, { overflow: 'hidden' }]}>
              <Animated.View style={shimmerStyle} />
            </View>
            <View style={[styles.skeletonSubtitle, { overflow: 'hidden' }]}>
              <Animated.View style={shimmerStyle} />
            </View>
          </View>
        </View>

        {/* Synopsis Skeleton */}
        <View style={styles.skeletonSection}>
          <View style={[styles.skeletonSynopsisTitle, { overflow: 'hidden' }]}>
            <Animated.View style={shimmerStyle} />
          </View>
          {[1, 2, 3].map((_, index) => (
            <View key={index} style={[styles.skeletonSynopsisLine, { overflow: 'hidden' }]}>
              <Animated.View style={shimmerStyle} />
            </View>
          ))}
        </View>

        {/* Action Buttons Skeleton */}
        <View style={styles.skeletonActions}>
          {[1, 2].map((_, index) => (
            <View key={index} style={[styles.skeletonButton, { overflow: 'hidden' }]}>
              <Animated.View style={shimmerStyle} />
            </View>
          ))}
        </View>

        {/* Episodes List Skeleton */}
        <View style={styles.skeletonSection}>
          <View style={[styles.skeletonEpisodesTitle, { overflow: 'hidden' }]}>
            <Animated.View style={shimmerStyle} />
          </View>
          {[1, 2, 3, 4].map((_, index) => (
            <View key={index} style={[styles.skeletonEpisodeItem, { overflow: 'hidden' }]}>
              <Animated.View style={shimmerStyle} />
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  if (!isPageLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f4511e" />
      </View>
    );
  }

  if (loading && !animeData) {
    return renderSkeletonUI();
  }

  if (!loading && !animeData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load anime details</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            fetchAnimeDetails();
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderContent()}
      
      <DownloadOptionsModal
        isVisible={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        sourceData={selectedEpisodeData.sourceData}
        episodeInfo={selectedEpisodeData.episodeInfo}
      />

      <CommentModal
        visible={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        animeId={id as string}
        animeTitle={animeData?.info.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#f4511e',
    fontSize: 16,
  },
  headerContainer: {
    height: height * 0.45,
    width: '100%',
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  headerGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
    marginTop: 'auto',
    paddingBottom: 12,
  },
  posterContainer: {
    width: width * 0.35,
    aspectRatio: 2/3,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.84,
    backgroundColor: '#1a1a1a',
  },
  posterImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    resizeMode: 'cover',
  },
  infoContainer: {
    flex: 1,
    paddingBottom: 8,
    justifyContent: 'flex-end',
  },
  animeTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
    flexWrap: 'wrap',
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  ratingText: {
    color: '#fff',
    fontSize: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  synopsisContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  description: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  moreInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 18, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  moreInfoText: {
    color: '#f4511e',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  moreInfoContent: {
    overflow: 'hidden',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 8,
  },
  infoItem: {
    width: '45%',
  },
  infoLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
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
  episodesList: {
    gap: 8,
  },
  episodeCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
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
  episodeNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  episodeInfo: {
    flex: 1,
    marginRight: 12,
  },
  episodeTitle: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  episodeBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  fillerBadge: {
    color: '#f4511e',
    fontSize: 12,
  },
  episodesLoader: {
    marginVertical: 20,
  },
  noEpisodesText: {
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 8,
  },
  searchModeButton: {
    backgroundColor: '#1a1a1a',
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeModeButton: {
    backgroundColor: '#f4511e',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
    gap: 16,
  },
  pageButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  disabledButton: {
    backgroundColor: '#222',
    opacity: 0.5,
  },
  pageInfo: {
    color: '#fff',
    fontSize: 14,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  shareButton: {
    flex: 0.85,
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  showLessButton: {
    marginTop: 16,
    alignSelf: 'center',
  },
  fillerEpisodeCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#f4511e',
  },
  dubBadge: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  recommendationsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  recommendationCard: {
    width: 140,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
  },
  recommendationImage: {
    width: '100%',
    height: 190,
    resizeMode: 'cover',
  },
  recommendationInfo: {
    padding: 8,
  },
  recommendationTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  recommendationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recommendationType: {
    color: '#666',
    fontSize: 12,
  },
  recommendationEpisodes: {
    color: '#666',
    fontSize: 12,
  },
  relationType: {
    color: '#f4511e',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  relatedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 8,
  },
  selectedTab: {
    backgroundColor: '#222',
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedTabText: {
    color: '#f4511e',
  },
  tabContent: {
    flex: 1,
    minHeight: 200,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    padding: 16,
  },
  episodeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  episodeActionButton: {
    padding: 4,
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonContainer: {
    marginBottom: 16,
    marginTop: 8,
    width: '100%',
  },
  watchNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4511e',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  watchNowText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  relatedContainer: {
    flex: 1,
    position: 'relative',
  },
  underWorkingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  underWorkingMessage: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  underWorkingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  underWorkingSubText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  japaneseTitle: {
    color: '#ccc',
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  externalLinks: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  externalButton: {
    backgroundColor: '#f4511e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  externalButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  metadataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 8,
  },
  metadataItem: {
    flex: 1,
    minWidth: '45%',
  },
  metadataLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
  },
  metadataValue: {
    color: '#fff',
    fontSize: 14,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  genreTag: {
    backgroundColor: 'rgba(244,81,30,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f4511e',
  },
  genreText: {
    color: '#f4511e',
    fontSize: 12,
  },
  infoLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  infoLinkButtonText: {
    color: '#f4511e',
    fontSize: 14,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#f4511e',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    width: 120,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  skeletonHeader: {
    padding: 16,
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
  },
  skeletonImage: {
    width: 120,
    height: 180,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginRight: 16,
  },
  skeletonHeaderContent: {
    flex: 1,
    justifyContent: 'center',
  },
  skeletonTitle: {
    height: 24,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonSubtitle: {
    height: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    width: '80%',
  },
  skeletonSection: {
    padding: 16,
    backgroundColor: '#1a1a1a',
    marginTop: 8,
  },
  skeletonSynopsisTitle: {
    height: 20,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    width: '40%',
    marginBottom: 16,
  },
  skeletonSynopsisLine: {
    height: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1a1a1a',
    marginTop: 8,
    gap: 16,
  },
  skeletonButton: {
    height: 40,
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
  },
  skeletonEpisodesTitle: {
    height: 20,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    width: '30%',
    marginBottom: 16,
  },
  skeletonEpisodeItem: {
    height: 60,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginBottom: 12,
  },
}); 