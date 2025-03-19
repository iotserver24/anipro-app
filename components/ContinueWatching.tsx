import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import { useWatchHistoryStore } from '../store/watchHistoryStore';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { logger } from '../utils/logger';
import { FALLBACK_IMAGE } from '../store/watchHistoryStore';
import { formatDistanceToNow } from 'date-fns';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.35;

export const ContinueWatching = () => {
  const { history, removeFromHistory } = useWatchHistoryStore();

  if (!history || history.length === 0) {
    return null;
  }

  // Group history items by anime ID and get the most recent episode for each
  const groupedHistory = history.reduce((acc, item) => {
    if (!acc[item.id] || item.lastWatched > acc[item.id].lastWatched) {
      acc[item.id] = item;
    }
    return acc;
  }, {} as Record<string, typeof history[0]>);

  // Convert grouped history to array and sort by last watched time
  const uniqueHistory = Object.values(groupedHistory)
    .sort((a, b) => b.lastWatched - a.lastWatched)
    .slice(0, 5);

  const formatProgress = (progress: number, duration: number) => {
    if (!progress || !duration) return 0;
    const percentage = (progress / duration) * 100;
    return Math.min(Math.max(Math.round(percentage), 0), 100); // Ensure between 0-100
  };

  const formatLastWatched = (timestamp: number) => {
    if (!timestamp) return '';
    try {
      return formatDistanceToNow(timestamp, { addSuffix: true });
    } catch (error) {
      logger.error('Error formatting timestamp:', error);
      return '';
    }
  };

  const handlePress = (item: any) => {
    if (!item?.episodeId || !item?.id) {
      logger.error('Invalid item data:', item);
      return;
    }

    // Only pass resumeTime if we have valid progress
    const resumeTimeParam = item.progress && item.progress > 0 ? 
      item.progress.toString() : undefined;
    
    //console.log(`[DEBUG] ContinueWatching: Navigating to episode with resumeTime: ${resumeTimeParam}, progress: ${item.progress}`);
    
    // Force a small delay to ensure the navigation works properly
    setTimeout(() => {
      router.push({
        pathname: "/anime/watch/[episodeId]",
        params: {
          episodeId: item.episodeId,
          animeId: item.id,
          episodeNumber: item.episodeNumber || 1,
          title: item.name || 'Unknown Anime',
          category: item.subOrDub || 'sub',
          resumeTime: resumeTimeParam
        }
      });
    }, 100);
  };

  const handleRemove = (item: any) => {
    Alert.alert(
      "Remove from History",
      `Remove "${item.name}" from continue watching?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Remove",
          onPress: () => {
            removeFromHistory(item.id);
          },
          style: "destructive"
        }
      ]
    );
  };

  const handleImageError = (item: any) => {
    logger.error(`Failed to load image for anime: ${item.name}`, item.img);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Continue Watching</Text>
        <TouchableOpacity
          style={styles.seeMoreButton}
          onPress={() => router.push('/history')}
        >
          <Text style={styles.seeMoreText}>See More</Text>
          <MaterialIcons name="chevron-right" size={24} color="#f4511e" />
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {uniqueHistory.map((item, index) => (
          <TouchableOpacity
            key={`${item.episodeId}-${index}`}
            style={styles.card}
            onPress={() => handlePress(item)}
          >
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => handleRemove(item)}
            >
              <MaterialIcons name="close" size={20} color="#fff" />
            </TouchableOpacity>

            <Image
              source={{ 
                uri: item.img || FALLBACK_IMAGE,
                headers: {
                  'User-Agent': 'Mozilla/5.0',
                  'Accept': 'image/webp,image/*,*/*;q=0.8',
                }
              }}
              style={styles.image}
              resizeMode="cover"
              onError={() => {
                logger.error(`Failed to load image for anime: ${item.name}`, item.img);
              }}
            />

            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${formatProgress(item.progress, item.duration)}%` }
                ]} 
              />
            </View>

            <View style={styles.info}>
              <Text style={styles.animeName} numberOfLines={1}>
                {item.name || 'Unknown Anime'}
              </Text>
              <View style={styles.episodeRow}>
                <Text style={styles.episodeText}>
                  Episode {item.episodeNumber || '?'}
                </Text>
                <View style={styles.typeIndicator}>
                  {item.subOrDub === 'dub' ? (
                    <Ionicons name="mic-outline" size={14} color="#f4511e" />
                  ) : (
                    <MaterialIcons name="subtitles" size={14} color="#f4511e" />
                  )}
                </View>
              </View>
              <Text style={styles.lastWatchedText}>
                {formatLastWatched(item.lastWatched)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
    marginBottom: 10,
  },
  card: {
    width: CARD_WIDTH,
    marginLeft: 10,
    marginBottom: 5,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: CARD_WIDTH * 1.5,
    backgroundColor: '#2a2a2a', // Add background color for when image is loading
  },
  progressBar: {
    height: 3,
    backgroundColor: '#333',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f4511e',
  },
  info: {
    padding: 8,
  },
  animeName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  episodeText: {
    color: '#999',
    fontSize: 12,
  },
  typeIndicator: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    padding: 4,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 10,
    marginBottom: 10,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
    zIndex: 2,
  },
  lastWatchedText: {
    color: '#999',
    fontSize: 10,
    marginTop: 2,
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeMoreText: {
    color: '#f4511e',
    fontSize: 16,
    marginRight: 4,
  },
}); 