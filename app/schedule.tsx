import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl, ScrollView, AppState } from 'react-native';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AnimeScheduleItem {
  id: string;
  title: string;
  japaneseTitle: string;
  airingTime: string;
  airingEpisode: string;
}

interface ScheduleData {
  [key: string]: AnimeScheduleItem[];
}

// Add new interface for cached data
interface CachedScheduleData {
  timestamp: number;
  data: ScheduleData;
}

// Add cache constants
const CACHE_KEY = 'anime_schedule_cache';
const CACHE_DURATION = 4 * 24 * 60 * 60 * 1000; // 4 days in milliseconds

const MONTHS_DE_TO_EN: { [key: string]: string } = {
  'Januar': 'January',
  'Februar': 'February',
  'März': 'March',
  'April': 'April',
  'Mai': 'May',
  'Juni': 'June',
  'Juli': 'July',
  'August': 'August',
  'September': 'September',
  'Oktober': 'October',
  'November': 'November',
  'Dezember': 'December'
};

const DAYS_DE_TO_EN: { [key: string]: string } = {
  'Montag': 'Monday',
  'Dienstag': 'Tuesday',
  'Mittwoch': 'Wednesday',
  'Donnerstag': 'Thursday',
  'Freitag': 'Friday',
  'Samstag': 'Saturday',
  'Sonntag': 'Sunday'
};

const convertToEnglishDate = (germanDate: string) => {
  // Example input: "Mittwoch, 05.03.2025"
  const [day, date] = germanDate.split(', ');
  const englishDay = DAYS_DE_TO_EN[day];
  const [dd, mm, yyyy] = date.split('.');
  return `${englishDay}, ${dd}/${mm}/${yyyy}`;
};

const convertToIST = (germanTime: string) => {
  // Example input: "~ 14:10 Uhr"
  const timeMatch = germanTime.match(/(\d{2}):(\d{2})/);
  if (!timeMatch) return 'Time TBA';

  // Convert CET/CEST to IST (UTC+5:30)
  // Assuming input is in CET (UTC+1) during winter and CEST (UTC+2) during summer
  const [hours, minutes] = timeMatch.slice(1).map(Number);
  
  // Add 4.5 hours for CET to IST conversion (or 3.5 hours during CEST)
  // You might want to add proper DST detection here
  const istHours = hours + 4;
  const istMinutes = minutes + 30;
  
  let finalHours = istHours + Math.floor(istMinutes / 60);
  const finalMinutes = istMinutes % 60;
  
  // Handle day rollover
  if (finalHours >= 24) {
    finalHours -= 24;
  }

  // Convert to 12-hour format
  const period = finalHours >= 12 ? 'PM' : 'AM';
  const hours12 = finalHours % 12 || 12;
  
  return `${hours12}:${finalMinutes.toString().padStart(2, '0')} ${period} IST`;
};

