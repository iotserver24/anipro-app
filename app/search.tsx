import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';
import { useMyListStore } from '../store/myListStore';

type SearchAnime = {
  id: string;
  title: string;
  image: string;
  type?: string;
  releaseDate?: string;
  subOrDub?: string;
  episodeNumber?: number;
  status?: string;
};

export default function Search() {
  const { query } = useLocalSearchParams();
  const [results, setResults] = useState<SearchAnime[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const { isBookmarked, addAnime, removeAnime } = useMyListStore();

  useEffect(() => {
    if (query) {
      searchAnime();
    }
  }, [query, currentPage]);

  const searchAnime = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://conapi.anipro.site/anime/animekai/${encodeURIComponent(query as string)}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      const transformedResults = data.results.map((item: any) => ({
        id: item.id,
        title: item.title || 'Unknown Title',
        image: item.image || '',
        type: item.type || '',
        releaseDate: item.releaseDate || '',
        subOrDub: item.subOrDub || 'sub',
        episodeNumber: item.episodeNumber || 0,
        status: item.status || 'Unknown'
      }));

      setResults(transformedResults);
      setHasNextPage(data.hasNextPage || false);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error searching anime:', error);
      setResults([]);
      setHasNextPage(false);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreResults = () => {
    if (hasNextPage && !loading) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const renderAnimeCard = ({ item }: { item: SearchAnime }) => (
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
          {item.episodeNumber > 0 && (
            <View style={styles.infoContainer}>
              <View style={styles.episodeInfo}>
                <MaterialIcons name="tv" size={12} color="#fff" />
                <Text style={styles.episodeText}>
                  {item.episodeNumber} Episodes
                </Text>
              </View>
              {item.subOrDub && (
                <Text style={[styles.episodeText, styles.typeText]}>
                  {item.subOrDub.toUpperCase()}
                </Text>
              )}
            </View>
          )}
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
      <Text style={styles.searchTitle}>Results for "{query}"</Text>
      {loading && currentPage === 1 ? (
        <ActivityIndicator size="large" color="#f4511e" style={styles.loader} />
      ) : (
        <FlatList
          data={results}
          renderItem={renderAnimeCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          numColumns={2}
          onEndReached={loadMoreResults}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => (
            loading && currentPage > 1 ? (
              <ActivityIndicator color="#f4511e" style={styles.footerLoader} />
            ) : null
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No results found</Text>
            </View>
          )}
        />
      )}
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  searchTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    padding: 16,
  },
  loader: {
    flex: 1,
  },
  listContainer: {
    padding: 8,
    paddingBottom: 80,
  },
  animeCardContainer: {
    position: 'relative',
    flex: 1,
    margin: 8,
  },
  animeCard: {
    height: 225,
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
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#fff',
    opacity: 0.6,
    fontSize: 16,
  },
  footerLoader: {
    paddingVertical: 20,
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
  typeText: {
    backgroundColor: '#f4511e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    marginLeft: 8,
  },
}); 