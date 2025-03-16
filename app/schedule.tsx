import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl, ScrollView, AppState } from 'react-native';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMyListStore } from '../store/myListStore';
import * as Notifications from 'expo-notifications';
import { logger } from '../utils/logger';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

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

// Configure notifications globally (outside of any component)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Request notification permissions
export const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      logger.warn('Notification permissions not granted');
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Error requesting notification permissions:', error);
    return false;
  }
};

// Modify the checkAndNotifyAiringAnime function to accept a bypassHistory parameter
export const checkAndNotifyAiringAnime = async (schedule: ScheduleData, myList: any[], selectedDate: string, bypassHistory: boolean = false) => {
  try {
    // Check permissions first
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      logger.warn('No notification permission');
      return;
    }

    const scheduleForDate = schedule[selectedDate] || [];
    let notificationCount = 0;

    for (const scheduledAnime of scheduleForDate) {
      try {
        const isInMyList = myList.some(item => item.id === scheduledAnime.id);
        
        if (isInMyList) {
          let shouldNotify = true;
          
          if (!bypassHistory) {
            // Only check notification history if not bypassing
            const notificationKey = `notified_${scheduledAnime.id}_${scheduledAnime.airingEpisode}`;
            const alreadyNotified = await AsyncStorage.getItem(notificationKey);
            shouldNotify = !alreadyNotified;
          }
          
          if (shouldNotify) {
            const identifier = await Notifications.scheduleNotificationAsync({
              content: {
                title: `Airing on ${selectedDate}: ${scheduledAnime.title}`,
                body: `Episode ${scheduledAnime.airingEpisode} airs at ${scheduledAnime.airingTime}`,
                data: {
                  deepLink: `anisurge://anime/${scheduledAnime.id}`,
                  animeId: scheduledAnime.id,
                  episode: scheduledAnime.airingEpisode
                },
              },
              trigger: null, // Send immediately
            });

            if (identifier) {
              if (!bypassHistory) {
                // Only store in history if not bypassing
                await AsyncStorage.setItem(`notified_${scheduledAnime.id}_${scheduledAnime.airingEpisode}`, 'true');
              }
              notificationCount++;
              logger.info(`Scheduled notification for ${scheduledAnime.title}`);
            }
          }
        }
      } catch (animeError) {
        logger.error(`Error processing anime ${scheduledAnime.title}:`, animeError);
        continue;
      }
    }

    if (notificationCount > 0) {
      logger.info(`Sent ${notificationCount} airing notifications for ${selectedDate}`);
    } else {
      logger.info(`No new episodes airing on ${selectedDate} from your list`);
    }
  } catch (error) {
    logger.error('Error checking for airing notifications:', error);
  }
};

// Move all task-related code outside the component
const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';

const getNext1AMIST = () => {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  const next1AM = new Date(ist);
  next1AM.setHours(1, 0, 0, 0);
  
  if (ist.getHours() >= 1) {
    next1AM.setDate(next1AM.getDate() + 1);
  }
  
  return new Date(next1AM.getTime() - (5.5 * 60 * 60 * 1000));
};

// Define background task outside component
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
  try {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });

    const cachedData = await AsyncStorage.getItem(CACHE_KEY);
    if (!cachedData) return BackgroundFetch.Result.NoData;

    const { data: schedule } = JSON.parse(cachedData);
    const myListData = await AsyncStorage.getItem('my_list');
    const myList = myListData ? JSON.parse(myListData) : [];

    await checkAndNotifyAiringAnime(schedule, myList, today);
    return BackgroundFetch.Result.NewData;
  } catch (error) {
    logger.error('Background task error:', error);
    return BackgroundFetch.Result.Failed;
  }
});

export default function Schedule() {
  const [schedule, setSchedule] = useState<ScheduleData>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { myList } = useMyListStore();

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

  // Modify the manual check function to bypass history
  const handleCheckNotifications = async (selectedDate: string) => {
    try {
      logger.info('Manually checking for airing notifications...');
      await checkAndNotifyAiringAnime(schedule, myList, selectedDate, true); // Set bypassHistory to true
    } catch (error) {
      logger.error('Error in manual notification check:', error);
    }
  };

  // Add notification response handler in the main component
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      try {
        const data = response.notification.request.content.data;
        if (data?.deepLink) {
          router.push(data.deepLink.replace('anisurge://', ''));
        }
      } catch (error) {
        logger.error('Error handling notification response:', error);
      }
    });

    return () => subscription.remove();
  }, []);

  // Register background task in a separate useEffect
  useEffect(() => {
    const setupBackgroundTask = async () => {
      try {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
          minimumInterval: 24 * 60 * 60, // 24 hours in seconds
          stopOnTerminate: false,
          startOnBoot: true,
        });

        logger.info('Background task registered successfully');
      } catch (error) {
        logger.error('Failed to register background task:', error);
      }
    };

    setupBackgroundTask();
  }, []);

  return (
    <View style={styles.container}>
      {/* Date selector */}
      <View style={styles.header}>
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
      </View>

      {/* Notification button */}
      <TouchableOpacity
        style={styles.notifyButtonContainer}
        onPress={() => handleCheckNotifications(selectedDate)}
      >
        <View style={styles.notifyButton}>
          <MaterialIcons name="notifications" size={24} color="#fff" />
          <Text style={styles.notifyButtonText}>Check Notifications for {formatDate(selectedDate)}</Text>
        </View>
      </TouchableOpacity>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  dateSelector: {
    flex: 1,
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
  notifyButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  notifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4511e',
    padding: 12,
    borderRadius: 8,
  },
  notifyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
}); 