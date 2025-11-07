import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/notification_item.dart';

class NotificationsService {
  static const String baseUrl = 'https://anisurge.me/api';

  Future<List<NotificationItem>> getNotifications() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/notifications'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data is List) {
          return data.map((e) => NotificationItem.fromJson(e)).toList();
        }
      }
      return [];
    } catch (e) {
      print('Error fetching notifications: $e');
      return [];
    }
  }

  Future<bool> markAsRead(List<String> notificationIds, String deviceId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/notifications/read'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'notificationIds': notificationIds,
          'deviceId': deviceId,
        }),
      );
      return response.statusCode == 200;
    } catch (e) {
      print('Error marking notifications as read: $e');
      return false;
    }
  }
}

