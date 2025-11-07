class WatchHistoryItem {
  final String id; // Anime ID
  final String name;
  final String img;
  final String episodeId;
  final int episodeNumber;
  final int timestamp;
  final int progress; // Current position in seconds
  final int duration; // Total duration
  final int lastWatched; // Unix timestamp
  final String subOrDub; // 'sub' or 'dub'

  WatchHistoryItem({
    required this.id,
    required this.name,
    required this.img,
    required this.episodeId,
    required this.episodeNumber,
    required this.timestamp,
    required this.progress,
    required this.duration,
    required this.lastWatched,
    required this.subOrDub,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'img': img,
      'episodeId': episodeId,
      'episodeNumber': episodeNumber,
      'timestamp': timestamp,
      'progress': progress,
      'duration': duration,
      'lastWatched': lastWatched,
      'subOrDub': subOrDub,
    };
  }

  factory WatchHistoryItem.fromJson(Map<String, dynamic> json) {
    return WatchHistoryItem(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      img: json['img'] ?? '',
      episodeId: json['episodeId'] ?? '',
      episodeNumber: json['episodeNumber'] ?? 0,
      timestamp: json['timestamp'] ?? 0,
      progress: json['progress'] ?? 0,
      duration: json['duration'] ?? 0,
      lastWatched: json['lastWatched'] ?? DateTime.now().millisecondsSinceEpoch ~/ 1000,
      subOrDub: json['subOrDub'] ?? 'sub',
    );
  }

  WatchHistoryItem copyWith({
    String? id,
    String? name,
    String? img,
    String? episodeId,
    int? episodeNumber,
    int? timestamp,
    int? progress,
    int? duration,
    int? lastWatched,
    String? subOrDub,
  }) {
    return WatchHistoryItem(
      id: id ?? this.id,
      name: name ?? this.name,
      img: img ?? this.img,
      episodeId: episodeId ?? this.episodeId,
      episodeNumber: episodeNumber ?? this.episodeNumber,
      timestamp: timestamp ?? this.timestamp,
      progress: progress ?? this.progress,
      duration: duration ?? this.duration,
      lastWatched: lastWatched ?? this.lastWatched,
      subOrDub: subOrDub ?? this.subOrDub,
    );
  }
}

