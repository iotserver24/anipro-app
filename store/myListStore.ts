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
      // Try to fetch from Firestore first
      const userData = await syncService.fetchUserData();
      if (userData?.watchlist) {
        const watchlist = userData.watchlist;
        set({
          myList: watchlist,
          bookmarkedIds: new Set(watchlist.map(item => item.id))
        });
        return;
      }

      // Fallback to local storage
      const savedList = await getItem<MyListAnime[]>(STORAGE_KEY);
      if (savedList) {
        set({
          myList: savedList,
          bookmarkedIds: new Set(savedList.map(item => item.id))
        });
      }
    } catch (error) {
      logger.error('Error initializing my list store:', error);
    }
  },

  addAnime: async (anime) => {
    try {
      const { myList, bookmarkedIds } = get();
      if (!bookmarkedIds.has(anime.id)) {
        const newList = [...myList, { ...anime, addedAt: Date.now() }];
        
        // Only update if the list has actually changed
        if (JSON.stringify(newList) !== JSON.stringify(myList)) {
          // Save to local storage
          await setItem(STORAGE_KEY, newList);
          
          // Sync with Firestore
          await syncService.addToWatchlist(anime);
          
          set({
            myList: newList,
            bookmarkedIds: new Set([...bookmarkedIds, anime.id])
          });
        }
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error adding to my list:', error);
      return false;
    }
  },

  removeAnime: async (animeId) => {
    try {
      const { myList, bookmarkedIds } = get();
      const newList = myList.filter(item => item.id !== animeId);
      
      // Only update if the list has actually changed
      if (JSON.stringify(newList) !== JSON.stringify(myList)) {
        // Save to local storage
        await setItem(STORAGE_KEY, newList);
        
        // Sync with Firestore
        await syncService.removeFromWatchlist(animeId);
        
        bookmarkedIds.delete(animeId);
        set({
          myList: newList,
          bookmarkedIds: new Set(bookmarkedIds)
        });
      }
      return true;
    } catch (error) {
      logger.error('Error removing from my list:', error);
      return false;
    }
  },

  isBookmarked: (animeId) => {
    return get().bookmarkedIds.has(animeId);
  },

  initializeList: async () => {
    try {
      // If user is authenticated, try to fetch from Firestore first
      if (auth.currentUser) {
        // Get local data first
        const localWatchlist = await getItem<MyListAnime[]>(STORAGE_KEY) || [];
        
        // Perform initial sync which will merge local and cloud data
        const syncResult = await syncService.performInitialSync([], localWatchlist);
        if (syncResult) {
          set({ 
            myList: syncResult.watchlist,
            bookmarkedIds: new Set(syncResult.watchlist.map(item => item.id))
          });
          // Update local storage with merged data
          await setItem(STORAGE_KEY, syncResult.watchlist);
          return;
        }
      }

      // If not authenticated or sync failed, use local storage
      const stored = await getItem<MyListAnime[]>(STORAGE_KEY);
      if (stored && Array.isArray(stored)) {
        const sortedList = stored.sort((a, b) => b.addedAt - a.addedAt);
        set({ 
          myList: sortedList,
          bookmarkedIds: new Set(sortedList.map(item => item.id))
        });
      } else {
        set({ 
          myList: [],
          bookmarkedIds: new Set()
        });
      }
    } catch (error) {
      logger.error('Error loading watchlist:', error);
      set({ 
        myList: [],
        bookmarkedIds: new Set()
      });
    }
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