import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

const FALLBACK_IMAGE = 'https://via.placeholder.com/300x450?text=No+Image';
const STORAGE_KEY = 'anipro:watchHistory';

export interface WatchHistoryItem {
  id: string;          // Anime ID
  name: string;        // Anime Name
  img: string;         // Anime Image
  episodeId: string;   // Current Episode ID
  episodeNumber: number;
  timestamp: number;
  progress: number;
  duration: number;
  lastWatched: number;
  subOrDub: 'sub' | 'dub';
}

interface WatchHistoryState {
  history: WatchHistoryItem[];
  addToHistory: (item: WatchHistoryItem) => void;
  updateProgress: (episodeId: string, progress: number) => void;
  getHistory: () => WatchHistoryItem[];
  clearHistory: () => void;
  initializeHistory: () => Promise<void>;
}

export const useWatchHistoryStore = create<WatchHistoryState>((set, get) => ({
  history: [],

  initializeHistory: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const history = JSON.parse(stored);
        set({ history });
      }
    } catch (error) {
      logger.error('Error loading watch history:', error);
    }
  },
  
  addToHistory: (item: WatchHistoryItem) => {
    if (!item.id || !item.episodeId) {
      logger.error('Invalid history item:', item);
      return;
    }

    set((state) => {
      const filteredHistory = state.history.filter(
        (historyItem) => historyItem.id !== item.id
      );

      const validatedItem = {
        ...item,
        name: item.name?.trim() || 'Unknown Anime',
        img: item.img?.trim() || FALLBACK_IMAGE,
        episodeNumber: item.episodeNumber || 1,
        progress: item.progress || 0, // Store in seconds
        duration: item.duration || 0, // Store in seconds
        lastWatched: Date.now()
      };

      const newHistory = [validatedItem, ...filteredHistory].slice(0, 20);
      
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory))
        .catch(error => logger.error('Error saving watch history:', error));

      return { history: newHistory };
    });
  },

  updateProgress: (episodeId: string, progress: number) => {
    set((state) => {
      const newHistory = [...state.history];
      const index = newHistory.findIndex(
        (item) => item.episodeId === episodeId
      );

      if (index !== -1) {
        newHistory[index] = {
          ...newHistory[index],
          progress,
          lastWatched: Date.now()
        };

        // Save to AsyncStorage
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory))
          .catch(error => logger.error('Error saving watch history:', error));
      }

      return { history: newHistory };
    });
  },

  getHistory: () => get().history,
  
  clearHistory: () => {
    AsyncStorage.removeItem(STORAGE_KEY)
      .catch(error => logger.error('Error clearing watch history:', error));
    set({ history: [] });
  }
}));

export { FALLBACK_IMAGE }; 