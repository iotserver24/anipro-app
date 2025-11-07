class Mention {
  final String id;
  final String content;
  final String fromUserId;
  final String fromUsername;
  final String messageId;
  final DateTime timestamp;
  final bool read;
  final String type;

  Mention({
    required this.id,
    required this.content,
    required this.fromUserId,
    required this.fromUsername,
    required this.messageId,
    required this.timestamp,
    this.read = false,
    this.type = 'mention',
  });

  factory Mention.fromMap(Map<String, dynamic> map, String id) {
    return Mention(
      id: id,
      content: map['content'] ?? '',
      fromUserId: map['fromUserId'] ?? '',
      fromUsername: map['fromUsername'] ?? '',
      messageId: map['messageId'] ?? '',
      timestamp: map['timestamp']?.toDate() ?? DateTime.now(),
      read: map['read'] ?? false,
      type: map['type'] ?? 'mention',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'content': content,
      'fromUserId': fromUserId,
      'fromUsername': fromUsername,
      'messageId': messageId,
      'timestamp': timestamp,
      'read': read,
      'type': type,
    };
  }
}

