import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import '../models/anime_models.dart';

/// API Service for handling all network requests
class ApiService {
  final http.Client _client = http.Client();
  
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  /// Get trending/top airing anime
  Future<List<AnimeResult>> getTrending({int page = 1}) async {
    try {
      final url = '${AppConfig.animeApiBaseUrl}${AppConfig.trendingEndpoint}?page=$page';
      final response = await _client.get(Uri.parse(url));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final results = data['results'] as List;
        return results.map((item) => AnimeResult.fromJson(item)).toList();
      }
      throw Exception('Failed to load trending anime');
    } catch (e) {
      debugPrint('Error fetching trending anime: $e');
      rethrow;
    }
  }

  /// Get popular anime
  Future<List<AnimeResult>> getPopular({int page = 1}) async {
    try {
      final url = '${AppConfig.animeApiBaseUrl}${AppConfig.popularEndpoint}?page=$page';
      final response = await _client.get(Uri.parse(url));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final results = data['results'] as List;
        return results.map((item) => AnimeResult.fromJson(item)).toList();
      }
      throw Exception('Failed to load popular anime');
    } catch (e) {
      debugPrint('Error fetching popular anime: $e');
      rethrow;
    }
  }

  /// Get recent episodes
  Future<List<AnimeResult>> getRecentEpisodes({int page = 1}) async {
    try {
      final url = '${AppConfig.animeApiBaseUrl}${AppConfig.recentEpisodesEndpoint}?page=$page';
      final response = await _client.get(Uri.parse(url));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final results = data['results'] as List;
        return results.map((item) => AnimeResult.fromJson(item)).toList();
      }
      throw Exception('Failed to load recent episodes');
    } catch (e) {
      debugPrint('Error fetching recent episodes: $e');
      rethrow;
    }
  }

  /// Get new releases
  Future<List<AnimeResult>> getNewReleases({int page = 1}) async {
    try {
      final url = '${AppConfig.animeApiBaseUrl}${AppConfig.newReleasesEndpoint}?page=$page';
      final response = await _client.get(Uri.parse(url));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final results = data['results'] as List;
        return results.map((item) => AnimeResult.fromJson(item)).toList();
      }
      throw Exception('Failed to load new releases');
    } catch (e) {
      debugPrint('Error fetching new releases: $e');
      rethrow;
    }
  }

  /// Get latest completed anime
  Future<List<AnimeResult>> getLatestCompleted({int page = 1}) async {
    try {
      final url = '${AppConfig.animeApiBaseUrl}${AppConfig.latestCompletedEndpoint}?page=$page';
      final response = await _client.get(Uri.parse(url));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final results = data['results'] as List;
        return results.map((item) => AnimeResult.fromJson(item)).toList();
      }
      throw Exception('Failed to load latest completed anime');
    } catch (e) {
      debugPrint('Error fetching latest completed anime: $e');
      rethrow;
    }
  }

  /// Search anime
  Future<List<AnimeResult>> searchAnime(String query, {int page = 1}) async {
    try {
      final url = '${AppConfig.animeApiBaseUrl}/$query?page=$page';
      final response = await _client.get(Uri.parse(url));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final results = data['results'] as List;
        return results.map((item) => AnimeResult.fromJson(item)).toList();
      }
      throw Exception('Failed to search anime');
    } catch (e) {
      debugPrint('Error searching anime: $e');
      rethrow;
    }
  }

  /// Get anime details
  Future<AnimeDetails> getAnimeDetails(String animeId) async {
    try {
      final url = '${AppConfig.animeApiBaseUrl}${AppConfig.infoEndpoint}?id=$animeId';
      final response = await _client.get(Uri.parse(url));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return AnimeDetails.fromJson(data);
      }
      throw Exception('Failed to load anime details');
    } catch (e) {
      debugPrint('Error fetching anime details: $e');
      rethrow;
    }
  }

  /// Get streaming sources for an episode
  Future<EpisodeSources> getEpisodeSources(String episodeId) async {
    try {
      final url = '${AppConfig.animeApiBaseUrl}${AppConfig.watchEndpoint.replaceAll(':episodeId', episodeId)}';
      final response = await _client.get(Uri.parse(url));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return EpisodeSources.fromJson(data);
      }
      throw Exception('Failed to load episode sources');
    } catch (e) {
      debugPrint('Error fetching episode sources: $e');
      rethrow;
    }
  }

  /// Get movies
  Future<List<AnimeResult>> getMovies({int page = 1}) async {
    try {
      final url = '${AppConfig.animeApiBaseUrl}${AppConfig.moviesEndpoint}?page=$page';
      final response = await _client.get(Uri.parse(url));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final results = data['results'] as List;
        return results.map((item) => AnimeResult.fromJson(item)).toList();
      }
      throw Exception('Failed to load movies');
    } catch (e) {
      debugPrint('Error fetching movies: $e');
      rethrow;
    }
  }

  /// Dispose the client
  void dispose() {
    _client.close();
  }
}
