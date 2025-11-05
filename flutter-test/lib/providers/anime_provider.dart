import 'package:flutter/material.dart';
import '../models/anime_models.dart';
import '../services/api_service.dart';

class AnimeProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  
  List<AnimeResult> _trendingAnime = [];
  List<AnimeResult> _popularAnime = [];
  List<AnimeResult> _recentEpisodes = [];
  List<AnimeResult> _newReleases = [];
  List<AnimeResult> _latestCompleted = [];
  List<AnimeResult> _searchResults = [];
  
  bool _isLoadingTrending = false;
  bool _isLoadingPopular = false;
  bool _isLoadingRecent = false;
  bool _isLoadingNewReleases = false;
  bool _isLoadingLatestCompleted = false;
  bool _isSearching = false;
  
  String? _error;

  // Getters
  List<AnimeResult> get trendingAnime => _trendingAnime;
  List<AnimeResult> get popularAnime => _popularAnime;
  List<AnimeResult> get recentEpisodes => _recentEpisodes;
  List<AnimeResult> get newReleases => _newReleases;
  List<AnimeResult> get latestCompleted => _latestCompleted;
  List<AnimeResult> get searchResults => _searchResults;
  
  bool get isLoadingTrending => _isLoadingTrending;
  bool get isLoadingPopular => _isLoadingPopular;
  bool get isLoadingRecent => _isLoadingRecent;
  bool get isLoadingNewReleases => _isLoadingNewReleases;
  bool get isLoadingLatestCompleted => _isLoadingLatestCompleted;
  bool get isSearching => _isSearching;
  
  String? get error => _error;

  // Fetch trending anime
  Future<void> fetchTrendingAnime({int page = 1, bool refresh = false}) async {
    if (refresh) {
      _trendingAnime = [];
    }
    
    _isLoadingTrending = true;
    _error = null;
    notifyListeners();

    try {
      final results = await _apiService.getTrending(page: page);
      if (page == 1) {
        _trendingAnime = results;
      } else {
        _trendingAnime.addAll(results);
      }
      _isLoadingTrending = false;
      notifyListeners();
    } catch (e) {
      _isLoadingTrending = false;
      _error = 'Failed to load trending anime';
      notifyListeners();
    }
  }

  // Fetch popular anime
  Future<void> fetchPopularAnime({int page = 1, bool refresh = false}) async {
    if (refresh) {
      _popularAnime = [];
    }
    
    _isLoadingPopular = true;
    _error = null;
    notifyListeners();

    try {
      final results = await _apiService.getPopular(page: page);
      if (page == 1) {
        _popularAnime = results;
      } else {
        _popularAnime.addAll(results);
      }
      _isLoadingPopular = false;
      notifyListeners();
    } catch (e) {
      _isLoadingPopular = false;
      _error = 'Failed to load popular anime';
      notifyListeners();
    }
  }

  // Fetch recent episodes
  Future<void> fetchRecentEpisodes({int page = 1, bool refresh = false}) async {
    if (refresh) {
      _recentEpisodes = [];
    }
    
    _isLoadingRecent = true;
    _error = null;
    notifyListeners();

    try {
      final results = await _apiService.getRecentEpisodes(page: page);
      if (page == 1) {
        _recentEpisodes = results;
      } else {
        _recentEpisodes.addAll(results);
      }
      _isLoadingRecent = false;
      notifyListeners();
    } catch (e) {
      _isLoadingRecent = false;
      _error = 'Failed to load recent episodes';
      notifyListeners();
    }
  }

  // Fetch new releases
  Future<void> fetchNewReleases({int page = 1, bool refresh = false}) async {
    if (refresh) {
      _newReleases = [];
    }
    
    _isLoadingNewReleases = true;
    _error = null;
    notifyListeners();

    try {
      final results = await _apiService.getNewReleases(page: page);
      if (page == 1) {
        _newReleases = results;
      } else {
        _newReleases.addAll(results);
      }
      _isLoadingNewReleases = false;
      notifyListeners();
    } catch (e) {
      _isLoadingNewReleases = false;
      _error = 'Failed to load new releases';
      notifyListeners();
    }
  }

  // Fetch latest completed
  Future<void> fetchLatestCompleted({int page = 1, bool refresh = false}) async {
    if (refresh) {
      _latestCompleted = [];
    }
    
    _isLoadingLatestCompleted = true;
    _error = null;
    notifyListeners();

    try {
      final results = await _apiService.getLatestCompleted(page: page);
      if (page == 1) {
        _latestCompleted = results;
      } else {
        _latestCompleted.addAll(results);
      }
      _isLoadingLatestCompleted = false;
      notifyListeners();
    } catch (e) {
      _isLoadingLatestCompleted = false;
      _error = 'Failed to load latest completed anime';
      notifyListeners();
    }
  }

  // Search anime
  Future<void> searchAnime(String query, {int page = 1}) async {
    if (query.isEmpty) {
      _searchResults = [];
      notifyListeners();
      return;
    }

    _isSearching = true;
    _error = null;
    notifyListeners();

    try {
      final results = await _apiService.searchAnime(query, page: page);
      if (page == 1) {
        _searchResults = results;
      } else {
        _searchResults.addAll(results);
      }
      _isSearching = false;
      notifyListeners();
    } catch (e) {
      _isSearching = false;
      _error = 'Failed to search anime';
      notifyListeners();
    }
  }

  // Clear search results
  void clearSearchResults() {
    _searchResults = [];
    notifyListeners();
  }

  // Refresh all data
  Future<void> refreshAllData() async {
    await Future.wait([
      fetchTrendingAnime(refresh: true),
      fetchPopularAnime(refresh: true),
      fetchRecentEpisodes(refresh: true),
      fetchNewReleases(refresh: true),
      fetchLatestCompleted(refresh: true),
    ]);
  }
}
