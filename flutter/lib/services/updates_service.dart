import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';

class UpdatesService {
  static const String apiBaseUrl = 'https://anisurge.me/api';

  // Check for updates
  Future<Map<String, dynamic>> checkForUpdates({bool beta = false}) async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = packageInfo.version;
      final versionCode = int.tryParse(packageInfo.buildNumber) ?? 1;

      final response = await http.get(
        Uri.parse('$apiBaseUrl/updates?version=$currentVersion&versionCode=$versionCode&beta=$beta'),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Updates API error: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to check for updates: $e');
    }
  }

  // Get What's New info
  Future<Map<String, dynamic>> getWhatsNew() async {
    try {
      final response = await http.get(
        Uri.parse('$apiBaseUrl/whats-new'),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Whats New API error: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to get What\'s New: $e');
    }
  }
}

