class StreamingSource {
  final String url;
  final bool isM3u8;

  StreamingSource({
    required this.url,
    required this.isM3u8,
  });

  factory StreamingSource.fromJson(Map<String, dynamic> json) {
    return StreamingSource(
      url: json['url'] as String? ?? '',
      isM3u8: json['isM3U8'] as bool? ?? json['isM3u8'] as bool? ?? false,
    );
  }
}

class SubtitleTrack {
  final String kind;
  final String url;

  SubtitleTrack({
    required this.kind,
    required this.url,
  });

  factory SubtitleTrack.fromJson(Map<String, dynamic> json) {
    return SubtitleTrack(
      kind: json['kind'] as String? ?? '',
      url: json['url'] as String? ?? '',
    );
  }
}

class StreamingResponse {
  final Map<String, String> headers;
  final List<StreamingSource> sources;
  final List<SubtitleTrack> subtitles;
  final String? download;
  final IntroOutro? intro;
  final IntroOutro? outro;

  StreamingResponse({
    required this.headers,
    required this.sources,
    required this.subtitles,
    this.download,
    this.intro,
    this.outro,
  });

  factory StreamingResponse.fromJson(Map<String, dynamic> json) {
    final headersJson = json['headers'];
    final headers = <String, String>{};
    if (headersJson is Map<String, dynamic>) {
      headers.addAll(headersJson.map((key, value) => MapEntry(key, '$value')));
    }
    return StreamingResponse(
      headers: headers,
      sources: (json['sources'] as List<dynamic>?)
              ?.map((e) => StreamingSource.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      subtitles: (json['subtitles'] as List<dynamic>?)
              ?.map((e) => SubtitleTrack.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      download: json['download'] as String?,
      intro: json['intro'] is Map
          ? IntroOutro.fromJson(json['intro'] as Map<String, dynamic>)
          : null,
      outro: json['outro'] is Map
          ? IntroOutro.fromJson(json['outro'] as Map<String, dynamic>)
          : null,
    );
  }
}

class IntroOutro {
  final double start;
  final double end;

  IntroOutro({
    required this.start,
    required this.end,
  });

  factory IntroOutro.fromJson(Map<String, dynamic> json) {
    final start = json['start'];
    final end = json['end'];
    return IntroOutro(
      start: start is num ? start.toDouble() : double.tryParse('$start') ?? 0,
      end: end is num ? end.toDouble() : double.tryParse('$end') ?? 0,
    );
  }
}
