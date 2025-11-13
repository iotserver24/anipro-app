import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native';
import React, { useEffect, useState, useCallback, memo, useMemo, forwardRef, useRef } from 'react';
import { router } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useWatchHistoryStore, WatchHistoryItem } from '../store/watchHistoryStore';
import { formatDistanceToNow } from 'date-fns';
import { auth } from '../services/firebase';
import { syncService } from '../services/syncService';

interface HistoryHeaderProps {
  totalUniqueShows: number;
  totalEpisodesWatched: number;
  totalWatchTimeLabel: string;
  lastWatched?: WatchHistoryItem;
  onContinueWatching: (item: WatchHistoryItem) => void;
  onClearAll: () => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
}

const HistoryHeader = memo(forwardRef<TextInput, HistoryHeaderProps>(({
  totalUniqueShows,
  totalEpisodesWatched,
  totalWatchTimeLabel,
  lastWatched,
  onContinueWatching,
  onClearAll,
  searchQuery,
  onSearchQueryChange,
}, searchInputRef) => (
  <View>
    <LinearGradient
      colors={['#1f2933', '#141821']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.summaryCard}
    >
      <View style={styles.summaryHeader}>
        <View>
          <Text style={styles.summaryTitle}>Watch History</Text>
          <Text style={styles.summarySubtitle}>
            Keep track of everything you've watched recently
          </Text>
        </View>
        {(totalEpisodesWatched > 0) && (
          <TouchableOpacity
            style={styles.summaryClearButton}
            onPress={onClearAll}
            activeOpacity={0.8}
          >
            <MaterialIcons name="delete-outline" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.summaryStatsRow}>
        <View style={styles.summaryStat}>
          <Text style={styles.summaryStatValue}>{totalUniqueShows}</Text>
          <Text style={styles.summaryStatLabel}>Series</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryStat}>
          <Text style={styles.summaryStatValue}>{totalEpisodesWatched}</Text>
          <Text style={styles.summaryStatLabel}>Episodes</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryStat}>
          <Text style={styles.summaryStatValue}>{totalWatchTimeLabel}</Text>
          <Text style={styles.summaryStatLabel}>Watch Time</Text>
        </View>
      </View>

      {lastWatched && (
        <TouchableOpacity
          onPress={() => onContinueWatching(lastWatched)}
          activeOpacity={0.85}
          style={styles.lastWatchedCard}
        >
          <Image source={{ uri: lastWatched.img }} style={styles.lastWatchedImage} />
          <View style={styles.lastWatchedContent}>
            <Text style={styles.lastWatchedLabel}>Continue Watching</Text>
            <Text style={styles.lastWatchedTitle} numberOfLines={1}>
              {lastWatched.name}
            </Text>
            <View style={styles.lastWatchedMeta}>
              <Text style={styles.lastWatchedMetaText}>
                Episode {lastWatched.episodeNumber}
              </Text>
              <MaterialIcons name="chevron-right" size={18} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>
      )}
    </LinearGradient>

    <View style={styles.searchSection}>
      <View style={styles.searchInputWrapper}>
        <MaterialIcons name="search" size={20} color="#7a7a7a" style={styles.searchIcon} />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Search your history..."
          placeholderTextColor="#8f8f8f"
          value={searchQuery}
          onChangeText={onSearchQueryChange}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onSearchQueryChange('')}>
            <MaterialIcons name="close" size={18} color="#8f8f8f" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  </View>
)));
HistoryHeader.displayName = 'HistoryHeader';

