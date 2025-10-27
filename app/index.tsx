import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl, ScrollView, Dimensions, Animated, ActivityIndicator, AppState, Alert, Linking, Platform, Share, ToastAndroid, Modal } from 'react-native';
import { useEffect, useState, useRef, useCallback } from 'react';
import { router } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useResponsive } from '../hooks/useResponsive';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCachedData, setCachedData, cacheKeys } from '../utils/cache';
import { addToMyList, removeFromMyList, isInMyList } from '../utils/myList';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMyListStore } from '../store/myListStore';
import { animeAPI } from '../services/api';
import { ContinueWatching } from '../components/ContinueWatching';
import { logger } from '../utils/logger';
import { useWatchHistoryStore } from '../store/watchHistoryStore';
import Constants from 'expo-constants';
import { APP_CONFIG, getAppVersion, getAppVersionCode } from '../constants/appConfig';
import UpdateModal from '../components/UpdateModal';
import WhatsNewModal from '../components/WhatsNewModal';
import { shouldShowWhatsNew, fetchWhatsNewInfo, WhatsNewInfo } from '../utils/whatsNewUtils';
import * as Device from 'expo-device';
import { getArchitectureSpecificDownloadUrl } from '../utils/deviceUtils';
import { notificationEmitter } from './notifications';
// Background fetch removed - old feature no longer used
// Removed import to avoid circular dependency issues
import * as Notifications from 'expo-notifications';
import AuthModal from '../components/AuthModal';
import { auth } from '../services/firebase';
import * as FileSystem from 'expo-file-system';

// Remove static dimensions - will be calculated dynamically

const CACHE_KEYS = {
  TRENDING_RECENT: 'home_trending_recent_cache',
  NEW_EPISODES: 'home_new_episodes_cache',
  NEW_RELEASES: 'home_new_releases_cache',
  POPULAR: 'home_popular_cache',
  LATEST_COMPLETED: 'home_latest_completed_cache'
};

interface CachedData {
  timestamp: number;
  data: any;
}

const getMidnightIST = () => {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)); // Convert to IST
  const midnight = new Date(ist);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - (5.5 * 60 * 60 * 1000); // Convert back to local time
};

const isNewEpisodesCacheValid = (timestamp: number) => {
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;
  return (now - timestamp) < thirtyMinutes;
};

const isTrendingRecentCacheValid = (timestamp: number) => {
  return Date.now() < getMidnightIST();
};

// Define a simplified AnimeResult interface for this file
interface AnimeResult {
  id: string;
  title: string;
  image: string;
  url?: string;
  japaneseTitle?: string;
  type?: string;
  sub?: number;
  dub?: number;
  episodes?: number;
  banner?: string;
  genres?: string[];
  releaseDate?: string;
  quality?: string;
  description?: string;
}

type AnimeItem = AnimeResult & {
  banner?: string;
  subOrDub?: string;
  episodes?: {
    eps: number;
    sub: number;
    dub: number;
  } | number;
};

const mapToAnimeItem = (item: any): AnimeItem => ({
  id: item.id,
  title: item.title || item.name,
  image: item.image || item.img,
  banner: item.banner,
  subOrDub: item.subOrDub || 'sub',
  url: item.url,
  japaneseTitle: item.japaneseTitle,
  type: item.type,
  sub: item.sub,
  dub: item.dub,
  episodes: item.totalEpisodes || (item.episodes ? {
    eps: item.episodes?.eps || 0,
    sub: item.episodes?.sub || 0,
    dub: item.episodes?.dub || 0
  } : (item.sub || item.dub) ? {
    eps: Math.max(item.sub || 0, item.dub || 0),
    sub: item.sub || 0,
    dub: item.dub || 0
  } : 0),
  genres: item.genres,
  releaseDate: item.releaseDate,
  quality: item.quality,
  description: item.description
});

interface ChangelogItem {
  type: 'text' | 'image' | 'video' | 'url';
  content: string;
  title?: string;
  description?: string;
  format?: 'bold' | 'italic' | 'normal';
}

interface UpdateInfo {
  latestVersion: string;
  minVersion: string;
  versionCode: number;
  changelog: ChangelogItem[];
  downloadUrls: {
    universal: string;
    'arm64-v8a': string;
    x86_64: string;
    x86: string;
  };
  releaseDate: string;
  isForced: boolean;
  showUpdate: boolean;
  aboutUpdate?: string;
  currentAppVersion?: string;
}

