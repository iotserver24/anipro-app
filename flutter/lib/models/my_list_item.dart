class MyListItem {
  final String id;
  final String title;
  final String image;
  final String type;
  final int episodes;

  MyListItem({
    required this.id,
    required this.title,
    required this.image,
    required this.type,
    required this.episodes,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'image': image,
      'type': type,
      'episodes': episodes,
    };
  }

  factory MyListItem.fromJson(Map<String, dynamic> json) {
    return MyListItem(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      image: json['image'] ?? '',
      type: json['type'] ?? '',
      episodes: json['episodes'] ?? 0,
    );
  }

  factory MyListItem.fromAnimeResult(dynamic anime) {
    return MyListItem(
      id: anime.id,
      title: anime.title,
      image: anime.image,
      type: anime.type,
      episodes: anime.episodes,
    );
  }
}

