import AsyncStorage from '@react-native-async-storage/async-storage';

export type MyListAnime = {
  id: string;
  name: string;
  img: string;
  addedAt: number;
  malId?: string; // Optional MAL ID for integration with MyAnimeList
};

export const addToMyList = async (anime: MyListAnime) => {
  try {
    const existingList = await AsyncStorage.getItem('my_list');
    let myList: MyListAnime[] = existingList ? JSON.parse(existingList) : [];
    
    // Check if already in list
    if (!myList.some(item => item.id === anime.id)) {
      myList.push(anime);
      await AsyncStorage.setItem('my_list', JSON.stringify(myList));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error adding to my list:', error);
    return false;
  }
};

export const removeFromMyList = async (animeId: string) => {
  try {
    const existingList = await AsyncStorage.getItem('my_list');
    if (!existingList) return false;

    let myList: MyListAnime[] = JSON.parse(existingList);
    myList = myList.filter(item => item.id !== animeId);
    await AsyncStorage.setItem('my_list', JSON.stringify(myList));
    return true;
  } catch (error) {
    console.error('Error removing from my list:', error);
    return false;
  }
};

export const isInMyList = async (animeId: string) => {
  try {
    const existingList = await AsyncStorage.getItem('my_list');
    if (!existingList) return false;

    const myList: MyListAnime[] = JSON.parse(existingList);
    return myList.some(item => item.id === animeId);
  } catch (error) {
    console.error('Error checking my list:', error);
    return false;
  }
}; 