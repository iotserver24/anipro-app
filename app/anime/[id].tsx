import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, Dimensions, Platform, Animated, TouchableWithoutFeedback, TextInput, Alert, Share, SectionList } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { DownloadOptionsModal } from '../../components/DownloadOptionsModal';
import { addToMyList, removeFromMyList, isInMyList } from '../../utils/myList';
import { useMyListStore } from '../../store/myListStore';
import { animeAPI } from '../../services/api';
import React from 'react';

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

type DownloadStatus = {
  [key: string]: {
    progress: number;
    status: 'idle' | 'downloading' | 'completed' | 'error';
  };
};

const { width, height } = Dimensions.get('window');

const EpisodeItem = React.memo(({ episode, onPress, onLongPress, mode }: {
  episode: APIEpisode;
  onPress: () => void;
  onLongPress: () => void;
  mode: 'sub' | 'dub';
}) => (
  <TouchableOpacity
    style={[styles.episodeCard, episode.isFiller && styles.fillerEpisodeCard]}
    onPress={onPress}
    onLongPress={onLongPress}
  >
    <View style={styles.episodeContent}>
      <View style={styles.episodeNumberContainer}>
        <Text style={styles.episodeNumber}>{episode.number}</Text>
      </View>
      <View style={styles.episodeInfo}>
        <Text style={styles.episodeTitle} numberOfLines={1}>
          {episode.title}
        </Text>
        <View style={styles.episodeBadges}>
          {mode === 'dub' && episode.isDubbed && (
            <Text style={styles.dubBadge}>DUB</Text>
          )}
          {episode.isFiller && (
            <Text style={styles.fillerBadge}>FILLER</Text>
          )}
        </View>
      </View>
      <MaterialIcons name="play-circle-outline" size={24} color="#f4511e" />
    </View>
  </TouchableOpacity>
));

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
  const [showRelated, setShowRelated] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'episodes' | 'related' | 'recommendations'>('episodes');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (id) {
      fetchAnimeDetails();
    }
  }, [id]);

  const fetchAnimeDetails = async () => {
    try {
      setLoading(true);
      const data = await animeAPI.getAnimeDetails(id as string);
      
      const formattedData: AnimeInfo = {
        info: {
          name: data.title,
          img: data.image,
          description: data.description,
          episodes: {
            sub: data.hasSub ? data.totalEpisodes : 0,
            dub: data.hasDub ? data.totalEpisodes : 0,
          },
          rating: data.rating,
        },
        moreInfo: {
          Type: data.type || '',
          Status: data.status || '',
          'Release Date': data.season || '',
          'Japanese Title': data.japaneseTitle || '',
          Genres: data.genres?.join(', ') || ''
        },
        recommendations: data.recommendations,
        relations: data.relations
      };

      setAnimeData(formattedData);
      
      // Set episodes directly from API response
      if (data.episodes) {
        setEpisodeList(data.episodes);
      }
      setEpisodesLoading(false);

    } catch (error) {
      console.error('Error fetching anime details:', error);
    } finally {
      setLoading(false);
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

  const handleDownload = async (episode: APIEpisode) => {
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
  };

  const handleShare = async () => {
    if (!animeData) return;
    
    try {
      const shareUrl = `anipro://anime/${id}`;
      const storeLink = Platform.select({
        ios: '[Your App Store Link]',
        android: '[Your Play Store Link]',
        default: '[Your Website Link]'
      });
      
      const message = `Check out ${animeData.info.name}!\n\nOpen in AniPro: ${shareUrl}\n\nInstall AniPro to watch anime: ${storeLink}`;
      
      await Share.share({
        message,
        title: animeData.info.name,
        url: shareUrl
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleEpisodeShare = async (episode: APIEpisode) => {
    if (!animeData) return;
    
    try {
      const shareUrl = `anipro://anime/watch/${episode.id}`;
      const storeLink = Platform.select({
        ios: '[Your App Store Link]',
        android: '[Your Play Store Link]',
        default: '[Your Website Link]'
      });
      
      const message = `Watch ${animeData.info.name} Episode ${episode.number} on AniPro!\n\nOpen in AniPro: ${shareUrl}\n\nInstall AniPro to watch anime: ${storeLink}`;
      
      await Share.share({
        message,
        title: `${animeData.info.name} - Episode ${episode.number}`,
        url: shareUrl
      });
    } catch (error) {
      console.error('Error sharing episode:', error);
    }
  };

  const handleTabChange = (tab: 'episodes' | 'related' | 'recommendations') => {
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

  const TabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity 
        style={[styles.tab, selectedTab === 'episodes' && styles.selectedTab]}
        onPress={() => handleTabChange('episodes')}
      >
        <MaterialIcons 
          name="playlist-play" 
          size={24} 
          color={selectedTab === 'episodes' ? '#f4511e' : '#666'} 
        />
        <Text style={[styles.tabText, selectedTab === 'episodes' && styles.selectedTabText]}>
          Episodes
        </Text>
      </TouchableOpacity>

      {animeData?.relations && animeData.relations.length > 0 && (
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'related' && styles.selectedTab]}
          onPress={() => handleTabChange('related')}
        >
          <MaterialIcons 
            name="link" 
            size={24} 
            color={selectedTab === 'related' ? '#f4511e' : '#666'} 
          />
          <Text style={[styles.tabText, selectedTab === 'related' && styles.selectedTabText]}>
            Related
          </Text>
        </TouchableOpacity>
      )}

      {animeData?.recommendations && animeData.recommendations.length > 0 && (
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'recommendations' && styles.selectedTab]}
          onPress={() => handleTabChange('recommendations')}
        >
          <MaterialIcons 
            name="recommend" 
            size={24} 
            color={selectedTab === 'recommendations' ? '#f4511e' : '#666'} 
          />
          <Text style={[styles.tabText, selectedTab === 'recommendations' && styles.selectedTabText]}>
            For You
          </Text>
        </TouchableOpacity>
      )}
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
              <ScrollView 
                contentContainerStyle={styles.gridContainer}
                showsVerticalScrollIndicator={false}
              >
                {animeData?.relations?.map((anime) => (
                  <RelatedAnimeItem key={anime.id} anime={anime} />
                ))}
              </ScrollView>
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f4511e" />
      </View>
    );
  }

  if (!animeData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load anime details</Text>
      </View>
    );
  }

  const renderEpisode = ({ item }: { item: APIEpisode }) => (
    <EpisodeItem
      episode={item}
      mode={selectedMode}
      onPress={() => {
        router.push({
          pathname: "/anime/watch/[episodeId]",
          params: {
            episodeId: item.id,
            animeId: id,
            episodeNumber: item.number,
            title: animeData?.info.name || 'Unknown Anime',
            category: selectedMode
          }
        });
      }}
      onLongPress={() => handleDownload(item)}
    />
  );

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
            {/* Synopsis */}
            <View style={styles.synopsisContainer}>
              <Text style={styles.sectionTitle}>Synopsis</Text>
              <Text style={styles.description} numberOfLines={showMoreInfo ? undefined : 3}>
                {animeData?.info.description}
              </Text>
              {!showMoreInfo && (
                <LinearGradient
                  colors={['transparent', '#121212']}
                  style={styles.gradientOverlay}
                >
                  <TouchableOpacity style={styles.moreInfoButton} onPress={toggleMoreInfo}>
                    <Text style={styles.moreInfoText}>More Info</Text>
                    <MaterialIcons name="keyboard-arrow-down" size={20} color="#f4511e" />
                  </TouchableOpacity>
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
                {Object.entries(animeData?.moreInfo || {}).map(([key, value]) => (
                  <View key={key} style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{key}</Text>
                    <Text style={styles.infoValue}>{value}</Text>
                  </View>
                ))}
              </View>
              {showMoreInfo && (
                <TouchableOpacity style={styles.showLessButton} onPress={toggleMoreInfo}>
                  <MaterialIcons name="keyboard-arrow-up" size={24} color="#f4511e" />
                </TouchableOpacity>
              )}
            </Animated.View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={async () => {
                  if (isBookmarked(id as string)) {
                    await removeAnime(id as string);
                  } else if (animeData) {
                    await addAnime({
                      id: id as string,
                      name: animeData.info.name,
                      img: animeData.info.img,
                      addedAt: Date.now()
                    });
                  }
                }}
              >
                <MaterialIcons 
                  name={isBookmarked(id as string) ? "bookmark" : "bookmark-outline"} 
                  size={24} 
                  color="#f4511e" 
                />
                <Text style={styles.actionText}>
                  {isBookmarked(id as string) ? 'In My List' : 'Add to List'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleShare}
              >
                <MaterialIcons name="share" size={24} color="#f4511e" />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>
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
        renderSectionHeader={null}
      />
    );
  };

  return (
    <View style={styles.container}>
      <SectionList
        sections={[
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
                {/* Synopsis */}
                <View style={styles.synopsisContainer}>
                  <Text style={styles.sectionTitle}>Synopsis</Text>
                  <Text style={styles.description} numberOfLines={showMoreInfo ? undefined : 3}>
                    {animeData?.info.description}
                  </Text>
                  {!showMoreInfo && (
                    <LinearGradient
                      colors={['transparent', '#121212']}
                      style={styles.gradientOverlay}
                    >
                      <TouchableOpacity style={styles.moreInfoButton} onPress={toggleMoreInfo}>
                        <Text style={styles.moreInfoText}>More Info</Text>
                        <MaterialIcons name="keyboard-arrow-down" size={20} color="#f4511e" />
                      </TouchableOpacity>
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
                    {Object.entries(animeData?.moreInfo || {}).map(([key, value]) => (
                      <View key={key} style={styles.infoItem}>
                        <Text style={styles.infoLabel}>{key}</Text>
                        <Text style={styles.infoValue}>{value}</Text>
                      </View>
                    ))}
                  </View>
                  {showMoreInfo && (
                    <TouchableOpacity style={styles.showLessButton} onPress={toggleMoreInfo}>
                      <MaterialIcons name="keyboard-arrow-up" size={24} color="#f4511e" />
                    </TouchableOpacity>
                  )}
                </Animated.View>

                {/* Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={async () => {
                      if (isBookmarked(id as string)) {
                        await removeAnime(id as string);
                      } else if (animeData) {
                        await addAnime({
                          id: id as string,
                          name: animeData.info.name,
                          img: animeData.info.img,
                          addedAt: Date.now()
                        });
                      }
                    }}
                  >
                    <MaterialIcons 
                      name={isBookmarked(id as string) ? "bookmark" : "bookmark-outline"} 
                      size={24} 
                      color="#f4511e" 
                    />
                    <Text style={styles.actionText}>
                      {isBookmarked(id as string) ? 'In My List' : 'Add to List'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={handleShare}
                  >
                    <MaterialIcons name="share" size={24} color="#f4511e" />
                    <Text style={styles.actionText}>Share</Text>
                  </TouchableOpacity>
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
        ]}
        keyExtractor={(item, index) => index.toString()}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={null}
      />
      <DownloadOptionsModal
        visible={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        sourceData={selectedEpisodeData.sourceData}
        episodeInfo={selectedEpisodeData.episodeInfo}
        animeTitle={animeData?.info.name || ''}
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
    gap: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
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
}); 