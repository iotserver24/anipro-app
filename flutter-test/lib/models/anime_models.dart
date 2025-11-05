/// Anime Result Model
class AnimeResult {
  final String id;
  final String title;
  final String image;
  final String? url;
  final String? japaneseTitle;
  final String? type;
  final int? sub;
  final int? dub;
  final int? episodes;
  final String? banner;
  final List<String>? genres;
  final String? releaseDate;
  final String? quality;
  final String? description;

  AnimeResult({
    required this.id,
    required this.title,
    required this.image,
    this.url,
    this.japaneseTitle,
    this.type,
    this.sub,
    this.dub,
    this.episodes,
    this.banner,
    this.genres,
    this.releaseDate,
    this.quality,
    this.description,
  });

  factory AnimeResult.fromJson(Map<String, dynamic> json) {
    return AnimeResult(
      id: json['id'] ?? '',
      title: json['title'] ?? json['name'] ?? '',
      image: json['image'] ?? json['img'] ?? '',
      url: json['url'],
      japaneseTitle: json['japaneseTitle'],
      type: json['type'],
      sub: json['sub'],
      dub: json['dub'],
      episodes: json['episodes'],
      banner: json['banner'],
      genres: json['genres'] != null ? List<String>.from(json['genres']) : null,
      releaseDate: json['releaseDate'],
      quality: json['quality'],
      description: json['description'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'image': image,
      'url': url,
      'japaneseTitle': japaneseTitle,
      'type': type,
      'sub': sub,
      'dub': dub,
      'episodes': episodes,
      'banner': banner,
      'genres': genres,
      'releaseDate': releaseDate,
      'quality': quality,
      'description': description,
    };
  }
}

/// Episode Model
class Episode {
  final String id;
  final int number;
  final String title;
  final String? thumbnail;
  final bool? isFiller;

  Episode({
    required this.id,
    required this.number,
    required this.title,
    this.thumbnail,
    this.isFiller,
  });

  factory Episode.fromJson(Map<String, dynamic> json) {
    return Episode(
      id: json['id'] ?? '',
      number: json['number'] ?? 0,
      title: json['title'] ?? '',
      thumbnail: json['thumbnail'],
      isFiller: json['isFiller'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'number': number,
      'title': title,
      'thumbnail': thumbnail,
      'isFiller': isFiller,
    };
  }
}

/// Anime Details Model
class AnimeDetails {
  final String id;
  final String title;
  final String? japaneseTitle;
  final String image;
  final String description;
  final String type;
  final String url;
  final String subOrDub;
  final bool hasSub;
  final bool hasDub;
  final List<String> genres;
  final String status;
  final String? season;
  final int totalEpisodes;
  final List<Episode> episodes;
  final String? rating;
  final List<AnimeResult>? recommendations;
  final List<AnimeRelation>? relations;

  AnimeDetails({
    required this.id,
    required this.title,
    this.japaneseTitle,
    required this.image,
    required this.description,
    required this.type,
    required this.url,
    required this.subOrDub,
    required this.hasSub,
    required this.hasDub,
    required this.genres,
    required this.status,
    this.season,
    required this.totalEpisodes,
    required this.episodes,
    this.rating,
    this.recommendations,
    this.relations,
  });

  factory AnimeDetails.fromJson(Map<String, dynamic> json) {
    return AnimeDetails(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      japaneseTitle: json['japaneseTitle'],
      image: json['image'] ?? '',
      description: json['description'] ?? '',
      type: json['type'] ?? '',
      url: json['url'] ?? '',
      subOrDub: json['subOrDub'] ?? 'sub',
      hasSub: json['hasSub'] ?? false,
      hasDub: json['hasDub'] ?? false,
      genres: json['genres'] != null ? List<String>.from(json['genres']) : [],
      status: json['status'] ?? '',
      season: json['season'],
      totalEpisodes: json['totalEpisodes'] ?? 0,
      episodes: json['episodes'] != null
          ? (json['episodes'] as List).map((e) => Episode.fromJson(e)).toList()
          : [],
      rating: json['rating'],
      recommendations: json['recommendations'] != null
          ? (json['recommendations'] as List)
              .map((e) => AnimeResult.fromJson(e))
              .toList()
          : null,
      relations: json['relations'] != null
          ? (json['relations'] as List).map((e) => AnimeRelation.fromJson(e)).toList()
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'japaneseTitle': japaneseTitle,
      'image': image,
      'description': description,
      'type': type,
      'url': url,
      'subOrDub': subOrDub,
      'hasSub': hasSub,
      'hasDub': hasDub,
      'genres': genres,
      'status': status,
      'season': season,
      'totalEpisodes': totalEpisodes,
      'episodes': episodes.map((e) => e.toJson()).toList(),
      'rating': rating,
      'recommendations': recommendations?.map((e) => e.toJson()).toList(),
      'relations': relations?.map((e) => e.toJson()).toList(),
    };
  }
}

/// Anime Relation Model
class AnimeRelation {
  final String id;
  final String title;
  final String image;
  final String type;
  final int episodes;
  final String relationType;

  AnimeRelation({
    required this.id,
    required this.title,
    required this.image,
    required this.type,
    required this.episodes,
    required this.relationType,
  });

  factory AnimeRelation.fromJson(Map<String, dynamic> json) {
    return AnimeRelation(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      image: json['image'] ?? '',
      type: json['type'] ?? '',
      episodes: json['episodes'] ?? 0,
      relationType: json['relationType'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'image': image,
      'type': type,
      'episodes': episodes,
      'relationType': relationType,
    };
  }
}

/// Video Source Model
class VideoSource {
  final String url;
  final String quality;
  final bool isM3U8;

  VideoSource({
    required this.url,
    required this.quality,
    required this.isM3U8,
  });

  factory VideoSource.fromJson(Map<String, dynamic> json) {
    return VideoSource(
      url: json['url'] ?? '',
      quality: json['quality'] ?? 'default',
      isM3U8: json['isM3U8'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'url': url,
      'quality': quality,
      'isM3U8': isM3U8,
    };
  }
}

/// Episode Sources Model
class EpisodeSources {
  final List<VideoSource> sources;
  final List<Subtitle>? subtitles;
  final String? intro;
  final String? outro;

  EpisodeSources({
    required this.sources,
    this.subtitles,
    this.intro,
    this.outro,
  });

  factory EpisodeSources.fromJson(Map<String, dynamic> json) {
    return EpisodeSources(
      sources: json['sources'] != null
          ? (json['sources'] as List).map((e) => VideoSource.fromJson(e)).toList()
          : [],
      subtitles: json['subtitles'] != null
          ? (json['subtitles'] as List).map((e) => Subtitle.fromJson(e)).toList()
          : null,
      intro: json['intro'],
      outro: json['outro'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'sources': sources.map((e) => e.toJson()).toList(),
      'subtitles': subtitles?.map((e) => e.toJson()).toList(),
      'intro': intro,
      'outro': outro,
    };
  }
}

/// Subtitle Model
class Subtitle {
  final String url;
  final String lang;

  Subtitle({
    required this.url,
    required this.lang,
  });

  factory Subtitle.fromJson(Map<String, dynamic> json) {
    return Subtitle(
      url: json['url'] ?? '',
      lang: json['lang'] ?? 'English',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'url': url,
      'lang': lang,
    };
  }
}
