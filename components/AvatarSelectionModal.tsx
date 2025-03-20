import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Animated
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AVATARS, Avatar } from '../constants/avatars';

type AvatarSelectionModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (avatar: Avatar) => void;
  selectedAvatarId?: string;
};

const CATEGORIES = ['All', 'Default', 'Anime', 'Game', 'Custom'];

const AvatarSelectionModal = ({
  visible,
  onClose,
  onSelect,
  selectedAvatarId
}: AvatarSelectionModalProps) => {
  const [loading, setLoading] = useState(false);
  const [avatars, setAvatars] = useState<Avatar[]>(AVATARS);
  const [filteredAvatars, setFilteredAvatars] = useState<Avatar[]>(AVATARS);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const pageSize = 12; // 3 rows of 4 avatars
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = Math.ceil(filteredAvatars.length / pageSize);

  // Fetch avatars from API when modal becomes visible
  useEffect(() => {
    if (visible) {
      fetchLatestAvatars();
    }
  }, [visible]);

  // Filter avatars by category
  useEffect(() => {
    if (selectedCategory === 'All') {
      setFilteredAvatars(avatars);
    } else {
      const filtered = avatars.filter(avatar => {
        const category = avatar.category?.toLowerCase() || 'default';
        return category === selectedCategory.toLowerCase();
      });
      setFilteredAvatars(filtered);
    }
    setCurrentPage(0);
  }, [selectedCategory, avatars]);

  const fetchLatestAvatars = async () => {
    setLoading(true);
    try {
      // Try multiple domain patterns to ensure we can reach the API
      const apiUrls = [
        'https://anisurge.me/api/avatars/list',
        'https://app.animeverse.cc/api/avatars/list',
        'https://api.animeverse.cc/avatars/list'
      ];
      
      let fetchSuccess = false;
      for (const url of apiUrls) {
        try {
          const response = await fetch(url, { 
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' } 
          });
          
          if (response.ok) {
            const data = await response.json();
            // Only update if we get valid data
            if (Array.isArray(data) && data.length > 0) {
              setAvatars(data);
              console.log('Successfully fetched', data.length, 'avatars from API');
              fetchSuccess = true;
              break;
            }
          } else {
            console.warn(`Failed to fetch avatars from ${url}:`, response.status);
          }
        } catch (urlError) {
          console.warn(`Error fetching from ${url}:`, urlError);
        }
      }
      
      if (!fetchSuccess) {
        console.warn('Could not fetch avatars from any endpoint, using defaults');
      }
    } catch (error) {
      console.error('Error fetching avatars:', error);
      // Keep using default avatars if fetch fails
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Avatar }) => (
    <TouchableOpacity
      style={[
        styles.avatarItem,
        selectedAvatarId === item.id && styles.selectedAvatarItem
      ]}
      onPress={() => onSelect(item)}
    >
      <View style={styles.avatarImageContainer}>
        <Image 
          source={{ uri: item.url }} 
          style={styles.avatarImage}
          onError={(e) => {
            console.warn('Failed to load avatar image:', item.url);
          }}
        />
      </View>
      {selectedAvatarId === item.id && (
        <View style={styles.selectedIndicator}>
          <MaterialIcons name="check-circle" size={24} color="#f4511e" />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderCategoryTab = (category: string) => (
    <TouchableOpacity
      key={category}
      style={[
        styles.categoryTab,
        selectedCategory === category && styles.selectedCategoryTab
      ]}
      onPress={() => setSelectedCategory(category)}
    >
      <Text style={[
        styles.categoryText,
        selectedCategory === category && styles.selectedCategoryText
      ]}>
        {category}
      </Text>
    </TouchableOpacity>
  );
  
  const renderPageIndicator = () => {
    const dots = [];
    for (let i = 0; i < totalPages; i++) {
      dots.push(
        <View 
          key={i} 
          style={[
            styles.pageDot,
            currentPage === i && styles.activePageDot
          ]}
        />
      );
    }
    return (
      <View style={styles.pageIndicator}>
        {dots}
      </View>
    );
  };
  
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );
  
  const onMomentumScrollEnd = (e: { nativeEvent: { contentOffset: { x: number }, layoutMeasurement: { width: number } } }) => {
    const contentOffset = e.nativeEvent.contentOffset;
    const viewSize = e.nativeEvent.layoutMeasurement;
    const newPage = Math.floor(contentOffset.x / viewSize.width);
    setCurrentPage(newPage);
  };
  
  const navigatePage = (direction: 'prev' | 'next') => {
    let newPage = currentPage;
    if (direction === 'prev' && currentPage > 0) {
      newPage = currentPage - 1;
    } else if (direction === 'next' && currentPage < totalPages - 1) {
      newPage = currentPage + 1;
    }
    
    flatListRef.current?.scrollToIndex({
      index: newPage * pageSize,
      animated: true
    });
    setCurrentPage(newPage);
  };

  const paginatedData = () => {
    const startIndex = currentPage * pageSize;
    return filteredAvatars.slice(startIndex, startIndex + pageSize);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Avatar</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {/* Category tabs */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryContainer}
          >
            {CATEGORIES.map(renderCategoryTab)}
          </ScrollView>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#f4511e" />
              <Text style={styles.loadingText}>Loading avatars...</Text>
            </View>
          ) : (
            <View style={styles.carouselContainer}>
              {filteredAvatars.length > 0 ? (
                <>
                  <FlatList
                    ref={flatListRef}
                    data={paginatedData()}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    numColumns={4}
                    contentContainerStyle={styles.avatarGrid}
                    showsVerticalScrollIndicator={false}
                  />
                  
                  <View style={styles.navigationContainer}>
                    <TouchableOpacity 
                      style={[styles.navigationButton, currentPage === 0 && styles.disabledButton]}
                      onPress={() => navigatePage('prev')}
                      disabled={currentPage === 0}
                    >
                      <MaterialIcons name="chevron-left" size={30} color={currentPage === 0 ? "#666" : "#fff"} />
                    </TouchableOpacity>
                    
                    {renderPageIndicator()}
                    
                    <TouchableOpacity 
                      style={[styles.navigationButton, currentPage === totalPages - 1 && styles.disabledButton]}
                      onPress={() => navigatePage('next')}
                      disabled={currentPage === totalPages - 1}
                    >
                      <MaterialIcons name="chevron-right" size={30} color={currentPage === totalPages - 1 ? "#666" : "#fff"} />
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No avatars found in this category</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');
const avatarSize = (width - 120) / 4; // 4 per row

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '92%',
    maxWidth: 500,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#333',
  },
  selectedCategoryTab: {
    backgroundColor: '#f4511e',
  },
  categoryText: {
    color: '#ccc',
    fontSize: 14,
  },
  selectedCategoryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#ccc',
    marginTop: 12,
    fontSize: 14,
  },
  carouselContainer: {
    padding: 10,
    flex: 1,
  },
  avatarGrid: {
    paddingBottom: 10,
    paddingHorizontal: 10,
  },
  avatarItem: {
    width: avatarSize,
    aspectRatio: 1,
    margin: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 5,
    position: 'relative',
  },
  selectedAvatarItem: {
    borderWidth: 2,
    borderColor: '#f4511e',
  },
  avatarImageContainer: {
    width: '85%',
    height: '85%',
    borderRadius: 1000,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 1000,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  navigationButton: {
    padding: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#444',
    marginHorizontal: 3,
  },
  activePageDot: {
    backgroundColor: '#f4511e',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default AvatarSelectionModal; 