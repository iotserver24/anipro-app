import { create } from 'zustand';
import { logger } from '../utils/logger';
import { getItem, setItem, removeItem } from '../utils/storage';

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
      const stored = await getItem<WatchHistoryItem[]>(STORAGE_KEY);
      if (stored && Array.isArray(stored)) {
        // Sort by lastWatched (most recent first)
        const sortedHistory = stored.sort((a: WatchHistoryItem, b: WatchHistoryItem) => 
          b.lastWatched - a.lastWatched
        );
        
        console.log(`[DEBUG] WatchHistoryStore: Loaded ${sortedHistory.length} history items`);
        set({ history: sortedHistory });
      } else {
        console.log('[DEBUG] WatchHistoryStore: No history found in storage');
        set({ history: [] });
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

    console.log(`[DEBUG] WatchHistoryStore: Adding to history - episodeId: ${item.episodeId}, progress: ${item.progress}, duration: ${item.duration}`);

    const currentHistory = get().history;
    const currentTime = Date.now();
    
    // Prepare the validated item with all required fields
    const validatedItem = {
      ...item,
      name: item.name?.trim() || 'Unknown Anime',
      img: item.img?.trim() || FALLBACK_IMAGE,
      episodeNumber: item.episodeNumber || 1,
      progress: item.progress > 0 ? item.progress : 0,
      duration: item.duration > 0 ? item.duration : 0,
      timestamp: item.timestamp || currentTime,
      lastWatched: currentTime // Always update lastWatched to current time
    };

    console.log(`[DEBUG] WatchHistoryStore: Validated progress: ${validatedItem.progress}`);

    // Create new history array with the new item
    const newHistory = [...currentHistory, validatedItem];

    // Sort by lastWatched (most recent first)
    newHistory.sort((a, b) => b.lastWatched - a.lastWatched);

    // Save to storage
    try {
      await setItem(STORAGE_KEY, newHistory);
      set({ history: newHistory });
      console.log(`[DEBUG] WatchHistoryStore: Saved ${newHistory.length} history items to storage`);
    } catch (error) {
      logger.error('Error saving watch history:', error);
    }
  },

  updateProgress: async (episodeId: string, progress: number) => {
    if (progress <= 0) {
      logger.error('Invalid progress value:', progress);
      return;
    }
    
    console.log(`[DEBUG] WatchHistoryStore: Updating progress for episodeId: ${episodeId}, progress: ${progress}`);
    
    const currentHistory = get().history;
    const newHistory = [...currentHistory];
    const index = newHistory.findIndex(
      (item) => item.episodeId === episodeId
    );

    console.log(`[DEBUG] WatchHistoryStore: Found episode at index: ${index}`);
    
    if (index !== -1) {
      const currentTime = Date.now();
      
      // Only update if the new progress is greater than the existing progress
      // or if we're within 10 seconds of the end
      const shouldUpdateProgress = 
        progress > newHistory[index].progress || 
        (newHistory[index].duration > 0 && progress >= newHistory[index].duration - 10);
      
      console.log(`[DEBUG] WatchHistoryStore: Should update progress: ${shouldUpdateProgress}, current: ${newHistory[index].progress}, new: ${progress}`);
      
      if (shouldUpdateProgress) {
        console.log(`[DEBUG] WatchHistoryStore: Updating progress from ${newHistory[index].progress} to ${progress}`);
        
        newHistory[index] = {
          ...newHistory[index],
          progress,
          lastWatched: currentTime
        };
      } else {
        // Just update the lastWatched time
        newHistory[index].lastWatched = currentTime;
      }

      // Re-sort by lastWatched (most recent first)
      newHistory.sort((a, b) => b.lastWatched - a.lastWatched);

      // Save to storage
      const success = await setItem(STORAGE_KEY, newHistory);
      if (success) {
        console.log(`[DEBUG] WatchHistoryStore: Saved updated progress to storage`);
      } else {
        console.error('[DEBUG] WatchHistoryStore: Failed to save updated progress to storage');
      }
      
      set({ history: newHistory });
    }
  },

  getHistory: () => {
    const history = get().history;
    console.log(`[DEBUG] WatchHistoryStore: Getting history with ${history.length} items`);
    return history;
  },
  
  clearHistory: async () => {
    console.log(`[DEBUG] WatchHistoryStore: Clearing history`);
    await removeItem(STORAGE_KEY);
    set({ history: [] });
  },
  
  removeFromHistory: async (animeId: string) => {
    console.log(`[DEBUG] WatchHistoryStore: Removing anime with ID: ${animeId} from history`);
    const currentHistory = get().history;
    const filteredHistory = currentHistory.filter(
      (historyItem) => historyItem.id !== animeId
    );
    
    const success = await setItem(STORAGE_KEY, filteredHistory);
    if (success) {
      console.log(`[DEBUG] WatchHistoryStore: Saved filtered history with ${filteredHistory.length} items`);
    } else {
      console.error('[DEBUG] WatchHistoryStore: Failed to save filtered history to storage');
    }
      
    set({ history: filteredHistory });
  }
}));

export { FALLBACK_IMAGE }; 