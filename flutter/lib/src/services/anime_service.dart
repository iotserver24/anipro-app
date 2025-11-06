import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/anime_result.dart';
import '../models/anime_details.dart';
import '../models/streaming_response.dart';
import 'api_config.dart';

class AnimeService {
  final http.Client _client;

  AnimeService({http.Client? client}) : _client = client ?? http.Client();

  Future<List<AnimeResult>> searchAnime(String query) async {
    try {
      final encodedQuery = Uri.encodeComponent(query.trim());
      final response = await _client.get(
        ApiConfig.endpoint(encodedQuery),
        headers: {'Accept': 'application/json'},
      );

      if (response.statusCode == 200) {
        final dynamic decoded = json.decode(response.body);
        final List<dynamic> data = decoded is List
            ? decoded
            : (decoded as Map<String, dynamic>)['results'] as List<dynamic>? ??
                [];

        return data
            .map((dynamic e) => AnimeResult.fromJson(e as Map<String, dynamic>))
            .toList();
      } else {
        return [];
      }
    } catch (e) {
      print('Error searching anime: $e');
      return [];
    }
  }

  Future<AnimeDetails?> getAnimeDetails(String id) async {
    try {
      final response = await _client.get(
        ApiConfig.endpoint('info', queryParameters: {'id': id}),
        headers: {'Accept': 'application/json'},
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> data =
            json.decode(response.body) as Map<String, dynamic>;
        return AnimeDetails.fromJson(data);
      } else {
        return null;
      }
    } catch (e) {
      print('Error fetching anime details: $e');
      return null;
    }
  }

  Future<StreamingResponse?> getEpisodeSources(String episodeId,
      {bool isDub = false}) async {
    try {
      final Map<String, String> queryParams = {};
      if (isDub) {
        queryParams['dub'] = 'true';
      }

      final response = await _client.get(
        ApiConfig.endpoint('watch/$episodeId', queryParameters: queryParams),
        headers: {'Accept': 'application/json'},
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> data =
            json.decode(response.body) as Map<String, dynamic>;
        return StreamingResponse.fromJson(data);
      } else {
        return null;
      }
    } catch (e) {
      print('Error fetching episode sources: $e');
      return null;
    }
  }

  Future<List<AnimeResult>> getRecentAnime() async {
    return _fetchAnimeList('recent-episodes');
  }

  Future<List<AnimeResult>> getTrending() async {
    return _fetchAnimeList('top-airing');
  }

  Future<List<AnimeResult>> getLatestCompleted() async {
    return _fetchAnimeList('latest-completed');
  }

  Future<List<AnimeResult>> getNewReleases() async {
    return _fetchAnimeList('recent-added');
  }

  Future<List<AnimeResult>> getPopularAnime() async {
    return _fetchAnimeList('most-popular');
  }

  Future<List<AnimeResult>> getFavoriteAnime() async {
    return _fetchAnimeList('most-favorite');
  }

  Future<List<String>> getGenreList() async {
    try {
      final response = await _client.get(
        ApiConfig.endpoint('genre/list'),
        headers: {'Accept': 'application/json'},
      );

      if (response.statusCode == 200) {
        final dynamic decoded = json.decode(response.body);
        final List<dynamic> data = decoded is List
            ? decoded
            : (decoded as Map<String, dynamic>)['results'] as List<dynamic>? ??
                [];
        return data.map((dynamic e) => e.toString()).toList();
      } else {
        return [];
      }
    } catch (e) {
      print('Error fetching genre list: $e');
      return [];
    }
  }

  Future<List<AnimeResult>> getAnimeByGenre(String genre) async {
    return _fetchAnimeList('genre/$genre');
  }

  Future<List<AnimeResult>> _fetchAnimeList(String endpoint) async {
    try {
      final response = await _client.get(
        ApiConfig.endpoint(endpoint),
        headers: {'Accept': 'application/json'},
      );

      if (response.statusCode == 200) {
        final contentType = response.headers['content-type'];
        if (contentType != null && !contentType.contains('application/json')) {
          print('[$endpoint] Non-JSON response received');
          return [];
        }

        final dynamic decoded = json.decode(response.body);
        final List<dynamic> data = decoded is List
            ? decoded
            : (decoded as Map<String, dynamic>)['results'] as List<dynamic>? ??
                [];

        return data
            .map((dynamic e) => AnimeResult.fromJson(e as Map<String, dynamic>))
            .toList();
      } else {
        print('[$endpoint] HTTP ${response.statusCode}');
        return [];
      }
    } catch (e) {
      print('Error fetching $endpoint: $e');
      return [];
    }
  }
}