export default function Schedule() {
  const [schedule, setSchedule] = useState<ScheduleData>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Get dates for the current week
  const getWeekDates = () => {
    const today = new Date();
    const dates = [];
    
    // Start from today and get next 3 days (total 4 days including today)
    for (let i = 0; i < 4; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]); // Format: YYYY-MM-DD
    }
    
    return dates;
  };

  const loadCachedSchedule = async () => {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const { timestamp, data }: CachedScheduleData = JSON.parse(cachedData);
        const now = Date.now();
        
        // Check if cache is still valid (within 4 days)
        if (now - timestamp < CACHE_DURATION) {
          setSchedule(data);
          
          // Set today's date as selected
          const today = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
          });
          setSelectedDate(today);
          return true; // Cache was valid and loaded
        }
      }
      return false; // No valid cache found
    } catch (error) {
      console.error('Error loading cached schedule:', error);
      return false;
    }
  };

  const saveScheduleToCache = async (scheduleData: ScheduleData) => {
    try {
      const cacheData: CachedScheduleData = {
        timestamp: Date.now(),
        data: scheduleData
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error saving schedule to cache:', error);
    }
  };

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const weekDates = getWeekDates();
      const groupedSchedule: ScheduleData = {};

      // Fetch schedule for each date
      for (const date of weekDates) {
        console.log(`Fetching schedule for ${date}...`);
        const response = await fetch(`https://conapi.anipro.site/anime/animekai/schedule/${date}`);
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        
        // Format date for display
        const displayDate = new Date(date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric'
        });
        
        groupedSchedule[displayDate] = data.results.map((anime: any) => ({
          id: anime.id,
          title: anime.title,
          japaneseTitle: anime.japaneseTitle,
          airingTime: anime.airingTime,
          airingEpisode: anime.airingEpisode
        }));
      }

      setSchedule(groupedSchedule);
      
      // Save to cache
      await saveScheduleToCache(groupedSchedule);
      
      // Select today's date by default
      const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });
      setSelectedDate(today);
      
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  // Modified useEffect to check cache first
  useEffect(() => {
    const initializeSchedule = async () => {
      // Check if we need to refresh the cache
      const lastUpdate = await AsyncStorage.getItem('last_schedule_update');
      const today = new Date().toDateString();
      
      if (lastUpdate !== today) {
        // If last update was not today, fetch new data
        await fetchSchedule();
        await AsyncStorage.setItem('last_schedule_update', today);
      } else {
        // Try loading from cache first
        const cachedDataLoaded = await loadCachedSchedule();
        if (!cachedDataLoaded) {
          await fetchSchedule();
        }
      }
    };

    initializeSchedule();

    // Check for new day when app comes to foreground
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        const lastUpdate = await AsyncStorage.getItem('last_schedule_update');
        const today = new Date().toDateString();
        
        if (lastUpdate !== today) {
          await fetchSchedule();
          await AsyncStorage.setItem('last_schedule_update', today);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Modified onRefresh to update cache
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSchedule(); // This will also update the cache
    setRefreshing(false);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const renderAnimeCard = ({ item }: { item: AnimeScheduleItem }) => (
    <TouchableOpacity 
      style={styles.animeCard}
      onPress={() => router.push({
        pathname: "/anime/[id]",
        params: { id: item.id }
      })}
    >
      <View style={styles.cardContent}>
        <Text style={styles.animeName}>{item.title}</Text>
        <Text style={styles.japaneseTitle}>{item.japaneseTitle}</Text>
        <View style={styles.infoContainer}>
          <View style={styles.episodeInfo}>
            <MaterialIcons name="tv" size={16} color="#f4511e" />
            <Text style={styles.episodeText}>Episode {item.airingEpisode}</Text>
          </View>
          <Text style={styles.episodeText}>{item.airingTime}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const formatDate = (dateString: string) => {
    console.log('Original date string:', dateString); // Debug log
    
    // Remove the day name if it exists (e.g., "Monday, 12 Jan" -> "12 Jan")
    const parts = dateString.split(', ');
    const dateWithoutDay = parts.length > 1 ? parts[1] : parts[0];
    
    return dateWithoutDay;
  };

  return (
    <View style={styles.container}>
      {/* Date selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.dateSelector}
      >
        {Object.keys(schedule).map((date, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dateButton,
              selectedDate === date && styles.selectedDate
            ]}
            onPress={() => setSelectedDate(date)}
          >
            <Text style={[
              styles.dateText,
              selectedDate === date && styles.selectedDateText
            ]}>
              {formatDate(date)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={schedule[selectedDate] || []}
        renderItem={renderAnimeCard}
        keyExtractor={(item) => `${item.id}-${item.airingEpisode}`}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#f4511e" 
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {loading ? 'Loading schedule...' : 'No anime scheduled for this date'}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  dateSelector: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  dateButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  selectedDate: {
    borderBottomWidth: 2,
    borderBottomColor: '#f4511e',
  },
  dateText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
  selectedDateText: {
    color: '#fff',
    opacity: 1,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  animeCard: {
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#f4511e',
  },
  cardContent: {
    padding: 16,
  },
  animeName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  episodeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  episodeText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
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
  japaneseTitle: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 8,
  },
}); 