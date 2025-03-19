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
      // If user is authenticated, try to fetch from Firestore first
      if (auth.currentUser) {
        // Get local data first
        const localHistory = await getItem<WatchHistoryItem[]>(STORAGE_KEY) || [];
        
        // Perform initial sync which will merge local and cloud data
        const syncResult = await syncService.performInitialSync(localHistory, []);
        if (syncResult) {
          set({ history: syncResult.watchHistory });
          // Update local storage with merged data
          await setItem(STORAGE_KEY, syncResult.watchHistory);
          return;
        }
      }

      // If not authenticated or sync failed, use local storage
      const stored = await getItem<WatchHistoryItem[]>(STORAGE_KEY);
      if (stored && Array.isArray(stored)) {
        const sortedHistory = stored.sort((a, b) => b.lastWatched - a.lastWatched);
        set({ history: sortedHistory });
      }
    } catch (error) {
      logger.error('Error loading watch history:', error);
      set({ history: [] });
    }
  },
  
  addToHistory: async (item: WatchHistoryItem) => {
    if (!item.id || !item.episodeId) {
      logger.error('Invalid history item:', item);
      return;
    }

    const currentHistory = get().history;
    const currentTime = Date.now();
    
    // Check if item already exists and if update is needed
    const existingIndex = currentHistory.findIndex(
      (historyItem) => historyItem.episodeId === item.episodeId
    );

    // Prepare the validated item with all required fields
    const validatedItem = {
      ...item,
      name: item.name?.trim() || 'Unknown Anime',
      img: item.img?.trim() || FALLBACK_IMAGE,
      episodeNumber: item.episodeNumber || 1,
      progress: item.progress > 0 ? item.progress : 0,
      duration: item.duration > 0 ? item.duration : 0,
      timestamp: item.timestamp || currentTime,
      lastWatched: currentTime
    };

    // Only update if:
    // 1. Item doesn't exist, or
    // 2. Progress has changed significantly (more than 5 seconds), or
    // 3. It's been more than 5 minutes since last update
    const shouldUpdate = 
      existingIndex === -1 ||
      Math.abs(validatedItem.progress - currentHistory[existingIndex].progress) > 5 ||
      currentTime - currentHistory[existingIndex].lastWatched > 300000;

    if (!shouldUpdate) {
      return;
    }

    let newHistory;
    if (existingIndex !== -1) {
      // Update existing item
      newHistory = [...currentHistory];
      newHistory[existingIndex] = validatedItem;
    } else {
      // Add new item
      newHistory = [...currentHistory, validatedItem];
    }

    // Sort by lastWatched (most recent first)
    newHistory.sort((a, b) => b.lastWatched - a.lastWatched);

    // Only update if the history has actually changed
    if (JSON.stringify(newHistory) !== JSON.stringify(currentHistory)) {
      try {
        // Save to local storage first for immediate feedback
        await setItem(STORAGE_KEY, newHistory);
        set({ history: newHistory });
        
        // Then sync with Firestore
        syncService.syncWatchHistory(newHistory);
      } catch (error) {
        logger.error('Error saving watch history:', error);
      }
    }
  },

  updateProgress: async (episodeId: string, progress: number) => {
    if (progress <= 0) return;
    
    const currentHistory = get().history;
    const index = currentHistory.findIndex(
      (item) => item.episodeId === episodeId
    );
    
    if (index !== -1) {
      const currentTime = Date.now();
      const currentItem = currentHistory[index];
      
      // Only update if:
      // 1. Progress has changed significantly (more than 5 seconds), or
      // 2. It's been more than 5 minutes since last update
      const shouldUpdate = 
        Math.abs(progress - currentItem.progress) > 5 ||
        currentTime - currentItem.lastWatched > 300000;
      
      if (!shouldUpdate) {
        return;
      }

      const newHistory = [...currentHistory];
      newHistory[index] = {
        ...currentItem,
        progress,
        lastWatched: currentTime
      };

      // Sort by lastWatched (most recent first)
      newHistory.sort((a, b) => b.lastWatched - a.lastWatched);

      // Only update if the history has actually changed
      if (JSON.stringify(newHistory) !== JSON.stringify(currentHistory)) {
        try {
          // Save to local storage first
          await setItem(STORAGE_KEY, newHistory);
          set({ history: newHistory });
          
          // Then sync with Firestore
          syncService.syncWatchHistory(newHistory);
        } catch (error) {
          logger.error('Error updating watch history:', error);
        }
      }
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