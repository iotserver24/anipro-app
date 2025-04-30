import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useMyListStore } from '../store/myListStore';
import { API_BASE, ENDPOINTS } from '../constants/api';

// Add genre type
type Genre = {
  id: string;
  name: string;
};

// Update SearchAnime type
type SearchAnime = {
  id: string;
  title: string;
  image: string;
  type?: string;
  releaseDate?: string;
  subOrDub?: string;
  episodeNumber?: number;
  status?: string;
  genres?: string[];
};

// Add predefined genres
const ANIME_GENRES = [
  { id: 'action', name: 'Action' },
  { id: 'adventure', name: 'Adventure' },
  { id: 'comedy', name: 'Comedy' },
  { id: 'drama', name: 'Drama' },
  { id: 'fantasy', name: 'Fantasy' },
  { id: 'horror', name: 'Horror' },
  { id: 'mecha', name: 'Mecha' },
  { id: 'mystery', name: 'Mystery' },
  { id: 'psychological', name: 'Psychological' },
  { id: 'romance', name: 'Romance' },
  { id: 'sci-fi', name: 'Sci-Fi' },
  { id: 'slice-of-life', name: 'Slice of Life' },
  { id: 'sports', name: 'Sports' },
  { id: 'supernatural', name: 'Supernatural' },
  { id: 'thriller', name: 'Thriller' }
];

export default function Search() {
  const { query } = useLocalSearchParams();
  const [searchText, setSearchText] = useState(decodeURIComponent(query as string));
  const [results, setResults] = useState<SearchAnime[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const { isBookmarked, addAnime, removeAnime, initializeStore } = useMyListStore();

  // Add new states for filters
  const [genres] = useState<Genre[]>(ANIME_GENRES);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Add initialization effect
  useEffect(() => {
    initializeStore();
  }, []);

  const handleSearch = (text: string) => {
    setSearchText(text);
    setCurrentPage(1);
    const apiQuery = text.toLowerCase().trim().replace(/\s+/g, '-');
    router.setParams({ query: apiQuery });
  };

  // Add genre toggle handler
  const toggleGenre = (genreId: string) => {
    setSelectedGenres(prev => 
      prev.includes(genreId) 
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    );
    setCurrentPage(1);
  };

  useEffect(() => {
    if (searchText || selectedGenres.length > 0) {
      searchAnime();
    }
  }, [searchText, selectedGenres, currentPage]);

  const searchAnime = async () => {
    try {
      setLoading(true);
      const apiQuery = searchText.toLowerCase().trim().replace(/\s+/g, '-');
      
      // Simplified params without type and sort
      const params = new URLSearchParams({
        page: currentPage.toString(),
      });

      let url;
      if (!apiQuery && selectedGenres.length > 0) {
        // Use genre endpoint with the first selected genre
        url = `${API_BASE}${ENDPOINTS.GENRE.replace(':genre', selectedGenres[0])}?${params}`;
      } else if (apiQuery) {
        // Use search endpoint if there's a search query
        url = `${API_BASE}${ENDPOINTS.SEARCH.replace(':query', apiQuery)}?${params}`;
      } else {
        // Default to trending if no filters
        url = `${API_BASE}${ENDPOINTS.TRENDING}?${params}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if data.results exists before mapping
      const transformedResults = data?.results?.map((item: any) => ({
        id: item.id,
        title: item.title || 'Unknown Title',
        image: item.image || '',
        type: item.type || '',
        releaseDate: item.releaseDate || '',
        subOrDub: item.subOrDub || 'sub',
        episodeNumber: item.episodeNumber || 0,
        status: item.status || 'Unknown',
        genres: item.genres || []
      })) || [];

      setResults(currentPage === 1 ? transformedResults : [...results, ...transformedResults]);
      setHasNextPage(data.hasNextPage || false);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error searching anime:', error);
      setResults(currentPage === 1 ? [] : results);
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

  // Modify FilterSection to only show genres
  const FilterSection = () => (
    <View style={styles.filterSection}>
      {/* Only Genre Filters */}
      <View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.genreContainer}
        >
          {genres.map((genre, index) => (
            <TouchableOpacity
              key={`genre-${genre.id}-${index}`}
              style={[
                styles.genreButton,
                selectedGenres.includes(genre.id) && styles.genreButtonActive
              ]}
              onPress={() => toggleGenre(genre.id)}
            >
              <Text style={[
                styles.genreText,
                selectedGenres.includes(genre.id) && styles.genreTextActive
              ]}>
                {genre.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

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
          <View>
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
          </View>
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
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search anime..."
            placeholderTextColor="#666"
            value={searchText}
            onChangeText={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchText ? (
            <TouchableOpacity 
              onPress={() => handleSearch('')}
              style={styles.clearButton}
            >
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity 
          style={styles.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <MaterialIcons 
            name="filter-list" 
            size={24} 
            color={showFilters ? "#f4511e" : "#666"} 
          />
        </TouchableOpacity>
      </View>

      {showFilters && <FilterSection />}

      {searchText && (
        <Text style={styles.searchTitle}>Results for "{searchText}"</Text>
      )}

      {loading && currentPage === 1 ? (
        <ActivityIndicator size="large" color="#f4511e" style={styles.loader} />
      ) : !searchText && !selectedGenres.length ? (
        <View style={styles.emptyStateContainer}>
          <Ionicons 
            name="search-outline" 
            size={64} 
            color="rgba(255, 255, 255, 0.2)" 
          />
          <View style={styles.animatedTextContainer}>
            <Text style={styles.emptyStateText}>Start typing to</Text>
            <ActivityIndicator
              size="small"
              color="#f4511e"
              style={styles.textAnimation}
            />
            <Text style={[styles.emptyStateText, styles.highlightText]}>
              discover anime
            </Text>
          </View>
        </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#1a1a1a',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
    height: '100%',
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  searchTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  loader: {
    flex: 1,
  },
  listContainer: {
    padding: 8,
    paddingBottom: 16,
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
  filterSection: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 8,
  },
  genreContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  genreButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#222',
    marginRight: 8,
  },
  genreButtonActive: {
    backgroundColor: '#f4511e',
  },
  genreText: {
    color: '#666',
    fontSize: 12,
  },
  genreTextActive: {
    color: '#fff',
  },
  filterToggle: {
    padding: 8,
    marginLeft: 8,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  animatedTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyStateText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 18,
    marginRight: 8,
  },
  highlightText: {
    color: '#f4511e',
    fontWeight: 'bold',
  },
  textAnimation: {
    marginHorizontal: 8,
    marginBottom: 4,
  },
}); 