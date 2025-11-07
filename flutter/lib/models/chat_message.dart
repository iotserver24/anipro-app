class ChatMessage {
  final String id;
  final String userId;
  final String userName;
  final String userAvatar;
  final String message;
  final String? gifUrl;
  final String? imageUrl;
  final int timestamp;
  final bool isAI;
  final String? characterName;

  ChatMessage({
    required this.id,
    required this.userId,
    required this.userName,
    required this.userAvatar,
    required this.message,
    this.gifUrl,
    this.imageUrl,
    required this.timestamp,
    this.isAI = false,
    this.characterName,
  });

  factory ChatMessage.fromMap(Map<String, dynamic> map, String id) {
    return ChatMessage(
      id: id,
      userId: map['userId'] ?? '',
      userName: map['userName'] ?? '',
      userAvatar: map['userAvatar'] ?? '',
      message: map['message'] ?? '',
      gifUrl: map['gifUrl'],
      imageUrl: map['imageUrl'],
      timestamp: map['timestamp'] ?? DateTime.now().millisecondsSinceEpoch,
      isAI: map['isAI'] ?? false,
      characterName: map['characterName'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'userName': userName,
      'userAvatar': userAvatar,
      'message': message,
      if (gifUrl != null) 'gifUrl': gifUrl,
      if (imageUrl != null) 'imageUrl': imageUrl,
      'timestamp': timestamp,
      'isAI': isAI,
      if (characterName != null) 'characterName': characterName,
    };
  }
}

