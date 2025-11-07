import 'dart:convert';
import 'package:http/http.dart' as http;

class GifService {
  static const String tenorApiKey = 'AIzaSyADDZfPf44y7I5FqY2TZQr_X95RdlYXYgg';
  static const String tenorBaseUrl = 'https://tenor.googleapis.com/v2';

  // Search GIFs
  Future<List<Map<String, dynamic>>> searchGifs(String query, {int limit = 20}) async {
    try {
      final response = await http.get(
        Uri.parse('$tenorBaseUrl/search?q=$query&key=$tenorApiKey&limit=$limit'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final results = data['results'] as List;
        return results.map((gif) => {
          'id': gif['id'],
          'url': gif['media_formats']['gif']['url'],
          'preview': gif['media_formats']['tinygif']['url'],
          'title': gif['content_description'] ?? '',
        }).toList();
      } else {
        throw Exception('Tenor API error: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to search GIFs: $e');
    }
  }

  // Get featured GIFs
  Future<List<Map<String, dynamic>>> getFeaturedGifs({int limit = 20}) async {
    try {
      final response = await http.get(
        Uri.parse('$tenorBaseUrl/featured?key=$tenorApiKey&limit=$limit'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final results = data['results'] as List;
        return results.map((gif) => {
          'id': gif['id'],
          'url': gif['media_formats']['gif']['url'],
          'preview': gif['media_formats']['tinygif']['url'],
          'title': gif['content_description'] ?? '',
        }).toList();
      } else {
        throw Exception('Tenor API error: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to get featured GIFs: $e');
    }
  }
}

