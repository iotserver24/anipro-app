import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, ActivityIndicator, Dimensions, RefreshControl, Modal, Animated, TextInput } from 'react-native';
import { useState, useCallback, useEffect, useRef } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { LinearGradient } from 'expo-linear-gradient';
import { APP_CONFIG } from '../constants/appConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface GalleryItem {
  id: string;
  type: 'waifu' | 'husbando' | 'anitube';
  title: string;
  url: string;
  createdAt: string;
  height?: number;
}

type GallerySection = 'waifu' | 'husbando' | 'anitube';

// Calculate dimensions
const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;
const numColumns = screenWidth > 600 ? 3 : 2;
const gap = 8;
const itemWidth = (screenWidth - (gap * (numColumns + 1))) / numColumns;

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

const getImageUri = (url: string, type: 'waifu' | 'husbando' | 'anitube'): string => {
  if (type === 'anitube') {
    const videoId = url.split('/').pop()?.split('.')[0];
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
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

export default function Gallery() {
  const [selectedSection, setSelectedSection] = useState<GallerySection>('waifu');
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  
  // Add state for fullscreen viewer
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeout = useRef<NodeJS.Timeout>();
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<GalleryItem[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchAnimation = useRef(new Animated.Value(0)).current;

  const fetchContent = useCallback(async () => {
    try {
      setError(null);

      // Try to get cached data first
      const cachedData = await getCachedData(selectedSection);
      if (cachedData) {
        const itemsWithHeight = cachedData.map((item: GalleryItem) => ({
          ...item,
          height: item.type === 'anitube' ? 
            itemWidth * (9/16) : 
            itemWidth * (Math.random() * (1.6 - 0.8) + 0.8)
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
      
      // Add random heights for Pinterest-like layout
      const itemsWithHeight = data.map((item: GalleryItem) => ({
        ...item,
        height: item.type === 'anitube' ? 
          itemWidth * (9/16) : 
          itemWidth * (Math.random() * (1.6 - 0.8) + 0.8)
      }));
      
      setItems(itemsWithHeight);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      throw err;
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchContent();
  }, [fetchContent]);

  useEffect(() => {
    setLoading(true);
    fetchContent();
  }, [selectedSection]);

  // Add search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(items);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = items.filter(item => 
      item.title.toLowerCase().includes(query)
    );
    setFilteredItems(filtered);
  }, [searchQuery, items]);

  const downloadContent = useCallback(async (url: string, title: string) => {
    try {
      if (!permissionResponse?.granted) {
        const permission = await requestPermission();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Please grant permission to save media');
          return;
        }
      }

      const filename = url.split('/').pop() || 'download';
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        fileUri,
        {}
      );

      Alert.alert('Downloading...', 'Please wait while we download your content.');

      const { uri } = await downloadResumable.downloadAsync();
      
      if (uri) {
        const asset = await MediaLibrary.createAssetAsync(uri);
        await MediaLibrary.createAlbumAsync('Anime Gallery', asset, false);
        Alert.alert('Success', 'Content saved to gallery!');
      }
    } catch (err) {
      console.error('Error downloading:', err);
      Alert.alert('Error', 'Failed to download content');
    }
  }, [permissionResponse, requestPermission]);

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

  // Add toggle search animation
  const toggleSearch = useCallback(() => {
    setShowSearch(prev => !prev);
    Animated.spring(searchAnimation, {
      toValue: showSearch ? 0 : 1,
      useNativeDriver: false,
      friction: 8,
      tension: 50
    }).start();
  }, [showSearch]);

  const renderItem = useCallback(({ item, index }: { item: GalleryItem; index: number }) => {
    const imageUri = getImageUri(item.url, item.type);
    const cachedImage = imageCache[imageUri];

    // Update image cache
    if (!cachedImage) {
      imageCache[imageUri] = {
        uri: imageUri,
        timestamp: Date.now()
      };
      clearOldImageCache();
    }

    return (
      <TouchableOpacity 
        style={[
          styles.itemContainer,
          {
            width: itemWidth,
            height: item.height || itemWidth,
            marginLeft: index % numColumns === 0 ? gap : 0,
            marginTop: index < numColumns ? gap : 0
          }
        ]}
        onPress={() => {
          setSelectedItem(item);
          setSelectedIndex(index);
          resetControlsTimeout();
        }}
      >
        <Image 
          source={{ uri: imageUri }}
          style={[
            styles.image,
            { height: item.height || itemWidth }
          ]}
          // Add caching props
          cachePolicy="memory-disk"
          loadingIndicatorSource={{ uri: imageUri }}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.9)']}
          style={[
            styles.gradient,
            { height: item.type === 'anitube' ? '100%' : '60%' }
          ]}
        >
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          {item.type === 'anitube' ? (
            <View style={styles.playIconContainer}>
              <MaterialIcons name="play-circle-filled" size={48} color="white" style={styles.playIcon} />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => downloadContent(item.url, item.title)}
            >
              <MaterialIcons name="file-download" size={24} color="white" />
            </TouchableOpacity>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }, [downloadContent, resetControlsTimeout]);

  // Add fullscreen modal component
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
          <Animated.Image
            source={{ uri: selectedItem?.url }}
            style={[
              styles.fullscreenImage,
              {
                transform: [
                  { translateX },
                  { scale }
                ]
              }
            ]}
            resizeMode="contain"
          />
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

            {selectedIndex > 0 && (
              <TouchableOpacity
                style={[styles.navigationButton, styles.prevButton]}
                onPress={() => navigateGallery('prev')}
              >
                <MaterialIcons name="chevron-left" size={40} color="white" />
              </TouchableOpacity>
            )}

            {selectedIndex < items.length - 1 && (
              <TouchableOpacity
                style={[styles.navigationButton, styles.nextButton]}
                onPress={() => navigateGallery('next')}
              >
                <MaterialIcons name="chevron-right" size={40} color="white" />
              </TouchableOpacity>
            )}

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.fullscreenControls}
            >
              <Text style={styles.fullscreenTitle}>{selectedItem?.title}</Text>
              <TouchableOpacity
                style={styles.fullscreenDownload}
                onPress={() => selectedItem && downloadContent(selectedItem.url, selectedItem.title)}
              >
                <MaterialIcons name="file-download" size={28} color="white" />
              </TouchableOpacity>
            </LinearGradient>
          </>
        )}
      </View>
    </Modal>
  );

  // Modify the header section to include search
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.headerTitle}>Gallery</Text>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={toggleSearch}
        >
          <MaterialIcons 
            name={showSearch ? "close" : "search"} 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>
      </View>

      <Animated.View style={[
        styles.searchContainer,
        {
          maxHeight: searchAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 50]
          }),
          opacity: searchAnimation,
          marginBottom: searchAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 16]
          })
        }
      ]}>
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
      </Animated.View>

      <View style={styles.sectionContainer}>
        <TouchableOpacity
          style={[styles.sectionButton, selectedSection === 'waifu' && styles.sectionButtonActive]}
          onPress={() => setSelectedSection('waifu')}
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
          onPress={() => setSelectedSection('husbando')}
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
        <TouchableOpacity
          style={[styles.sectionButton, selectedSection === 'anitube' && styles.sectionButtonActive]}
          onPress={() => setSelectedSection('anitube')}
        >
          <MaterialIcons 
            name="play-circle-outline" 
            size={20} 
            color={selectedSection === 'anitube' ? 'white' : '#666'} 
          />
          <Text style={[styles.sectionButtonText, selectedSection === 'anitube' && styles.sectionButtonTextActive]}>
            AniTube
          </Text>
        </TouchableOpacity>
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
    <View style={styles.container}>
      {renderHeader()}

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f4511e" />
          <Text style={styles.loadingText}>Loading content...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#666" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchContent}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          {searchQuery ? (
            <>
              <MaterialIcons name="search-off" size={48} color="#666" />
              <Text style={styles.emptyText}>No results found</Text>
            </>
          ) : (
            <>
              {selectedSection === 'anitube' ? (
                <MaterialIcons name="play-circle-outline" size={48} color="#666" />
              ) : (
                <MaterialIcons name="favorite" size={48} color="#666" />
              )}
              <Text style={styles.emptyText}>
                No {selectedSection === 'waifu' ? 'Waifus' : selectedSection === 'husbando' ? 'Husbandos' : 'AniTube videos'} found
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
          contentContainerStyle={styles.listContainer}
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
        />
      )}

      {renderFullscreenViewer()}
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
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    marginLeft: 8,
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
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
  fullscreenImage: {
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
  fullscreenDownload: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 