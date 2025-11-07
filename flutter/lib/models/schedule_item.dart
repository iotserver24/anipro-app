class ScheduleItem {
  final String id;
  final String time;
  final String name;
  final String jname;
  final int airingTimestamp;
  final int secondsUntilAiring;
  final int episode;
  final String bannerUrl;
  final String bannerType;

  ScheduleItem({
    required this.id,
    required this.time,
    required this.name,
    required this.jname,
    required this.airingTimestamp,
    required this.secondsUntilAiring,
    required this.episode,
    required this.bannerUrl,
    required this.bannerType,
  });

  factory ScheduleItem.fromJson(Map<String, dynamic> json) {
    return ScheduleItem(
      id: json['id'] ?? '',
      time: json['time'] ?? '',
      name: json['name'] ?? '',
      jname: json['jname'] ?? '',
      airingTimestamp: json['airingTimestamp'] ?? 0,
      secondsUntilAiring: json['secondsUntilAiring'] ?? 0,
      episode: json['episode'] ?? 0,
      bannerUrl: json['bannerUrl'] ?? '',
      bannerType: json['bannerType'] ?? 'poster',
    );
  }
}

