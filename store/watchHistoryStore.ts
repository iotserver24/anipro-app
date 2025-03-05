import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WatchHistoryItem = {
  id: string;
  name: string;
  img: string;
  episodeId: string;
  episodeNumber: number;
  timestamp: number;
  progress: number;
  duration: number;
};

interface WatchHistoryStore {
  history: WatchHistoryItem[];
  initializeStore: () => Promise<void>;
  addToHistory: (item: WatchHistoryItem) => Promise<void>;
  removeFromHistory: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  updateProgress: (episodeId: string, progress: number) => Promise<void>;
}

export const useWatchHistoryStore = create<WatchHistoryStore>((set, get) => ({
  history: [],

  initializeStore: async () => {
    try {
      const saved = await AsyncStorage.getItem('watch_history');
      if (saved) {
        const history = JSON.parse(saved);
        set({ history });
      }
    } catch (error) {
      console.error('Error initializing watch history:', error);
    }
  },

  addToHistory: async (item) => {
    try {
      const { history } = get();
      const existingIndex = history.findIndex(h => h.episodeId === item.episodeId);
      
      let newHistory;
      if (existingIndex !== -1) {
        newHistory = [...history];
        newHistory[existingIndex] = item;
      } else {
        newHistory = [item, ...history].slice(0, 30); // Keep last 30 items
      }

      await AsyncStorage.setItem('watch_history', JSON.stringify(newHistory));
      set({ history: newHistory });
    } catch (error) {
      console.error('Error adding to watch history:', error);
    }
  },

  removeFromHistory: async (id) => {
    try {
      const { history } = get();
      const newHistory = history.filter(item => item.id !== id);
      await AsyncStorage.setItem('watch_history', JSON.stringify(newHistory));
      set({ history: newHistory });
    } catch (error) {
      console.error('Error removing from watch history:', error);
    }
  },

  clearHistory: async () => {
    try {
      await AsyncStorage.removeItem('watch_history');
      set({ history: [] });
    } catch (error) {
      console.error('Error clearing watch history:', error);
    }
  },

  updateProgress: async (episodeId, progress) => {
    try {
      const { history } = get();
      const newHistory = history.map(item => 
        item.episodeId === episodeId 
          ? { ...item, progress }
          : item
      );
      await AsyncStorage.setItem('watch_history', JSON.stringify(newHistory));
      set({ history: newHistory });
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  },
})); 