import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Dimensions,
  ToastAndroid,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { TENOR_API_KEY } from '../constants/apiKeys';

type GifPickerProps = {
  isVisible: boolean;
  onClose: () => void;
  onSelectGif: (gifUrl: string) => void;
};

type GifItem = {
  id: string;
  url: string;
  preview: string;
};

const GifPicker = ({ isVisible, onClose, onSelectGif }: GifPickerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load trending GIFs by default
  useEffect(() => {
    if (isVisible) {
      fetchTrendingGifs();
    }
  }, [isVisible]);

  const fetchTrendingGifs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&limit=20&media_filter=basic`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch GIFs: ${response.status}`);
      }
      
      const data = await response.json();
      
      const formattedGifs = data.results.map((gif: any) => {
        // Get the MP4 URL for better compatibility
        const mp4Url = gif.media_formats.mp4?.url || gif.media_formats.gif?.url;
        return {
          id: gif.id,
          url: mp4Url, // Use MP4 URL which is more widely supported
          preview: gif.media_formats.tinygif?.url || gif.media_formats.nanogif?.url
        };
      });
      
      setGifs(formattedGifs);
    } catch (error) {
      console.error('Error fetching trending GIFs:', error);
      setError('Failed to load GIFs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const searchGifs = async () => {
    if (!searchQuery.trim()) {
      fetchTrendingGifs();
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(searchQuery)}&key=${TENOR_API_KEY}&limit=20&media_filter=basic`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to search GIFs: ${response.status}`);
      }
      
      const data = await response.json();
      
      const formattedGifs = data.results.map((gif: any) => {
        // Get the MP4 URL for better compatibility
        const mp4Url = gif.media_formats.mp4?.url || gif.media_formats.gif?.url;
        return {
          id: gif.id,
          url: mp4Url, // Use MP4 URL which is more widely supported
          preview: gif.media_formats.tinygif?.url || gif.media_formats.nanogif?.url
        };
      });
      
      setGifs(formattedGifs);
    } catch (error) {
      console.error('Error searching GIFs:', error);
      setError('Failed to search GIFs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGif = (gifUrl: string) => {
    // Show toast message for Android devices
    if (Platform.OS === 'android') {
      ToastAndroid.show('GIF selected!', ToastAndroid.SHORT);
    }
    
    onSelectGif(gifUrl);
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Select a GIF</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search GIFs..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={searchGifs}
              returnKeyType="search"
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={searchGifs} style={styles.searchButton}>
              <MaterialIcons name="search" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={fetchTrendingGifs} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : loading ? (
            <ActivityIndicator style={styles.loader} size="large" color="#f4511e" />
          ) : (
            <FlatList
              data={gifs}
              keyExtractor={(item) => item.id}
              numColumns={2}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.gifItem}
                  onPress={() => handleSelectGif(item.url)}
                >
                  {item.preview ? (
                    <Image
                      source={{ uri: item.preview }}
                      style={styles.gifImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.gifImage, styles.placeholderImage]}>
                      <MaterialIcons name="gif" size={24} color="#666" />
                    </View>
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.gifList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No GIFs found</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');
const gifWidth = (width - 60) / 2;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#232323',
    color: '#fff',
    padding: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: '#f4511e',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gifList: {
    padding: 12,
  },
  gifItem: {
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gifImage: {
    width: gifWidth,
    height: gifWidth,
    backgroundColor: '#2a2a2a',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    marginTop: 20,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#f4511e',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#f4511e',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
  },
});

export default GifPicker; 