const countUser = async () => {
  try {
    const response = await fetch('https://anisurge.me/api/count', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        deviceInfo: {
          brand: Platform.OS,
          model: Platform.Version.toString(),
          systemVersion: Platform.Version.toString(),
          isTablet: Platform.OS === 'ios' ? false : false,
          architecture: Platform.OS === 'android' ? 'arm64' : 'universal'
        }
      })
    });
    const data = await response.json();
    logger.info('User counted:', JSON.stringify(data));
  } catch (error) {
    logger.error('Error counting user:', String(error));
  }
};

const shareApp = async () => {
  try {
    await Share.share({
      message: `Check out ${APP_CONFIG.APP_NAME}, the best anime streaming app! Download now: ${APP_CONFIG.WEBSITE_URL}`,
    });
  } catch (error) {
    console.error('Error sharing app:', error);
  }
};

// Move notification configuration to after imports
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Background fetch functionality removed - old feature no longer used

// Add function to get next 1 AM IST trigger
const getNext1AMIST = () => {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)); // Convert to IST
  const next1AM = new Date(ist);
  next1AM.setHours(1, 0, 0, 0);
  
  // If it's past 1 AM IST, schedule for next day
  if (ist.getHours() >= 1) {
    next1AM.setDate(next1AM.getDate() + 1);
  }
  
  // Convert back to local time
  return new Date(next1AM.getTime() - (5.5 * 60 * 60 * 1000));
};

// Add this helper function before the Home component
const compareVersions = (v1: string, v2: string) => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
};

const APP_STORAGE_FOLDER_KEY = 'APP_STORAGE_FOLDER_URI';
const APP_STORAGE_FOLDER_SKIP_KEY = 'APP_STORAGE_FOLDER_SKIP';

