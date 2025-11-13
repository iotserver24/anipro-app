import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, Platform, Modal } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
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

// Add predefined genres (expanded)
const ANIME_GENRES = [
  { id: 'action', name: 'Action' },
  { id: 'adventure', name: 'Adventure' },
  { id: 'comedy', name: 'Comedy' },
  { id: 'drama', name: 'Drama' },
  { id: 'fantasy', name: 'Fantasy' },
  { id: 'horror', name: 'Horror' },
  { id: 'mystery', name: 'Mystery' },
  { id: 'romance', name: 'Romance' },
  { id: 'sci-fi', name: 'Sci-Fi' },
  { id: 'slice-of-life', name: 'Slice of Life' },
  { id: 'sports', name: 'Sports' },
  { id: 'supernatural', name: 'Supernatural' },
  { id: 'thriller', name: 'Thriller' },
  { id: 'ecchi', name: 'Ecchi' },
  { id: 'harem', name: 'Harem' },
  { id: 'isekai', name: 'Isekai' },
  { id: 'mecha', name: 'Mecha' },
  { id: 'music', name: 'Music' },
  { id: 'psychological', name: 'Psychological' },
  { id: 'school', name: 'School' },
  { id: 'military', name: 'Military' },
  { id: 'historical', name: 'Historical' },
  { id: 'demons', name: 'Demons' },
  { id: 'magic', name: 'Magic' },
  { id: 'vampire', name: 'Vampire' },
];

// Add advanced filter types (extended for more flexibility)
const ANIME_TYPES = [
  { id: '', name: 'All Types' },
  { id: 'tv', name: 'TV' },
  { id: 'movie', name: 'Movie' },
  { id: 'ova', name: 'OVA' },
  { id: 'ona', name: 'ONA' },
  { id: 'special', name: 'Special' },
];
const ANIME_SORTS = [
  { id: '', name: 'Default' },
  { id: 'recently-added', name: 'Recently Added' },
  { id: 'score', name: 'Score' },
  { id: 'popularity', name: 'Popularity' },
];
const ANIME_SEASONS = [
  { id: '', name: 'All Seasons' },
  { id: 'winter', name: 'Winter' },
  { id: 'spring', name: 'Spring' },
  { id: 'summer', name: 'Summer' },
  { id: 'fall', name: 'Fall' },
];
const ANIME_LANGUAGES = [
  { id: '', name: 'All Languages' },
  { id: 'sub', name: 'Sub' },
  { id: 'dub', name: 'Dub' },
  { id: 'sub-&-dub', name: 'Sub & Dub' },
];
const ANIME_STATUSES = [
  { id: '', name: 'All Statuses' },
  { id: 'finished-airing', name: 'Finished Airing' },
  { id: 'currently-airing', name: 'Currently Airing' },
  { id: 'not-yet-aired', name: 'Not Yet Aired' },
];
const ANIME_RATINGS = [
  { id: '', name: 'All Ratings' },
  { id: 'g', name: 'G' },
  { id: 'pg', name: 'PG' },
  { id: 'pg-13', name: 'PG-13' },
  { id: 'r', name: 'R' },
  { id: 'r+', name: 'R+' },
  { id: 'rx', name: 'Rx' },
];
const ANIME_SCORES = [
  { id: 'good', name: 'Good' },
  { id: 'very-good', name: 'Very Good' },
  { id: 'excellent', name: 'Excellent' },
];

