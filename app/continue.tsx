import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomNav from '../components/BottomNav';
import { useWatchHistoryStore, WatchHistoryItem } from '../store/watchHistoryStore';
import { formatDistanceToNow } from 'date-fns';

export default function ContinueWatching() {
  const { history, initializeHistory, removeFromHistory } = useWatchHistoryStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    //////console.log('[DEBUG] ContinuePage: Initializing watch history');
    setLoading(true);
    initializeHistory().then(() => {
      //////console.log('[DEBUG] ContinuePage: Watch history initialized with', history.length, 'items');
      setLoading(false);
    }).catch(error => {
      console.error('[DEBUG] ContinuePage: Error initializing watch history:', error);
      setError('Failed to load watch history');
      setLoading(false);
    });
  }, []);

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

  if (!history || history.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="history" size={64} color="#666" />
        <Text style={styles.emptyText}>No watch history yet</Text>
        <Text style={styles.emptySubtext}>Start watching anime to see your history here</Text>
      </View>
    );
  }

  const handleRemove = (item: WatchHistoryItem) => {
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
  };

  const formatLastWatched = (timestamp: number) => {
    if (!timestamp) return '';
    try {
      return formatDistanceToNow(timestamp, { addSuffix: true });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return '';
    }
  };

  const handlePress = (item: WatchHistoryItem) => {
    // Only pass resumeTime if we have valid progress
    const resumeTimeParam = item.progress && item.progress > 0 ? 
      item.progress.toString() : undefined;
    
    //////console.log(`[DEBUG] ContinuePage: Navigating to episode with resumeTime: ${resumeTimeParam}, progress: ${item.progress}`);
    
    // Force a small delay to ensure the navigation works properly
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
  };

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
          <Text style={styles.lastWatchedText}>{formatLastWatched(item.lastWatched)}</Text>
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
  ), [handlePress, handleRemove, formatLastWatched]);

  // Add a getItemLayout function to optimize FlatList rendering
  const getItemLayout = useCallback((data, index) => {
    const ITEM_HEIGHT = 150; // Adjust this to match your actual item height
    return {
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Continue Watching</Text>
      <FlatList
        data={history}
        renderItem={renderWatchItem}
        keyExtractor={(item) => item.episodeId}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        getItemLayout={getItemLayout}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={5}
      />
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    padding: 16,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  watchCard: {
    height: 200,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
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
    height: '100%',
    padding: 16,
    justifyContent: 'flex-end',
  },
  contentContainer: {
    gap: 4,
  },
  animeName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  episodeInfo: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
  lastWatchedText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginTop: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#f4511e',
    borderRadius: 2,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
  browseButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f4511e',
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
}); 