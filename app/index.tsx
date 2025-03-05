import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl, ScrollView, Dimensions, Animated } from 'react-native';
import { useEffect, useState, useRef, useCallback } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomNav from '../components/BottomNav';
import { getCachedData, setCachedData, cacheKeys } from '../utils/cache';
import { addToMyList, removeFromMyList, isInMyList } from '../utils/myList';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMyListStore } from '../store/myListStore';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.85;
const ITEM_SPACING = (width - ITEM_WIDTH) / 2;
const SPACING = 10;

type AnimeItem = {
  id: string;
  name: string;
  img: string;
  episodes?: {
    eps: number;
    sub: number;
    dub: number;
  };
};

export default function Home() {
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

  const fetchAnime = async () => {
    try {
      // Try to get cached data first
      const cached = await getCachedData(cacheKeys.HOME_DATA);
      if (cached && !refreshing) {
        setTrendingAnime(cached.trendingAnimes || []);
        setNewEpisodes(cached.latestEpisodes || []);
        setPopularAnime(cached.featuredAnimes?.mostPopularAnimes || []);
        setLoading(false);
        return;
      }

      const response = await fetch('https://anime-api-app-nu.vercel.app/aniwatch/');
      const data = await response.json();
      
      // Cache the new data
      await setCachedData(cacheKeys.HOME_DATA, data);
      
      setTrendingAnime(data.trendingAnimes || []);
      setNewEpisodes(data.latestEpisodes || []);
      setPopularAnime(data.featuredAnimes?.mostPopularAnimes || []);
    } catch (error) {
      console.error('Error fetching anime:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnime();
  }, []);

  useEffect(() => {
    initializeStore();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnime();
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
          <Image source={{ uri: item.img }} style={styles.trendingImage} />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)']}
            style={styles.gradient}
          >
            <Text style={styles.trendingTitle} numberOfLines={2}>{item.name}</Text>
            {item.episodes && (
              <View style={styles.episodeInfo}>
                <MaterialIcons name="play-circle-outline" size={16} color="#fff" />
                <Text style={styles.episodeText}>{item.episodes.eps} Episodes</Text>
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
        <Image source={{ uri: item.img }} style={styles.animeImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        >
          <Text style={styles.animeName} numberOfLines={2}>{item.name}</Text>
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
              name: item.name,
              img: item.img,
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
          {/* Add dots indicator */}
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
        </View>

        {/* New Episodes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>New Episodes</Text>
          <FlatList
            data={newEpisodes}
            renderItem={renderAnimeCard}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        </View>

        {/* Popular Anime Section */}
        <View style={[styles.section, { marginBottom: 100 }]}>
          <Text style={styles.sectionTitle}>Most Popular</Text>
          <FlatList
            data={popularAnime}
            renderItem={renderAnimeCard}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        </View>
      </ScrollView>

      {/* Floating Navigation Bar */}
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  trendingSection: {
    paddingVertical: 16,
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
    paddingHorizontal: ITEM_SPACING,
  },
  trendingCard: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * 0.6,
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
}); 