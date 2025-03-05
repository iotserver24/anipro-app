import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, Dimensions, Platform, Animated, TouchableWithoutFeedback, TextInput, Alert, Share } from 'react-native';
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

type Episode = {
  name: string;
  episodeId: string;
  episodeNo: number;
  filler: boolean;
};

type AnimeInfo = {
  info: {
    id: string;
    name: string;
    img: string;
    rating: string;
    episodes: {
      sub: number;
      dub: number;
      total: number;
    };
    description: string;
  };
  moreInfo: {
    [key: string]: string | string[];
  };
};

type APIEpisode = {
  episodeId: string;
  episodeNo: number;
  filler: boolean;
  name: string;
};

type DownloadStatus = {
  [key: string]: {
    progress: number;
    status: 'idle' | 'downloading' | 'completed' | 'error';
  };
};

const { width, height } = Dimensions.get('window');

export default function AnimeDetails() {
  const { id } = useLocalSearchParams();
  const [animeData, setAnimeData] = useState<AnimeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [episodeList, setEpisodeList] = useState<Episode[]>([]);
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
    episodeInfo: Episode | null;
  }>({
    sourceData: null,
    episodeInfo: null
  });
  const { isBookmarked, addAnime, removeAnime } = useMyListStore();

  useEffect(() => {
    if (id) {
      fetchAnimeDetails();
      fetchEpisodeList();
    }
  }, [id]);

  useEffect(() => {
    router.setParams({
      headerRight: () => (
        <TouchableOpacity 
          style={styles.bookmarkButton}
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
            size={28} 
            color="#f4511e" 
          />
        </TouchableOpacity>
      )
    });
  }, [animeData, id]);

  const fetchAnimeDetails = async () => {
    try {
      const response = await fetch(`https://anime-api-app-nu.vercel.app/aniwatch/anime/${id}`);
      const data = await response.json();
      setAnimeData(data);
    } catch (error) {
      console.error('Error fetching anime details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEpisodeList = async () => {
    setEpisodesLoading(true);
    try {
      const response = await fetch(`https://anime-api-app-nu.vercel.app/aniwatch/episodes/${id}`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      console.log('Episodes response:', data);
      
      if (data && Array.isArray(data.episodes)) {
        const formattedEpisodes = data.episodes.map((ep: APIEpisode) => ({
          name: ep.name || `Episode ${ep.episodeNo}`,
          episodeId: ep.episodeId,
          episodeNo: ep.episodeNo,
          filler: ep.filler
        }));
        setEpisodeList(formattedEpisodes);
      } else {
        setEpisodeList([]);
      }
    } catch (error) {
      console.error('Error fetching episodes:', error);
      setEpisodeList([]);
    } finally {
      setEpisodesLoading(false);
    }
  };

  const getFilteredEpisodes = () => {
    if (!animeData) return [];
    
    const totalEpisodes = selectedMode === 'dub' 
      ? animeData.info.episodes.dub 
      : animeData.info.episodes.sub;
    
    return episodeList.filter(episode => episode.episodeNo <= totalEpisodes);
  };

  const getPaginatedEpisodes = () => {
    const filteredEpisodes = getFilteredEpisodes().filter(episode => {
      if (!searchQuery) return true;
      
      if (searchMode === 'number') {
        return episode.episodeNo.toString().includes(searchQuery);
      } else {
        return episode.name.toLowerCase().includes(searchQuery.toLowerCase());
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

  const handleDownload = async (episode: Episode) => {
    try {
      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) {
          Alert.alert('Permission Required', 'Storage permission is required to download episodes');
          return;
        }
      }

      console.log('Starting download for:', {
        episodeId: episode.episodeId,
        episodeNo: episode.episodeNo,
        name: episode.name
      });

      const response = await fetch(
        `https://anime-api-app-nu.vercel.app/aniwatch/episode-srcs?id=${episode.episodeId}&server=megacloud&category=${selectedMode}`
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
      const message = `Check out ${animeData.info.name}!\n\nOpen in AniPro: ${shareUrl}\n\nInstall AniPro to watch anime: [Add your app store link here]`;
      
      await Share.share({
        message,
        title: animeData.info.name,
        url: shareUrl // This makes the URL clickable in some apps
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const renderAnimeHeader = () => {
    if (!animeData) return null;

    return (
      <View style={styles.headerContainer}>
        <Image 
          source={{ uri: animeData.info.img }} 
          style={styles.posterImage}
        />
        <LinearGradient
          colors={['transparent', 'rgba(18,18,18,0.8)', '#121212']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Text style={styles.animeTitle}>{animeData.info.name}</Text>
            <View style={styles.headerActions}>
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
                <MaterialIcons 
                  name="share" 
                  size={24} 
                  color="#f4511e" 
                />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
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

  const renderEpisode = ({ item }: { item: Episode }) => {
    if (!item) return null;

    const downloadStatus = downloads[item.episodeId] || { progress: 0, status: 'idle' };

    return (
      <TouchableOpacity 
        style={styles.episodeCard}
        onPress={() => router.push({
          pathname: "/anime/watch/[episodeId]",
          params: { 
            episodeId: item.episodeId,
            animeId: id as string,
            episodeNumber: item.episodeNo,
            title: item.name,
            category: selectedMode
          }
        })}
      >
        <View style={styles.episodeContent}>
          <View style={styles.episodeNumberContainer}>
            <Text style={styles.episodeNumber}>{item.episodeNo}</Text>
          </View>
          <View style={styles.episodeInfo}>
            <Text style={styles.episodeTitle} numberOfLines={1}>{item.name}</Text>
            {item.filler && <Text style={styles.fillerBadge}>Filler</Text>}
          </View>
          <View style={styles.episodeActions}>
            <MaterialIcons name="play-circle-outline" size={24} color="#f4511e" />
            <TouchableOpacity 
              style={styles.downloadButton}
              onPress={() => handleDownload(item)}
              disabled={downloadStatus.status === 'downloading'}
            >
              {downloadStatus.status === 'downloading' ? (
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>
                    {Math.round(downloadStatus.progress * 100)}%
                  </Text>
                </View>
              ) : downloadStatus.status === 'completed' ? (
                <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
              ) : downloadStatus.status === 'error' ? (
                <MaterialIcons name="error" size={24} color="#f44336" />
              ) : (
                <MaterialIcons name="file-download" size={24} color="#666" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container} bounces={false}>
      {renderAnimeHeader()}

      {/* Info Section with Synopsis */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        
        <View style={styles.synopsisContainer}>
          <Text style={styles.description} numberOfLines={showMoreInfo ? undefined : 3}>
            {animeData.info.description}
          </Text>
          
          {!showMoreInfo && (
            <LinearGradient
              colors={['rgba(18, 18, 18, 0)', 'rgba(18, 18, 18, 0.95)']}
              style={styles.gradientOverlay}
            >
              <TouchableWithoutFeedback onPress={toggleMoreInfo}>
                <View style={styles.moreInfoButton}>
                  <Text style={styles.moreInfoText}>More Info</Text>
                  <MaterialIcons name="keyboard-arrow-down" size={24} color="#f4511e" />
                </View>
              </TouchableWithoutFeedback>
            </LinearGradient>
          )}
        </View>

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
            {Object.entries(animeData.moreInfo).map(([key, value]) => (
              <View key={key} style={styles.infoItem}>
                <Text style={styles.infoLabel}>{key}</Text>
                <Text style={styles.infoValue}>
                  {Array.isArray(value) ? value.join(', ') : value}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {showMoreInfo && (
          <TouchableWithoutFeedback onPress={toggleMoreInfo}>
            <View style={styles.lessInfoButton}>
              <Text style={styles.moreInfoText}>Show Less</Text>
              <MaterialIcons name="keyboard-arrow-up" size={24} color="#f4511e" />
            </View>
          </TouchableWithoutFeedback>
        )}
      </View>

      {/* Episodes Section */}
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
              keyExtractor={(item) => item?.episodeId || ''}
              scrollEnabled={false}
              contentContainerStyle={styles.episodesList}
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

      <DownloadOptionsModal
        isVisible={showDownloadModal}
        onClose={() => {
          setShowDownloadModal(false);
          setSelectedEpisodeData({ sourceData: null, episodeInfo: null });
        }}
        sourceData={selectedEpisodeData.sourceData}
        episodeInfo={selectedEpisodeData.episodeInfo}
      />
    </ScrollView>
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
    height: height * 0.4,
    width: '100%',
    position: 'relative',
  },
  posterImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  headerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
    justifyContent: 'flex-end',
    padding: 16,
  },
  headerContent: {
    gap: 12,
  },
  animeTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
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
  lessInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 8,
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
  episodeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  downloadButton: {
    padding: 4,
  },
  progressContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    color: '#f4511e',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bookmarkButton: {
    padding: 8,
  },
}); 