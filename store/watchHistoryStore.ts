import { create } from 'zustand';
import { logger } from '../utils/logger';
import { getItem, setItem, removeItem } from '../utils/storage';
import { syncService } from '../services/syncService';
import { auth } from '../services/firebase';

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
  addToHistory: (item: WatchHistoryItem) => Promise<void>;
  updateProgress: (episodeId: string, progress: number) => Promise<void>;
  getHistory: () => WatchHistoryItem[];
  clearHistory: () => Promise<void>;
  initializeHistory: () => Promise<void>;
  removeFromHistory: (animeId: string) => Promise<void>;
}

export const useWatchHistoryStore = create<WatchHistoryState>((set, get) => ({
  history: [],

  initializeHistory: async () => {
    try {
      // Always load local data first for immediate response
      const localHistory = await getItem<WatchHistoryItem[]>(STORAGE_KEY) || [];
      
      // Set local data immediately for faster UI response
      if (localHistory.length > 0) {
        const sortedHistory = localHistory.sort((a, b) => b.lastWatched - a.lastWatched);
        set({ history: sortedHistory });
      }
      
      // If user is authenticated, try to sync with cloud in background
      if (auth.currentUser) {
        // Perform initial sync which will merge local and cloud data
        const syncResult = await syncService.performInitialSync(localHistory, []);
        if (syncResult?.watchHistory && syncResult.watchHistory.length > 0) {
          set({ history: syncResult.watchHistory });
          // Update local storage with merged data
          await setItem(STORAGE_KEY, syncResult.watchHistory);
        }
      }
    } catch (error) {
      logger.error('Error loading watch history:', error);
      // We already set local data, so no need to reset here
    }
  },
  
  addToHistory: async (item: WatchHistoryItem) => {
    if (!item.id || !item.episodeId) {
      logger.error('Invalid history item:', item);
      return;
    }

    try {
      let history = [...get().history];
      
      // Update existing item or add new one
      const existingIndex = history.findIndex(h => h.episodeId === item.episodeId);
      if (existingIndex >= 0) {
        // Update existing item
        history[existingIndex] = {
          ...history[existingIndex],
          ...item,
          lastWatched: Date.now()
        };
      } else {
        // Add new item with current timestamp
        history.unshift({
          ...item,
          lastWatched: Date.now()
        });
      }
      
      // Sort by last watched
      history = history.sort((a, b) => b.lastWatched - a.lastWatched);
      
      // Update state
      set({ history });
      
      // Save to local storage first (fast operation)
      await setItem(STORAGE_KEY, history);
      
      // Then sync with cloud (may be slow or fail)
      if (auth.currentUser) {
        syncService.syncWatchHistory(history);
      }
    } catch (error) {
      logger.error('Error adding to watch history:', error);
    }
  },
  
  updateProgress: async (episodeId: string, progress: number) => {
    try {
      let history = [...get().history];
      const itemIndex = history.findIndex(item => item.episodeId === episodeId);
      
      if (itemIndex === -1) {
        logger.warn(`Episode ${episodeId} not found in watch history`);
        return;
      }
      
      // Update progress and last watched time
      history[itemIndex] = {
        ...history[itemIndex],
        progress,
        lastWatched: Date.now()
      };
      
      // Resort by last watched
      history = history.sort((a, b) => b.lastWatched - a.lastWatched);
      
      // Update state
      set({ history });
      
      // Save to local storage first (fast operation)
      await setItem(STORAGE_KEY, history);
      
      // Then sync with cloud (may be slow or fail)
      if (auth.currentUser) {
        syncService.syncWatchHistory(history);
      }
    } catch (error) {
      logger.error('Error updating watch progress:', error);
    }
  },

  getHistory: () => {
    const history = get().history;
    //console.log(`[DEBUG] WatchHistoryStore: Getting history with ${history.length} items`);
    return history;
  },
  
  clearHistory: async () => {
    try {
      // Clear local storage
      await removeItem(STORAGE_KEY);
      
      // If user is authenticated, clear Firestore data
      if (auth.currentUser) {
        await syncService.syncWatchHistory([]);
      }
      
      set({ history: [] });
      logger.info('Watch history cleared successfully');
    } catch (error) {
      logger.error('Error clearing watch history:', error);
    }
  },
  
  removeFromHistory: async (animeId: string) => {
    //console.log(`[DEBUG] WatchHistoryStore: Removing anime with ID: ${animeId} from history`);
    const currentHistory = get().history;
    const filteredHistory = currentHistory.filter(
      (historyItem) => historyItem.id !== animeId
    );
    
    try {
      // Save to local storage
      await setItem(STORAGE_KEY, filteredHistory);
      
      // Sync with Firestore
      await syncService.syncWatchHistory(filteredHistory);
      
      set({ history: filteredHistory });
    } catch (error) {
      logger.error('Error removing from watch history:', error);
    }
  }
}));

export { FALLBACK_IMAGE }; 