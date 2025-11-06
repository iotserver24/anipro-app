import 'package:flutter/material.dart';
import '../../../models/anime_result.dart';
import '../../../state/anime_repository.dart';
import '../widgets/anime_list_section.dart';
import '../widgets/featured_banner.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final AnimeRepository _repository = AnimeRepository();
  bool _isLoading = true;

  List<AnimeResult> _trending = [];
  List<AnimeResult> _recent = [];
  List<AnimeResult> _popular = [];
  List<AnimeResult> _newReleases = [];
  List<AnimeResult> _latestCompleted = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);

    final results = await Future.wait([
      _repository.loadHomeSection('trending'),
      _repository.loadHomeSection('recent'),
      _repository.loadHomeSection('popular'),
      _repository.loadHomeSection('newReleases'),
      _repository.loadHomeSection('latest'),
    ]);

    setState(() {
      _trending = results[0];
      _recent = results[1];
      _popular = results[2];
      _newReleases = results[3];
      _latestCompleted = results[4];
      _isLoading = false;
    });
  }

  void _openDetails(AnimeResult anime) {
    Navigator.of(context).pushNamed('/details', arguments: anime.id);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AniSurge'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {
              Navigator.of(context).pushNamed('/search');
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(16.0),
                children: [
                  if (_trending.isNotEmpty)
                    FeaturedBanner(
                      anime: _trending.first,
                      onPlay: () => _openDetails(_trending.first),
                    ),
                  const SizedBox(height: 24),
                  if (_trending.isNotEmpty)
                    AnimeListSection(
                      title: 'Trending Now',
                      animeList: _trending,
                      onTap: _openDetails,
                    ),
                  const SizedBox(height: 24),
                  if (_recent.isNotEmpty)
                    AnimeListSection(
                      title: 'Recent Episodes',
                      animeList: _recent,
                      onTap: _openDetails,
                    ),
                  const SizedBox(height: 24),
                  if (_popular.isNotEmpty)
                    AnimeListSection(
                      title: 'Popular Anime',
                      animeList: _popular,
                      onTap: _openDetails,
                    ),
                  const SizedBox(height: 24),
                  if (_newReleases.isNotEmpty)
                    AnimeListSection(
                      title: 'New Releases',
                      animeList: _newReleases,
                      onTap: _openDetails,
                    ),
                  const SizedBox(height: 24),
                  if (_latestCompleted.isNotEmpty)
                    AnimeListSection(
                      title: 'Latest Completed',
                      animeList: _latestCompleted,
                      onTap: _openDetails,
                    ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
    );
  }
}
