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
  };
  moreInfo: {
    [key: string]: string | string[];
  };
};

type APIEpisode = {
  id: string;
  number: number;
  title: string;
  isSubbed: boolean;
  isDubbed: boolean;
  url: string;
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
    style={styles.episodeCard}
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
        {mode === 'dub' && episode.isDubbed && (
          <Text style={styles.fillerBadge}>DUB</Text>
        )}
      </View>
      <MaterialIcons name="play-circle-outline" size={24} color="#f4511e" />
    </View>
  </TouchableOpacity>
));

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
          }
        },
        moreInfo: {
          Type: data.type || '',
          Status: data.status || '',
          'Release Date': data.season || '',
          'Japanese Title': data.japaneseTitle || '',
          Genres: data.genres?.join(', ') || ''
        }
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

  const renderAnimeHeader = () => (
    <View style={styles.headerContainer}>
      {/* Blurred Background Image */}
      <Image 
        source={{ uri: animeData?.info.img }} 
        style={styles.backgroundImage}
        blurRadius={3}
      />
      
      {/* Gradient Overlay */}
      <LinearGradient
        colors={['rgba(18, 18, 18, 0.3)', '#121212']}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          {/* Poster Image */}
          <View style={styles.posterContainer}>
            <Image 
              source={{ uri: animeData?.info.img }} 
              style={styles.posterImage}
            />
          </View>

          {/* Title and Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.animeTitle}>
              {animeData?.info.name}
            </Text>
            
            {/* Meta Info (Rating & Episodes) */}
            <View style={styles.metaInfo}>
              <View style={styles.ratingBadge}>
                <MaterialIcons name="star" size={16} color="#f4511e" />
                <Text style={styles.ratingText}>PG-13</Text>
              </View>
              <TouchableOpacity style={styles.episodesBadge}>
                <MaterialIcons name="playlist-play" size={20} color="#f4511e" />
                <Text style={styles.episodesText}>Episodes</Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
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
        </View>
      </LinearGradient>
    </View>
  );

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
        router.replace({
          pathname: "/anime/watch/[episodeId]",
          params: {
            episodeId: item.id,
            animeId: id as string,
            episodeNumber: item.number,
            title: item.title,
            category: selectedMode
          }
        });
      }}
      onLongPress={() => {
        handleDownload(item);
      }}
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
            <View style={styles.synopsisContainer}>
              <Text style={styles.description} numberOfLines={showMoreInfo ? undefined : 3}>
                {animeData?.info.description}
              </Text>
              <LinearGradient
                colors={['transparent', '#121212']}
                style={styles.gradientOverlay}
                pointerEvents={showMoreInfo ? 'none' : 'auto'}
                opacity={showMoreInfo ? 0 : 1}
              >
                <TouchableOpacity 
                  style={styles.moreInfoButton}
                  onPress={toggleMoreInfo}
                >
                  <Text style={styles.moreInfoText}>
                    {showMoreInfo ? 'Show Less' : 'Show More'}
                  </Text>
                  <MaterialIcons 
                    name={showMoreInfo ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                    size={24} 
                    color="#f4511e" 
                  />
                </TouchableOpacity>
              </LinearGradient>
            </View>

            {/* More Info Content */}
            <Animated.View style={[
              styles.moreInfoContent,
              {
                maxHeight: animatedHeight.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1000]
                }),
                opacity: animatedHeight
              }
            ]}>
              <View style={styles.infoGrid}>
                {Object.entries(animeData?.moreInfo || {}).map(([key, value]) => (
                  <View key={key} style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{key}</Text>
                    <Text style={styles.infoValue}>
                      {Array.isArray(value) ? value.join(', ') : value}
                    </Text>
                  </View>
                ))}
              </View>
              
              {/* Show Less button when expanded */}
              {showMoreInfo && (
                <TouchableOpacity 
                  style={[styles.moreInfoButton, styles.showLessButton]}
                  onPress={toggleMoreInfo}
                >
                  <Text style={styles.moreInfoText}>Show Less</Text>
                  <MaterialIcons name="keyboard-arrow-up" size={24} color="#f4511e" />
                </TouchableOpacity>
              )}
            </Animated.View>
          </View>
        )
      },
      {
        title: 'episodes',
        data: [null],
        renderItem: () => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Episodes</Text>
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
                  Sub ({animeData.info.episodes.sub || 0})
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
                  Dub ({animeData.info.episodes.dub || 0})
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
                    setCurrentPage(1); // Reset to first page on search
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
                <View style={styles.synopsisContainer}>
                  <Text style={styles.description} numberOfLines={showMoreInfo ? undefined : 3}>
                    {animeData?.info.description}
                  </Text>
                  <LinearGradient
                    colors={['transparent', '#121212']}
                    style={styles.gradientOverlay}
                    pointerEvents={showMoreInfo ? 'none' : 'auto'}
                    opacity={showMoreInfo ? 0 : 1}
                  >
                    <TouchableOpacity 
                      style={styles.moreInfoButton}
                      onPress={toggleMoreInfo}
                    >
                      <Text style={styles.moreInfoText}>
                        {showMoreInfo ? 'Show Less' : 'Show More'}
                      </Text>
                      <MaterialIcons 
                        name={showMoreInfo ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                        size={24} 
                        color="#f4511e" 
                      />
                    </TouchableOpacity>
                  </LinearGradient>
                </View>

                {/* More Info Content */}
                <Animated.View style={[
                  styles.moreInfoContent,
                  {
                    maxHeight: animatedHeight.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1000]
                    }),
                    opacity: animatedHeight
                  }
                ]}>
                  <View style={styles.infoGrid}>
                    {Object.entries(animeData?.moreInfo || {}).map(([key, value]) => (
                      <View key={key} style={styles.infoItem}>
                        <Text style={styles.infoLabel}>{key}</Text>
                        <Text style={styles.infoValue}>
                          {Array.isArray(value) ? value.join(', ') : value}
                        </Text>
                      </View>
                    ))}
                  </View>
                  
                  {/* Show Less button when expanded */}
                  {showMoreInfo && (
                    <TouchableOpacity 
                      style={[styles.moreInfoButton, styles.showLessButton]}
                      onPress={toggleMoreInfo}
                    >
                      <Text style={styles.moreInfoText}>Show Less</Text>
                      <MaterialIcons name="keyboard-arrow-up" size={24} color="#f4511e" />
                    </TouchableOpacity>
                  )}
                </Animated.View>
              </View>
            )
          },
          {
            title: 'episodes',
            data: [null],
            renderItem: () => (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Episodes</Text>
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
                      Sub ({animeData.info.episodes.sub || 0})
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
                      Dub ({animeData.info.episodes.dub || 0})
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
                        setCurrentPage(1); // Reset to first page on search
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
  episodesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244,81,30,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  episodesText: {
    color: '#f4511e',
    fontSize: 14,
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
  bookmarkButton: {
    padding: 8,
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
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
}); 