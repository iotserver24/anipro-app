import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

interface Character {
  id: string;
  name: string;
  anime: string;
  primaryColor: string;
  secondaryColor: string;
  systemPrompt: string;
  greeting: string;
  model: string;
  features: string[];
  personalityTags: string[];
  avatarUrl: string;
  backgroundUrl: string;
  version: string;
  chatCount: number;
}

interface CharacterStore {
  downloadedCharacters: Record<string, Character>;
  availableCharacters: Array<{
    id: string;
    name: string;
    anime: string;
    version: string;
    avatarUrl: string;
    personalityTags: string[];
    chatCount: number;
  }>;
  isLoading: boolean;
  error: string | null;
  fetchAvailableCharacters: () => Promise<void>;
  startChat: (characterId: string) => Promise<void>;
  getCharacter: (characterId: string) => Character | null;
}

const API_BASE_URL = 'https://anisurge.me/api';

const useCharacterStore = create<CharacterStore>()(
  persist(
    (set, get) => ({
      downloadedCharacters: {},
      availableCharacters: [],
      isLoading: false,
      error: null,

      fetchAvailableCharacters: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE_URL}/characters`);
          if (!response.ok) throw new Error('Failed to fetch characters');
          
          const characters = await response.json();
          set({ availableCharacters: characters });
        } catch (error) {
          set({ error: (error as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },

      startChat: async (characterId: string) => {
        try {
          // Notify the API that a chat session has started
          const response = await fetch(`${API_BASE_URL}/characters?id=${characterId}&action=startChat`);
          if (!response.ok) throw new Error('Failed to start chat session');
          
          const character = await response.json();
          
          // Update the character in the store with the new chat count
          set(state => ({
            downloadedCharacters: {
              ...state.downloadedCharacters,
              [characterId]: character
            },
            availableCharacters: state.availableCharacters.map(c => 
              c.id === characterId 
                ? { ...c, chatCount: (c.chatCount || 0) + 1 }
                : c
            )
          }));
        } catch (error) {
          console.error('Failed to start chat:', error);
          Alert.alert('Error', 'Failed to start chat session. Please try again.');
        }
      },

      getCharacter: (characterId: string) => {
        const state = get();
        return state.downloadedCharacters[characterId] || null;
      },
    }),
    {
      name: 'character-store',
      storage: {
        getItem: async (name) => {
          try {
            const value = await AsyncStorage.getItem(name);
            if (!value) return null;
            return JSON.parse(value);
          } catch (error) {
            console.error('Storage getItem error:', error);
            return null;
          }
        },
        setItem: async (name, value) => {
          try {
            await AsyncStorage.setItem(name, JSON.stringify(value));
          } catch (error) {
            console.error('Storage setItem error:', error);
          }
        },
        removeItem: async (name) => {
          try {
            await AsyncStorage.removeItem(name);
          } catch (error) {
            console.error('Storage removeItem error:', error);
          }
        },
      },
    }
  )
);

export default useCharacterStore; 