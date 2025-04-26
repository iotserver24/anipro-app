import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { getCharacterById } from '../constants/characters';
import { db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { APP_CONFIG } from '../constants/appConfig';
import useCharacterStore from '../stores/characterStore';

interface StoreCharacter {
  id: string;
  name: string;
  anime: string;
  avatarUrl: string;
  description: string;
  downloadCount: number;
  version: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export default function CharacterStore() {
  const [characters, setCharacters] = useState<StoreCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCharacters = async () => {
    try {
      const response = await fetch(`${APP_CONFIG.API_BASE_URL}/characters`);
      const data = await response.json();
      setCharacters(data);
    } catch (error) {
      console.error('Error fetching characters:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCharacters();
  };

  useEffect(() => {
    fetchCharacters();
  }, []);

  const downloadCharacter = async (character: StoreCharacter) => {
    try {
      // Show loading indicator
      setLoading(true);

      // Transform the store character into the format expected by the chat
      const characterForChat = {
        id: character.id,
        name: character.name,
        anime: character.anime,
        avatarUrl: character.avatarUrl,
        primaryColor: character.primaryColor || '#f4511e',
        secondaryColor: character.secondaryColor || '#2C2C2C',
        systemPrompt: `You are ${character.name} from ${character.anime}. ${character.description || ''}`,
        greeting: `Hello! I'm ${character.name}!`,
        model: 'meta-llama/llama-4-maverick:free',
        features: [],
        personalityTags: [],
        version: character.version
      };

      // Store the character in the character store
      const characterStore = useCharacterStore.getState();
      characterStore.downloadedCharacters[character.id] = characterForChat;

      // Navigate to chat
      router.push({
        pathname: '/chat',
        params: { characterId: character.id }
      });
    } catch (error) {
      console.error('Error preparing character:', error);
      Alert.alert('Error', 'Failed to prepare character. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderAvatar = (character: StoreCharacter) => {
    if (character.avatarUrl) {
      return (
        <Image
          source={{ uri: character.avatarUrl }}
          style={styles.avatar}
          onError={() => console.log(`Failed to load avatar for ${character.name}`)}
        />
      );
    }
    return (
      <View style={[styles.avatar, { backgroundColor: character.primaryColor || '#f4511e', justifyContent: 'center', alignItems: 'center' }]}>
        <FontAwesome name="user" size={30} color="#fff" />
      </View>
    );
  };

  const renderCharacterCard = ({ item }: { item: StoreCharacter }) => (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: item.primaryColor || '#f4511e', borderLeftWidth: 4 }]}
      onPress={() => downloadCharacter(item)}
    >
      {renderAvatar(item)}
      <View style={styles.cardContent}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.anime}>{item.anime}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.stats}>
          <MaterialIcons name="file-download" size={12} color="#666" /> {item.downloadCount} • v{item.version}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.downloadButton, { backgroundColor: item.primaryColor || '#f4511e' }]}
        onPress={() => downloadCharacter(item)}
      >
        <MaterialIcons name="file-download" size={24} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f4511e" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Character Store',
          headerStyle: {
            backgroundColor: '#f4511e',
          },
          headerTintColor: '#fff',
          headerLeft: () => (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />
      <FlatList
        data={characters}
        renderItem={renderCharacterCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#f4511e']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome name="inbox" size={48} color="#666" />
            <Text style={styles.emptyText}>No characters available</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#000',
  },
  anime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#444',
    marginBottom: 8,
  },
  stats: {
    fontSize: 12,
    color: '#666',
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f4511e',
  },
  backButton: {
    marginLeft: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
}); 