class AnimeResult {
  final String id;
  final String title;
  final String url;
  final String image;
  final String japaneseTitle;
  final String type;
  final int sub;
  final int dub;
  final int episodes;
  final String? duration;
  final bool? nsfw;

  AnimeResult({
    required this.id,
    required this.title,
    required this.url,
    required this.image,
    required this.japaneseTitle,
    required this.type,
    required this.sub,
    required this.dub,
    required this.episodes,
    this.duration,
    this.nsfw,
  });

  factory AnimeResult.fromJson(Map<String, dynamic> json) {
    return AnimeResult(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      url: json['url'] as String? ?? '',
      image: json['image'] as String? ?? '',
      japaneseTitle: json['japaneseTitle'] as String? ?? '',
      type: json['type'] as String? ?? '',
      sub: json['sub'] as int? ?? 0,
      dub: json['dub'] as int? ?? 0,
      episodes: json['episodes'] as int? ?? 0,
      duration: json['duration'] as String?,
      nsfw: json['nsfw'] as bool?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'url': url,
      'image': image,
      'japaneseTitle': japaneseTitle,
      'type': type,
      'sub': sub,
      'dub': dub,
      'episodes': episodes,
      'duration': duration,
      'nsfw': nsfw,
    };
  }
}
