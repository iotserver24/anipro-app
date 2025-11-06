import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/anime.dart';

class AnimeApiService {
  static const String baseUrl = 'https://con.anisurge.me/anime/zoro';

  Future<List<AnimeResult>> searchAnime(String query) async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/$query'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data is List) {
          return data.map((e) => AnimeResult.fromJson(e)).toList();
        } else if (data is Map && data['results'] != null) {
          return (data['results'] as List)
              .map((e) => AnimeResult.fromJson(e))
              .toList();
        }
      }
      return [];
    } catch (e) {
      print('Error searching anime: $e');
      return [];
    }
  }

  Future<AnimeDetails?> getAnimeDetails(String id) async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/info?id=$id'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return AnimeDetails.fromJson(data);
      }
      return null;
    } catch (e) {
      print('Error getting anime details: $e');
      return null;
    }
  }

  Future<StreamingResponse?> getEpisodeSources(
      String episodeId, bool isDub) async {
    try {
      final url = '$baseUrl/watch/$episodeId${isDub ? '?dub=true' : ''}';
      print('Fetching sources from: $url');
      final response = await http.get(Uri.parse(url));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return StreamingResponse.fromJson(data);
      }
      return null;
    } catch (e) {
      print('Error getting episode sources: $e');
      return null;
    }
  }

  Future<List<AnimeResult>> getRecentAnime() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/recent-episodes'));
      if (response.statusCode == 200) {
        final contentType = response.headers['content-type'];
        if (contentType != null && contentType.contains('application/json')) {
          final data = json.decode(response.body);
          if (data is List) {
            return data.map((e) => AnimeResult.fromJson(e)).toList();
          } else if (data is Map && data['results'] != null) {
            return (data['results'] as List)
                .map((e) => AnimeResult.fromJson(e))
                .toList();
          }
        }
      }
      return [];
    } catch (e) {
      print('Error getting recent anime: $e');
      return [];
    }
  }

  Future<List<AnimeResult>> getTrending() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/top-airing'));
      if (response.statusCode == 200) {
        final contentType = response.headers['content-type'];
        if (contentType != null && contentType.contains('application/json')) {
          final data = json.decode(response.body);
          if (data is List) {
            return data.map((e) => AnimeResult.fromJson(e)).toList();
          } else if (data is Map && data['results'] != null) {
            return (data['results'] as List)
                .map((e) => AnimeResult.fromJson(e))
                .toList();
          }
        }
      }
      return [];
    } catch (e) {
      print('Error getting trending anime: $e');
      return [];
    }
  }

  Future<List<AnimeResult>> getLatestCompleted() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/latest-completed'));
      if (response.statusCode == 200) {
        final contentType = response.headers['content-type'];
        if (contentType != null && contentType.contains('application/json')) {
          final data = json.decode(response.body);
          if (data is List) {
            return data.map((e) => AnimeResult.fromJson(e)).toList();
          } else if (data is Map && data['results'] != null) {
            return (data['results'] as List)
                .map((e) => AnimeResult.fromJson(e))
                .toList();
          }
        }
      }
      return [];
    } catch (e) {
      print('Error getting latest completed anime: $e');
      return [];
    }
  }

  Future<List<AnimeResult>> getNewReleases() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/recent-added'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data is List) {
          return data.map((e) => AnimeResult.fromJson(e)).toList();
        } else if (data is Map && data['results'] != null) {
          return (data['results'] as List)
              .map((e) => AnimeResult.fromJson(e))
              .toList();
        }
      }
      return [];
    } catch (e) {
      print('Error getting new releases: $e');
      return [];
    }
  }

  Future<List<String>> getGenreList() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/genre/list'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data is List) {
          return data.map((e) => e.toString()).toList();
        } else if (data is Map && data['results'] != null) {
          return (data['results'] as List).map((e) => e.toString()).toList();
        }
      }
      return [];
    } catch (e) {
      print('Error getting genre list: $e');
      return [];
    }
  }

  Future<List<AnimeResult>> getAnimeByGenre(String genre) async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/genre/$genre'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data is List) {
          return data.map((e) => AnimeResult.fromJson(e)).toList();
        } else if (data is Map && data['results'] != null) {
          return (data['results'] as List)
              .map((e) => AnimeResult.fromJson(e))
              .toList();
        }
      }
      return [];
    } catch (e) {
      print('Error getting anime by genre: $e');
      return [];
    }
  }

  Future<List<AnimeResult>> getPopularAnime() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/most-popular'));
      if (response.statusCode == 200) {
        final contentType = response.headers['content-type'];
        if (contentType != null && contentType.contains('application/json')) {
          final data = json.decode(response.body);
          if (data is List) {
            return data.map((e) => AnimeResult.fromJson(e)).toList();
          } else if (data is Map && data['results'] != null) {
            return (data['results'] as List)
                .map((e) => AnimeResult.fromJson(e))
                .toList();
          }
        }
      }
      return [];
    } catch (e) {
      print('Error getting popular anime: $e');
      return [];
    }
  }

  Future<List<AnimeResult>> getFavoriteAnime() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/most-favorite'));
      if (response.statusCode == 200) {
        final contentType = response.headers['content-type'];
        if (contentType != null && contentType.contains('application/json')) {
          final data = json.decode(response.body);
          if (data is List) {
            return data.map((e) => AnimeResult.fromJson(e)).toList();
          } else if (data is Map && data['results'] != null) {
            return (data['results'] as List)
                .map((e) => AnimeResult.fromJson(e))
                .toList();
          }
        }
      }
      return [];
    } catch (e) {
      print('Error getting favorite anime: $e');
      return [];
    }
  }
}
