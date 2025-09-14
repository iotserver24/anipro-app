import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, ActivityIndicator, Dimensions, RefreshControl, Modal, Animated, TextInput, PanResponder } from 'react-native';
import { useState, useCallback, useEffect, useRef } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { LinearGradient } from 'expo-linear-gradient';
import { APP_CONFIG } from '../constants/appConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Video from 'react-native-video';
import MediaLoader from '../components/MediaLoader';

interface GalleryItem {
  id: string;
  type: 'waifu' | 'husbando';
  title: string;
  url: string;
  createdAt: string;
  height?: number;
  mediaType?: 'image' | 'video' | 'gif';
}

interface GalleryStatus {
  isReady: boolean;
  message: string;
  lastUpdated: string;
}

type GallerySection = 'waifu' | 'husbando';

// Calculate dimensions
const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;
const BOTTOM_NAV_HEIGHT = 60; // Height of bottom navigation
const BOTTOM_OFFSET = 90; // Increased offset to move content higher
const SAFE_SCREEN_HEIGHT = screenHeight - BOTTOM_OFFSET; // Adjusted height for content
const numColumns = screenWidth > 600 ? 3 : 2;
const gap = 8;
const itemWidth = (screenWidth - (gap * (numColumns + 1))) / numColumns;

// Optimize image dimensions for better performance
const IMAGE_DIMENSIONS = {
  min: itemWidth * 0.8,
  max: itemWidth * 1.6
};

// Add cache constants
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY_PREFIX = 'gallery_cache_';
const IMAGE_CACHE_SIZE = 100; // Maximum number of images to keep in memory cache

// Add cache interfaces
interface CacheEntry {
  data: GalleryItem[];
  timestamp: number;
}

interface ImageCache {
  [key: string]: {
    uri: string;
    timestamp: number;
  };
}

// Add memory cache
const memoryCache: { [key: string]: CacheEntry } = {};
const imageCache: ImageCache = {};

// Add cache utility functions
const getCacheKey = (section: GallerySection) => `${CACHE_KEY_PREFIX}${section}`;

const clearOldImageCache = () => {
  const entries = Object.entries(imageCache);
  if (entries.length > IMAGE_CACHE_SIZE) {
    // Sort by timestamp and remove oldest entries
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, entries.length - IMAGE_CACHE_SIZE);
    toRemove.forEach(([key]) => {
      delete imageCache[key];
    });
  }
};

const getImageUri = (url: string, type: 'waifu' | 'husbando'): string => {
  return url;
};

// Add cache management functions
const getCachedData = async (section: GallerySection): Promise<GalleryItem[] | null> => {
  try {
    // Check memory cache first
    const memoryCacheEntry = memoryCache[getCacheKey(section)];
    if (memoryCacheEntry && Date.now() - memoryCacheEntry.timestamp < CACHE_EXPIRY) {
      return memoryCacheEntry.data;
    }

    // Check AsyncStorage if not in memory
    const cached = await AsyncStorage.getItem(getCacheKey(section));
    if (cached) {
      const { data, timestamp }: CacheEntry = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_EXPIRY) {
        // Update memory cache
        memoryCache[getCacheKey(section)] = { data, timestamp };
        return data;
      }
    }
    return null;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
};

const setCachedData = async (section: GallerySection, data: GalleryItem[]) => {
  try {
    const cacheEntry: CacheEntry = {
      data,
      timestamp: Date.now()
    };

    // Update memory cache
    memoryCache[getCacheKey(section)] = cacheEntry;

    // Update AsyncStorage
    await AsyncStorage.setItem(getCacheKey(section), JSON.stringify(cacheEntry));
  } catch (error) {
    console.error('Cache write error:', error);
  }
};

// Add video cache constants
const VIDEO_PRELOAD_COUNT = 3; // Number of videos to preload ahead
const VIDEO_CACHE_SIZE = 10; // Maximum number of videos to keep in cache

// Add video cache interface
interface VideoCache {
  [key: string]: {
    uri: string;
    isPreloaded: boolean;
    timestamp: number;
  };
}

// Add video cache
const videoCache: VideoCache = {};

