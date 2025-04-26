import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useCharacterStore from '../stores/characterStore';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';

export default function CharacterBrowserScreen() {
  const navigation = useNavigation();
  const {
    availableCharacters,
    downloadedCharacters,
    isLoading,
    error,
    fetchAvailableCharacters,
    downloadCharacter,
  } = useCharacterStore();

  useEffect(() => {
    fetchAvailableCharacters();
  }, []);

  const renderCharacterItem = ({ item }) => {
    const isDownloaded = !!downloadedCharacters[item.id];

    return (
      <TouchableOpacity
        style={styles.characterCard}
        onPress={() => !isDownloaded && downloadCharacter(item.id)}
      >
        <Image
          source={{ uri: item.avatarUrl }}
          style={styles.avatar}
          defaultSource={require('../assets/default-avatar.png')}
        />
        <View style={styles.characterInfo}>
          <Text style={styles.characterName}>{item.name}</Text>
          <Text style={styles.animeTitle}>{item.anime}</Text>
          <View style={styles.tagsContainer}>
            {item.personalityTags.slice(0, 2).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.downloads}>
            <MaterialIcons name="file-download" size={12} color="#808080" /> {item.downloadCount}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.downloadButton,
            isDownloaded && styles.downloadedButton,
          ]}
          disabled={isDownloaded}
          onPress={() => downloadCharacter(item.id)}
        >
          <MaterialIcons 
            name={isDownloaded ? "check" : "file-download"} 
            size={20} 
            color="#FFFFFF" 
          />
          <Text style={styles.downloadButtonText}>
            {isDownloaded ? 'Downloaded' : 'Download'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="error-outline" size={64} color="#FF6B6B" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchAvailableCharacters}
        >
          <MaterialIcons name="refresh" size={20} color="#FFFFFF" />
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Browse Characters</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.headerButton, styles.storeButton]}
            onPress={() => navigation.navigate('character-store')}
          >
            <FontAwesome5 name="store" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={availableCharacters}
        renderItem={renderCharacterItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchAvailableCharacters}
            tintColor="#FF6B6B"
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.centerContainer}>
              <FontAwesome5 name="user-astronaut" size={64} color="#808080" />
              <Text style={styles.emptyText}>No characters available</Text>
              <TouchableOpacity
                style={styles.storeButtonLarge}
                onPress={() => navigation.navigate('character-store')}
              >
                <FontAwesome5 name="store" size={20} color="#FFFFFF" style={styles.storeButtonIcon} />
                <Text style={styles.storeButtonText}>Visit Character Store</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  storeButton: {
    backgroundColor: '#4A90E2',
    padding: 10,
  },
  listContainer: {
    padding: 16,
  },
  characterCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  characterInfo: {
    flex: 1,
  },
  characterName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  animeTitle: {
    color: '#B0B0B0',
    fontSize: 14,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tag: {
    backgroundColor: '#FF6B6B20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  tagText: {
    color: '#FF6B6B',
    fontSize: 12,
  },
  downloads: {
    color: '#808080',
    fontSize: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadedButton: {
    backgroundColor: '#4A4A4A',
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  emptyText: {
    color: '#808080',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  storeButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  storeButtonIcon: {
    marginRight: 8,
  },
  storeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 