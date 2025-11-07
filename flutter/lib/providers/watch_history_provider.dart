import 'package:flutter/foundation.dart';
import '../models/watch_history.dart';
import '../services/watch_history_service.dart';

class WatchHistoryProvider with ChangeNotifier {
  final WatchHistoryService _service = WatchHistoryService();
  List<WatchHistoryItem> _history = [];
  bool _isLoading = false;

  List<WatchHistoryItem> get history => _history;
  bool get isLoading => _isLoading;

  Future<void> initializeHistory() async {
    _isLoading = true;
    notifyListeners();
    
    _history = await _service.getHistory();
    
    _isLoading = false;
    notifyListeners();
  }

  Future<void> addToHistory(WatchHistoryItem item) async {
    await _service.addToHistory(item);
    await initializeHistory();
  }

  Future<void> updateProgress(String episodeId, int progress, int duration) async {
    await _service.updateProgress(episodeId, progress, duration);
    await initializeHistory();
  }

  Future<void> removeFromHistory(String animeId) async {
    await _service.removeFromHistory(animeId);
    await initializeHistory();
  }

  Future<void> clearHistory() async {
    await _service.clearHistory();
    await initializeHistory();
  }

  Future<WatchHistoryItem?> getHistoryForAnime(String animeId) async {
    return await _service.getHistoryForAnime(animeId);
  }
}

