import { create } from 'zustand';
import { MyListAnime } from '../utils/myList';
import { syncService } from '../services/syncService';
import { auth } from '../services/firebase';
import { getItem, setItem, removeItem } from '../utils/storage';
import { logger } from '../utils/logger';

const STORAGE_KEY = 'anipro:watchlist';

interface MyListStore {
  myList: MyListAnime[];
  bookmarkedIds: Set<string>;
  initializeStore: () => Promise<void>;
  addAnime: (anime: MyListAnime) => Promise<boolean>;
  removeAnime: (animeId: string) => Promise<boolean>;
  isBookmarked: (animeId: string) => boolean;
  initializeList: () => Promise<void>;
  clearList: () => Promise<void>;
}

export const useMyListStore = create<MyListStore>((set, get) => ({
  myList: [],
  bookmarkedIds: new Set(),

  initializeStore: async () => {
    try {
      // Load local data first for immediate UI response
      const savedList = await getItem<MyListAnime[]>(STORAGE_KEY);
      if (savedList && savedList.length > 0) {
        set({
          myList: savedList,
          bookmarkedIds: new Set(savedList.map(item => item.id))
        });
      }
    } catch (error) {
      logger.error('Error loading local watchlist data:', error);
    }
  },

  initializeList: async () => {
    try {
      // Always load local data first for immediate response
      const localList = await getItem<MyListAnime[]>(STORAGE_KEY) || [];
      
      // Set local data immediately for fast UI response
      if (localList.length > 0) {
        set({
          myList: localList,
          bookmarkedIds: new Set(localList.map(item => item.id))
        });
      }
      
      // If user is authenticated, try to sync with cloud in background
      if (auth.currentUser) {
        // Perform initial sync which will merge local and cloud data
        const syncResult = await syncService.performInitialSync([], localList);
        if (syncResult?.watchlist && syncResult.watchlist.length > 0) {
          set({
            myList: syncResult.watchlist,
            bookmarkedIds: new Set(syncResult.watchlist.map(item => item.id))
          });
          // Update local storage with merged data
          await setItem(STORAGE_KEY, syncResult.watchlist);
        }
      }
    } catch (error) {
      logger.error('Error initializing my list store:', error);
      // If there was an error fetching, we already have local data displayed
    }
  },

  addAnime: async (anime) => {
    try {
      const { myList, bookmarkedIds } = get();
      if (!bookmarkedIds.has(anime.id)) {
        // Add addedAt property to the anime object
        const animeWithTimestamp = { ...anime, addedAt: Date.now() };
        const newList = [...myList, animeWithTimestamp];
        
        // Update state and bookmarkedIds
        const newBookmarkedIds = new Set(bookmarkedIds);
        newBookmarkedIds.add(anime.id);
        set({ 
          myList: newList,
          bookmarkedIds: newBookmarkedIds 
        });
        
        // Save to local storage first (fast operation)
        await setItem(STORAGE_KEY, newList);
        
        // Then sync with cloud (may be slow or fail)
        if (auth.currentUser) {
          syncService.syncWatchlist(newList);
        }
        
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error adding anime to my list:', error);
      return false;
    }
  },

  removeAnime: async (animeId) => {
    try {
      const { myList, bookmarkedIds } = get();
      if (bookmarkedIds.has(animeId)) {
        const newList = myList.filter(anime => anime.id !== animeId);
        
        // Update state and bookmarkedIds
        const newBookmarkedIds = new Set(bookmarkedIds);
        newBookmarkedIds.delete(animeId);
        set({ 
          myList: newList,
          bookmarkedIds: newBookmarkedIds 
        });
        
        // Save to local storage first (fast operation)
        await setItem(STORAGE_KEY, newList);
        
        // Then sync with cloud (may be slow or fail)
        if (auth.currentUser) {
          syncService.syncWatchlist(newList);
        }
        
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error removing anime from my list:', error);
      return false;
    }
  },

  isBookmarked: (animeId) => {
    return get().bookmarkedIds.has(animeId);
  },

  clearList: async () => {
    try {
      // Clear local storage
      await removeItem(STORAGE_KEY);
      
      // If user is authenticated, clear Firestore data
      if (auth.currentUser) {
        await syncService.syncWatchlist([]);
      }
      
      set({ 
        myList: [],
        bookmarkedIds: new Set()
      });
      logger.info('Watchlist cleared successfully');
    } catch (error) {
      logger.error('Error clearing watchlist:', error);
    }
  }
})); 