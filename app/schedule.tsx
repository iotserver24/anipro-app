import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import dayjs from 'dayjs';

interface ScheduledAnime {
  id: string;
  time: string;
  name: string;
  jname: string;
  airingTimestamp: number;
  secondsUntilAiring: number;
  episode: number;
  bannerUrl: string | null;
  bannerType: 'banner' | 'poster' | 'unknown';
}

export default function ScheduleScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [animes, setAnimes] = useState<ScheduledAnime[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://anisurge.me/api/schedule-cache`);
      const json = await res.json();
      if (json.success && Array.isArray(json.scheduledAnimes)) {
        setAnimes(json.scheduledAnimes);
      } else {
        setError('Failed to load schedule.');
      }
    } catch (e) {
      setError('Failed to load schedule.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchedule();
  };

  const renderAnime = ({ item }: { item: ScheduledAnime }) => {
    const airingTime = dayjs(item.airingTimestamp).format('HH:mm');
    const isAiringSoon = item.secondsUntilAiring > 0;
    const showBanner = item.bannerUrl && (item.bannerType === 'banner' || item.bannerType === 'poster');
    return (
      <TouchableOpacity
        style={styles.animeCard}
        onPress={() => router.push(`/anime/${item.id}`)}
        activeOpacity={0.8}
      >
        {showBanner && (
          <>
            <Image
              source={{ uri: item.bannerUrl! }}
              style={styles.bannerImage}
              resizeMode="cover"
              blurRadius={0}
            />
            <LinearGradient
              colors={["rgba(18,18,18,0)", "#121212"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.6, y: 0 }}
           style={styles.bannerGradient}
            />
          </>
        )}
        <View style={styles.cardContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.animeTitle} numberOfLines={2}>{item.name}</Text>
          </View>
          <View style={styles.detailsContainer}>
            <View style={styles.timeRow}>
              <MaterialIcons name="schedule" size={18} color="#f4511e" style={{ marginRight: 4 }} />
              <Text style={styles.timeText}>{airingTime}</Text>
            </View>
            <View style={styles.episodeRow}>
              <MaterialIcons name="confirmation-number" size={16} color="#888" />
              <Text style={styles.episodeText}>Episode {item.episode}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  function formatCountdown(seconds: number) {
    if (seconds <= 0) return 'Aired';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Schedule',
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#fff',
        }}
      />
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#f4511e" style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchSchedule}>
              <MaterialIcons name="refresh" size={20} color="#fff" />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={animes}
            keyExtractor={(item, idx) => item.id + '-' + item.episode + '-' + idx}
            renderItem={renderAnime}
            contentContainerStyle={animes.length === 0 ? styles.centered : undefined}
            ListEmptyComponent={<Text style={styles.emptyText}>No scheduled anime for today.</Text>}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f4511e" />}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 0,
  },
  animeCard: {
    position: 'relative',
    flexDirection: 'column',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 0,
    elevation: 2,
    overflow: 'hidden',
    minHeight: 110,
  },
  bannerContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  bannerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.8,
    borderRadius: 12,
    zIndex: 0,
  },
  bannerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    borderRadius: 12,
    zIndex: 1,
  },
  cardContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    flex: 0.6,
    justifyContent: 'center',
    paddingLeft: 8,
    zIndex: 2,
  },
  detailsContainer: {
    flex: 0.4,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 12,
    zIndex: 2,
  },
  timeContainer: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 60,
  },
  timeText: {
    color: '#f4511e',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 4,
  },
  infoContainer: {
    flex: 1,
    marginLeft: '30%',
  },
  animeTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  japaneseTitle: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 6,
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  episodeText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 4,
    marginRight: 8,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: 'rgba(76,175,80,0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  countdownText: {
    color: '#4CAF50',
    fontSize: 13,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  errorText: {
    color: '#f4511e',
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4511e',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
}); 