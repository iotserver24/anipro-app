import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl, ScrollView, Dimensions, Animated, ActivityIndicator, AppState } from 'react-native';
import { useEffect, useState, useRef, useCallback } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCachedData, setCachedData, cacheKeys } from '../utils/cache';
import { addToMyList, removeFromMyList, isInMyList } from '../utils/myList';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMyListStore } from '../store/myListStore';
import { animeAPI } from '../services/api';
import { AnimeResult } from '../services/api';
import { ContinueWatching } from '../components/ContinueWatching';
import { logger } from '../utils/logger';
import { useWatchHistoryStore } from '../store/watchHistoryStore';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.9;
const ITEM_SPACING = (width - ITEM_WIDTH) / 2;
const SPACING = 10;

const CACHE_KEYS = {
  TRENDING_RECENT: 'home_trending_recent_cache',
  NEW_EPISODES: 'home_new_episodes_cache'
};

interface CachedData {
  timestamp: number;
  data: any;
}

const getMidnightIST = () => {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)); // Convert to IST
  const midnight = new Date(ist);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - (5.5 * 60 * 60 * 1000); // Convert back to local time
};

const isNewEpisodesCacheValid = (timestamp: number) => {
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;
  return (now - timestamp) < thirtyMinutes;
};

const isTrendingRecentCacheValid = (timestamp: number) => {
  return Date.now() < getMidnightIST();
};

type AnimeItem = AnimeResult & {
  banner?: string;
  episodes?: {
    eps: number;
    sub: number;
    dub: number;
  };
};

const mapToAnimeItem = (item: any): AnimeItem => ({
  id: item.id,
  title: item.title || item.name,
  image: item.image || item.img,
  banner: item.banner,
  subOrDub: item.subOrDub || 'sub',
  episodes: {
    eps: item.totalEpisodes || item.episodes?.eps || 0,
    sub: item.sub || item.episodes?.sub || 0,
    dub: item.dub || item.episodes?.dub || 0
  }
});

