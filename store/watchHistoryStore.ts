import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WatchHistoryItem {
  episodeId: string;
  animeId: string;
  progress: number;
  timestamp: number;
}

interface WatchHistoryStore {
  history: WatchHistoryItem[];
  getHistory: () => Promise<WatchHistoryItem[]>;
  addToHistory: (item: WatchHistoryItem) => Promise<void>;
  updateProgress: (episodeId: string, progress: number) => Promise<void>;
}

export const useWatchHistoryStore = create<WatchHistoryStore>((set, get) => ({
  history: [],
  
  getHistory: async () => {
    try {
      const stored = await AsyncStorage.getItem('watchHistory');
      if (stored) {
        const history = JSON.parse(stored);
        set({ history });
        return history;
      }
      return [];
    } catch (error) {
      console.error('Error getting watch history:', error);
      return [];
    }
  },

  addToHistory: async (item: WatchHistoryItem) => {
    try {
      const history = [...get().history];
      const index = history.findIndex(h => h.episodeId === item.episodeId);
      
      if (index > -1) {
        history[index] = item;
      } else {
        history.push(item);
      }
      
      await AsyncStorage.setItem('watchHistory', JSON.stringify(history));
      set({ history });
    } catch (error) {
      console.error('Error adding to watch history:', error);
    }
  },

  updateProgress: async (episodeId: string, progress: number) => {
    try {
      const history = [...get().history];
      const index = history.findIndex(h => h.episodeId === episodeId);
      
      if (index > -1) {
        history[index].progress = progress;
        history[index].timestamp = Date.now();
        await AsyncStorage.setItem('watchHistory', JSON.stringify(history));
        set({ history });
      }
    } catch (error) {
      console.error('Error updating watch progress:', error);
    }
  }
})); 