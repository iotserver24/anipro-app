import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MyListAnime } from '../utils/myList';
import { syncService } from '../services/syncService';

interface MyListStore {
  myList: MyListAnime[];
  bookmarkedIds: Set<string>;
  initializeStore: () => Promise<void>;
  addAnime: (anime: MyListAnime) => Promise<boolean>;
  removeAnime: (animeId: string) => Promise<boolean>;
  isBookmarked: (animeId: string) => boolean;
}

export const useMyListStore = create<MyListStore>((set, get) => ({
  myList: [],
  bookmarkedIds: new Set(),

  initializeStore: async () => {
    try {
      // Try to fetch from Firestore first
      const userData = await syncService.fetchUserData();
      if (userData?.watchlist) {
        set({
          myList: userData.watchlist,
          bookmarkedIds: new Set(userData.watchlist.map((item: MyListAnime) => item.id))
        });
        return;
      }

      // Fallback to local storage
      const savedList = await AsyncStorage.getItem('my_list');
      if (savedList) {
        const list = JSON.parse(savedList);
        set({
          myList: list,
          bookmarkedIds: new Set(list.map((item: MyListAnime) => item.id))
        });
      }
    } catch (error) {
      console.error('Error initializing my list store:', error);
    }
  },

  addAnime: async (anime) => {
    try {
      const { myList, bookmarkedIds } = get();
      if (!bookmarkedIds.has(anime.id)) {
        const newList = [...myList, anime];
        
        // Save to local storage
        await AsyncStorage.setItem('my_list', JSON.stringify(newList));
        
        // Sync with Firestore
        await syncService.addToWatchlist(anime);
        
        set({
          myList: newList,
          bookmarkedIds: new Set([...bookmarkedIds, anime.id])
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding to my list:', error);
      return false;
    }
  },

  removeAnime: async (animeId) => {
    try {
      const { myList, bookmarkedIds } = get();
      const newList = myList.filter(item => item.id !== animeId);
      
      // Save to local storage
      await AsyncStorage.setItem('my_list', JSON.stringify(newList));
      
      // Sync with Firestore
      await syncService.removeFromWatchlist(animeId);
      
      bookmarkedIds.delete(animeId);
      set({
        myList: newList,
        bookmarkedIds: new Set(bookmarkedIds)
      });
      return true;
    } catch (error) {
      console.error('Error removing from my list:', error);
      return false;
    }
  },

  isBookmarked: (animeId) => {
    return get().bookmarkedIds.has(animeId);
  },
})); 