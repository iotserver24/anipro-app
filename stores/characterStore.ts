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
  version: string;
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
    downloadCount: number;
  }>;
  isLoading: boolean;
  error: string | null;
  fetchAvailableCharacters: () => Promise<void>;
  downloadCharacter: (characterId: string) => Promise<void>;
  removeCharacter: (characterId: string) => Promise<void>;
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

      downloadCharacter: async (characterId: string) => {
        const state = get();
        const character = state.availableCharacters.find(c => c.id === characterId);
        if (!character) {
          throw new Error('Character not found in available characters');
        }
        
        set(state => ({
          downloadedCharacters: {
            ...state.downloadedCharacters,
            [characterId]: character
          }
        }));
      },

      removeCharacter: async (characterId: string) => {
        set(state => {
          const newCharacters = { ...state.downloadedCharacters };
          delete newCharacters[characterId];
          return { downloadedCharacters: newCharacters };
        });
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
          const value = await AsyncStorage.getItem(name);
          return value ?? null;
        },
        setItem: async (name, value) => {
          await AsyncStorage.setItem(name, value);
        },
        removeItem: async (name) => {
          await AsyncStorage.removeItem(name);
        },
      },
    }
  )
);

export default useCharacterStore; 