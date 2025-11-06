class Episode {
  final String id;
  final int number;
  final String title;
  final bool isSubbed;
  final bool isDubbed;
  final String url;
  final bool? isFiller;

  Episode({
    required this.id,
    required this.number,
    required this.title,
    required this.isSubbed,
    required this.isDubbed,
    required this.url,
    this.isFiller,
  });

  factory Episode.fromJson(Map<String, dynamic> json) {
    return Episode(
      id: json['id'] as String? ?? '',
      number: json['number'] is num ? (json['number'] as num).toInt() : int.tryParse('${json['number']}') ?? 0,
      title: json['title'] as String? ?? '',
      isSubbed: json['isSubbed'] as bool? ?? false,
      isDubbed: json['isDubbed'] as bool? ?? false,
      url: json['url'] as String? ?? '',
      isFiller: json['isFiller'] as bool?,
    );
  }
}
