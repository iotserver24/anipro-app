import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useCharacterStore from '../stores/characterStore';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

export default function CharacterSelectionScreen() {
  const navigation = useNavigation();
  const { downloadedCharacters, removeCharacter } = useCharacterStore();

  const characters = Object.values(downloadedCharacters);

  const handleCharacterPress = (character) => {
    navigation.navigate('Chat', { character });
  };

  const handleRemoveCharacter = (characterId: string) => {
    Alert.alert(
      'Remove Character',
      'Are you sure you want to remove this character? You can download it again later.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeCharacter(characterId),
        },
      ]
    );
  };

  const renderCharacterItem = ({ item }) => (
    <TouchableOpacity
      style={styles.characterCard}
      onPress={() => handleCharacterPress(item)}
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
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveCharacter(item.id)}
      >
        <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Characters</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.headerButton, styles.storeButton]}
            onPress={() => navigation.navigate('character-store')}
          >
            <FontAwesome5 name="store" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, styles.browseButton]}
            onPress={() => navigation.navigate('CharacterBrowser')}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
            <Text style={styles.browseButtonText}>Browse More</Text>
          </TouchableOpacity>
        </View>
      </View>

      {characters.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="user-astronaut" size={64} color="#808080" />
          <Text style={styles.emptyText}>
            You haven't downloaded any characters yet.
          </Text>
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={() => navigation.navigate('character-store')}
          >
            <FontAwesome5 name="store" size={20} color="#FFFFFF" style={styles.downloadButtonIcon} />
            <Text style={styles.downloadButtonText}>Visit Character Store</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={characters}
          renderItem={renderCharacterItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
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
    marginRight: 12,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
  removeButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    color: '#808080',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  downloadButtonIcon: {
    marginRight: 8,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 