import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/anime.dart';
import '../services/anime_api_service.dart';
import 'video_player_screen.dart';

class AnimeDetailsScreen extends StatefulWidget {
  final String animeId;

  const AnimeDetailsScreen({super.key, required this.animeId});

  @override
  State<AnimeDetailsScreen> createState() => _AnimeDetailsScreenState();
}

class _AnimeDetailsScreenState extends State<AnimeDetailsScreen> {
  final AnimeApiService _apiService = AnimeApiService();
  AnimeDetails? _animeDetails;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDetails();
  }

  Future<void> _loadDetails() async {
    setState(() => _isLoading = true);
    try {
      final details = await _apiService.getAnimeDetails(widget.animeId);
      setState(() {
        _animeDetails = details;
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading details: $e');
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_animeDetails == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Error')),
        body: const Center(child: Text('Failed to load anime details')),
      );
    }

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 300,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              title: Text(
                _animeDetails!.title,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  shadows: [
                    Shadow(
                      offset: Offset(0, 1),
                      blurRadius: 3.0,
                      color: Color.fromARGB(255, 0, 0, 0),
                    ),
                  ],
                ),
              ),
              background: Stack(
                fit: StackFit.expand,
                children: [
                  CachedNetworkImage(
                    imageUrl: _animeDetails!.image,
                    fit: BoxFit.cover,
                    placeholder: (context, url) => Container(
                      color: Colors.grey[800],
                    ),
                    errorWidget: (context, url, error) => Container(
                      color: Colors.grey[800],
                      child: const Icon(Icons.error),
                    ),
                  ),
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.transparent,
                          Colors.black.withValues(alpha: 0.7),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Chip(
                        label: Text(_animeDetails!.type),
                        backgroundColor: Colors.blue,
                      ),
                      const SizedBox(width: 8),
                      Chip(
                        label: Text(_animeDetails!.status),
                        backgroundColor: Colors.green,
                      ),
                      if (_animeDetails!.rating != null) ...[
                        const SizedBox(width: 8),
                        Chip(
                          label: Text('★ ${_animeDetails!.rating}'),
                          backgroundColor: Colors.orange,
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 16),
                  if (_animeDetails!.japaneseTitle.isNotEmpty) ...[
                    Text(
                      _animeDetails!.japaneseTitle,
                      style: const TextStyle(
                        fontSize: 14,
                        fontStyle: FontStyle.italic,
                        color: Colors.grey,
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                  Text(
                    _animeDetails!.description,
                    style: const TextStyle(
                      fontSize: 14,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (_animeDetails!.genres.isNotEmpty) ...[
                    const Text(
                      'Genres',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _animeDetails!.genres
                          .map((genre) => Chip(label: Text(genre)))
                          .toList(),
                    ),
                    const SizedBox(height: 24),
                  ],
                  const Text(
                    'Episodes',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (_animeDetails!.episodes.isEmpty)
                    const Text('No episodes available')
                  else
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 4,
                        crossAxisSpacing: 8,
                        mainAxisSpacing: 8,
                        childAspectRatio: 1.5,
                      ),
                      itemCount: _animeDetails!.episodes.length,
                      itemBuilder: (context, index) {
                        final episode = _animeDetails!.episodes[index];
                        return ElevatedButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => VideoPlayerScreen(
                                  episodeId: episode.id,
                                  episodeNumber: episode.number,
                                  animeTitle: _animeDetails!.title,
                                ),
                              ),
                            );
                          },
                          child: Text('${episode.number}'),
                        );
                      },
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
