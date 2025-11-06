class StreamingResponse {
  const StreamingResponse({
    required this.headers,
    required this.sources,
    this.subtitles = const [],
    this.download,
    this.intro,
    this.outro,
  });

  final Map<String, String> headers;
  final List<VideoSource> sources;
  final List<Subtitle> subtitles;
  final String? download;
  final TimeMarker? intro;
  final TimeMarker? outro;

  factory StreamingResponse.fromJson(Map<String, dynamic> json) {
    final Map<String, dynamic> headersMap =
        json['headers'] as Map<String, dynamic>? ?? {};
    final List<dynamic> sourcesList = json['sources'] as List<dynamic>? ?? [];
    final List<dynamic> subtitlesList = json['subtitles'] as List<dynamic>? ?? [];

    return StreamingResponse(
      headers: headersMap.map(
        (key, value) => MapEntry(key, value.toString()),
      ),
      sources: sourcesList
          .map((dynamic e) => VideoSource.fromJson(e as Map<String, dynamic>))
          .toList(),
      subtitles: subtitlesList
          .map((dynamic e) => Subtitle.fromJson(e as Map<String, dynamic>))
          .toList(),
      download: json['download'] as String?,
      intro: json['intro'] != null
          ? TimeMarker.fromJson(json['intro'] as Map<String, dynamic>)
          : null,
      outro: json['outro'] != null
          ? TimeMarker.fromJson(json['outro'] as Map<String, dynamic>)
          : null,
    );
  }
}

class VideoSource {
  const VideoSource({
    required this.url,
    required this.isM3U8,
  });

  final String url;
  final bool isM3U8;

  factory VideoSource.fromJson(Map<String, dynamic> json) {
    return VideoSource(
      url: json['url'] as String? ?? '',
      isM3U8: json['isM3U8'] as bool? ?? false,
    );
  }
}

class Subtitle {
  const Subtitle({
    required this.kind,
    required this.url,
  });

  final String kind;
  final String url;

  factory Subtitle.fromJson(Map<String, dynamic> json) {
    return Subtitle(
      kind: json['kind'] as String? ?? '',
      url: json['url'] as String? ?? '',
    );
  }
}

class TimeMarker {
  const TimeMarker({
    required this.start,
    required this.end,
  });

  final double start;
  final double end;

  factory TimeMarker.fromJson(Map<String, dynamic> json) {
    return TimeMarker(
      start: (json['start'] as num?)?.toDouble() ?? 0.0,
      end: (json['end'] as num?)?.toDouble() ?? 0.0,
    );
  }
}
