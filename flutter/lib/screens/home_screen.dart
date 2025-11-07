import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/anime.dart';
import '../models/watch_history.dart';
import '../services/anime_api_service.dart';
import '../widgets/anime_card.dart';
import '../providers/watch_history_provider.dart';
import 'anime_details_screen.dart';
import 'video_player_screen.dart';

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
  List<AnimeResult> _latestCompleted = [];
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
      final completed = await _apiService.getLatestCompleted();

      setState(() {
        _trendingAnime = trending;
        _recentAnime = recent;
        _popularAnime = popular;
        _latestCompleted = completed;
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading data: $e');
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final watchHistory = Provider.of<WatchHistoryProvider>(context);
    final continueWatching = watchHistory.history.take(10).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'AniSurge',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 24,
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_trendingAnime.isNotEmpty) _buildTrendingCarousel(),
                    if (continueWatching.isNotEmpty) _buildContinueWatching(continueWatching),
                    _buildSection('Recent Episodes', _recentAnime),
                    _buildSection('Popular', _popularAnime),
                    _buildSection('Latest Completed', _latestCompleted),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildTrendingCarousel() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.all(16.0),
          child: Text(
            'Trending Now',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        CarouselSlider.builder(
          itemCount: _trendingAnime.take(10).length,
          itemBuilder: (context, index, realIndex) {
            final anime = _trendingAnime[index];
            return GestureDetector(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => AnimeDetailsScreen(animeId: anime.id),
                  ),
                );
              },
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 8),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: CachedNetworkImage(
                        imageUrl: anime.image,
                        fit: BoxFit.cover,
                        placeholder: (context, url) => Container(
                          color: Colors.grey[800],
                          child: const Center(child: CircularProgressIndicator()),
                        ),
                        errorWidget: (context, url, error) => Container(
                          color: Colors.grey[800],
                          child: const Icon(Icons.error),
                        ),
                      ),
                    ),
                    Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            Colors.black.withValues(alpha: 0.8),
                          ],
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: 16,
                      left: 16,
                      right: 16,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            anime.title,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            anime.japaneseTitle,
                            style: TextStyle(
                              color: Colors.grey[300],
                              fontSize: 12,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
          options: CarouselOptions(
            height: 250,
            autoPlay: true,
            enlargeCenterPage: true,
            viewportFraction: 0.9,
            autoPlayInterval: const Duration(seconds: 4),
            autoPlayAnimationDuration: const Duration(milliseconds: 800),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildContinueWatching(List<WatchHistoryItem> history) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.all(16.0),
          child: Text(
            'Continue Watching',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        SizedBox(
          height: 180,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: history.length,
            itemBuilder: (context, index) {
              final item = history[index];
              final progress = item.duration > 0
                  ? item.progress / item.duration
                  : 0.0;

              return GestureDetector(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => VideoPlayerScreen(
                        episodeId: item.episodeId,
                        episodeNumber: item.episodeNumber,
                        animeTitle: item.name,
                      ),
                    ),
                  );
                },
                child: Container(
                  width: 140,
                  margin: const EdgeInsets.only(right: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Stack(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: CachedNetworkImage(
                              imageUrl: item.img,
                              height: 120,
                              width: double.infinity,
                              fit: BoxFit.cover,
                              placeholder: (context, url) => Container(
                                color: Colors.grey[800],
                                height: 120,
                              ),
                              errorWidget: (context, url, error) => Container(
                                color: Colors.grey[800],
                                height: 120,
                                child: const Icon(Icons.error),
                              ),
                            ),
                          ),
                          Positioned(
                            bottom: 0,
                            left: 0,
                            right: 0,
                            child: LinearProgressIndicator(
                              value: progress,
                              backgroundColor: Colors.black.withValues(alpha: 0.3),
                              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF6C63FF)),
                              minHeight: 3,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        item.name,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        'Episode ${item.episodeNumber}',
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey[400],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 16),
      ],
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
        const SizedBox(height: 16),
      ],
    );
  }
}
