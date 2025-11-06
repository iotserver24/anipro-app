class Episode {
  const Episode({
    required this.id,
    required this.number,
    required this.title,
    this.isSubbed = false,
    this.isDubbed = false,
    this.url = '',
    this.isFiller = false,
  });

  final String id;
  final int number;
  final String title;
  final bool isSubbed;
  final bool isDubbed;
  final String url;
  final bool isFiller;

  factory Episode.fromJson(Map<String, dynamic> json) {
    return Episode(
      id: json['id'] as String? ?? '',
      number: json['number'] as int? ?? 0,
      title: json['title'] as String? ?? 'Episode ${json['number']}',
      isSubbed: json['isSubbed'] as bool? ?? false,
      isDubbed: json['isDubbed'] as bool? ?? false,
      url: json['url'] as String? ?? '',
      isFiller: json['isFiller'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'number': number,
      'title': title,
      'isSubbed': isSubbed,
      'isDubbed': isDubbed,
      'url': url,
      'isFiller': isFiller,
    };
  }
}
