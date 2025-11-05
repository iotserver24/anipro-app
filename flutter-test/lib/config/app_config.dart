/// Application configuration
class AppConfig {
  // App Information
  static const String appName = 'AniSurge';
  static const String appVersion = '2.26.6';
  static const int versionCode = 4;
  
  // Environment
  static const String environment = 'production';
  
  // API Configuration
  static const String apiBaseUrl = 'https://anisurge.me/api';
  static const String animeApiBaseUrl = 'https://con.anisurge.me/anime/zoro';
  
  // API Endpoints
  static const String recentEpisodesEndpoint = '/recent-episodes';
  static const String trendingEndpoint = '/top-airing';
  static const String popularEndpoint = '/most-popular';
  static const String favoriteEndpoint = '/most-favorite';
  static const String latestCompletedEndpoint = '/latest-completed';
  static const String newReleasesEndpoint = '/recent-added';
  static const String searchEndpoint = '/:query';
  static const String infoEndpoint = '/info';
  static const String watchEndpoint = '/watch/:episodeId';
  static const String genreListEndpoint = '/genre/list';
  static const String genreEndpoint = '/genre/:genre';
  static const String moviesEndpoint = '/movies';
  static const String onaEndpoint = '/ona';
  static const String ovaEndpoint = '/ova';
  static const String specialsEndpoint = '/specials';
  static const String tvEndpoint = '/tv';
  
  // Theme Colors
  static const int primaryColor = 0xFFf4511e;
  static const int secondaryColor = 0xFF1a1a1a;
  static const int backgroundColor = 0xFF121212;
  static const int cardColor = 0xFF1F1F1F;
  
  // Contact
  static const String supportEmail = 'support@anisurge.me';
  static const String websiteUrl = 'https://anisurge.me';
  static const String downloadUrl = 'https://anisurge.me/download';
  
  // Cache Configuration
  static const Duration cacheExpiration = Duration(hours: 24);
  static const Duration newEpisodesCacheExpiration = Duration(minutes: 30);
  
  // Pagination
  static const int defaultPageSize = 20;
  
  // Deep Links
  static const String deepLinkScheme = 'anisurge';
}
