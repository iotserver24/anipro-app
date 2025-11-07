class NotificationItem {
  final String id;
  final String type;
  final String title;
  final String content;
  final String? imageUrl;
  final String? videoUrl;
  final String? deepLink;
  final int priority;
  final DateTime createdAt;
  final DateTime? expiresAt;

  NotificationItem({
    required this.id,
    required this.type,
    required this.title,
    required this.content,
    this.imageUrl,
    this.videoUrl,
    this.deepLink,
    required this.priority,
    required this.createdAt,
    this.expiresAt,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: json['id'] ?? '',
      type: json['type'] ?? 'announcement',
      title: json['title'] ?? '',
      content: json['content'] ?? '',
      imageUrl: json['imageUrl'],
      videoUrl: json['videoUrl'],
      deepLink: json['deepLink'],
      priority: json['priority'] ?? 0,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      expiresAt: json['expiresAt'] != null
          ? DateTime.parse(json['expiresAt'])
          : null,
    );
  }
}