export default function History() {
  const { theme, hasBackgroundMedia } = useTheme();
  // 1. Store hooks
  const { history, initializeHistory, clearHistory, removeFromHistory } = useWatchHistoryStore();
  
  // 2. State hooks
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 3. Callback hooks - define ALL callbacks using useCallback
  const handlePress = useCallback((item: WatchHistoryItem) => {
    const resumeTimeParam = item.progress && item.progress > 0 ? 
      item.progress.toString() : undefined;
    
    //console.log(`[DEBUG] HistoryPage: Navigating to episode with resumeTime: ${resumeTimeParam}, progress: ${item.progress}`);
    
    setTimeout(() => {
      router.push({
        pathname: "/anime/watch/[episodeId]",
        params: {
          episodeId: item.episodeId,
          animeId: item.id,
          episodeNumber: item.episodeNumber,
          title: item.name,
          category: item.subOrDub,
          resumeTime: resumeTimeParam
        }
      });
    }, 100);
  }, []);

  const handleClearAll = useCallback(() => {
    // First check if user is logged in and email is verified
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      Alert.alert(
        'Email Not Verified',
        'Please verify your email first to sync changes with cloud storage. Your local history will still be cleared.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear Local Only',
            style: 'destructive',
            onPress: async () => {
              try {
                await clearHistory();
              } catch (error) {
                console.error('Error clearing local history:', error);
                Alert.alert('Error', 'Failed to clear the local history. Please try again.');
              }
            }
          }
        ]
      );
      return;
    }

    Alert.alert(
      'Clear Watch History',
      auth.currentUser 
        ? 'Are you sure you want to clear your entire watch history? This will clear both local and cloud storage.'
        : 'Are you sure you want to clear your entire watch history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear local history
              await clearHistory();
              
              // If user is logged in and verified, sync empty history with Firestore
              if (auth.currentUser?.emailVerified) {
                await syncService.syncWatchHistory([]);
              }
            } catch (error) {
              console.error('Error clearing history:', error);
              Alert.alert(
                'Error',
                'Failed to clear the history. Please try again.'
              );
            }
          }
        }
      ]
    );
  }, [clearHistory]);

  const handleRemove = useCallback((item: WatchHistoryItem) => {
    Alert.alert(
      'Remove from History',
      'Are you sure you want to remove this from your watch history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeFromHistory(item.id)
        }
      ]
    );
  }, [removeFromHistory]);

  const renderWatchItem = useCallback(({ item }: { item: WatchHistoryItem }) => {
    const progress = typeof item.progress === 'number' ? item.progress : 0;
    const duration = typeof item.duration === 'number' && item.duration > 0 ? item.duration : null;
    const progressPercentage = duration ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;

    return (
      <TouchableOpacity
        style={styles.watchCard}
        onPress={() => handlePress(item)}
      >
        <Image source={{ uri: item.img }} style={styles.animeImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.9)']}
          style={styles.gradient}
        >
          <View style={styles.contentContainer}>
            <Text style={styles.animeName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.episodeInfo}>Episode {item.episodeNumber}</Text>
            <Text style={styles.lastWatchedText}>{formatDistanceToNow(item.lastWatched, { addSuffix: true })}</Text>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { width: `${progressPercentage}%` }
                ]} 
              />
            </View>
          </View>
        </LinearGradient>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemove(item)}
        >
          <MaterialIcons name="close" size={16} color="white" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [handlePress, handleRemove]);

  const getItemLayout = useCallback((data, index) => ({
    length: 150,
    offset: 150 * index,
    index,
  }), []);

  // 4. Effect hooks
  useEffect(() => {
    //console.log('[DEBUG] HistoryPage: Initializing watch history');
    setLoading(true);
    initializeHistory().then(() => {
      //console.log('[DEBUG] HistoryPage: Watch history initialized with', history.length, 'items');
      setLoading(false);
    }).catch(error => {
      console.error('[DEBUG] HistoryPage: Error initializing watch history:', error);
      setError('Failed to load watch history');
      setLoading(false);
    });
  }, []);

  // 5. Derived state
  const groupedHistory = history.reduce((acc, item) => {
    if (!acc[item.id] || item.lastWatched > acc[item.id].lastWatched) {
      acc[item.id] = item;
    }
    return acc;
  }, {} as Record<string, WatchHistoryItem>);

  const filteredHistory = Object.values(groupedHistory)
    .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.lastWatched - a.lastWatched);

  const totalUniqueShows = Object.keys(groupedHistory).length;
  const totalEpisodesWatched = history.length;
  const totalWatchSeconds = history.reduce((acc, item) => 
    typeof item.progress === 'number' ? acc + item.progress : acc, 
    0
  );
  const totalWatchHours = Math.floor(totalWatchSeconds / 3600);
  const totalWatchMinutes = Math.floor((totalWatchSeconds % 3600) / 60);
  const totalWatchTimeLabel = totalWatchSeconds > 0 
    ? `${totalWatchHours}h ${totalWatchMinutes}m`
    : '—';
  const lastWatched = filteredHistory[0];
  const searchInputRef = useRef<TextInput>(null);
  const shouldRefocusSearch = useRef(false);

  const handleSearchQueryChange = useCallback((value: string) => {
    shouldRefocusSearch.current = true;
    setSearchQuery(value);
  }, []);

  useEffect(() => {
    if (shouldRefocusSearch.current) {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
      shouldRefocusSearch.current = false;
    }
  }, [searchQuery]);

  const headerComponent = useMemo(() => (
    <HistoryHeader
      totalUniqueShows={totalUniqueShows}
      totalEpisodesWatched={totalEpisodesWatched}
      totalWatchTimeLabel={totalWatchTimeLabel}
      lastWatched={lastWatched}
      onContinueWatching={handlePress}
      onClearAll={handleClearAll}
      searchQuery={searchQuery}
      onSearchQueryChange={handleSearchQueryChange}
      ref={searchInputRef}
    />
  ), [
    totalUniqueShows,
    totalEpisodesWatched,
    totalWatchTimeLabel,
    lastWatched,
    handlePress,
    handleClearAll,
    searchQuery,
    handleSearchQueryChange,
  ]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading watch history...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: hasBackgroundMedia ? 'transparent' : theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.text }]}>{error}</Text>
        <TouchableOpacity 
          style={styles.browseButton}
          onPress={() => router.push('/')}
        >
          <Text style={styles.browseButtonText}>Browse Anime</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={filteredHistory}
        renderItem={renderWatchItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          filteredHistory.length === 0 && styles.listContentEmpty
        ]}
        showsVerticalScrollIndicator={false}
        getItemLayout={getItemLayout}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={5}
        ListHeaderComponent={headerComponent}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="history" size={64} color="#666" />
            <Text style={styles.emptyText}>No watch history found</Text>
            {searchQuery ? (
              <Text style={styles.emptySubtext}>Try different search terms</Text>
            ) : (
              <Text style={styles.emptySubtext}>Start watching anime to see your history here</Text>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  summaryCard: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  summaryTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  summarySubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    maxWidth: '80%',
  },
  summaryClearButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 8,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15,16,30,0.6)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  summaryStatLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 4,
  },
  summaryDivider: {
    height: '60%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  lastWatchedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(12,13,25,0.85)',
    borderRadius: 16,
    padding: 12,
    marginTop: 4,
  },
  lastWatchedImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#232323',
  },
  lastWatchedContent: {
    flex: 1,
  },
  lastWatchedLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    marginBottom: 2,
  },
  lastWatchedTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  lastWatchedMeta: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastWatchedMetaText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
  },
  searchSection: {
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2129',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  searchIcon: {
    marginRight: 10,
    color: '#7a7a7a',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    paddingVertical: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#f4511e',
    textAlign: 'center',
    margin: 16,
  },
  browseButton: {
    backgroundColor: '#f4511e',
    padding: 12,
    borderRadius: 8,
    margin: 16,
  },
  browseButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'transparent',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  listContentEmpty: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  watchCard: {
    width: '100%',
    height: 205,
    marginBottom: 18,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#202226',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  animeImage: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  contentContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  animeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  episodeInfo: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  lastWatchedText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#f4511e',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 14,
    padding: 6,
  },
}); 