export default function Home() {
  const [recentAnime, setRecentAnime] = useState<AnimeItem[]>([]);
  const [trendingAnime, setTrendingAnime] = useState<AnimeItem[]>([]);
  const [newEpisodes, setNewEpisodes] = useState<AnimeItem[]>([]);
  const [popularAnime, setPopularAnime] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isBookmarked, addAnime, removeAnime, initializeStore } = useMyListStore();
  const { initializeHistory } = useWatchHistoryStore();

  const fetchAnime = async (bypassCache: boolean = false) => {
    try {
      setLoading(true);

      if (!bypassCache) {
        // Try loading from cache first
        const [trendingRecentCache, newEpisodesCache] = await Promise.all([
          AsyncStorage.getItem(CACHE_KEYS.TRENDING_RECENT),
          AsyncStorage.getItem(CACHE_KEYS.NEW_EPISODES)
        ]);

        if (trendingRecentCache) {
          const { timestamp, data } = JSON.parse(trendingRecentCache);
          if (isTrendingRecentCacheValid(timestamp)) {
            setTrendingAnime(data.trending);
            setRecentAnime(data.recent);
          }
        }

        if (newEpisodesCache) {
          const { timestamp, data } = JSON.parse(newEpisodesCache);
          if (isNewEpisodesCacheValid(timestamp)) {
            setNewEpisodes(data);
            if (!trendingRecentCache || !isTrendingRecentCacheValid(JSON.parse(trendingRecentCache).timestamp)) {
              // Only fetch trending and recent if their cache is invalid
              await fetchTrendingAndRecent();
            }
            setLoading(false);
            setRefreshing(false);
            return;
          }
        }
      }

      // If cache is invalid or bypassing cache, fetch everything
      await Promise.all([
        fetchTrendingAndRecent(),
        fetchNewEpisodes()
      ]);

    } catch (error) {
      logger.error('Error fetching anime:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTrendingAndRecent = async () => {
    try {
      const [recent, trending] = await Promise.all([
        animeAPI.getRecentAnime(),
        animeAPI.getTrending()
      ]);

      const recentResults = recent?.results || recent;
      const trendingResults = trending?.results || trending;

      const mappedRecent = recentResults?.map(mapToAnimeItem) || [];
      const mappedTrending = trendingResults?.map(mapToAnimeItem) || [];

      setRecentAnime(mappedRecent);
      setTrendingAnime(mappedTrending);

      // Cache the data
      const cacheData = {
        timestamp: Date.now(),
        data: {
          recent: mappedRecent,
          trending: mappedTrending
        }
      };
      await AsyncStorage.setItem(CACHE_KEYS.TRENDING_RECENT, JSON.stringify(cacheData));

    } catch (error) {
      logger.error('Error fetching trending and recent:', error);
    }
  };

  const fetchNewEpisodes = async () => {
    try {
      const latest = await animeAPI.getLatestCompleted();
      const latestResults = latest?.results || latest;
      const mappedLatest = latestResults?.map(mapToAnimeItem) || [];

      setNewEpisodes(mappedLatest);

      // Cache the data
      const cacheData = {
        timestamp: Date.now(),
        data: mappedLatest
      };
      await AsyncStorage.setItem(CACHE_KEYS.NEW_EPISODES, JSON.stringify(cacheData));

    } catch (error) {
      logger.error('Error fetching new episodes:', error);
    }
  };

  useEffect(() => {
    // Initialize watch history
    initializeHistory();
    
    // Initial fetch
    fetchAnime(false);

    // Setup app state subscription
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        fetchAnime(false);
      }
    });

    return () => {
      // Cleanup subscription
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  useEffect(() => {
    initializeStore();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnime(true); // Pass true to bypass cache
  };

  // Auto slide function
  const goToNextSlide = useCallback(() => {
    if (!trendingAnime.length) return;

    const nextIndex = (currentIndex + 1) % trendingAnime.length;
    flatListRef.current?.scrollToIndex({
      index: nextIndex,
      animated: true
    });
    setCurrentIndex(nextIndex);
  }, [currentIndex, trendingAnime.length]);

  // Setup auto sliding
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(goToNextSlide, 3000); // Changed from 7000 to 4000 for 4 seconds

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentIndex, goToNextSlide]);

  // Handle manual scroll end
  const handleScrollEnd = useCallback((event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / slideSize);
    
    setCurrentIndex(index);
  }, []);

  const renderTrendingItem = ({ item, index }: { item: AnimeItem; index: number }) => {
    const inputRange = [
      (index - 1) * ITEM_WIDTH,
      index * ITEM_WIDTH,
      (index + 1) * ITEM_WIDTH,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.9, 1, 0.9],
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.6, 1, 0.6],
    });

    return (
      <Animated.View style={[styles.trendingCard, { transform: [{ scale }], opacity }]}>
        <TouchableOpacity
          onPress={() => router.push({
            pathname: "/anime/[id]",
            params: { id: item.id }
          })}
        >
          <Image 
            source={{ uri: item.banner || item.image }} 
            style={styles.trendingImage} 
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)']}
            style={styles.gradient}
          >
            <Text style={styles.trendingTitle} numberOfLines={2}>{item.title}</Text>
            {item.episodes && (
              <View style={styles.episodeInfo}>
                <MaterialIcons name="play-circle-outline" size={16} color="#fff" />
                <Text style={styles.episodeText}>
                  {item.episodes.sub || item.episodes.eps} Episodes
                </Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderAnimeCard = ({ item }: { item: AnimeItem }) => (
    <View style={styles.animeCardContainer}>
      <TouchableOpacity 
        style={styles.animeCard}
        onPress={() => router.push({
          pathname: "/anime/[id]",
          params: { id: item.id }
        })}
      >
        <Image source={{ uri: item.image }} style={styles.animeImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        >
          <Text style={styles.animeName} numberOfLines={2}>{item.title}</Text>
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.bookmarkButton}
        onPress={async () => {
          if (isBookmarked(item.id)) {
            await removeAnime(item.id);
          } else {
            await addAnime({
              id: item.id,
              name: item.title,
              img: item.image,
              addedAt: Date.now()
            });
          }
        }}
      >
        <MaterialIcons 
          name={isBookmarked(item.id) ? "bookmark" : "bookmark-outline"} 
          size={24} 
          color="#f4511e" 
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f4511e" />
        }
      >
        {/* Trending Section */}
        <View style={styles.trendingSection}>
          <Text style={styles.sectionTitle}>Trending Now</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#f4511e" />
          ) : trendingAnime && trendingAnime.length > 0 ? (
            <>
              <Animated.FlatList
                ref={flatListRef}
                data={trendingAnime}
                renderItem={renderTrendingItem}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={ITEM_WIDTH}
                decelerationRate="fast"
                contentContainerStyle={styles.trendingList}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                  { useNativeDriver: true }
                )}
                onMomentumScrollEnd={handleScrollEnd}
                getItemLayout={(data, index) => ({
                  length: ITEM_WIDTH,
                  offset: ITEM_WIDTH * index,
                  index,
                })}
                snapToAlignment="center"
                pagingEnabled
              />
              {/* Dots indicator */}
              <View style={styles.dotsContainer}>
                {trendingAnime.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      { backgroundColor: index === currentIndex ? '#f4511e' : '#666' }
                    ]}
                  />
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.noDataText}>No trending anime available</Text>
          )}
        </View>

        <ContinueWatching />

        {/* New Episodes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>New Episodes</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#f4511e" />
          ) : newEpisodes && newEpisodes.length > 0 ? (
            <FlatList
              data={newEpisodes}
              renderItem={renderAnimeCard}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
            />
          ) : (
            <Text style={styles.noDataText}>No new episodes available</Text>
          )}
        </View>

        {/* Recent Anime Section */}
        <View style={[styles.section, { marginBottom: 100 }]}>
          <Text style={styles.sectionTitle}>Recent Anime</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#f4511e" />
          ) : recentAnime && recentAnime.length > 0 ? (
            <FlatList
              data={recentAnime}
              renderItem={renderAnimeCard}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
            />
          ) : (
            <Text style={styles.noDataText}>No recent anime available</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  trendingSection: {
    paddingVertical: 8,
  },
  section: {
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  trendingList: {
    paddingHorizontal: ITEM_SPACING / 2,
  },
  trendingCard: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * 0.5625,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  trendingImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  trendingTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  animeCardContainer: {
    position: 'relative',
  },
  animeCard: {
    width: 150,
    height: 225,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  animeImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    padding: 12,
    justifyContent: 'flex-end',
  },
  animeName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  episodeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  episodeText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
    opacity: 0.8,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  bookmarkButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 4,
    zIndex: 1,
  },
  noDataText: {
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
}); 