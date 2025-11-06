import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/anime_details.dart';
import '../models/anime_result.dart';
import '../models/streaming_source.dart';

class AnimeApiService {
  static const String _scheme = 'https';
  static const String _host = 'con.anisurge.me';
  static const List<String> _baseSegments = ['anime', 'zoro'];

  Future<List<AnimeResult>> searchAnime(String query) async {
    final trimmed = query.trim();
    if (trimmed.isEmpty) {
      return [];
    }

    try {
      final uri = _uriForEndpoint(trimmed);
      final response = await http.get(uri);
      if (response.statusCode == 200) {
        final data = _decodeJson(response.body);
        if (data is List) {
          return data.map((item) => AnimeResult.fromJson(_asMap(item))).toList();
        }
        if (data is Map && data['results'] is List) {
          return (data['results'] as List)
              .map((item) => AnimeResult.fromJson(_asMap(item)))
              .toList();
        }
      }
      return [];
    } catch (error) {
      print('Error searching anime "$trimmed": $error');
      return [];
    }
  }

  Future<AnimeDetails?> getAnimeDetails(String id) async {
    if (id.isEmpty) {
      return null;
    }
    try {
      final uri = _uriForEndpoint(
        'info',
        queryParameters: {'id': id},
      );
      final response = await http.get(uri);
      if (response.statusCode == 200) {
        final data = _decodeJson(response.body);
        if (data is Map<String, dynamic>) {
          return AnimeDetails.fromJson(data);
        }
      }
      return null;
    } catch (error) {
      print('Error fetching anime details for "$id": $error');
      return null;
    }
  }

  Future<StreamingResponse?> getEpisodeSources(String episodeId, bool isDub) async {
    if (episodeId.isEmpty) {
      return null;
    }
    try {
      final uri = _uriForEndpoint(
        'watch/$episodeId',
        queryParameters: isDub ? {'dub': 'true'} : null,
      );
      final response = await http.get(uri);
      if (response.statusCode == 200) {
        final data = _decodeJson(response.body);
        if (data is Map<String, dynamic>) {
          return StreamingResponse.fromJson(data);
        }
      }
      return null;
    } catch (error) {
      print('Error fetching episode sources ($episodeId, dub=$isDub): $error');
      return null;
    }
  }

  Future<List<AnimeResult>> getRecentAnime() => _fetchAnimeList('/recent-episodes');

  Future<List<AnimeResult>> getTrendingAnime() => _fetchAnimeList('/top-airing');

  Future<List<AnimeResult>> getPopularAnime() => _fetchAnimeList('/most-popular');

  Future<List<AnimeResult>> getLatestCompleted() => _fetchAnimeList('/latest-completed');

  Future<List<AnimeResult>> getNewReleases() => _fetchAnimeList('/recent-added');

  Future<List<AnimeResult>> getFavoriteAnime() => _fetchAnimeList('/most-favorite');

  Future<List<String>> getGenreList() async {
    try {
      final uri = _uriForEndpoint('genre/list');
      final response = await http.get(uri);
      if (response.statusCode == 200) {
        final data = _decodeJson(response.body);
        if (data is List) {
          return data.map((item) => item.toString()).toList();
        }
        if (data is Map && data['results'] is List) {
          return (data['results'] as List).map((item) => item.toString()).toList();
        }
      }
      return [];
    } catch (error) {
      print('Error fetching genre list: $error');
      return [];
    }
  }

  Future<List<AnimeResult>> getAnimeByGenre(String genre) {
    final trimmed = genre.trim();
    if (trimmed.isEmpty) {
      return Future.value([]);
    }
    return _fetchAnimeList('/genre/$trimmed');
  }

  Future<List<AnimeResult>> _fetchAnimeList(String endpoint) async {
    try {
      final uri = _uriForEndpoint(endpoint);
      final response = await http.get(uri);
      if (response.statusCode == 200) {
        final contentType = response.headers['content-type'] ?? '';
        if (!contentType.contains('application/json')) {
          print('Non-JSON response for $endpoint: $contentType');
          return [];
        }
        final data = _decodeJson(response.body);
        if (data is List) {
          return data.map((item) => AnimeResult.fromJson(_asMap(item))).toList();
        }
        if (data is Map && data['results'] is List) {
          return (data['results'] as List)
              .map((item) => AnimeResult.fromJson(_asMap(item)))
              .toList();
        }
      }
      return [];
    } catch (error) {
      print('Error fetching anime list from "$endpoint": $error');
      return [];
    }
  }

  Uri _uriForEndpoint(String endpoint, {Map<String, String>? queryParameters}) {
    final trimmed = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    final segments = trimmed.isEmpty
        ? <String>[]
        : trimmed.split('/').where((segment) => segment.isNotEmpty).toList();

    return Uri(
      scheme: _scheme,
      host: _host,
      pathSegments: [..._baseSegments, ...segments],
      queryParameters: queryParameters,
    );
  }

  dynamic _decodeJson(String source) {
    try {
      return json.decode(source);
    } catch (_) {
      return null;
    }
  }

  Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    return {};
  }
}
