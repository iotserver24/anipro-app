import 'package:flutter/material.dart';
import '../models/anime_result.dart';
import '../services/anime_api_service.dart';
import '../widgets/anime_grid.dart';
import '../widgets/anime_list.dart';
import 'search_screen.dart';
import 'watch_history_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final AnimeApiService _apiService = AnimeApiService();
  List<AnimeResult> _trending = [];
  List<AnimeResult> _recent = [];
  List<AnimeResult> _popular = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);

    final results = await Future.wait([
      _apiService.getTrendingAnime(),
      _apiService.getRecentAnime(),
      _apiService.getPopularAnime(),
    ]);

    if (mounted) {
      setState(() {
        _trending = results[0];
        _recent = results[1];
        _popular = results[2];
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Anisurge2'),
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const WatchHistoryScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const SearchScreen()),
              );
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_trending.isNotEmpty) ...[
                    const Text(
                      'Trending Now',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    AnimeList(animeList: _trending),
                    const SizedBox(height: 24),
                  ],
                  if (_recent.isNotEmpty) ...[
                    const Text(
                      'Recent Episodes',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    AnimeGrid(animeList: _recent),
                    const SizedBox(height: 24),
                  ],
                  if (_popular.isNotEmpty) ...[
                    const Text(
                      'Popular Anime',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    AnimeGrid(animeList: _popular),
                  ],
                ],
              ),
            ),
    );
  }
}
