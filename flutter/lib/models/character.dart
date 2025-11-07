class Character {
  final String id;
  final String name;
  final String anime;
  final String avatar;
  final String primaryColor;
  final String secondaryColor;
  final String systemPrompt;
  final String greeting;
  final String model;
  final List<String> features;
  final List<String> personalityTags;
  final bool isPersonal;
  final String? createdBy;

  Character({
    required this.id,
    required this.name,
    required this.anime,
    required this.avatar,
    required this.primaryColor,
    required this.secondaryColor,
    required this.systemPrompt,
    required this.greeting,
    required this.model,
    required this.features,
    required this.personalityTags,
    this.isPersonal = false,
    this.createdBy,
  });

  factory Character.fromMap(Map<String, dynamic> map) {
    return Character(
      id: map['id'] ?? '',
      name: map['name'] ?? '',
      anime: map['anime'] ?? '',
      avatar: map['avatar'] ?? '',
      primaryColor: map['primaryColor'] ?? '#6C63FF',
      secondaryColor: map['secondaryColor'] ?? '#03DAC6',
      systemPrompt: map['systemPrompt'] ?? '',
      greeting: map['greeting'] ?? '',
      model: map['model'] ?? 'mistral',
      features: List<String>.from(map['features'] ?? []),
      personalityTags: List<String>.from(map['personalityTags'] ?? []),
      isPersonal: map['isPersonal'] ?? false,
      createdBy: map['createdBy'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'anime': anime,
      'avatar': avatar,
      'primaryColor': primaryColor,
      'secondaryColor': secondaryColor,
      'systemPrompt': systemPrompt,
      'greeting': greeting,
      'model': model,
      'features': features,
      'personalityTags': personalityTags,
      'isPersonal': isPersonal,
      if (createdBy != null) 'createdBy': createdBy,
    };
  }
}

