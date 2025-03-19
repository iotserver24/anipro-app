import { db, auth } from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  Timestamp,
  DocumentReference
} from 'firebase/firestore';
import { WatchHistoryItem } from '../store/watchHistoryStore';
import { MyListAnime } from '../utils/myList';
import { trimWatchHistoryIfNeeded, trimWatchlistIfNeeded } from '../utils/firebaseUtils';
import { logger } from '../utils/logger';

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

export const syncService = {
  // Initialize user data document
  async initializeUserData() {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

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
    } catch (error) {
      logger.error('Error initializing user data:', error);
    }
  },

  // Get user data document reference
  getUserDataRef(): DocumentReference | null {
    const userId = auth.currentUser?.uid;
    if (!userId) return null;
    return doc(db, COLLECTIONS.USER_DATA, userId);
  },

  // Sync watch history
  async syncWatchHistory(history: WatchHistoryItem[]) {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      // Initialize document if it doesn't exist
      await this.initializeUserData();
      
      // Trim history to prevent exceeding Firestore document size limit
      const trimmedHistory = trimWatchHistoryIfNeeded(history);
      
      if (trimmedHistory.length < history.length) {
        logger.warn(`Watch history trimmed from ${history.length} to ${trimmedHistory.length} items due to size constraints`);
      }
      
      const userDataRef = doc(db, COLLECTIONS.USER_DATA, userId);
      await updateDoc(userDataRef, {
        watchHistory: trimmedHistory,
        lastSync: Timestamp.now()
      });
      
      logger.info(`Successfully synced ${trimmedHistory.length} watch history items to Firestore`);
    } catch (error) {
      logger.error('Error syncing watch history:', error);
    }
  },

  // Sync watchlist
  async syncWatchlist(watchlist: MyListAnime[]) {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      // Initialize document if it doesn't exist
      await this.initializeUserData();
      
      // Trim watchlist to prevent exceeding Firestore document size limit
      const trimmedWatchlist = trimWatchlistIfNeeded(watchlist);
      
      if (trimmedWatchlist.length < watchlist.length) {
        logger.warn(`Watchlist trimmed from ${watchlist.length} to ${trimmedWatchlist.length} items due to size constraints`);
      }
      
      const userDataRef = doc(db, COLLECTIONS.USER_DATA, userId);
      await updateDoc(userDataRef, {
        watchlist: trimmedWatchlist,
        lastSync: Timestamp.now()
      });
      
      logger.info(`Successfully synced ${trimmedWatchlist.length} watchlist items to Firestore`);
    } catch (error) {
      logger.error('Error syncing watchlist:', error);
    }
  },

  // Fetch user data from Firestore
  async fetchUserData(): Promise<UserData | null> {
    const userId = auth.currentUser?.uid;
    if (!userId) return null;

    try {
      // Initialize document if it doesn't exist
      await this.initializeUserData();
      
      const userDataRef = doc(db, COLLECTIONS.USER_DATA, userId);
      const userDataSnap = await getDoc(userDataRef);

      if (userDataSnap.exists()) {
        const data = userDataSnap.data() as UserData;
        logger.info(`Successfully fetched user data from Firestore with lastSync: ${data.lastSync?.toDate().toISOString()}`);
        return data;
      }
    } catch (error) {
      logger.error('Error fetching user data:', error);
    }
    return null;
  },

  // Add item to watchlist
  async addToWatchlist(anime: MyListAnime) {
    const userId = auth.currentUser?.uid;
    if (!userId) return false;

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
      } else {
        // Document doesn't exist yet, create it
        await setDoc(userDataRef, {
          watchlist: [anime],
          watchHistory: [],
          lastSync: Timestamp.now()
        });
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
    if (!userId) return false;

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
          logger.info(`Removed anime ${animeId} from watchlist in Firestore`);
          return true;
        } else {
          // Filter manually if we can't find the exact object
          const filteredWatchlist = (data.watchlist || []).filter(item => item.id !== animeId);
          await updateDoc(userDataRef, {
            watchlist: filteredWatchlist,
            lastSync: Timestamp.now()
          });
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
    if (!userId) return false;

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
    if (!userId) return;

    try {
      logger.info('Starting sync on app launch');
      await this.initializeUserData();
      
      // Additional sync logic could be added here:
      // - Merge local and remote data based on lastSync timestamps
      // - Resolve conflicts
      // - Batch updates
      
      logger.info('Completed sync on app launch');
    } catch (error) {
      logger.error('Error during sync on launch:', error);
    }
  }
}; 