import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/anime_result.dart';
import '../models/episode.dart';

class WatchHistoryEntry {
  final String animeId;
  final String episodeId;
  final int episodeNumber;
  final String animeTitle;
  final String imageUrl;
  final DateTime watchedAt;

  WatchHistoryEntry({
    required this.animeId,
    required this.episodeId,
    required this.episodeNumber,
    required this.animeTitle,
    required this.imageUrl,
    required this.watchedAt,
  });

  Map<String, dynamic> toJson() => {
        'animeId': animeId,
        'episodeId': episodeId,
        'episodeNumber': episodeNumber,
        'animeTitle': animeTitle,
        'imageUrl': imageUrl,
        'watchedAt': watchedAt.toIso8601String(),
      };

  factory WatchHistoryEntry.fromJson(Map<String, dynamic> json) {
    return WatchHistoryEntry(
      animeId: json['animeId'] as String,
      episodeId: json['episodeId'] as String,
      episodeNumber: json['episodeNumber'] as int,
      animeTitle: json['animeTitle'] as String,
      imageUrl: json['imageUrl'] as String,
      watchedAt: DateTime.parse(json['watchedAt'] as String),
    );
  }
}

class WatchHistoryService {
  WatchHistoryService._();

  static const String _storageKey = 'watch_history';
  static final WatchHistoryService instance = WatchHistoryService._();

  Future<List<WatchHistoryEntry>> loadHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonString = prefs.getString(_storageKey);
    if (jsonString == null) return [];

    try {
      final List<dynamic> decoded = json.decode(jsonString) as List<dynamic>;
      return decoded
          .map((json) => WatchHistoryEntry.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (_) {
      await prefs.remove(_storageKey);
      return [];
    }
  }

  Future<void> addToHistory(AnimeResult anime, Episode episode) async {
    final prefs = await SharedPreferences.getInstance();
    final existing = await loadHistory();

    // Remove any existing entry for the same episode.
    existing.removeWhere((e) => e.episodeId == episode.id);

    // Add the new entry at the beginning.
    existing.insert(
      0,
      WatchHistoryEntry(
        animeId: anime.id,
        episodeId: episode.id,
        episodeNumber: episode.number,
        animeTitle: anime.title,
        imageUrl: anime.image,
        watchedAt: DateTime.now(),
      ),
    );

    // Limit history to last 50 entries.
    final limited = existing.take(50).toList();
    final encoded = json.encode(limited.map((entry) => entry.toJson()).toList());
    await prefs.setString(_storageKey, encoded);
  }

  Future<void> clearHistory() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_storageKey);
  }
}
