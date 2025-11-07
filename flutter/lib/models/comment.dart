class Comment {
  final String id;
  final String animeId;
  final String userId;
  final String userName;
  final String userAvatar;
  final String content;
  final String? gifUrl;
  final int likes;
  final DateTime createdAt;

  Comment({
    required this.id,
    required this.animeId,
    required this.userId,
    required this.userName,
    required this.userAvatar,
    required this.content,
    this.gifUrl,
    required this.likes,
    required this.createdAt,
  });
}

