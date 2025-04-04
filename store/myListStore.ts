import { create } from 'zustand';
import { MyListAnime } from '../utils/myList';
import { syncService } from '../services/syncService';
import { auth } from '../services/firebase';
import { getItem, setItem, removeItem } from '../utils/storage';
import { logger } from '../utils/logger';

const STORAGE_KEY = 'anipro:watchlist';
const STORAGE_KEY_BACKUP = 'anipro:watchlist_backup';

interface MyListStore {
  myList: MyListAnime[];
  bookmarkedIds: Set<string>;
  initialLoadDone: boolean;  // Track if we've done the initial load
  lastLoadTime: number;      // Track when we last loaded data
  isLoading: boolean;        // Track loading state
  initializeStore: () => Promise<void>;
  addAnime: (anime: MyListAnime) => Promise<boolean>;
  removeAnime: (animeId: string) => Promise<boolean>;
  isBookmarked: (animeId: string) => boolean;
  initializeList: () => Promise<void>;
  clearList: () => Promise<void>;
  refreshIfNeeded: () => Promise<void>; // New method to refresh if data is stale
}

export const useMyListStore = create<MyListStore>((set, get) => ({
  myList: [],
  bookmarkedIds: new Set(),
  initialLoadDone: false,
  lastLoadTime: 0,
  isLoading: false,

  initializeStore: async () => {
    try {
      set({ isLoading: true });
      
      // Load local data first for immediate UI response
      const savedList = await getItem<MyListAnime[]>(STORAGE_KEY);
      if (savedList && savedList.length > 0) {
        set({
          myList: savedList,
          bookmarkedIds: new Set(savedList.map(item => item.id)),
          lastLoadTime: Date.now()
        });
      }
      
      set({ isLoading: false, initialLoadDone: true });
    } catch (error) {
      logger.error('MyListStore', `Error loading local watchlist data: ${error}`);
      set({ isLoading: false, initialLoadDone: true });
    }
  },

  initializeList: async () => {
    // If already loading, don't start a new load
    if (get().isLoading) return;
    
    try {
      set({ isLoading: true });
      
      // Always try to load local data first for immediate response
      const localList = await getItem<MyListAnime[]>(STORAGE_KEY) || [];
      
      // Set local data immediately for fast UI response
      if (localList.length > 0) {
        set({
          myList: localList,
          bookmarkedIds: new Set(localList.map(item => item.id))
        });
      }
      
      // If there's a backup and no main list, try to recover from backup
      if (localList.length === 0) {
        const backupList = await getItem<MyListAnime[]>(STORAGE_KEY_BACKUP);
        if (backupList && backupList.length > 0) {
          logger.info('MyListStore', `Recovered ${backupList.length} items from backup`);
          set({
            myList: backupList,
            bookmarkedIds: new Set(backupList.map(item => item.id))
          });
          await setItem(STORAGE_KEY, backupList);
        }
      }
      
      // If user is authenticated, try to sync with cloud in background
      if (auth.currentUser) {
        try {
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
        } catch (syncError) {
          logger.error('MyListStore', `Error during cloud sync: ${syncError}`);
          // We still have local data, so we don't need to do anything special here
        }
      }
      
      set({ 
        isLoading: false, 
        initialLoadDone: true,
        lastLoadTime: Date.now()
      });
    } catch (error) {
      logger.error('MyListStore', `Error initializing my list store: ${error}`);
      // If there was an error fetching, we already have local data displayed
      set({ 
        isLoading: false, 
        initialLoadDone: true,
        lastLoadTime: Date.now()
      });
    }
  },

  refreshIfNeeded: async () => {
    const { lastLoadTime, initialLoadDone, isLoading } = get();
    
    // If we've never loaded or it's been more than 30 minutes, refresh
    const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes
    const shouldRefresh = !initialLoadDone || 
                         (Date.now() - lastLoadTime > REFRESH_INTERVAL);
    
    if (shouldRefresh && !isLoading) {
      await get().initializeList();
    }
  },

  addAnime: async (anime) => {
    try {
      const { myList, bookmarkedIds } = get();
      
      // Quick check to avoid redundant work
      if (bookmarkedIds.has(anime.id)) {
        return true; // Already in the list, return success immediately
      }
      
      // Add addedAt property to the anime object
      const animeWithTimestamp = { ...anime, addedAt: Date.now() };
      const newList = [...myList, animeWithTimestamp];
      
      // Update UI state immediately for perceived performance
      const newBookmarkedIds = new Set(bookmarkedIds);
      newBookmarkedIds.add(anime.id);
      set({ 
        myList: newList,
        bookmarkedIds: newBookmarkedIds 
      });
      
      // Create a backup in the background without awaiting
      const backupPromise = setItem(STORAGE_KEY_BACKUP, myList).catch(error => {
        logger.warn('MyListStore', `Non-critical: Backup creation failed: ${error}`);
      });
      
      // Save to local storage without blocking the UI
      setItem(STORAGE_KEY, newList).catch(error => {
        logger.error('MyListStore', `Failed to save updated list to local storage: ${error}`);
        // Don't revert UI state as it creates a jarring experience
      });
      
      // Then sync with cloud (may be slow or fail) without blocking
      if (auth.currentUser) {
        setTimeout(() => {
          syncService.syncWatchlist(newList);
        }, 0);
      }
      
      return true;
    } catch (error) {
      logger.error('MyListStore', `Error adding anime to my list: ${error}`);
      // Only try to restore if the error is catastrophic
      try {
        const backup = await getItem<MyListAnime[]>(STORAGE_KEY_BACKUP);
        if (backup) {
          set({ 
            myList: backup,
            bookmarkedIds: new Set(backup.map(item => item.id))
          });
          await setItem(STORAGE_KEY, backup);
        }
      } catch (backupError) {
        logger.error('MyListStore', `Failed to restore from backup: ${backupError}`);
      }
      return false;
    }
  },

  removeAnime: async (animeId) => {
    try {
      const { myList, bookmarkedIds } = get();
      
      // Quick check to avoid redundant work
      if (!bookmarkedIds.has(animeId)) {
        return true; // Not in list, return success immediately
      }
      
      // Create a backup in the background without awaiting
      const backupPromise = setItem(STORAGE_KEY_BACKUP, myList).catch(error => {
        logger.warn('MyListStore', `Non-critical: Backup creation failed: ${error}`);
      });
      
      // Filter out the anime to be removed
      const newList = myList.filter(anime => anime.id !== animeId);
      
      // Update UI state immediately for perceived performance
      const newBookmarkedIds = new Set(bookmarkedIds);
      newBookmarkedIds.delete(animeId);
      set({ 
        myList: newList,
        bookmarkedIds: newBookmarkedIds 
      });
      
      // Save to local storage without blocking the UI
      setItem(STORAGE_KEY, newList).catch(error => {
        logger.error('MyListStore', `Failed to save updated list after removal to local storage: ${error}`);
        // Don't revert UI state as it creates a jarring experience
      });
      
      // Then sync with cloud (may be slow or fail) without blocking
      if (auth.currentUser) {
        setTimeout(() => {
          syncService.syncWatchlist(newList);
        }, 0);
      }
      
      return true;
    } catch (error) {
      logger.error('MyListStore', `Error removing anime from my list: ${error}`);
      // Only try to restore if the error is catastrophic
      try {
        const backup = await getItem<MyListAnime[]>(STORAGE_KEY_BACKUP);
        if (backup) {
          set({ 
            myList: backup,
            bookmarkedIds: new Set(backup.map(item => item.id))
          });
          await setItem(STORAGE_KEY, backup);
        }
      } catch (backupError) {
        logger.error('MyListStore', `Failed to restore from backup: ${backupError}`);
      }
      return false;
    }
  },

  isBookmarked: (animeId) => {
    return get().bookmarkedIds.has(animeId);
  },

  clearList: async () => {
    try {
      // Create backup before clearing
      const currentList = get().myList;
      if (currentList.length > 0) {
        await setItem(STORAGE_KEY_BACKUP, currentList);
      }
      
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
      logger.info('MyListStore', 'Watchlist cleared successfully');
    } catch (error) {
      logger.error('MyListStore', `Error clearing watchlist: ${error}`);
    }
  }
})); 