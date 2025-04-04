import { db, auth } from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  Timestamp,
  DocumentReference,
  writeBatch
} from 'firebase/firestore';
import { WatchHistoryItem } from '../store/watchHistoryStore';
import { MyListAnime } from '../utils/myList';
import { trimWatchHistoryIfNeeded, trimWatchlistIfNeeded } from '../utils/firebaseUtils';
import { logger } from '../utils/logger';
import { isEmailVerified } from './userService'; // Import to check email verification status
import { getItem, setItem } from '../utils/storage'; // Import storage functions for backup/restore

// Collection names
const COLLECTIONS = {
  USER_DATA: 'user_data',
  WATCH_HISTORY: 'watch_history',
  WATCHLIST: 'watchlist'
} as const;

// Types for Firestore documents
interface UserData {
  lastSync: Timestamp;
  watchHistory: WatchHistoryItem[];
  watchlist: MyListAnime[];
}

// Add sync queue and debounce
let syncQueue: { [key: string]: NodeJS.Timeout } = {};
const SYNC_DELAY = 2000; // 2 seconds delay for batching

// Add cache for user data
let userDataCache: { [userId: string]: { data: UserData; timestamp: number } } = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Add performance optimization flags
let isSyncing = false;
let pendingSync = false;
let verificationFailed = false; // Flag to avoid repeated checks if verification failed

// Add this helper function at the top
function mergeWatchHistoryItems(local: WatchHistoryItem[], cloud: WatchHistoryItem[]): WatchHistoryItem[] {
  const merged = new Map<string, WatchHistoryItem>();
  
  // First add all cloud items
  cloud.forEach(item => {
    merged.set(item.episodeId, item);
  });
  
  // Then merge local items, keeping the one with higher progress or more recent lastWatched
  local.forEach(localItem => {
    const cloudItem = merged.get(localItem.episodeId);
    if (!cloudItem) {
      merged.set(localItem.episodeId, localItem);
    } else {
      // Keep the item with higher progress or more recent lastWatched
      if (localItem.progress > cloudItem.progress || localItem.lastWatched > cloudItem.lastWatched) {
        merged.set(localItem.episodeId, localItem);
      }
    }
  });
  
  // Convert back to array and sort by lastWatched
  return Array.from(merged.values())
    .sort((a, b) => b.lastWatched - a.lastWatched);
}

function mergeWatchlistItems(local: MyListAnime[], cloud: MyListAnime[]): MyListAnime[] {
  const merged = new Map<string, MyListAnime>();
  
  // First add all cloud items
  cloud.forEach(item => {
    merged.set(item.id, item);
  });
  
  // Then merge local items, keeping the one with more recent addedAt
  local.forEach(localItem => {
    const cloudItem = merged.get(localItem.id);
    if (!cloudItem) {
      merged.set(localItem.id, localItem);
    } else {
      // Keep the item with more recent addedAt
      if (localItem.addedAt > cloudItem.addedAt) {
        merged.set(localItem.id, localItem);
      }
    }
  });
  
  // Convert back to array and sort by addedAt
  return Array.from(merged.values())
    .sort((a, b) => b.addedAt - a.addedAt);
}

// New conservative merge function that focuses on preserving all items
function mergeWatchlistItemsConservatively(local: MyListAnime[], cloud: MyListAnime[]): MyListAnime[] {
  // If either list is empty, return the other one
  if (local.length === 0) return cloud;
  if (cloud.length === 0) return local;
  
  // Create a Set with all unique IDs from both lists
  const allIds = new Set<string>();
  local.forEach(item => allIds.add(item.id));
  cloud.forEach(item => allIds.add(item.id));
  
  // Create a map with the most up-to-date version of each item
  const mergedMap = new Map<string, MyListAnime>();
  
  // Process all unique IDs
  allIds.forEach(id => {
    const localItem = local.find(item => item.id === id);
    const cloudItem = cloud.find(item => item.id === id);
    
    // If item exists only in one list, add it directly
    if (!localItem) {
      mergedMap.set(id, cloudItem!);
    } else if (!cloudItem) {
      mergedMap.set(id, localItem);
    } else {
      // If item exists in both lists, keep the newer timestamp
      // but make sure we keep the item regardless
      mergedMap.set(id, localItem.addedAt > cloudItem.addedAt ? localItem : cloudItem);
    }
  });
  
  // Convert back to array and sort by addedAt (newest first)
  return Array.from(mergedMap.values())
    .sort((a, b) => b.addedAt - a.addedAt);
}

