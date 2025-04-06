import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useWatchHistoryStore, WatchHistoryItem } from '../store/watchHistoryStore';
import { formatDistanceToNow } from 'date-fns';
import { auth } from '../services/firebase';
import { syncService } from '../services/syncService';

export default function History() {
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

  const renderWatchItem = useCallback(({ item }: { item: WatchHistoryItem }) => (
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
                { width: `${(item.progress / item.duration) * 100}%` }
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
  ), [handlePress, handleRemove]);

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f4511e" />
        <Text style={styles.loadingText}>Loading watch history...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Watch History</Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearAll}
        >
          <MaterialIcons name="delete" size={24} color="#f4511e" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search history..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {filteredHistory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="history" size={64} color="#666" />
          <Text style={styles.emptyText}>No watch history found</Text>
          {searchQuery ? (
            <Text style={styles.emptySubtext}>Try different search terms</Text>
          ) : (
            <Text style={styles.emptySubtext}>Start watching anime to see your history here</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          renderItem={renderWatchItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          getItemLayout={getItemLayout}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={5}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  clearButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  searchIcon: {
    marginRight: 8,
    color: '#666',
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#fff',
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
    padding: 16,
    backgroundColor: '#1a1a1a',
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
  listContainer: {
    padding: 16,
  },
  watchCard: {
    width: '100%',
    height: 200,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#2a2a2a',
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
}); 