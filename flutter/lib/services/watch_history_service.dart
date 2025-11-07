import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/watch_history.dart';

class WatchHistoryService {
  static const String _storageKey = 'anipro:watchHistory';

  Future<List<WatchHistoryItem>> getHistory() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final historyJson = prefs.getString(_storageKey);
      if (historyJson == null) return [];

      final List<dynamic> historyList = json.decode(historyJson);
      return historyList
          .map((item) => WatchHistoryItem.fromJson(item))
          .toList();
    } catch (e) {
      print('Error loading watch history: $e');
      return [];
    }
  }

  Future<void> addToHistory(WatchHistoryItem item) async {
    try {
      final history = await getHistory();
      
      // Remove existing entry for this anime if it exists
      history.removeWhere((h) => h.id == item.id);
      
      // Add new entry at the beginning
      history.insert(0, item);
      
      // Keep only last 100 items
      if (history.length > 100) {
        history.removeRange(100, history.length);
      }

      await _saveHistory(history);
    } catch (e) {
      print('Error adding to watch history: $e');
    }
  }

  Future<void> updateProgress(String episodeId, int progress, int duration) async {
    try {
      final history = await getHistory();
      final index = history.indexWhere((item) => item.episodeId == episodeId);
      
      if (index != -1) {
        history[index] = history[index].copyWith(
          progress: progress,
          duration: duration,
          lastWatched: DateTime.now().millisecondsSinceEpoch ~/ 1000,
        );
        await _saveHistory(history);
      }
    } catch (e) {
      print('Error updating progress: $e');
    }
  }

  Future<void> removeFromHistory(String animeId) async {
    try {
      final history = await getHistory();
      history.removeWhere((item) => item.id == animeId);
      await _saveHistory(history);
    } catch (e) {
      print('Error removing from watch history: $e');
    }
  }

  Future<void> clearHistory() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_storageKey);
    } catch (e) {
      print('Error clearing watch history: $e');
    }
  }

  Future<WatchHistoryItem?> getHistoryForAnime(String animeId) async {
    try {
      final history = await getHistory();
      return history.firstWhere(
        (item) => item.id == animeId,
        orElse: () => throw StateError('Not found'),
      );
    } catch (e) {
      return null;
    }
  }

  Future<void> _saveHistory(List<WatchHistoryItem> history) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final historyJson = json.encode(
        history.map((item) => item.toJson()).toList(),
      );
      await prefs.setString(_storageKey, historyJson);
    } catch (e) {
      print('Error saving watch history: $e');
    }
  }
}

