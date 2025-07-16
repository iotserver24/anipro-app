import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';

interface ScheduledAnime {
  id: string;
  time: string;
  name: string;
  jname: string;
  airingTimestamp: number;
  secondsUntilAiring: number;
  episode: number;
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
      const today = dayjs().format('YYYY-MM-DD');
      const res = await fetch(`https://ani.anisurge.me/api/v2/hianime/schedule?date=${today}`);
      const json = await res.json();
      if (json.status === 200 && json.data && Array.isArray(json.data.scheduledAnimes)) {
        setAnimes(json.data.scheduledAnimes);
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
    return (
      <TouchableOpacity
        style={styles.animeCard}
        onPress={() => router.push(`/anime/${item.id}`)}
        activeOpacity={0.8}
      >
        <View style={styles.timeContainer}>
          <MaterialIcons name="schedule" size={20} color="#f4511e" />
          <Text style={styles.timeText}>{airingTime}</Text>
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.animeTitle}>{item.name}</Text>
          <Text style={styles.japaneseTitle}>{item.jname}</Text>
          <View style={styles.episodeRow}>
            <MaterialIcons name="confirmation-number" size={16} color="#888" />
            <Text style={styles.episodeText}>Episode {item.episode}</Text>
            {isAiringSoon && (
              <View style={styles.countdownContainer}>
                <MaterialIcons name="timer" size={16} color="#4CAF50" />
                <Text style={styles.countdownText}>{formatCountdown(item.secondsUntilAiring)}</Text>
              </View>
            )}
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    elevation: 2,
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
}); 