// Add a helper for rendering dropdowns (simple touchable list)
const SimpleDropdown = ({ label, options, value, onChange }: { label: string, options: { id: string, name: string }[], value: string, onChange: (v: string) => void }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={{ color: '#fff', marginBottom: 4 }}>{label}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt.id}
          style={[styles.dropdownOption, value === opt.id && styles.dropdownOptionActive]}
          onPress={() => onChange(value === opt.id ? '' : opt.id)}
        >
          <Text style={[styles.dropdownOptionText, value === opt.id && styles.dropdownOptionTextActive]}>{opt.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

// Dropdown component for single-select (with bigger options and red tick)
const Dropdown = ({ label, options, value, onChange, open, setOpen }: { label: string, options: { id: string, name: string }[], value: string, onChange: (v: string) => void, open: boolean, setOpen: (v: boolean) => void }) => (
  <View style={styles.dropdownContainer}>
    <TouchableOpacity style={styles.dropdownHeader} onPress={() => setOpen(!open)}>
      <Text style={styles.dropdownHeaderText}>{label}: {options.find(o => o.id === value)?.name || 'Any'}</Text>
      <Text style={styles.dropdownArrow}>{open ? '▲' : '▼'}</Text>
    </TouchableOpacity>
    {open && (
      <View style={styles.dropdownList}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.id}
            style={[styles.dropdownOption, value === opt.id && styles.dropdownOptionActive]}
            onPress={() => { onChange(opt.id); setOpen(false); }}
          >
            <View style={styles.dropdownOptionRow}>
              <Text style={[styles.dropdownOptionText, value === opt.id && styles.dropdownOptionTextActive]}>{opt.name}</Text>
              {value === opt.id && (
                <MaterialIcons name="check-box" size={22} color="#f4511e" style={{ marginLeft: 8 }} />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    )}
  </View>
);

// Dropdown for genres (multi-select, bigger, red tick)
const GenreDropdown = ({ label, options, values, onChange, open, setOpen }: { label: string, options: { id: string, name: string }[], values: string[], onChange: (v: string[]) => void, open: boolean, setOpen: (v: boolean) => void }) => (
  <View style={styles.dropdownContainer}>
    <TouchableOpacity style={styles.dropdownHeader} onPress={() => setOpen(!open)}>
      <Text style={styles.dropdownHeaderText}>{label}: {values.length ? values.map(id => options.find(o => o.id === id)?.name).join(', ') : 'Any'}</Text>
      <Text style={styles.dropdownArrow}>{open ? '▲' : '▼'}</Text>
    </TouchableOpacity>
    {open && (
      <View style={styles.dropdownList}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.id}
            style={[styles.dropdownOption, values.includes(opt.id) && styles.dropdownOptionActive]}
            onPress={() => {
              if (values.includes(opt.id)) {
                onChange(values.filter(id => id !== opt.id));
              } else {
                onChange([...values, opt.id]);
              }
            }}
          >
            <View style={styles.dropdownOptionRow}>
              <Text style={[styles.dropdownOptionText, values.includes(opt.id) && styles.dropdownOptionTextActive]}>{opt.name}</Text>
              {values.includes(opt.id) && (
                <MaterialIcons name="check-box" size={22} color="#f4511e" style={{ marginLeft: 8 }} />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    )}
  </View>
);

export default function Search() {
  const { theme, hasBackgroundMedia } = useTheme();
  const params = useLocalSearchParams<{ query?: string | string[] }>();

  const normalizedQuery = useMemo(() => {
    const rawQuery = Array.isArray(params.query)
      ? params.query[0]
      : params.query;
    if (typeof rawQuery !== 'string' || rawQuery.trim().length === 0 || rawQuery === 'undefined') {
      return '';
    }
    try {
      return decodeURIComponent(rawQuery);
    } catch {
      return rawQuery;
    }
  }, [params.query]);

  const [searchText, setSearchText] = useState(normalizedQuery);
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

  // Add new states for advanced filters
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedSort, setSelectedSort] = useState<string>('');
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedRated, setSelectedRated] = useState<string>('');
  const [selectedScore, setSelectedScore] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [customScore, setCustomScore] = useState('');
  const [customType, setCustomType] = useState('');
  const [customStatus, setCustomStatus] = useState('');
  const [customRated, setCustomRated] = useState('');
  const [customSeason, setCustomSeason] = useState('');
  const [customLanguage, setCustomLanguage] = useState('');
  const [customSort, setCustomSort] = useState('');

  // Add new state for modal visibility
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string>('');
  const [pendingFilters, setPendingFilters] = useState<any>(null); // store filters before applying

  // Add initialization effect
  useEffect(() => {
    initializeStore();
  }, []);

  const handleSearch = (text: string) => {
    console.log('[Search] handleSearch called with text:', text);
    setSearchText(text);
    setCurrentPage(1);
    const trimmed = text.trim();
    const apiQuery = trimmed.length > 0 ? trimmed.toLowerCase().replace(/\s+/g, '-') : undefined;
    router.setParams(apiQuery ? { query: apiQuery } : {});
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

  // Helper to get current filter state
  const getCurrentFilters = () => ({
    genres: selectedGenres,
    type: selectedType,
    sort: selectedSort,
    season: selectedSeason,
    language: selectedLanguage,
    status: selectedStatus,
    rated: selectedRated,
    score: customScore,
    startDate,
    endDate,
  });

  // Helper to set all filters
  const setAllFilters = (filters: any) => {
    setSelectedGenres(filters.genres || []);
    setSelectedType(filters.type || '');
    setSelectedSort(filters.sort || '');
    setSelectedSeason(filters.season || '');
    setSelectedLanguage(filters.language || '');
    setSelectedStatus(filters.status || '');
    setSelectedRated(filters.rated || '');
    setCustomScore(filters.score || '');
    setStartDate(filters.startDate || '');
    setEndDate(filters.endDate || '');
  };

  // Only search when apply is clicked
  const [appliedFilters, setAppliedFilters] = useState<any>(getCurrentFilters());
  useEffect(() => {
    setAllFilters(appliedFilters);
    // (Removed searchAnime call from here)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters]);

  useEffect(() => {
    setSearchText(normalizedQuery);
    setCurrentPage(1);
  }, [normalizedQuery]);

  // NEW: Trigger search when searchText, appliedFilters, or currentPage changes
  useEffect(() => {
    if (searchText && searchText.trim().length > 0) {
      searchAnime();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, appliedFilters, currentPage]);

  // Update searchAnime to use new API and advanced filters
  const searchAnime = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchText) params.append('q', searchText);
      params.append('page', currentPage.toString());
      if (selectedGenres.length > 0) params.append('genres', selectedGenres.join(','));
      if (selectedType) params.append('type', selectedType);
      if (selectedSort) params.append('sort', selectedSort);
      if (selectedSeason) params.append('season', selectedSeason);
      if (selectedLanguage) params.append('language', selectedLanguage);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedRated) params.append('rated', selectedRated);
      if (selectedScore) params.append('score', selectedScore);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      // Add custom filter values if provided
      if (customScore) params.set('score', customScore);
      if (customType) params.set('type', customType);
      if (customStatus) params.set('status', customStatus);
      if (customRated) params.set('rated', customRated);
      if (customSeason) params.set('season', customSeason);
      if (customLanguage) params.set('language', customLanguage);
      if (customSort) params.set('sort', customSort);
      const url = `https://ani.anisurge.me/api/v2/hianime/search?${params.toString()}`;
      console.log('[Search] searchAnime called. Fetching:', url);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const animes = data?.data?.animes || [];
      const transformedResults = animes.map((item: any) => ({
        id: item.id,
        title: item.name || 'Unknown Title',
        image: item.poster || '',
        type: item.type || '',
        releaseDate: '',
        rating: item.rating || '', // ADDED
        duration: item.duration || '', // ADDED
        episodes: item.episodes || {}, // ADDED
        subOrDub: item.episodes?.dub > 0 && item.episodes?.sub > 0 ? 'sub & dub' : (item.episodes?.dub > 0 ? 'dub' : 'sub'), // for legacy
        episodeNumber: (item.episodes?.sub || 0) + (item.episodes?.dub || 0),
        status: item.status || '',
        genres: [],
      }));
      setResults(currentPage === 1 ? transformedResults : [...results, ...transformedResults]);
      setHasNextPage(data?.data?.hasNextPage || false);
      setTotalPages(data?.data?.totalPages || 1);
      console.log('[Search] searchAnime results:', transformedResults.length, 'animes found.');
    } catch (error) {
      console.error('[Search] Error searching anime:', error);
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

  // Update FilterSection to support advanced filters
  const FilterSection = () => (
    <Modal
      visible={filterModalVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={[styles.fullscreenModalOverlay, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.fullscreenFilterPanel, { backgroundColor: theme.colors.background }]}>
          <ScrollView>
            <GenreDropdown
              label="Genres"
              options={genres}
              values={pendingFilters ? pendingFilters.genres : selectedGenres}
              onChange={v => setPendingFilters((f: any) => ({ ...f, genres: v }))}
              open={openDropdown === 'genres'}
              setOpen={v => setOpenDropdown(v ? 'genres' : '')}
            />
            <Dropdown
              label="Type"
              options={ANIME_TYPES}
              value={pendingFilters ? pendingFilters.type : selectedType}
              onChange={v => setPendingFilters((f: any) => ({ ...f, type: v }))}
              open={openDropdown === 'type'}
              setOpen={v => setOpenDropdown(v ? 'type' : '')}
            />
            <Dropdown
              label="Sort"
              options={ANIME_SORTS}
              value={pendingFilters ? pendingFilters.sort : selectedSort}
              onChange={v => setPendingFilters((f: any) => ({ ...f, sort: v }))}
              open={openDropdown === 'sort'}
              setOpen={v => setOpenDropdown(v ? 'sort' : '')}
            />
            <Dropdown
              label="Season"
              options={ANIME_SEASONS}
              value={pendingFilters ? pendingFilters.season : selectedSeason}
              onChange={v => setPendingFilters((f: any) => ({ ...f, season: v }))}
              open={openDropdown === 'season'}
              setOpen={v => setOpenDropdown(v ? 'season' : '')}
            />
            <Dropdown
              label="Language"
              options={ANIME_LANGUAGES}
              value={pendingFilters ? pendingFilters.language : selectedLanguage}
              onChange={v => setPendingFilters((f: any) => ({ ...f, language: v }))}
              open={openDropdown === 'language'}
              setOpen={v => setOpenDropdown(v ? 'language' : '')}
            />
            <Dropdown
              label="Status"
              options={ANIME_STATUSES}
              value={pendingFilters ? pendingFilters.status : selectedStatus}
              onChange={v => setPendingFilters((f: any) => ({ ...f, status: v }))}
              open={openDropdown === 'status'}
              setOpen={v => setOpenDropdown(v ? 'status' : '')}
            />
            <Dropdown
              label="Rated"
              options={ANIME_RATINGS}
              value={pendingFilters ? pendingFilters.rated : selectedRated}
              onChange={v => setPendingFilters((f: any) => ({ ...f, rated: v }))}
              open={openDropdown === 'rated'}
              setOpen={v => setOpenDropdown(v ? 'rated' : '')}
            />
            {/* Score and Dates */}
            <View style={{ marginBottom: 18 }}>
              <Text style={styles.filterLabel}>Score</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="e.g. good"
                placeholderTextColor="#888"
                value={pendingFilters ? pendingFilters.score : customScore}
                onChangeText={v => setPendingFilters((f: any) => ({ ...f, score: v }))}
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.filterLabel}>Start Date</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="yyyy-mm-dd"
                  placeholderTextColor="#888"
                  value={pendingFilters ? pendingFilters.startDate : startDate}
                  onChangeText={v => setPendingFilters((f: any) => ({ ...f, startDate: v }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterLabel}>End Date</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="yyyy-mm-dd"
                  placeholderTextColor="#888"
                  value={pendingFilters ? pendingFilters.endDate : endDate}
                  onChangeText={v => setPendingFilters((f: any) => ({ ...f, endDate: v }))}
                />
              </View>
            </View>
            <TouchableOpacity style={styles.clearFiltersButton} onPress={() => setPendingFilters({
              genres: [],
              type: '',
              sort: '',
              season: '',
              language: '',
              status: '',
              rated: '',
              score: '',
              startDate: '',
              endDate: ''
            })}>
              <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyFiltersButton} onPress={() => {
              setFilterModalVisible(false);
              setAppliedFilters(pendingFilters || {});
            }}>
              <Text style={styles.applyFiltersButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderAnimeCard = ({ item }: { item: SearchAnime & { rating?: string, duration?: string, type?: string, episodes?: { sub?: number, dub?: number } } }) => {
    // Extract badges and info
    const is18 = item.rating === '18+';
    return (
      <View style={styles.animeCardContainer}>
        <TouchableOpacity
          style={styles.animeCard}
          onPress={() => router.push({
            pathname: "/anime/[id]",
            params: { id: item.id }
          })}
        >
          <Image source={{ uri: item.image }} style={styles.animeImage} />
          {/* 18+ badge in top-left */}
          {is18 && (
            <View style={styles.badge18Absolute}>
              <Text style={styles.badge18Text}>18+</Text>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.gradient}
          >
            <View>
              <Text style={styles.animeName} numberOfLines={2}>{item.title}</Text>
              <View style={styles.infoContainer}>
                {/* Type */}
                {item.type && (
                  <View style={styles.badge}><Text style={styles.badgeText}>{item.type}</Text></View>
                )}
                {/* Duration */}
                {item.duration && (
                  <View style={styles.badge}><Text style={styles.badgeText}>{item.duration}</Text></View>
                )}
              </View>
              {item.episodeNumber > 0 && (
                <View style={styles.episodeInfo}>
                  <MaterialIcons name="tv" size={12} color="#fff" />
                  <Text style={styles.episodeText}>
                    {item.episodeNumber} Episodes
                  </Text>
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
  };

  return (
    <View style={[styles.container, { backgroundColor: hasBackgroundMedia ? 'transparent' : theme.colors.background }]}>
      <View style={[styles.searchBarContainer, { backgroundColor: theme.colors.surface }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search anime..."
            placeholderTextColor={theme.colors.textSecondary}
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
          onPress={() => {
            setPendingFilters(getCurrentFilters());
            setFilterModalVisible(true);
          }}
        >
          <MaterialIcons 
            name="filter-list" 
            size={24} 
            color={Object.values(appliedFilters).some(v => v && (Array.isArray(v) ? v.length : true)) ? "#f4511e" : "#666"} 
          />
        </TouchableOpacity>
      </View>

      {FilterSection()}

      {/* Show applied filters as chips under the search bar */}
      {Object.entries(appliedFilters).some(([k, v]) => v && (Array.isArray(v) ? v.length : v)) && (
        <View style={[styles.activeFiltersBar, { flexWrap: 'wrap' }]}>
          {Object.entries(appliedFilters).map(([key, value]) => {
            if (!value || (Array.isArray(value) && value.length === 0)) return null;
            if (key === 'genres') {
              return (value as string[]).map(genreId => (
                <View key={key + '-' + genreId} style={styles.filterChip}>
                  <Text style={styles.filterChipText}>{genres.find(g => g.id === genreId)?.name || genreId}</Text>
                  <TouchableOpacity onPress={() => setAppliedFilters((f: any) => ({ ...f, genres: (f.genres || []).filter((g: string) => g !== genreId) }))}>
                    <MaterialIcons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ));
            }
            let label = '';
            switch (key) {
              case 'type': label = 'Type'; break;
              case 'sort': label = 'Sort'; break;
              case 'season': label = 'Season'; break;
              case 'language': label = 'Language'; break;
              case 'status': label = 'Status'; break;
              case 'rated': label = 'Rated'; break;
              case 'score': label = 'Score'; break;
              case 'startDate': label = 'Start'; break;
              case 'endDate': label = 'End'; break;
              default: label = key;
            }
            return (
              <View key={key} style={styles.filterChip}>
                <Text style={styles.filterChipText}>{label}: {value}</Text>
                <TouchableOpacity onPress={() => setAppliedFilters((f: any) => ({ ...f, [key]: '' }))}>
                  <MaterialIcons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {searchText && (
        <Text style={styles.searchTitle}>Results for "{searchText}"</Text>
      )}

      {loading && currentPage === 1 ? (
        <ActivityIndicator size="large" color="#f4511e" style={styles.loader} />
      ) : !searchText ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Type something to search...</Text>
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
    backgroundColor: 'transparent', // Will be overridden by theme
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
  filterSectionVertical: {
    backgroundColor: '#181818',
    padding: 16,
    maxHeight: 400,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    marginBottom: 8,
  },
  filterLabel: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
    fontSize: 14,
  },
  genreCheckboxContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  genreCheckbox: {
    backgroundColor: '#222',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  genreCheckboxActive: {
    backgroundColor: '#f4511e',
  },
  genreCheckboxText: {
    color: '#888',
    fontSize: 12,
  },
  genreCheckboxTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dropdownOption: {
    backgroundColor: '#222',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  dropdownOptionActive: {
    backgroundColor: '#f4511e',
  },
  dropdownOptionText: {
    color: '#888',
    fontSize: 15,
  },
  dropdownOptionTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  filterInput: {
    backgroundColor: '#222',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 40,
    fontSize: 16,
    marginBottom: 0,
  },
  clearFiltersButton: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  clearFiltersButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterPanel: {
    backgroundColor: '#181818',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: Platform.OS === 'web' ? 600 : 500,
  },
  dropdownContainer: {
    marginBottom: 18,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#222',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dropdownHeaderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dropdownArrow: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 8,
  },
  dropdownList: {
    backgroundColor: '#232323',
    borderRadius: 8,
    marginTop: 4,
    paddingVertical: 6,
  },
  applyFiltersButton: {
    backgroundColor: '#f4511e',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  applyFiltersButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  fullscreenModalOverlay: {
    flex: 1,
    backgroundColor: '#181818',
    justifyContent: 'flex-start',
  },
  fullscreenFilterPanel: {
    flex: 1,
    backgroundColor: '#181818',
    padding: 16,
    paddingTop: 32,
  },
  dropdownOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeFiltersBar: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#181818',
    borderBottomWidth: 1,
    borderBottomColor: '#232323',
    minHeight: undefined,
    height: undefined,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4511e',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4, // smaller vertical padding
    marginRight: 8,
    marginBottom: 4,
    alignSelf: 'flex-start', // ensures chip is only as wide as its content
    minHeight: undefined,
    minWidth: undefined,
    height: undefined,
    width: undefined,
  },
  filterChipText: {
    color: '#fff',
    fontSize: 14,
    marginRight: 4,
    fontWeight: '500',
  },
  badge: {
    backgroundColor: '#222',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 2,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  badge18: {
    backgroundColor: '#f4511e',
  },
  badge18Absolute: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#f4511e',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    zIndex: 2,
    alignSelf: 'flex-start',
  },
  badge18Text: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
}); 