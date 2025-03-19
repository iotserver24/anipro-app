import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AVATARS, Avatar } from '../constants/avatars';

type AvatarSelectionModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (avatar: Avatar) => void;
  selectedAvatarId?: string;
};

const AvatarSelectionModal = ({
  visible,
  onClose,
  onSelect,
  selectedAvatarId
}: AvatarSelectionModalProps) => {
  const [loading, setLoading] = useState(false);
  const [avatars, setAvatars] = useState<Avatar[]>(AVATARS);

  // Fetch avatars from API when modal becomes visible
  useEffect(() => {
    if (visible) {
      fetchLatestAvatars();
    }
  }, [visible]);

  const fetchLatestAvatars = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://app.animeverse.cc/api/avatars/list');
      if (response.ok) {
        const data = await response.json();
        // Only update if we get valid data
        if (Array.isArray(data) && data.length > 0) {
          setAvatars(data);
          console.log('Successfully fetched', data.length, 'avatars from API');
        } else {
          console.warn('Received empty or invalid avatar list from API');
        }
      } else {
        console.warn('Failed to fetch avatars from API:', response.status);
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
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#f4511e" />
              <Text style={styles.loadingText}>Loading avatars...</Text>
            </View>
          ) : (
            <FlatList
              data={avatars}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              numColumns={5}
              contentContainerStyle={styles.avatarGrid}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');
const avatarSize = (width - 100) / 5;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
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
  avatarGrid: {
    padding: 10,
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
});

export default AvatarSelectionModal; 