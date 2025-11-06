class AnimeResult {
  const AnimeResult({
    required this.id,
    required this.title,
    required this.image,
    this.url = '',
    this.japaneseTitle = '',
    this.type = '',
    this.sub = 0,
    this.dub = 0,
    this.episodes = 0,
  });

  final String id;
  final String title;
  final String image;
  final String url;
  final String japaneseTitle;
  final String type;
  final int sub;
  final int dub;
  final int episodes;

  factory AnimeResult.fromJson(Map<String, dynamic> json) {
    return AnimeResult(
      id: json['id'] as String? ?? json['animeId'] as String? ?? '',
      title: json['title'] as String? ?? json['name'] as String? ?? 'Unknown',
      image: json['image'] as String? ?? json['img'] as String? ?? '',
      url: json['url'] as String? ?? '',
      japaneseTitle: json['japaneseTitle'] as String? ?? '',
      type: json['type'] as String? ?? '',
      sub: json['sub'] as int? ?? 0,
      dub: json['dub'] as int? ?? 0,
      episodes: json['episodes'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'title': title,
      'image': image,
      'url': url,
      'japaneseTitle': japaneseTitle,
      'type': type,
      'sub': sub,
      'dub': dub,
      'episodes': episodes,
    };
  }
}
