import 'episode.dart';

class AnimeDetails {
  const AnimeDetails({
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
    this.recommendations = const [],
    this.relations = const [],
  });

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
  final List<RelatedAnime> recommendations;
  final List<RelatedAnime> relations;

  factory AnimeDetails.fromJson(Map<String, dynamic> json) {
    final List<dynamic> episodeList = json['episodes'] as List<dynamic>? ?? [];
    final List<dynamic> recommendationsList =
        json['recommendations'] as List<dynamic>? ?? [];
    final List<dynamic> relationsList = json['relations'] as List<dynamic>? ?? [];

    return AnimeDetails(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Unknown',
      japaneseTitle: json['japaneseTitle'] as String? ?? '',
      image: json['image'] as String? ?? '',
      description: json['description'] as String? ?? '',
      type: json['type'] as String? ?? '',
      url: json['url'] as String? ?? '',
      subOrDub: json['subOrDub'] as String? ?? 'sub',
      hasSub: json['hasSub'] as bool? ?? true,
      hasDub: json['hasDub'] as bool? ?? false,
      genres: (json['genres'] as List<dynamic>? ?? [])
          .map((dynamic e) => e.toString())
          .toList(),
      status: json['status'] as String? ?? '',
      season: json['season'] as String? ?? '',
      totalEpisodes: json['totalEpisodes'] as int? ?? 0,
      episodes: episodeList
          .map((dynamic e) => Episode.fromJson(e as Map<String, dynamic>))
          .toList(),
      rating: json['rating'] as String?,
      recommendations: recommendationsList
          .map((dynamic e) =>
              RelatedAnime.fromJson(e as Map<String, dynamic>))
          .toList(),
      relations: relationsList
          .map((dynamic e) =>
              RelatedAnime.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class RelatedAnime {
  const RelatedAnime({
    required this.id,
    required this.title,
    required this.image,
    required this.type,
    required this.episodes,
    this.relationType = '',
  });

  final String id;
  final String title;
  final String image;
  final String type;
  final int episodes;
  final String relationType;

  factory RelatedAnime.fromJson(Map<String, dynamic> json) {
    return RelatedAnime(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Unknown',
      image: json['image'] as String? ?? '',
      type: json['type'] as String? ?? '',
      episodes: json['episodes'] as int? ?? 0,
      relationType: json['relationType'] as String? ?? '',
    );
  }
}
