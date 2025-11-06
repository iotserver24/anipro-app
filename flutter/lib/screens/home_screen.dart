import 'package:flutter/material.dart';
import '../models/anime.dart';
import '../services/anime_api_service.dart';
import '../widgets/anime_card.dart';
import 'anime_details_screen.dart';
import 'search_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final AnimeApiService _apiService = AnimeApiService();
  List<AnimeResult> _trendingAnime = [];
  List<AnimeResult> _recentAnime = [];
  List<AnimeResult> _popularAnime = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final trending = await _apiService.getTrending();
      final recent = await _apiService.getRecentAnime();
      final popular = await _apiService.getPopularAnime();

      setState(() {
        _trendingAnime = trending;
        _recentAnime = recent;
        _popularAnime = popular;
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading data: $e');
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'AniSurge',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 24,
          ),
        ),
        actions: [
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
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSection('Trending Now', _trendingAnime),
                    _buildSection('Recent Episodes', _recentAnime),
                    _buildSection('Popular', _popularAnime),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildSection(String title, List<AnimeResult> animeList) {
    if (animeList.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        SizedBox(
          height: 240,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: animeList.length,
            itemBuilder: (context, index) {
              return AnimeCard(
                anime: animeList[index],
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => AnimeDetailsScreen(
                        animeId: animeList[index].id,
                      ),
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }
}
