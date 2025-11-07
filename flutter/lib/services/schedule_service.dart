import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/schedule_item.dart';

class ScheduleService {
  static const String baseUrl = 'https://anisurge.me/api';

  Future<List<ScheduleItem>> getSchedule() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/schedule-cache'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data is Map && data['scheduledAnimes'] != null) {
          return (data['scheduledAnimes'] as List)
              .map((e) => ScheduleItem.fromJson(e))
              .toList();
        }
      }
      return [];
    } catch (e) {
      print('Error fetching schedule: $e');
      return [];
    }
  }

  Future<bool> triggerScheduleGeneration() async {
    try {
      final response = await http.post(
        Uri.parse('https://she.anisurge.me/api/schedule/trigger'),
      );
      return response.statusCode == 200;
    } catch (e) {
      print('Error triggering schedule: $e');
      return false;
    }
  }
}

