import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/my_list_item.dart';

class MyListService {
  static const String _storageKey = 'myList';

  Future<List<MyListItem>> getMyList() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final listJson = prefs.getString(_storageKey);
      if (listJson == null) return [];

      final List<dynamic> listData = json.decode(listJson);
      return listData.map((item) => MyListItem.fromJson(item)).toList();
    } catch (e) {
      print('Error loading my list: $e');
      return [];
    }
  }

  Future<void> addAnime(MyListItem anime) async {
    try {
      final myList = await getMyList();
      
      // Check if already exists
      if (!myList.any((item) => item.id == anime.id)) {
        myList.add(anime);
        await _saveMyList(myList);
      }
    } catch (e) {
      print('Error adding anime to my list: $e');
    }
  }

  Future<void> removeAnime(String animeId) async {
    try {
      final myList = await getMyList();
      myList.removeWhere((item) => item.id == animeId);
      await _saveMyList(myList);
    } catch (e) {
      print('Error removing anime from my list: $e');
    }
  }

  Future<bool> isBookmarked(String animeId) async {
    try {
      final myList = await getMyList();
      return myList.any((item) => item.id == animeId);
    } catch (e) {
      print('Error checking bookmark status: $e');
      return false;
    }
  }

  Future<void> clearMyList() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_storageKey);
    } catch (e) {
      print('Error clearing my list: $e');
    }
  }

  Future<void> _saveMyList(List<MyListItem> myList) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final listJson = json.encode(
        myList.map((item) => item.toJson()).toList(),
      );
      await prefs.setString(_storageKey, listJson);
    } catch (e) {
      print('Error saving my list: $e');
    }
  }
}

