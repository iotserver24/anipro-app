import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/gallery_item.dart';

class GalleryService {
  static const String apiBaseUrl = 'https://anisurge.me/api';

  // Get gallery items
  Future<List<GalleryItem>> getGalleryItems({
    required String type, // 'waifu' or 'husbando'
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await http.get(
        Uri.parse('$apiBaseUrl/gallery/$type?page=$page&limit=$limit'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final items = data['items'] as List;
        return items.map((item) => GalleryItem.fromMap(item)).toList();
      } else {
        throw Exception('Gallery API error: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to get gallery items: $e');
    }
  }

  // Get gallery status
  Future<Map<String, dynamic>> getGalleryStatus() async {
    try {
      final response = await http.get(
        Uri.parse('$apiBaseUrl/gallery/status'),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Gallery status API error: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to get gallery status: $e');
    }
  }
}

