import 'episode.dart';

class AnimeDetails {
  final String id;
  final String title;
  final String japaneseTitle;
  final String image;
  final String description;
  final String type;
  final String url;
  final String subOrDub;
  final bool hasSub;
  final bool hasDub;
  final List<String> genres;
  final String status;
  final String season;
  final int totalEpisodes;
  final List<Episode> episodes;
  final String? rating;
  final List<Recommendation>? recommendations;
  final List<Relation>? relations;

  AnimeDetails({
    required this.id,
    required this.title,
    required this.japaneseTitle,
    required this.image,
    required this.description,
    required this.type,
    required this.url,
    required this.subOrDub,
    required this.hasSub,
    required this.hasDub,
    required this.genres,
    required this.status,
    required this.season,
    required this.totalEpisodes,
    required this.episodes,
    this.rating,
    this.recommendations,
    this.relations,
  });

  factory AnimeDetails.fromJson(Map<String, dynamic> json) {
    return AnimeDetails(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      japaneseTitle: json['japaneseTitle'] as String? ?? '',
      image: json['image'] as String? ?? '',
      description: json['description'] as String? ?? '',
      type: json['type'] as String? ?? '',
      url: json['url'] as String? ?? '',
      subOrDub: json['subOrDub'] as String? ?? 'sub',
      hasSub: json['hasSub'] as bool? ?? false,
      hasDub: json['hasDub'] as bool? ?? false,
      genres: (json['genres'] as List<dynamic>?)?.map((e) => e as String).toList() ?? [],
      status: json['status'] as String? ?? '',
      season: json['season'] as String? ?? '',
      totalEpisodes: json['totalEpisodes'] as int? ?? 0,
      episodes: (json['episodes'] as List<dynamic>?)?.map((e) => Episode.fromJson(e as Map<String, dynamic>)).toList() ?? [],
      rating: json['rating'] as String?,
      recommendations: (json['recommendations'] as List<dynamic>?)?.map((e) => Recommendation.fromJson(e as Map<String, dynamic>)).toList(),
      relations: (json['relations'] as List<dynamic>?)?.map((e) => Relation.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}

class Recommendation {
  final String id;
  final String title;
  final String image;
  final String type;
  final int episodes;

  Recommendation({
    required this.id,
    required this.title,
    required this.image,
    required this.type,
    required this.episodes,
  });

  factory Recommendation.fromJson(Map<String, dynamic> json) {
    return Recommendation(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      image: json['image'] as String? ?? '',
      type: json['type'] as String? ?? '',
      episodes: json['episodes'] as int? ?? 0,
    );
  }
}

class Relation {
  final String id;
  final String title;
  final String image;
  final String type;
  final int episodes;
  final String relationType;

  Relation({
    required this.id,
    required this.title,
    required this.image,
    required this.type,
    required this.episodes,
    required this.relationType,
  });

  factory Relation.fromJson(Map<String, dynamic> json) {
    return Relation(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      image: json['image'] as String? ?? '',
      type: json['type'] as String? ?? '',
      episodes: json['episodes'] as int? ?? 0,
      relationType: json['relationType'] as String? ?? '',
    );
  }
}