export default function Home() {
  const { theme, hasBackgroundMedia } = useTheme();
  const responsive = useResponsive();
  const styles = createThemedStyles(theme, responsive);
  const [recentAnime, setRecentAnime] = useState<AnimeItem[]>([]);
  const [trendingAnime, setTrendingAnime] = useState<AnimeItem[]>([]);
  const [newEpisodes, setNewEpisodes] = useState<AnimeItem[]>([]);
  const [popularAnime, setPopularAnime] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isBookmarked, addAnime, removeAnime, initializeStore } = useMyListStore();
  const { initializeHistory } = useWatchHistoryStore();
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [whatsNewInfo, setWhatsNewInfo] = useState<WhatsNewInfo | null>(null);
  const [showWhatsNewModal, setShowWhatsNewModal] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [hasShownAuthPrompt, setHasShownAuthPrompt] = useState(false);
  const [latestCompleted, setLatestCompleted] = useState<AnimeItem[]>([]);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [betaUpdatesEnabled, setBetaUpdatesEnabled] = useState(false);
  const [betaChecked, setBetaChecked] = useState(false);

  // Optimized fetch function - prioritize trending for immediate display
  const fetchAnime = async (bypassCache: boolean = false) => {
    try {
      setLoading(true);

      if (!bypassCache) {
        // Try loading from cache first - prioritize trending for immediate display
        const trendingRecentCache = await AsyncStorage.getItem(CACHE_KEYS.TRENDING_RECENT);
        
        if (trendingRecentCache) {
          const { timestamp, data } = JSON.parse(trendingRecentCache);
          if (isTrendingRecentCacheValid(timestamp)) {
            setTrendingAnime(data.trending);
            setRecentAnime(data.recent);
            setLoading(false); // Show trending immediately
            setRefreshing(false);
            
            // Load other sections in background
            Promise.all([
              AsyncStorage.getItem(CACHE_KEYS.NEW_EPISODES),
              AsyncStorage.getItem(CACHE_KEYS.POPULAR),
              AsyncStorage.getItem(CACHE_KEYS.LATEST_COMPLETED)
            ]).then(([newEpisodesCache, popularCache, completedCache]) => {
              if (newEpisodesCache) {
                const { timestamp, data } = JSON.parse(newEpisodesCache);
                if (isNewEpisodesCacheValid(timestamp)) {
                  setNewEpisodes(data);
                } else {
                  fetchNewEpisodes();
                }
              } else {
                fetchNewEpisodes();
              }

              if (popularCache) {
                const { timestamp, data } = JSON.parse(popularCache);
                if (isNewEpisodesCacheValid(timestamp)) {
                  setPopularAnime(data);
                } else {
                  fetchPopularAnime();
                }
              } else {
                fetchPopularAnime();
              }

              if (completedCache) {
                const { timestamp, data } = JSON.parse(completedCache);
                if (isNewEpisodesCacheValid(timestamp)) {
                  setLatestCompleted(data);
                } else {
                  fetchLatestCompleted();
                }
              } else {
                fetchLatestCompleted();
              }
            });
            return;
          }
        }
      }

      // If no cache or bypassing cache, fetch trending first for immediate display
      await fetchTrendingAndRecent();
      setLoading(false); // Show trending immediately
      setRefreshing(false);
      
      // Load other sections in background
      Promise.all([
        fetchNewEpisodes(),
        fetchPopularAnime(),
        fetchLatestCompleted()
      ]).catch(error => {
        logger.error('Error fetching background data:', String(error));
      });

    } catch (error) {
      logger.error('Error fetching anime:', String(error));
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTrendingAndRecent = async () => {
    try {
      const [recent, trending] = await Promise.all([
        animeAPI.getRecentAnime(),
        animeAPI.getTrending()
      ]);

      // Handle both array and object with results property
      const recentResults = Array.isArray(recent) ? recent : ((recent as any)?.results || []);
      const trendingResults = Array.isArray(trending) ? trending : ((trending as any)?.results || []);

      const mappedRecent = recentResults?.map(mapToAnimeItem) || [];
      const mappedTrending = trendingResults?.map(mapToAnimeItem) || [];

      setRecentAnime(mappedRecent);
      setTrendingAnime(mappedTrending);

      // Cache the data
      const cacheData = {
        timestamp: Date.now(),
        data: {
          recent: mappedRecent,
          trending: mappedTrending
        }
      };
      await AsyncStorage.setItem(CACHE_KEYS.TRENDING_RECENT, JSON.stringify(cacheData));

    } catch (error) {
      logger.error('Error fetching trending and recent:', String(error));
    }
  };

  const fetchNewEpisodes = async () => {
    try {
      const latest = await animeAPI.getRecentAnime();
      // Handle both array and object with results property
      const latestResults = Array.isArray(latest) ? latest : ((latest as any)?.results || []);
      const mappedLatest = latestResults?.map(mapToAnimeItem) || [];

      setNewEpisodes(mappedLatest);

      // Cache the data
      const cacheData = {
        timestamp: Date.now(),
        data: mappedLatest
      };
      await AsyncStorage.setItem(CACHE_KEYS.NEW_EPISODES, JSON.stringify(cacheData));

    } catch (error) {
      logger.error('Error fetching new episodes:', String(error));
    }
  };

  const fetchPopularAnime = async () => {
    try {
      const popular = await animeAPI.getPopularAnime();
      const mappedPopular = popular?.map(mapToAnimeItem) || [];
      setPopularAnime(mappedPopular);

      // Cache the data
      const cacheData = {
        timestamp: Date.now(),
        data: mappedPopular
      };
      await AsyncStorage.setItem(CACHE_KEYS.POPULAR, JSON.stringify(cacheData));
    } catch (error) {
      logger.error('Error fetching popular anime:', String(error));
    }
  };


  const fetchLatestCompleted = async () => {
    try {
      const completed = await animeAPI.getLatestCompleted();
      const mappedCompleted = completed?.map(mapToAnimeItem) || [];
      setLatestCompleted(mappedCompleted);

      // Cache the data
      const cacheData = {
        timestamp: Date.now(),
        data: mappedCompleted
      };
      await AsyncStorage.setItem(CACHE_KEYS.LATEST_COMPLETED, JSON.stringify(cacheData));
    } catch (error) {
      logger.error('Error fetching latest completed anime:', String(error));
    }
  };

  const checkForUpdates = async () => {
    try {
      const response = await fetch(`${APP_CONFIG.API_BASE_URL}/updates`);
      
      // Check if the response is ok
      if (!response.ok) {
        throw new Error(`Failed to check for updates: ${response.status}`);
      }
      
      const updateData: UpdateInfo = await response.json();
      
      // Validate the required fields
      if (!updateData || !updateData.latestVersion || !updateData.downloadUrls || !updateData.downloadUrls.universal) {
        logger.error('Invalid update data received:', JSON.stringify(updateData));
        return;
      }
      
      // Handle legacy format (string[] instead of ChangelogItem[])
      if (updateData.changelog && Array.isArray(updateData.changelog) && 
          updateData.changelog.length > 0 && typeof updateData.changelog[0] === 'string') {
        updateData.changelog = (updateData.changelog as unknown as string[]).map(item => ({
          type: 'text',
          content: item,
          format: 'normal'
        }));
      }
      
      // Ensure aboutUpdate exists
      if (updateData.aboutUpdate === undefined) {
        updateData.aboutUpdate = '';
      }
      
      // Set currentAppVersion to our actual app version (overriding any server value)
      // This ensures we're displaying the correct current version in the UI
      updateData.currentAppVersion = getAppVersion();
      
      // Ensure isForced exists
      if (updateData.isForced === undefined) {
        updateData.isForced = false;
      }
      
      const currentVersion = getAppVersion();
      const currentVersionCode = getAppVersionCode();
      
      // Compare our actual app version with the server's latest version
      const versionComparison = compareVersions(currentVersion, updateData.latestVersion);
      if (versionComparison < 0 || (versionComparison === 0 && currentVersionCode < updateData.versionCode)) {
        // Only show if forced, or (showUpdate and beta enabled)
        if (updateData.isForced || (updateData.showUpdate && betaUpdatesEnabled)) {
          setUpdateInfo(updateData);
          if (updateData.isForced) {
            setShowUpdateModal(true);
          } else {
            setShowUpdateBanner(true);
          }
        }
      }
    } catch (error) {
      logger.error('Error checking for updates:', String(error));
    }
  };

  const handleUpdate = () => {
    if (!updateInfo) return;
    
    // The URL opening is now handled in the UpdateModal component
    // This function is called after the URL is opened
    logger.info('Update initiated for version:', updateInfo.latestVersion);
  };

  const checkWhatsNew = async () => {
    try {
      // Check if the modal should be shown
      const shouldShow = await shouldShowWhatsNew();
      
      if (shouldShow) {
        // Fetch the "What's New" information
        const info = await fetchWhatsNewInfo();
        
        if (info) {
          setWhatsNewInfo(info);
          setShowWhatsNewModal(true);
        }
      }
    } catch (error) {
      logger.error('Error checking "What\'s New":', String(error));
    }
  };

  const checkForUnreadNotifications = async () => {
    try {
      // Get device ID
      const deviceId = await AsyncStorage.getItem('device_id');
      if (!deviceId) return;
      
      // Get locally stored read notifications
      const readIdsStr = await AsyncStorage.getItem('read_notifications');
      const readIds = readIdsStr ? JSON.parse(readIdsStr) : [];
      
      // Fetch notifications from API
      const response = await fetch(`${APP_CONFIG.API_BASE_URL}/notifications`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.status}`);
      }
      
      const notifications = await response.json();
      
      // Count unread notifications
      const unreadCount = notifications.filter((notification: any) => 
        !readIds.includes(notification.id)
      ).length;
      
      setNotificationCount(unreadCount);
      setHasUnreadNotifications(unreadCount > 0);
    } catch (error) {
      logger.error('Error checking for unread notifications:', String(error));
    }
  };

  useEffect(() => {
    // Initialize watch history
    initializeHistory();
    
    // Initial fetch - prioritize trending for immediate display
    fetchAnime(false);

    // Count user on app start
    countUser();

    // Check for "What's New" - defer to avoid blocking initial render
    setTimeout(() => {
      checkWhatsNew();
    }, 1000);
    
    // Check for unread notifications - defer to avoid blocking initial render
    setTimeout(() => {
      checkForUnreadNotifications();
    }, 2000);

    // Setup notification update listener
    const notificationListener = notificationEmitter.on('notificationUpdate', () => {
      checkForUnreadNotifications();
    });

    // Setup app state subscription
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        fetchAnime(false);
        // Count user when app comes to foreground
        countUser();
        // Check for unread notifications when app comes to foreground
        checkForUnreadNotifications();
      }
    });

    return () => {
      // Cleanup subscriptions
      if (subscription) {
        subscription.remove();
      }
      notificationListener.removeAllListeners();
    };
  }, []);

  useEffect(() => {
    initializeStore();
  }, []);

  useEffect(() => {
    // Check for updates on app start - defer to avoid blocking initial render
    setTimeout(() => {
      checkForUpdates();
    }, 3000);
    
    // Check for updates when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkForUpdates();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // Request notification permissions when app starts
    const requestNotificationPermissions = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        // Only ask if permissions have not been determined
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          logger.warn('Notification permissions not granted', '');
          return;
        }

        logger.info('Notification permissions granted', '');
      } catch (error) {
        logger.error('Error requesting notification permissions:', String(error));
      }
    };

    requestNotificationPermissions();
    fetchAnime();
  }, []);

  // Background fetch registration removed - old feature no longer used

  useEffect(() => {
    const checkAndShowAuthPrompt = async () => {
      try {
        // Check if we've shown the auth prompt before
        const hasShown = await AsyncStorage.getItem('has_shown_auth_prompt');
        if (hasShown) return;

        // Check if user is already logged in
        if (auth.currentUser) return;

        // Show the auth modal
        setShowAuthModal(true);
        setHasShownAuthPrompt(true);

        // Mark that we've shown the prompt
        await AsyncStorage.setItem('has_shown_auth_prompt', 'true');
      } catch (error) {
        logger.error('Error checking auth prompt:', String(error));
      }
    };

    checkAndShowAuthPrompt();
  }, []);

  useEffect(() => {
    // Defer storage modal check to avoid blocking initial render
    setTimeout(async () => {
      const folderUri = await AsyncStorage.getItem(APP_STORAGE_FOLDER_KEY);
      const skip = await AsyncStorage.getItem(APP_STORAGE_FOLDER_SKIP_KEY);
      if (!folderUri && !skip && Platform.OS === 'android') {
        setShowStorageModal(true);
      }
    }, 5000);
  }, []);

  useEffect(() => {
    // Defer beta updates check to avoid blocking initial render
    setTimeout(async () => {
      const value = await AsyncStorage.getItem('beta_updates_enabled');
      setBetaUpdatesEnabled(value === 'true');
      setBetaChecked(true);
    }, 1000);
  }, []);

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Clear all caches first
      await Promise.all([
        AsyncStorage.removeItem(CACHE_KEYS.TRENDING_RECENT),
        AsyncStorage.removeItem(CACHE_KEYS.NEW_EPISODES),
        AsyncStorage.removeItem(CACHE_KEYS.POPULAR),
        AsyncStorage.removeItem(CACHE_KEYS.LATEST_COMPLETED)
      ]);
      // Fetch fresh data
      await fetchAnime(true);
    } catch (error) {
      logger.error('Error refreshing:', String(error));
      setRefreshing(false);
    }
  };

  // Auto slide function
  const goToNextSlide = useCallback(() => {
    if (!trendingAnime.length) return;

    const ITEM_WIDTH = responsive.isLandscape ? responsive.width * 0.4 : responsive.width * 0.85;
    const ITEM_SPACING = responsive.isLandscape ? 20 : 10;

    const nextIndex = (currentIndex + 1) % trendingAnime.length;
    if (flatListRef.current) {
      if (nextIndex === 0) {
        // When looping back to first item, disable animation for smooth transition
        flatListRef.current.scrollToOffset({ offset: 0, animated: false });
      } else {
        // Calculate the exact offset for perfect centering
        const offset = (ITEM_WIDTH + ITEM_SPACING) * nextIndex;
        flatListRef.current.scrollToOffset({ offset, animated: true });
      }
      setCurrentIndex(nextIndex);
    }
  }, [currentIndex, trendingAnime.length, responsive]);

  // Setup auto sliding
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(goToNextSlide, 4000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentIndex, goToNextSlide]);

  // Handle manual scroll end with improved logic
  const handleScrollEnd = useCallback((event: any) => {
    if (!trendingAnime.length) return;
    
    const ITEM_WIDTH = responsive.isLandscape ? responsive.width * 0.4 : responsive.width * 0.85;
    const ITEM_SPACING = responsive.isLandscape ? 20 : 10;
    
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (ITEM_WIDTH + ITEM_SPACING));
    
    // Ensure index is within bounds
    const boundedIndex = Math.max(0, Math.min(index, trendingAnime.length - 1));
    setCurrentIndex(boundedIndex);
    
    // Reset timer when user manually scrolls
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(goToNextSlide, 4000);
    }
  }, [trendingAnime.length, goToNextSlide, responsive]);

  // Completely redesigned trending item renderer
  const renderTrendingItem = ({ item, index }: { item: AnimeItem; index: number }) => {
    const isCurrentItem = index === currentIndex;
    
    return (
      <TouchableOpacity 
        style={[
          styles.trendingCard,
          isCurrentItem && styles.trendingCardActive
        ]}
        activeOpacity={0.9}
        onPress={() => router.push({
          pathname: "/anime/[id]",
          params: { id: item.id }
        })}
      >
        <Image 
          source={{ uri: item.banner || item.image }} 
          style={styles.trendingImage} 
          resizeMode="cover"
        />
        
        {/* Overlay gradient for better text visibility */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
          style={styles.trendingGradient}
        />
        
        {/* Content container */}
        <View style={styles.trendingContent}>
          {/* Title and metadata */}
          <View style={styles.trendingInfo}>
            <Text style={styles.trendingTitle} numberOfLines={2}>{item.title}</Text>
            
            {/* Japanese Title if available */}
            {item.japaneseTitle ? (
              <Text style={styles.japaneseTitleText} numberOfLines={1}>{item.japaneseTitle}</Text>
            ) : null}
            
            <View style={styles.trendingMeta}>
              {/* Type badge */}
              {item.type ? (
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{item.type}</Text>
                </View>
              ) : null}
              
              {/* Year */}
              {item.releaseDate ? (
                <Text style={styles.yearText}>{item.releaseDate}</Text>
              ) : null}
              
              {/* Episodes with Sub/Dub indicators */}
              <View style={styles.episodeInfo}>
                {item.sub && item.sub > 0 ? (
                  <View style={styles.langContainer}>
                    <MaterialIcons name="subtitles" size={16} color="#fff" />
                    <Text style={styles.episodeText}>{item.sub}</Text>
                  </View>
                ) : null}
                
                {item.dub && item.dub > 0 ? (
                  <View style={styles.langContainer}>
                    <MaterialCommunityIcons name="microphone" size={16} color="#fff" />
                    <Text style={styles.episodeText}>{item.dub}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            
            {/* Genres */}
            {item.genres && item.genres.length > 0 ? (
              <View style={styles.genreContainer}>
                {item.genres.slice(0, 3).map((genre, idx) => (
                  <View key={idx} style={styles.genrePill}>
                    <Text style={styles.genreText}>{genre}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderAnimeCard = useCallback(({ item }: { item: AnimeItem }) => (
    <View style={styles.animeCardContainer}>
      <TouchableOpacity 
        style={styles.animeCard}
        onPress={() => router.push({
          pathname: "/anime/[id]",
          params: { id: item.id }
        })}
      >
        <Image source={{ uri: item.image }} style={styles.animeImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        >
          <View>
            <Text style={styles.animeName} numberOfLines={2}>{item.title}</Text>
            {item.type ? <Text style={styles.animeType}>{item.type}</Text> : null}
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
  ), [isBookmarked, addAnime, removeAnime]);

  const handleChooseFolder = async () => {
    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (permissions.granted) {
      await AsyncStorage.setItem(APP_STORAGE_FOLDER_KEY, permissions.directoryUri);
      await AsyncStorage.removeItem(APP_STORAGE_FOLDER_SKIP_KEY);
      setShowStorageModal(false);
      ToastAndroid.show('Storage folder set!', ToastAndroid.SHORT);
    } else {
      Alert.alert('Permission Denied', 'Cannot set storage folder without permission.');
    }
  };

  const handleCancelStorageModal = async () => {
    await AsyncStorage.setItem(APP_STORAGE_FOLDER_SKIP_KEY, '1');
    setShowStorageModal(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: hasBackgroundMedia ? 'transparent' : theme.colors.background }]}>
      <AuthModal 
        isVisible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
      {betaChecked && showUpdateBanner && updateInfo && (
        <TouchableOpacity 
          style={styles.updateBanner}
          onPress={() => setShowUpdateModal(true)}
        >
          <MaterialIcons name="system-update" size={24} color="#fff" />
          <Text style={styles.updateText}>
            Update Available: Version {updateInfo.latestVersion}
            {updateInfo.showUpdate && !updateInfo.isForced && (
              <Text style={{ color: '#FFD700', fontWeight: 'bold' }}> (beta)</Text>
            )}
          </Text>
          {updateInfo.showUpdate && !updateInfo.isForced && (
            <View style={{ backgroundColor: '#FFD700', borderRadius: 6, paddingHorizontal: 6, marginLeft: 8 }}>
              <Text style={{ color: '#222', fontWeight: 'bold', fontSize: 12 }}>BETA</Text>
            </View>
          )}
          <MaterialIcons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>
      )}
      
      {/* Notification Banner */}
      {hasUnreadNotifications && (
        <TouchableOpacity 
          style={styles.notificationBanner}
          onPress={() => router.push('/notifications')}
        >
          <MaterialIcons name="notifications" size={24} color="#fff" />
          <Text style={styles.notificationText}>
            {notificationCount} new {notificationCount === 1 ? 'notification' : 'notifications'}
          </Text>
          <MaterialIcons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>
      )}
      
      {/* Update Modal */}
      {betaChecked && updateInfo && (
        <UpdateModal 
          visible={showUpdateModal}
          updateInfo={updateInfo}
          onClose={() => setShowUpdateModal(false)}
          onUpdate={handleUpdate}
          simulatedArch={null}
        />
      )}
      
      {/* What's New Modal */}
      {whatsNewInfo && (
        <WhatsNewModal 
          visible={showWhatsNewModal}
          whatsNewInfo={whatsNewInfo}
          onClose={() => setShowWhatsNewModal(false)}
        />
      )}
      
      <Modal visible={showStorageModal} transparent animationType="fade">
        <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.7)',justifyContent:'center',alignItems:'center'}}>
          <View style={{backgroundColor:'#222',padding:24,borderRadius:12,width:'85%',alignItems:'center'}}>
            <Text style={{color:'#FFD700',fontWeight:'bold',fontSize:18,marginBottom:12}}>Storage Permission Needed</Text>
            <Text style={{color:'#fff',fontSize:15,marginBottom:18,textAlign:'center'}}>To save files locally (exports, downloads, etc), please create a folder and grant permission. You can skip for now and set it later from your profile.</Text>
            <View style={{flexDirection:'row',justifyContent:'space-between',width:'100%'}}>
              <TouchableOpacity style={{flex:1,backgroundColor:'#2196F3',padding:12,borderRadius:8,marginRight:8,alignItems:'center'}} onPress={handleChooseFolder}>
                <Text style={{color:'#fff',fontWeight:'bold'}}>Choose Folder</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{flex:1,backgroundColor:'#444',padding:12,borderRadius:8,alignItems:'center'}} onPress={handleCancelStorageModal}>
                <Text style={{color:'#fff',fontWeight:'bold'}}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f4511e" />
        }
      >
        {/* Redesigned Trending Section */}
        <View style={styles.trendingSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Now</Text>
          </View>
          
          {loading ? (
            <ActivityIndicator size="large" color="#f4511e" />
          ) : trendingAnime && trendingAnime.length > 0 ? (
            <View>
              {/* Main carousel without dots */}
              <FlatList
                ref={flatListRef}
                data={trendingAnime}
                renderItem={({ item, index }) => {
                  const ITEM_WIDTH = responsive.isLandscape ? responsive.width * 0.4 : responsive.width * 0.85;
                  const ITEM_SPACING = responsive.isLandscape ? 20 : 10;
                  
                  return (
                    <View style={{ 
                      width: ITEM_WIDTH,
                      marginHorizontal: ITEM_SPACING / 2, // Half spacing on each side
                    }}>
                      {renderTrendingItem({ item, index })}
                    </View>
                  );
                }}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled={false}
                showsHorizontalScrollIndicator={false}
                snapToInterval={responsive.isLandscape ? responsive.width * 0.4 + 20 : responsive.width * 0.85 + 10}
                decelerationRate="fast"
                snapToAlignment="center"
                onMomentumScrollEnd={handleScrollEnd}
                getItemLayout={(data, index) => {
                  const ITEM_WIDTH = responsive.isLandscape ? responsive.width * 0.4 : responsive.width * 0.85;
                  const ITEM_SPACING = responsive.isLandscape ? 20 : 10;
                  return {
                    length: ITEM_WIDTH + ITEM_SPACING,
                    offset: (ITEM_WIDTH + ITEM_SPACING) * index,
                    index,
                  };
                }}
                contentContainerStyle={{
                  paddingHorizontal: responsive.isLandscape ? 
                    (responsive.width - responsive.width * 0.4) / 2 - 10 : 
                    (responsive.width - responsive.width * 0.85) / 2 - 5
                }}
                initialScrollIndex={0}
                windowSize={5}
                maxToRenderPerBatch={3}
                initialNumToRender={2}
                removeClippedSubviews={true}
                onScrollToIndexFailed={(info) => {
                  const wait = new Promise(resolve => setTimeout(resolve, 500));
                  wait.then(() => {
                    if (flatListRef.current) {
                      flatListRef.current.scrollToIndex({ index: info.index, animated: true });
                    }
                  });
                }}
              />
              
              {/* Optional: Visual indicator for position/total */}
              <View style={styles.carouselIndicator}>
                <Text style={styles.carouselIndicatorText}>
                  {currentIndex + 1}/{trendingAnime.length}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noDataText}>No trending anime available</Text>
          )}
        </View>

        <ContinueWatching />

        {/* New Episodes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>New Episodes</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#f4511e" />
          ) : newEpisodes && newEpisodes.length > 0 ? (
            <FlatList
              data={newEpisodes}
              renderItem={renderAnimeCard}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
              windowSize={10}
              maxToRenderPerBatch={5}
              initialNumToRender={3}
              removeClippedSubviews={true}
              getItemLayout={(data, index) => ({
                length: 150 + 12, // item width + margin
                offset: (150 + 12) * index,
                index,
              })}
            />
          ) : (
            <Text style={styles.noDataText}>No new episodes available</Text>
          )}
        </View>

        {/* Latest Completed Section */}
        <View style={[styles.section, { marginBottom: 16 }]}>
          <Text style={styles.sectionTitle}>Latest Completed</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#f4511e" />
          ) : latestCompleted && latestCompleted.length > 0 ? (
            <FlatList
              data={latestCompleted}
              renderItem={renderAnimeCard}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
              windowSize={10}
              maxToRenderPerBatch={5}
              initialNumToRender={3}
              removeClippedSubviews={true}
              getItemLayout={(data, index) => ({
                length: 150 + 12, // item width + margin
                offset: (150 + 12) * index,
                index,
              })}
            />
          ) : (
            <Text style={styles.noDataText}>No completed anime available</Text>
          )}
        </View>

        {/* Popular Anime Section */}
        <View style={[styles.section, { marginBottom: 16 }]}>
          <Text style={styles.sectionTitle}>Popular Anime</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#f4511e" />
          ) : popularAnime && popularAnime.length > 0 ? (
            <FlatList
              data={popularAnime}
              renderItem={renderAnimeCard}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
              windowSize={10}
              maxToRenderPerBatch={5}
              initialNumToRender={3}
              removeClippedSubviews={true}
              getItemLayout={(data, index) => ({
                length: 150 + 12, // item width + margin
                offset: (150 + 12) * index,
                index,
              })}
            />
          ) : (
            <Text style={styles.noDataText}>No popular anime available</Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Made with <Text style={styles.heartText}>❤️</Text> by AniSurge team
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// Create themed styles function
const createThemedStyles = (theme: any, responsive: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  trendingSection: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  section: {
    paddingVertical: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  trendingListContainer: {
    paddingHorizontal: responsive.isLandscape ? 
      (responsive.width - responsive.width * 0.4) / 2 : 
      (responsive.width - responsive.width * 0.85) / 2
  },
  trendingCard: {
    width: responsive.isLandscape ? responsive.width * 0.4 : responsive.width * 0.85,
    height: responsive.isLandscape ? responsive.width * 0.4 * 0.5625 : responsive.width * 0.85 * 0.5625, // 16:9 aspect ratio
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    elevation: 5,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  trendingImage: {
    width: '100%',
    height: '100%',
  },
  trendingGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  trendingContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  trendingInfo: {
    justifyContent: 'flex-end',
  },
  trendingTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  japaneseTitleText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  trendingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  typeBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  typeBadgeText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  yearText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginRight: 12,
  },
  episodeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  langContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8,
  },
  episodeText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  genreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  genrePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  genreText: {
    color: '#fff',
    fontSize: 11,
  },
  carouselIndicator: {
    position: 'absolute',
    right: 24,
    bottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  carouselIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  trendingCardActive: {
    // Optional: Add a subtle indicator for the active card
    borderWidth: 2,
    borderColor: '#f4511e',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  animeCardContainer: {
    position: 'relative',
  },
  animeCard: {
    width: responsive.isLandscape ? 120 : 150,
    height: responsive.isLandscape ? 180 : 225,
    marginRight: responsive.isLandscape ? 8 : 12,
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
    fontWeight: '600',
    marginBottom: 4,
  },
  animeType: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '500',
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
  noDataText: {
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  updateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4511e',
    padding: 12,
    gap: 8,
  },
  updateText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4511e',
    padding: 12,
    gap: 8,
  },
  notificationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  footerText: {
    color: '#9e9e9e',
    fontSize: 14,
    textAlign: 'center',
  },
  heartText: {
    color: '#f4511e',
  },
}); 