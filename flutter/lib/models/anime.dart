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
  });

  factory AnimeResult.fromJson(Map<String, dynamic> json) {
    return AnimeResult(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      url: json['url'] ?? '',
      image: json['image'] ?? '',
      japaneseTitle: json['japaneseTitle'] ?? '',
      type: json['type'] ?? '',
      sub: json['sub'] ?? 0,
      dub: json['dub'] ?? 0,
      episodes: json['episodes'] ?? 0,
    );
  }
}

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
      id: json['id'] ?? '',
      number: json['number'] ?? 0,
      title: json['title'] ?? '',
      isSubbed: json['isSubbed'] ?? false,
      isDubbed: json['isDubbed'] ?? false,
      url: json['url'] ?? '',
      isFiller: json['isFiller'],
    );
  }
}

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
  });

  factory AnimeDetails.fromJson(Map<String, dynamic> json) {
    return AnimeDetails(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      japaneseTitle: json['japaneseTitle'] ?? '',
      image: json['image'] ?? '',
      description: json['description'] ?? '',
      type: json['type'] ?? '',
      url: json['url'] ?? '',
      subOrDub: json['subOrDub'] ?? 'sub',
      hasSub: json['hasSub'] ?? false,
      hasDub: json['hasDub'] ?? false,
      genres: List<String>.from(json['genres'] ?? []),
      status: json['status'] ?? '',
      season: json['season'] ?? '',
      totalEpisodes: json['totalEpisodes'] ?? 0,
      episodes: (json['episodes'] as List?)
              ?.map((e) => Episode.fromJson(e))
              .toList() ??
          [],
      rating: json['rating'],
    );
  }
}

class StreamingSource {
  final String url;
  final bool isM3U8;

  StreamingSource({
    required this.url,
    required this.isM3U8,
  });

  factory StreamingSource.fromJson(Map<String, dynamic> json) {
    return StreamingSource(
      url: json['url'] ?? '',
      isM3U8: json['isM3U8'] ?? false,
    );
  }
}

class Subtitle {
  final String kind;
  final String url;

  Subtitle({
    required this.kind,
    required this.url,
  });

  factory Subtitle.fromJson(Map<String, dynamic> json) {
    return Subtitle(
      kind: json['kind'] ?? '',
      url: json['url'] ?? '',
    );
  }
}

class IntroOutro {
  final int start;
  final int end;

  IntroOutro({
    required this.start,
    required this.end,
  });

  factory IntroOutro.fromJson(Map<String, dynamic> json) {
    return IntroOutro(
      start: json['start'] ?? 0,
      end: json['end'] ?? 0,
    );
  }
}

class StreamingResponse {
  final Map<String, String> headers;
  final List<StreamingSource> sources;
  final List<Subtitle>? subtitles;
  final String? download;
  final IntroOutro? intro;
  final IntroOutro? outro;

  StreamingResponse({
    required this.headers,
    required this.sources,
    this.subtitles,
    this.download,
    this.intro,
    this.outro,
  });

  factory StreamingResponse.fromJson(Map<String, dynamic> json) {
    return StreamingResponse(
      headers: Map<String, String>.from(json['headers'] ?? {}),
      sources: (json['sources'] as List?)
              ?.map((e) => StreamingSource.fromJson(e))
              .toList() ??
          [],
      subtitles: (json['subtitles'] as List?)
          ?.map((e) => Subtitle.fromJson(e))
          .toList(),
      download: json['download'],
      intro:
          json['intro'] != null ? IntroOutro.fromJson(json['intro']) : null,
      outro:
          json['outro'] != null ? IntroOutro.fromJson(json['outro']) : null,
    );
  }
}
