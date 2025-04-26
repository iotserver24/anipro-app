import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useCharacterStore from '../stores/characterStore';
import { AVAILABLE_CHARACTERS, getCharacterById } from '../constants/characters';

interface ChatHistory {
  characterId: string;
  lastMessage: string;
  timestamp: string;
  messageCount: number;
}

export default function ChatHistoryScreen() {
  const [history, setHistory] = useState<ChatHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { downloadedCharacters } = useCharacterStore();

  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      setLoading(true);
      const keys = await AsyncStorage.getAllKeys();
      const chatKeys = keys.filter(key => key.startsWith('chat_messages_'));
      
      const historyPromises = chatKeys.map(async key => {
        const messages = await AsyncStorage.getItem(key);
        if (!messages) return null;
        
        const parsedMessages = JSON.parse(messages);
        const characterId = key.replace('chat_messages_', '');
        
        if (parsedMessages.length === 0) return null;

        return {
          characterId,
          lastMessage: parsedMessages[parsedMessages.length - 1].text,
          timestamp: new Date(parsedMessages[parsedMessages.length - 1].timestamp).toLocaleString(),
          messageCount: parsedMessages.length
        };
      });

      const historyResults = (await Promise.all(historyPromises)).filter(Boolean);
      setHistory(historyResults.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async (characterId: string) => {
    try {
      await AsyncStorage.removeItem(`chat_messages_${characterId}`);
      setHistory(prev => prev.filter(h => h.characterId !== characterId));
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  };

  const getCharacterInfo = (characterId: string) => {
    // First check in downloaded characters
    const downloadedChar = downloadedCharacters[characterId];
    if (downloadedChar) {
      return {
        name: downloadedChar.name,
        avatar: downloadedChar.avatarUrl,
        source: 'Downloaded'
      };
    }

    // Then check in predefined characters
    const predefinedChar = getCharacterById(characterId);
    if (predefinedChar) {
      return {
        name: predefinedChar.name,
        avatar: predefinedChar.avatar,
        source: 'Built-in'
      };
    }

    return null;
  };

  const renderHistoryItem = ({ item }: { item: ChatHistory }) => {
    const characterInfo = getCharacterInfo(item.characterId);
    if (!characterInfo) return null;

    return (
      <TouchableOpacity
        style={styles.historyCard}
        onPress={() => router.push({
          pathname: '/chat',
          params: { characterId: item.characterId }
        })}
      >
        <Image
          source={typeof characterInfo.avatar === 'string' ? { uri: characterInfo.avatar } : characterInfo.avatar}
          style={styles.avatar}
        />
        <View style={styles.historyInfo}>
          <View style={styles.nameContainer}>
            <Text style={styles.characterName}>{characterInfo.name}</Text>
            <View style={[
              styles.sourceTag,
              { backgroundColor: characterInfo.source === 'Downloaded' ? '#4CAF50' : '#2196F3' }
            ]}>
              <Text style={styles.sourceText}>{characterInfo.source}</Text>
            </View>
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          <View style={styles.historyMeta}>
            <Text style={styles.timestamp}>{item.timestamp}</Text>
            <Text style={styles.messageCount}>
              {item.messageCount} messages
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => clearHistory(item.characterId)}
        >
          <MaterialIcons name="delete-outline" size={24} color="#ff6b6b" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Chat History',
          headerStyle: {
            backgroundColor: '#1a1a1a',
          },
          headerTintColor: '#fff',
        }}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f4511e" />
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={item => item.characterId}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="history" size={48} color="#666" />
              <Text style={styles.emptyText}>No chat history</Text>
              <Text style={styles.emptySubtext}>
                Start chatting with characters to see your history here
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  historyInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  characterName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 8,
  },
  sourceTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  sourceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  lastMessage: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  historyMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  messageCount: {
    fontSize: 12,
    color: '#666',
  },
  clearButton: {
    padding: 8,
    marginLeft: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
}); 