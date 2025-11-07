class GalleryItem {
  final String id;
  final String type; // 'waifu' or 'husbando'
  final String title;
  final String url;
  final String createdAt;
  final double? height;
  final String? mediaType; // 'image', 'video', 'gif'

  GalleryItem({
    required this.id,
    required this.type,
    required this.title,
    required this.url,
    required this.createdAt,
    this.height,
    this.mediaType,
  });

  factory GalleryItem.fromMap(Map<String, dynamic> map) {
    return GalleryItem(
      id: map['id'] ?? '',
      type: map['type'] ?? 'waifu',
      title: map['title'] ?? '',
      url: map['url'] ?? '',
      createdAt: map['createdAt'] ?? '',
      height: map['height']?.toDouble(),
      mediaType: map['mediaType'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'type': type,
      'title': title,
      'url': url,
      'createdAt': createdAt,
      if (height != null) 'height': height,
      if (mediaType != null) 'mediaType': mediaType,
    };
  }
}