// Add video cache utility functions
const preloadVideo = async (url: string) => {
  if (!videoCache[url] || !videoCache[url].isPreloaded) {
    try {
      // Create a prefetch request
      const prefetchTask = FileSystem.createDownloadResumable(
        url,
        `${FileSystem.cacheDirectory}${url.split('/').pop()}`,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          // You can use this progress value to show loading status if needed
        }
      );

      // Start prefetching
      const { uri } = await prefetchTask.downloadAsync();
      
      videoCache[url] = {
        uri,
        isPreloaded: true,
        timestamp: Date.now()
      };

      // Clean up old cache entries
      const entries = Object.entries(videoCache);
      if (entries.length > VIDEO_CACHE_SIZE) {
        entries
          .sort((a, b) => a[1].timestamp - b[1].timestamp)
          .slice(0, entries.length - VIDEO_CACHE_SIZE)
          .forEach(([key]) => {
            delete videoCache[key];
            // Also delete the cached file
            FileSystem.deleteAsync(`${FileSystem.cacheDirectory}${key.split('/').pop()}`, { idempotent: true });
          });
      }
    } catch (error) {
      console.error('Error preloading video:', error);
    }
  }
};

// Add video dimensions interface
interface VideoDimensions {
  width: number;
  height: number;
}

// Modify the ReelsView component
const ReelsView = ({ items, onClose }: { items: GalleryItem[]; onClose: () => void }) => {
  // Add validation
  if (!items || items.length === 0) {
    return (
      <View style={styles.reelsContainer}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="white" />
          <Text style={styles.errorText}>No videos available</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoDimensions, setVideoDimensions] = useState<{ [key: string]: VideoDimensions }>({});
  const [isBuffering, setIsBuffering] = useState(false);
  const [loadedVideos, setLoadedVideos] = useState<Set<string>>(new Set());
  const videoRefs = useRef<{ [key: string]: any }>({});
  const scrollViewRef = useRef<FlatList>(null);
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

  // Preload videos function with tracking
  const preloadVideos = useCallback(async (videosToPreload: GalleryItem[]) => {
    for (const video of videosToPreload) {
      if (!loadedVideos.has(video.id) && !videoCache[video.url]?.isPreloaded) {
        try {
          await preloadVideo(video.url);
          setLoadedVideos(prev => new Set([...prev, video.id]));
        } catch (error) {
          console.error('Error preloading video:', error);
        }
      }
    }
  }, [loadedVideos]);

  // Initial preload
  useEffect(() => {
    // Preload first 3 videos immediately
    const initialVideos = items.slice(0, 3);
    preloadVideos(initialVideos);
  }, [items]);

  // Add download functionality
  const downloadContent = useCallback(async (url: string, title: string) => {
    try {
      // Check permissions first
      if (!permissionResponse?.granted) {
        const permission = await requestPermission();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Please grant permission to save media');
          return;
        }
      }

      // Get file extension from URL
      const ext = url.split('.').pop() || 'jpg';
      
      // Create filename with extension
      const timestamp = Date.now();
      const filename = `anisurge_${timestamp}.${ext}`;
      
      // Download directly to cache
      const { uri } = await FileSystem.downloadAsync(
        url,
        FileSystem.cacheDirectory + filename
      );

      if (!uri) {
        throw new Error('Download failed');
      }

      // Save to gallery
      const asset = await MediaLibrary.createAssetAsync(uri);
      if (!asset) {
        throw new Error('Failed to save to gallery');
      }

      // Create album if needed and move asset to it
      await MediaLibrary.createAlbumAsync('Anime Gallery', asset, false);
      
      // Success!
      Alert.alert('Success', 'Image saved to gallery!');

      // Clean up
      await FileSystem.deleteAsync(uri, { idempotent: true });

    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to save image. Please try again.');
    }
  }, [permissionResponse, requestPermission]);

  // Add function to calculate video dimensions
  const calculateVideoDimensions = (naturalSize: { width: number; height: number }, videoId: string) => {
    // Validate input dimensions
    if (!naturalSize?.width || !naturalSize?.height || 
        isNaN(naturalSize.width) || isNaN(naturalSize.height) ||
        naturalSize.width <= 0 || naturalSize.height <= 0) {
      console.warn('Invalid video dimensions:', naturalSize);
      // Use default dimensions as fallback
      setVideoDimensions(prev => ({
        ...prev,
        [videoId]: { width: screenWidth, height: SAFE_SCREEN_HEIGHT }
      }));
      return;
    }

    const screenRatio = screenWidth / SAFE_SCREEN_HEIGHT;
    const videoRatio = naturalSize.width / naturalSize.height;
    let width = screenWidth;
    let height = SAFE_SCREEN_HEIGHT;

    if (videoRatio > screenRatio) {
      // Video is wider than screen ratio
      height = Math.floor(screenWidth / videoRatio);
    } else {
      // Video is taller than screen ratio
      width = Math.floor(SAFE_SCREEN_HEIGHT * videoRatio);
    }

    // Validate calculated dimensions
    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      console.warn('Invalid calculated dimensions:', { width, height });
      // Use default dimensions as fallback
      width = screenWidth;
      height = SAFE_SCREEN_HEIGHT;
    }

    setVideoDimensions(prev => ({
      ...prev,
      [videoId]: { width, height }
    }));
  };

  const renderItem = useCallback(({ item, index }: { item: GalleryItem; index: number }) => {
    // Add validation for item
    if (!item?.url) {
      console.error('Invalid video item:', item);
      return null;
    }

    const videoUri = videoCache[item.url]?.uri || item.url;
    const dimensions = videoDimensions[item.id];

    return (
      <View style={styles.reelContainer}>
        <View style={styles.videoTouchable}>
          <View style={styles.videoWrapper}>
            <Video
              ref={ref => videoRefs.current[item.id] = ref}
              source={{ uri: videoUri }}
              style={[
                styles.reelVideo,
                dimensions ? {
                  width: dimensions.width || screenWidth,
                  height: dimensions.height || SAFE_SCREEN_HEIGHT,
                  alignSelf: 'center'
                } : {
                  width: screenWidth,
                  height: SAFE_SCREEN_HEIGHT,
                  alignSelf: 'center'
                }
              ]}
              resizeMode={dimensions ? "contain" : "cover"}
              repeat={true}
              paused={currentIndex !== index || !isPlaying}
              playInBackground={false}
              playWhenInactive={false}
              onError={(error) => {
                console.error('Video error:', error);
                setIsBuffering(false);
              }}
              onLoad={(data) => {
                if (data.naturalSize) {
                  calculateVideoDimensions(data.naturalSize, item.id);
                }
                setIsBuffering(false);
                // Preload next 2 videos when current video loads
                const nextVideos = items.slice(index + 1, index + 3);
                preloadVideos(nextVideos);
              }}
              onBuffer={({ isBuffering: buffering }) => setIsBuffering(buffering)}
              bufferConfig={{
                minBufferMs: 15000,
                maxBufferMs: 50000,
                bufferForPlaybackMs: 2500,
                bufferForPlaybackAfterRebufferMs: 5000
              }}
            />
            {isBuffering && !isPlaying && (
              <View style={styles.bufferingContainer}>
                <ActivityIndicator size="large" color="white" />
                <Text style={styles.bufferingText}>Loading video...</Text>
              </View>
            )}
          </View>
          
          <View style={styles.reelOverlay}>
            <LinearGradient
              colors={['rgba(0,0,0,0.3)', 'transparent', 'transparent', 'rgba(0,0,0,0.7)']}
              style={styles.reelGradient}
            >
              <View style={styles.reelHeader}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <MaterialIcons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => downloadContent(item.url, item.title)}
                >
                  <MaterialIcons name="file-download" size={24} color="white" />
                </TouchableOpacity>
              </View>

              <View style={styles.reelFooter}>
                <View style={styles.controlsContainer}>
                  <View style={styles.titleContainer}>
                    <Text style={styles.reelTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.videoProgress}>{index + 1} / {items.length}</Text>
                  </View>

                  <View style={styles.controlsRight}>
                    <TouchableOpacity
                      style={styles.playButton}
                      onPress={() => setIsPlaying(!isPlaying)}
                    >
                      <MaterialIcons
                        name={isPlaying ? "pause" : "play-arrow"}
                        size={32}
                        color="white"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>
      </View>
    );
  }, [isPlaying, currentIndex, isBuffering, items.length, onClose, preloadVideos]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      setCurrentIndex(newIndex);
      
      // Preload next few videos when scrolling
      const nextVideos = items.slice(newIndex + 1, newIndex + 4);
      preloadVideos(nextVideos);
    }
  }, [items, preloadVideos]);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50
  };

  return (
    <View style={styles.reelsContainer}>
      <FlatList
        ref={scrollViewRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SAFE_SCREEN_HEIGHT}
        decelerationRate="fast"
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        getItemLayout={(data, index) => ({
          length: SAFE_SCREEN_HEIGHT,
          offset: SAFE_SCREEN_HEIGHT * index,
          index,
        })}
      />
    </View>
  );
};