// Helper function to check if cloud operations are likely to succeed
// This is a quick check that avoids expensive Firestore operations when they would fail
const shouldAttemptCloudOperations = (): boolean => {
  // Skip if no user or if we already know verification has failed
  if (!auth.currentUser || verificationFailed) {
    return false;
  }
  
  // Check email verification status
  const verified = isEmailVerified();
  
  // If not verified, set the flag to avoid checking again
  if (!verified) {
    verificationFailed = true;
  }
  
  return verified;
};

// Reset verification flag when user changes
auth.onAuthStateChanged((user) => {
  // Reset verification failed flag when user changes
  verificationFailed = false;
});

export const syncService = {
  // Initialize user data document
  async initializeUserData() {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      logger.info('No authenticated user, skipping initialization');
      return;
    }

    try {
      const userDataRef = doc(db, COLLECTIONS.USER_DATA, userId);
      const userDataSnap = await getDoc(userDataRef);

      if (!userDataSnap.exists()) {
        await setDoc(userDataRef, {
          lastSync: Timestamp.now(),
          watchHistory: [],
          watchlist: []
        });
        logger.info('User data document initialized in Firestore');
      }
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        logger.warn('Permission denied when initializing user data - user may need to verify email');
        verificationFailed = true; // Set flag to avoid future attempts
      } else {
        logger.error('Error initializing user data:', error);
      }
      throw error;
    }
  },

  // Get user data document reference
  getUserDataRef(): DocumentReference | null {
    const userId = auth.currentUser?.uid;
    return userId ? doc(db, COLLECTIONS.USER_DATA, userId) : null;
  },

  // Optimize queue sync operation
  queueSync(key: string, operation: () => Promise<void>) {
    // Skip if no authenticated user or if we already know write operations will fail
    if (!auth.currentUser || verificationFailed) {
      return;
    }

    // Clear existing timeout for this key
    if (syncQueue[key]) {
      clearTimeout(syncQueue[key]);
    }

    // Set new timeout with reduced operations
    syncQueue[key] = setTimeout(async () => {
      try {
        if (isSyncing) {
          pendingSync = true;
          return;
        }
        isSyncing = true;
        await operation();
        isSyncing = false;
        
        // Handle any pending sync
        if (pendingSync) {
          pendingSync = false;
          this.queueSync(key, operation);
        }
        
        delete syncQueue[key];
      } catch (error) {
        logger.error(`Error in queued sync operation for ${key}:`, error);
        isSyncing = false;
        delete syncQueue[key];
      }
    }, SYNC_DELAY);
  },

  // Clear sync queue (useful when logging out)
  clearSyncQueue() {
    Object.keys(syncQueue).forEach(key => {
      if (syncQueue[key]) {
        clearTimeout(syncQueue[key]);
        delete syncQueue[key];
      }
    });
    // Also clear cache
    userDataCache = {};
    // Reset verification flag
    verificationFailed = false;
  },

  // Optimize sync watch history
  async syncWatchHistory(history: WatchHistoryItem[]) {
    // Quick check to avoid unnecessary operations
    const userId = auth.currentUser?.uid;
    if (!userId || !shouldAttemptCloudOperations()) {
      return;
    }

    this.queueSync('watchHistory', async () => {
      try {
        const trimmedHistory = trimWatchHistoryIfNeeded(history);
        
        // Only sync if cache doesn't exist or data is different
        const cached = userDataCache[userId]?.data?.watchHistory;
        if (cached && JSON.stringify(cached) === JSON.stringify(trimmedHistory)) {
          return;
        }

        const batch = writeBatch(db);
        const userDataRef = doc(db, COLLECTIONS.USER_DATA, userId);
        
        batch.update(userDataRef, {
          watchHistory: trimmedHistory,
          lastSync: Timestamp.now()
        });

        await batch.commit();
        
        // Update cache
        if (userDataCache[userId]) {
          userDataCache[userId] = {
            data: { 
              ...userDataCache[userId].data, 
              watchHistory: trimmedHistory,
              lastSync: Timestamp.now()
            },
            timestamp: Date.now()
          };
        }
      } catch (error: any) {
        if (error.code === 'permission-denied') {
          verificationFailed = true; // Set flag to avoid future attempts
        }
        logger.error('Error syncing watch history:', error);
      }
    });
  },

  // Optimize sync watchlist
  async syncWatchlist(watchlist: MyListAnime[]) {
    // Quick check to avoid unnecessary operations
    const userId = auth.currentUser?.uid;
    if (!userId || !shouldAttemptCloudOperations()) {
      return;
    }

    this.queueSync('watchlist', async () => {
      try {
        // Add a failsafe - store a copy of the watchlist before any operations
        // This will be used if sync fails to ensure data isn't lost
        await setItem('anipro:watchlist_backup', watchlist); 
        
        const trimmedWatchlist = trimWatchlistIfNeeded(watchlist);
        
        // Only sync if cache doesn't exist or data is different
        const cached = userDataCache[userId]?.data?.watchlist;
        if (cached && JSON.stringify(cached) === JSON.stringify(trimmedWatchlist)) {
          return;
        }

        let syncSuccess = false;
        let retryCount = 0;
        const MAX_RETRIES = 3;
        
        while (!syncSuccess && retryCount < MAX_RETRIES) {
          try {
            const batch = writeBatch(db);
            const userDataRef = doc(db, COLLECTIONS.USER_DATA, userId);
            
            batch.update(userDataRef, {
              watchlist: trimmedWatchlist,
              lastSync: Timestamp.now()
            });

            await batch.commit();
            syncSuccess = true;
            
            // Update cache
            if (userDataCache[userId]) {
              userDataCache[userId] = {
                data: { 
                  ...userDataCache[userId].data, 
                  watchlist: trimmedWatchlist,
                  lastSync: Timestamp.now()
                },
                timestamp: Date.now()
              };
            }
            
            logger.info('Sync', `Successfully synced watchlist to cloud (${trimmedWatchlist.length} items)`);
          } catch (retryError: any) {
            retryCount++;
            logger.warn('Sync', `Watchlist sync attempt ${retryCount} failed: ${retryError.message}`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          }
        }
        
        if (!syncSuccess) {
          logger.error('Sync', 'All watchlist sync attempts failed');
        }
      } catch (error: any) {
        if (error.code === 'permission-denied') {
          verificationFailed = true; // Set flag to avoid future attempts
        }
        logger.error('Sync', `Error syncing watchlist: ${error.message}`);
        
        // Restore from backup if sync failed completely
        try {
          const backupWatchlist = await getItem('anipro:watchlist_backup');
          if (backupWatchlist) {
            await setItem('anipro:watchlist', backupWatchlist);
            logger.info('Sync', 'Restored watchlist from backup after sync failure');
          }
        } catch (backupError) {
          logger.error('Sync', `Failed to restore watchlist from backup: ${backupError}`);
        }
      }
    });
  },

  // Optimize fetch user data - only try cloud fetch if we think it will succeed
  async fetchUserData(): Promise<UserData | null> {
    const userId = auth.currentUser?.uid;
    if (!userId) return null;

    try {
      // Check cache first - use cache with longer TTL for better performance
      const cached = userDataCache[userId];
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        // Return cached data immediately without network requests
        logger.info('Using cached user data');
        return cached.data;
      }

      // Skip cloud fetch if we know it will fail
      if (!shouldAttemptCloudOperations()) {
        return null;
      }

      logger.info('Fetching user data from Firestore');
      const userDataRef = doc(db, COLLECTIONS.USER_DATA, userId);
      const userDataSnap = await getDoc(userDataRef);

      if (userDataSnap.exists()) {
        const data = userDataSnap.data() as UserData;
        
        // Update cache with fresh data
        userDataCache[userId] = {
          data,
          timestamp: Date.now()
        };
        
        return data;
      }

      // Initialize if document doesn't exist
      logger.info('Creating new user data document');
      const initialData: UserData = {
        lastSync: Timestamp.now(),
        watchHistory: [],
        watchlist: []
      };
      await setDoc(userDataRef, initialData);
      
      // Cache the new data
      userDataCache[userId] = {
        data: initialData,
        timestamp: Date.now()
      };
      
      return initialData;
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        verificationFailed = true; // Set flag to avoid future attempts
        logger.warn('Permission denied when fetching user data - email verification may be required');
      } else {
        logger.error('Error fetching user data:', error);
      }
      return null;
    }
  },

  // Add item to watchlist
  async addToWatchlist(anime: MyListAnime) {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      logger.info('No authenticated user, skipping add to watchlist');
      return false;
    }

    try {
      // Initialize document if it doesn't exist
      await this.initializeUserData();
      
      const userDataRef = doc(db, COLLECTIONS.USER_DATA, userId);
      
      // Check if we need to use arrayUnion or if we need to manage size
      const userDataSnap = await getDoc(userDataRef);
      if (userDataSnap.exists()) {
        const data = userDataSnap.data() as UserData;
        const currentWatchlist = data.watchlist || [];
        
        // Check if anime already exists in watchlist
        if (currentWatchlist.some(item => item.id === anime.id)) {
          return true; // Already added, consider it a success
        }
        
        // Add the new anime
        const newWatchlist = [...currentWatchlist, anime];
        
        // Trim if needed
        const trimmedWatchlist = trimWatchlistIfNeeded(newWatchlist);
        
        // Update the document
        await updateDoc(userDataRef, {
          watchlist: trimmedWatchlist,
          lastSync: Timestamp.now()
        });
        
        // Update cache
        userDataCache[userId] = {
          data: { ...data, watchlist: trimmedWatchlist },
          timestamp: Date.now()
        };
      } else {
        // Document doesn't exist yet, create it
        const newData = {
          watchlist: [anime],
          watchHistory: [],
          lastSync: Timestamp.now()
        };
        await setDoc(userDataRef, newData);
        
        // Update cache
        userDataCache[userId] = {
          data: newData,
          timestamp: Date.now()
        };
      }
      
      logger.info(`Added anime ${anime.id} to watchlist in Firestore`);
      return true;
    } catch (error) {
      logger.error('Error adding to watchlist:', error);
      return false;
    }
  },

  // Remove item from watchlist
  async removeFromWatchlist(animeId: string) {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      logger.info('No authenticated user, skipping remove from watchlist');
      return false;
    }

    try {
      const userDataRef = doc(db, COLLECTIONS.USER_DATA, userId);
      const userDataSnap = await getDoc(userDataRef);
      
      if (userDataSnap.exists()) {
        const data = userDataSnap.data() as UserData;
        const animeToRemove = data.watchlist?.find(item => item.id === animeId);
        
        if (animeToRemove) {
          // If using arrayRemove is possible (exact object match)
          await updateDoc(userDataRef, {
            watchlist: arrayRemove(animeToRemove),
            lastSync: Timestamp.now()
          });
          
          // Update cache
          if (userDataCache[userId]) {
            const newWatchlist = data.watchlist.filter(item => item.id !== animeId);
            userDataCache[userId] = {
              data: { ...data, watchlist: newWatchlist },
              timestamp: Date.now()
            };
          }
          
          logger.info(`Removed anime ${animeId} from watchlist in Firestore`);
          return true;
        } else {
          // Filter manually if we can't find the exact object
          const filteredWatchlist = (data.watchlist || []).filter(item => item.id !== animeId);
          await updateDoc(userDataRef, {
            watchlist: filteredWatchlist,
            lastSync: Timestamp.now()
          });
          
          // Update cache
          if (userDataCache[userId]) {
            userDataCache[userId] = {
              data: { ...data, watchlist: filteredWatchlist },
              timestamp: Date.now()
            };
          }
          
          logger.info(`Removed anime ${animeId} from watchlist in Firestore using manual filtering`);
          return true;
        }
      }
      return false;
    } catch (error) {
      logger.error('Error removing from watchlist:', error);
      return false;
    }
  },

  // Update watch history item
  async updateWatchHistoryItem(historyItem: WatchHistoryItem) {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      logger.info('No authenticated user, skipping watch history item update');
      return false;
    }

    try {
      const userDataRef = doc(db, COLLECTIONS.USER_DATA, userId);
      const userDataSnap = await getDoc(userDataRef);
      
      if (userDataSnap.exists()) {
        const data = userDataSnap.data() as UserData;
        const updatedHistory = (data.watchHistory || []).map(item => 
          item.episodeId === historyItem.episodeId ? historyItem : item
        );
        
        // Trim if needed
        const trimmedHistory = trimWatchHistoryIfNeeded(updatedHistory);
        
        await updateDoc(userDataRef, {
          watchHistory: trimmedHistory,
          lastSync: Timestamp.now()
        });
        
        // Update cache
        if (userDataCache[userId]) {
          userDataCache[userId] = {
            data: { ...data, watchHistory: trimmedHistory },
            timestamp: Date.now()
          };
        }
        
        logger.info(`Updated watch history item for episode ${historyItem.episodeId} in Firestore`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error updating watch history item:', error);
      return false;
    }
  },

  // Sync on app launch or at regular intervals
  async syncOnLaunch() {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      logger.info('No authenticated user, skipping sync on launch');
      return;
    }

    try {
      logger.info('Starting sync on app launch');
      await this.initializeUserData();
      
      // Clear any existing sync operations
      this.clearSyncQueue();
      
      // Clear cache to ensure fresh data
      delete userDataCache[userId];
      
      logger.info('Completed sync on launch');
    } catch (error) {
      logger.error('Error during sync on launch:', error);
    }
  },

  // Add this new method for initial sync after login
  async performInitialSync(localHistory: WatchHistoryItem[], localWatchlist: MyListAnime[]) {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      logger.info('No authenticated user, skipping initial sync');
      return { watchHistory: localHistory, watchlist: localWatchlist };
    }

    // Reset verification flag on new sync
    verificationFailed = false;

    // Skip cloud sync if user isn't verified (to avoid slowdowns)
    if (!isEmailVerified()) {
      logger.info('Email not verified, skipping cloud sync');
      verificationFailed = true;
      return { watchHistory: localHistory, watchlist: localWatchlist };
    }

    try {
      logger.info('Starting initial sync after login');
      
      // Always backup local data first as a safety measure
      if (localWatchlist.length > 0) {
        await setItem('anipro:watchlist_backup', localWatchlist);
        logger.info('Sync', `Backed up local watchlist (${localWatchlist.length} items) before sync`);
      }
      
      // Initialize user data document if needed
      await this.initializeUserData();
      
      // Get cloud data
      const userDataRef = doc(db, COLLECTIONS.USER_DATA, userId);
      const userDataSnap = await getDoc(userDataRef);
      
      let cloudHistory: WatchHistoryItem[] = [];
      let cloudWatchlist: MyListAnime[] = [];
      
      if (userDataSnap.exists()) {
        const data = userDataSnap.data() as UserData;
        cloudHistory = data.watchHistory || [];
        cloudWatchlist = data.watchlist || [];
        
        // If cloud has no watchlist but local does, prefer local without merging
        if (cloudWatchlist.length === 0 && localWatchlist.length > 0) {
          logger.info('Sync', 'Using local watchlist as cloud watchlist is empty');
          cloudWatchlist = localWatchlist;
        }
      }
      
      // Merge local and cloud data
      const mergedHistory = mergeWatchHistoryItems(localHistory, cloudHistory);
      
      // Use a more conservative merge for watchlist that prioritizes keeping items
      const mergedWatchlist = mergeWatchlistItemsConservatively(localWatchlist, cloudWatchlist);
      
      // Log the merge result
      logger.info('Sync', `Merged watchlist: ${localWatchlist.length} local + ${cloudWatchlist.length} cloud = ${mergedWatchlist.length} total`);
      
      // Trim if needed (but this should rarely happen now with our increased limit)
      const trimmedHistory = trimWatchHistoryIfNeeded(mergedHistory);
      const trimmedWatchlist = trimWatchlistIfNeeded(mergedWatchlist);
      
      // If we had to trim, log a warning
      if (trimmedWatchlist.length < mergedWatchlist.length) {
        logger.warn('Sync', `Watchlist was trimmed from ${mergedWatchlist.length} to ${trimmedWatchlist.length} items`);
      }
      
      // Save merged data back to Firestore
      try {
        const batch = writeBatch(db);
        batch.update(userDataRef, {
          watchHistory: trimmedHistory,
          watchlist: trimmedWatchlist,
          lastSync: Timestamp.now()
        });
        
        await batch.commit();
        
        // Update cache
        userDataCache[userId] = {
          data: {
            lastSync: Timestamp.now(),
            watchHistory: trimmedHistory,
            watchlist: trimmedWatchlist
          },
          timestamp: Date.now()
        };
        
        logger.info('Sync', `Initial sync completed: ${trimmedHistory.length} history items, ${trimmedWatchlist.length} watchlist items`);
      } catch (writeError: any) {
        if (writeError.code === 'permission-denied') {
          verificationFailed = true;
          logger.warn('Permission denied when writing data - email verification required');
        } else {
          logger.error('Error writing synced data:', writeError);
        }
      }
      
      // Return merged data for stores to update
      return {
        watchHistory: trimmedHistory,
        watchlist: trimmedWatchlist
      };
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        verificationFailed = true;
        logger.warn('Permission denied during sync - email verification required');
      } else {
        logger.error('Sync', `Error during initial sync: ${error.message}`);
      }
      
      // Even if sync fails, return local data so user can still use the app
      return {
        watchHistory: localHistory,
        watchlist: localWatchlist
      };
    }
  }
}; 