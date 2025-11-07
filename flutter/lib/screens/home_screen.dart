import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

  // Focus nodes for TV navigation
  final Map<String, FocusNode> _focusNodes = {};
  final Map<String, ScrollController> _scrollControllers = {};

  @override
  void initState() {
    super.initState();
    _loadData();
    _initializeFocusNodes();
  }

  void _initializeFocusNodes() {
    _focusNodes['trending'] = FocusNode();
    _focusNodes['continue'] = FocusNode();
    _focusNodes['recent'] = FocusNode();
    _focusNodes['popular'] = FocusNode();
    _focusNodes['completed'] = FocusNode();
    
    _scrollControllers['trending'] = ScrollController();
    _scrollControllers['continue'] = ScrollController();
    _scrollControllers['recent'] = ScrollController();
    _scrollControllers['popular'] = ScrollController();
    _scrollControllers['completed'] = ScrollController();
  }

  @override
  void dispose() {
    _focusNodes.values.forEach((node) => node.dispose());
    _scrollControllers.values.forEach((controller) => controller.dispose());
    super.dispose();
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
              child: FocusScope(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (_trendingAnime.isNotEmpty)
                        _buildTrendingCarousel(),
                      if (continueWatching.isNotEmpty)
                        _buildContinueWatching(continueWatching),
                      _buildSection('Recent Episodes', _recentAnime, 'recent'),
                      _buildSection('Popular', _popularAnime, 'popular'),
                      _buildSection('Latest Completed', _latestCompleted, 'completed'),
                    ],
                  ),
                ),
              ),
            ),
    );
  }

  Widget _buildTrendingCarousel() {
    return Focus(
      focusNode: _focusNodes['trending'],
      child: Column(
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
              return Focus(
                onKeyEvent: (node, event) {
                  if (event is KeyDownEvent) {
                    if (event.logicalKey == LogicalKeyboardKey.arrowRight &&
                        index < _trendingAnime.length - 1) {
                      return KeyEventResult.handled;
                    }
                    if (event.logicalKey == LogicalKeyboardKey.arrowLeft &&
                        index > 0) {
                      return KeyEventResult.handled;
                    }
                  }
                  return KeyEventResult.ignored;
                },
                child: GestureDetector(
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
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: _focusNodes['trending']?.hasFocus == true
                          ? Border.all(color: const Color(0xFF6C63FF), width: 3)
                          : null,
                    ),
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
      ),
    );
  }

  Widget _buildContinueWatching(List<WatchHistoryItem> history) {
    return Focus(
      focusNode: _focusNodes['continue'],
      child: Column(
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
              controller: _scrollControllers['continue'],
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: history.length,
              itemBuilder: (context, index) {
                final item = history[index];
                final progress = item.duration > 0
                    ? item.progress / item.duration
                    : 0.0;

                return Focus(
                  onKeyEvent: (node, event) {
                    if (event is KeyDownEvent) {
                      if (event.logicalKey == LogicalKeyboardKey.arrowRight) {
                        _scrollControllers['continue']?.animateTo(
                          _scrollControllers['continue']!.offset + 160,
                          duration: const Duration(milliseconds: 200),
                          curve: Curves.easeOut,
                        );
                        return KeyEventResult.handled;
                      }
                      if (event.logicalKey == LogicalKeyboardKey.arrowLeft) {
                        _scrollControllers['continue']?.animateTo(
                          _scrollControllers['continue']!.offset - 160,
                          duration: const Duration(milliseconds: 200),
                          curve: Curves.easeOut,
                        );
                        return KeyEventResult.handled;
                      }
                      if (event.logicalKey == LogicalKeyboardKey.select ||
                          event.logicalKey == LogicalKeyboardKey.enter) {
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
                        return KeyEventResult.handled;
                      }
                    }
                    return KeyEventResult.ignored;
                  },
                  child: Builder(
                    builder: (context) {
                      final hasFocus = Focus.of(context).hasFocus;
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
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(8),
                            border: hasFocus
                                ? Border.all(color: const Color(0xFF6C63FF), width: 3)
                                : null,
                          ),
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
                );
              },
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildSection(String title, List<AnimeResult> animeList, String key) {
    if (animeList.isEmpty) {
      return const SizedBox.shrink();
    }

    return Focus(
      focusNode: _focusNodes[key],
      child: Column(
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
              controller: _scrollControllers[key],
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: animeList.length,
              itemBuilder: (context, index) {
                return Focus(
                  onKeyEvent: (node, event) {
                    if (event is KeyDownEvent) {
                      if (event.logicalKey == LogicalKeyboardKey.arrowRight) {
                        _scrollControllers[key]?.animateTo(
                          _scrollControllers[key]!.offset + 120,
                          duration: const Duration(milliseconds: 200),
                          curve: Curves.easeOut,
                        );
                        return KeyEventResult.handled;
                      }
                      if (event.logicalKey == LogicalKeyboardKey.arrowLeft) {
                        _scrollControllers[key]?.animateTo(
                          _scrollControllers[key]!.offset - 120,
                          duration: const Duration(milliseconds: 200),
                          curve: Curves.easeOut,
                        );
                        return KeyEventResult.handled;
                      }
                      if (event.logicalKey == LogicalKeyboardKey.select ||
                          event.logicalKey == LogicalKeyboardKey.enter) {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => AnimeDetailsScreen(
                              animeId: animeList[index].id,
                            ),
                          ),
                        );
                        return KeyEventResult.handled;
                      }
                    }
                    return KeyEventResult.ignored;
                  },
                  child: Builder(
                    builder: (context) {
                      final hasFocus = Focus.of(context).hasFocus;
                      return Container(
                        margin: const EdgeInsets.only(right: 8),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(8),
                          border: hasFocus
                              ? Border.all(color: const Color(0xFF6C63FF), width: 3)
                              : null,
                        ),
                        child: AnimeCard(
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
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}
