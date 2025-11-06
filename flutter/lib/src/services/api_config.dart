class ApiConfig {
  static const String baseUrl = 'https://con.anisurge.me/anime/zoro';

  static Uri endpoint(String path, {Map<String, String>? queryParameters}) {
    final String trimmedPath = path.startsWith('/') ? path.substring(1) : path;
    return Uri.parse('$baseUrl/$trimmedPath').replace(
      queryParameters: queryParameters,
    );
  }
}
