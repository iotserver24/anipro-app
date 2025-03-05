import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomNav from '../components/BottomNav';
import { useWatchHistoryStore, WatchHistoryItem } from '../store/watchHistoryStore';

export default function ContinueWatching() {
  const { history, initializeStore, removeFromHistory } = useWatchHistoryStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeStore();
      } catch (err) {
        setError('Failed to load watch history');
        console.error('Error loading watch history:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#f4511e" />
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

  if (!history.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No watch history yet</Text>
        <TouchableOpacity 
          style={styles.browseButton}
          onPress={() => router.push('/')}
        >
          <Text style={styles.browseButtonText}>Browse Anime</Text>
        </TouchableOpacity>
        <BottomNav />
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

  const renderWatchItem = ({ item }: { item: WatchHistoryItem }) => (
    <TouchableOpacity
      style={styles.watchCard}
      onPress={() => router.push({
        pathname: "/anime/watch/[episodeId]",
        params: { 
          episodeId: item.episodeId,
          animeId: item.id,
          episodeNumber: item.episodeNumber,
        }
      })}
    >
      <Image source={{ uri: item.img }} style={styles.animeImage} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.gradient}
      >
        <View style={styles.contentContainer}>
          <Text style={styles.animeName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.episodeInfo}>Episode {item.episodeNumber}</Text>
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
        <MaterialIcons name="close" size={20} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Continue Watching</Text>
      <FlatList
        data={history}
        renderItem={renderWatchItem}
        keyExtractor={(item) => item.episodeId}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
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
}); 