// Add media type detection function
const getMediaType = (url: string): 'image' | 'video' | 'gif' => {
  const extension = url.split('.').pop()?.toLowerCase();
  if (extension === 'mp4' || extension === 'webm') return 'video';
  if (extension === 'gif') return 'gif';
  return 'image';
};

// Add sorting and grouping function
const sortAndGroupItems = (items: GalleryItem[]) => {
  // Sort by createdAt timestamp (newest first)
  return [...items].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

export default function Gallery() {
  const { theme, hasBackgroundMedia } = useTheme();
  const [selectedSection, setSelectedSection] = useState<GallerySection>('waifu');
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<GalleryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeout = useRef<NodeJS.Timeout>();
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);

  // Add handleSectionChange function
  const handleSectionChange = useCallback((section: GallerySection) => {
    setSelectedSection(section);
    setSearchQuery('');
  }, []);

  // Fetch content directly without status check
  const fetchContent = useCallback(async () => {
    try {
      setError(null);

      // Try to get cached data first
      const cachedData = await getCachedData(selectedSection);
      if (cachedData) {
        const itemsWithHeight = cachedData.map((item: GalleryItem) => ({
          ...item,
          height: itemWidth * (Math.random() * (1.6 - 0.8) + 0.8)
        }));
        setItems(itemsWithHeight);
        setLoading(false);
        setRefreshing(false);

        // Fetch fresh data in background
        fetchFreshData();
        return;
      }

      // If no cache, fetch fresh data
      await fetchFreshData();
    } catch (err) {
      console.error('Error fetching content:', err);
      setError('Failed to load content. Please try again.');
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSection]);

  const fetchFreshData = async () => {
    try {
      const response = await fetch(`${APP_CONFIG.API_BASE_URL}/gallery?type=${selectedSection}`);
      if (!response.ok) throw new Error('Failed to fetch content');
      const data = await response.json();
      
      // Cache the fresh data
      await setCachedData(selectedSection, data);
      
      // Add media type for each item and sort them
      const itemsWithMediaType = data.map((item: GalleryItem) => ({
        ...item,
        mediaType: getMediaType(item.url)
      }));
      
      setItems(sortAndGroupItems(itemsWithMediaType));
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      throw err;
    }
  };

  const onRefresh = useEffect(() => {
    setRefreshing(true);
    fetchContent();
  }, [fetchContent]);

  useEffect(() => {
    setLoading(true);
    fetchContent();
  }, [selectedSection]);

  // Modify useEffect for search to include sorting
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(sortAndGroupItems(items));
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = items.filter(item => 
      item.title.toLowerCase().includes(query)
    );
    setFilteredItems(sortAndGroupItems(filtered));
  }, [searchQuery, items]);

  // Add navigation handlers for fullscreen view
  const navigateGallery = useCallback((direction: 'prev' | 'next') => {
    if (selectedIndex === -1) return;
    
    const newIndex = direction === 'next' ? 
      Math.min(selectedIndex + 1, items.length - 1) : 
      Math.max(selectedIndex - 1, 0);
    
    if (newIndex !== selectedIndex) {
      // Animate the transition
      Animated.sequence([
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: direction === 'next' ? -screenWidth : screenWidth,
            duration: 0,
            useNativeDriver: true
          }),
          Animated.timing(scale, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true
          })
        ]),
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true
          })
        ])
      ]).start();

      setSelectedIndex(newIndex);
      setSelectedItem(items[newIndex]);
      resetControlsTimeout();
    }
  }, [selectedIndex, items]);

  // Add control visibility timeout handler
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    setShowControls(true);
    controlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  const toggleControls = useCallback(() => {
    setShowControls(prev => !prev);
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  // Add downloadContent function
  const downloadContent = useCallback(async (item: GalleryItem) => {
    try {
      // Check permissions
      if (!permissionResponse?.granted) {
        const permission = await requestPermission();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Please grant media library permissions to download content.');
          return;
        }
      }

      // Show download starting
      Alert.alert('Download Started', 'Your download will begin shortly...');

      // Create a safe filename from the title
      const safeTitle = item.title
        .replace(/[^a-zA-Z0-9]/g, '_') // Replace non-alphanumeric with underscore
        .toLowerCase()
        .substring(0, 50); // Limit length to 50 chars
      
      const filename = `${safeTitle}.jpg`;
      const fileUri = FileSystem.cacheDirectory + filename;

      // Ensure base cache directory exists
      const dirInfo = await FileSystem.getInfoAsync(FileSystem.cacheDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(FileSystem.cacheDirectory, { intermediates: true });
      }

      // Download file
      const { uri } = await FileSystem.downloadAsync(
        item.url,
        fileUri
      );

      if (!uri) {
        throw new Error('Download failed');
      }

      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(uri);
      
      // Create album if it doesn't exist and move asset to it
      const album = await MediaLibrary.getAlbumAsync('Anisurge Gallery');
      if (album) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      } else {
        await MediaLibrary.createAlbumAsync('Anisurge Gallery', asset, false);
      }

      // Delete cached file
      await FileSystem.deleteAsync(uri, { idempotent: true });

      // Show success message
      Alert.alert('Success', 'Image saved to your gallery!');
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Download Failed', 'Failed to download image. Please try again.');
    }
  }, [permissionResponse, requestPermission]);

  const renderItem = useCallback(({ item, index }: { item: GalleryItem; index: number }) => {
    // Set portrait aspect ratios for all media types
    const itemHeight = itemWidth * 1.5; // 2:3 portrait aspect ratio for all items

    const handlePress = () => {
      setSelectedItem(item);
      setSelectedIndex(index);
      resetControlsTimeout();
      if (item.mediaType === 'video') {
        setIsPlaying(true);
      }
    };

    return (
      <TouchableOpacity 
        style={[
          styles.itemContainer,
          {
            width: itemWidth,
            height: itemHeight,
            marginLeft: index % numColumns === 0 ? gap : 0,
            marginTop: gap
          }
        ]}
        onPress={handlePress}
      >
        <MediaLoader
          type={item.mediaType || 'image'}
          source={{ uri: item.url }}
          style={[
            styles.image,
            { height: itemHeight }
          ]}
          resizeMode="cover"
          loadingType="spinner"
          loadingSize={24}
          loadingColor="#f4511e"
          paused={true}
          muted={true}
          repeat={true}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.9)']}
          style={[styles.gradient, { height: '40%' }]} // Adjusted gradient height
        >
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={() => downloadContent(item)}
          >
            <MaterialIcons name="file-download" size={24} color="white" />
          </TouchableOpacity>
        </LinearGradient>
        {item.mediaType === 'video' && (
          <View style={styles.videoIndicator}>
            <MaterialIcons name="play-circle-outline" size={24} color="white" />
          </View>
        )}
      </TouchableOpacity>
    );
  }, [downloadContent, resetControlsTimeout]);

  // Update fullscreen modal component to support videos
  const renderFullscreenViewer = () => (
    <Modal
      visible={!!selectedItem}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        setSelectedItem(null);
        setSelectedIndex(-1);
        translateX.setValue(0);
        scale.setValue(1);
      }}
    >
      <View style={styles.fullscreenContainer}>
        <TouchableOpacity
          style={styles.fullscreenTouchable}
          activeOpacity={1}
          onPress={toggleControls}
        >
          {selectedItem?.mediaType === 'video' ? (
            <MediaLoader
              type="video"
              source={{ uri: selectedItem.url }}
              style={styles.fullscreenMedia}
              resizeMode="contain"
              paused={false}
              muted={false}
              repeat={true}
              showPlayIcon={false}
            />
          ) : (
            <Animated.Image
              source={{ uri: selectedItem?.url }}
              style={[
                styles.fullscreenMedia,
                {
                  transform: [
                    { translateX },
                    { scale }
                  ]
                }
              ]}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>

        {showControls && (
          <>
            <TouchableOpacity
              style={[styles.fullscreenClose]}
              onPress={() => {
                setSelectedItem(null);
                setSelectedIndex(-1);
                translateX.setValue(0);
                scale.setValue(1);
              }}
            >
              <MaterialIcons name="close" size={24} color="white" />
            </TouchableOpacity>

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.fullscreenControls}
            >
              <View style={styles.fullscreenControlsContent}>
                <Text style={styles.fullscreenTitle}>{selectedItem?.title}</Text>
                <TouchableOpacity
                  style={styles.fullscreenButton}
                  onPress={() => selectedItem && downloadContent(selectedItem)}
                >
                  <MaterialIcons name="file-download" size={28} color="white" />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </>
        )}
      </View>
    </Modal>
  );

  // Modify the header section to include search
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.sectionContainer}>
        <TouchableOpacity
          style={[styles.sectionButton, selectedSection === 'waifu' && styles.sectionButtonActive]}
          onPress={() => handleSectionChange('waifu')}
        >
          <MaterialIcons 
            name="favorite" 
            size={20} 
            color={selectedSection === 'waifu' ? 'white' : '#666'} 
          />
          <Text style={[styles.sectionButtonText, selectedSection === 'waifu' && styles.sectionButtonTextActive]}>
            Waifus
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sectionButton, selectedSection === 'husbando' && styles.sectionButtonActive]}
          onPress={() => handleSectionChange('husbando')}
        >
          <MaterialIcons 
            name="face" 
            size={20} 
            color={selectedSection === 'husbando' ? 'white' : '#666'} 
          />
          <Text style={[styles.sectionButtonText, selectedSection === 'husbando' && styles.sectionButtonTextActive]}>
            Husbandos
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search gallery..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <MaterialIcons name="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Add cache cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear memory cache when component unmounts
      Object.keys(memoryCache).forEach(key => {
        delete memoryCache[key];
      });
      Object.keys(imageCache).forEach(key => {
        delete imageCache[key];
      });
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: hasBackgroundMedia ? 'transparent' : theme.colors.background }]}>
      <>
        {renderHeader()}

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading content...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color="#666" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchContent}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            {searchQuery ? (
              <>
                <MaterialIcons name="search-off" size={48} color="#666" />
                <Text style={styles.emptyText}>No results found</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="favorite" size={48} color="#666" />
                <Text style={styles.emptyText}>
                  No {selectedSection === 'waifu' ? 'Waifus' : 'Husbandos'} found
                </Text>
              </>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            numColumns={numColumns}
            contentContainerStyle={[
              styles.listContainer,
              { paddingBottom: 80 }
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#f4511e']}
                tintColor="#f4511e"
              />
            }
            columnWrapperStyle={styles.columnWrapper}
            windowSize={21}
            maxToRenderPerBatch={10}
            initialNumToRender={12}
            removeClippedSubviews={false}
            updateCellsBatchingPeriod={50}
            onEndReachedThreshold={0.5}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 10
            }}
            getItemLayout={(data, index) => ({
              length: itemWidth * 1.5 + gap,
              offset: (itemWidth * 1.5 + gap) * Math.floor(index / numColumns),
              index,
            })}
          />
        )}

        {renderFullscreenViewer()}
      </>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    gap: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    gap: 8,
  },
  sectionButtonActive: {
    backgroundColor: '#f4511e',
  },
  sectionButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionButtonTextActive: {
    color: 'white',
  },
  listContainer: {
    paddingRight: gap,
    paddingBottom: 80,
  },
  columnWrapper: {
    gap: gap,
  },
  itemContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#2a2a2a',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 12,
  },
  title: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  downloadButton: {
    alignSelf: 'flex-end',
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  playIconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#f4511e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenMedia: {
    width: screenWidth,
    height: screenHeight,
  },
  fullscreenClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  navigationButton: {
    position: 'absolute',
    top: '50%',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -25 }],
    zIndex: 2,
  },
  prevButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
  },
  fullscreenControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  fullscreenTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 20,
  },
  fullscreenControlsContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fullscreenButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reelsContainer: {
    flex: 1,
    backgroundColor: 'black',
    height: SAFE_SCREEN_HEIGHT,
  },
  reelContainer: {
    width: screenWidth,
    height: SAFE_SCREEN_HEIGHT,
  },
  videoTouchable: {
    flex: 1,
  },
  videoWrapper: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    height: SAFE_SCREEN_HEIGHT,
  },
  reelVideo: {
    backgroundColor: '#000',
    maxHeight: SAFE_SCREEN_HEIGHT,
  },
  reelOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  reelGradient: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.2)', // Add slight overlay for better visibility
  },
  reelHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: 16,
    paddingTop: 60,
    gap: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  reelFooter: {
    padding: 16,
    paddingBottom: 48,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
    paddingBottom: 32,
  },
  titleContainer: {
    flex: 1,
    marginRight: 16,
  },
  controlsRight: {
    alignItems: 'center',
    gap: 16,
  },
  navigationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bufferingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  bufferingText: {
    color: 'white',
    marginTop: 12,
    fontSize: 16,
  },
  videoProgress: {
    color: '#ffffff80',
    fontSize: 14,
    marginTop: 4,
  },
  reelTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  comingSoonTitle: {
    color: '#666',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  comingSoonMessage: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 32,
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  videoIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
}); 