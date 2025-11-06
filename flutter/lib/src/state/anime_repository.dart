import '../models/anime_details.dart';
import '../models/anime_result.dart';
import '../models/streaming_response.dart';
import '../services/anime_service.dart';

class AnimeRepository {
  AnimeRepository({AnimeService? service})
      : _service = service ?? AnimeService();

  final AnimeService _service;

  Future<List<AnimeResult>> loadHomeSection(String section) {
    switch (section) {
      case 'trending':
        return _service.getTrending();
      case 'recent':
        return _service.getRecentAnime();
      case 'newReleases':
        return _service.getNewReleases();
      case 'popular':
        return _service.getPopularAnime();
      case 'latest':
        return _service.getLatestCompleted();
      case 'favorites':
        return _service.getFavoriteAnime();
      default:
        return Future.value(<AnimeResult>[]);
    }
  }

  Future<List<String>> loadGenres() => _service.getGenreList();

  Future<List<AnimeResult>> loadGenre(String genre) =>
      _service.getAnimeByGenre(genre);

  Future<List<AnimeResult>> search(String query) =>
      _service.searchAnime(query);

  Future<AnimeDetails?> loadDetails(String id) =>
      _service.getAnimeDetails(id);

  Future<StreamingResponse?> loadEpisodeSources(String episodeId,
          {bool isDub = false}) =>
      _service.getEpisodeSources(episodeId, isDub: isDub);
}
