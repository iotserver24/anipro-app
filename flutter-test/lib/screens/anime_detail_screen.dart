import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../config/app_config.dart';
import '../models/anime_models.dart';
import '../services/api_service.dart';
import 'video_player_screen.dart';

class AnimeDetailScreen extends StatefulWidget {
  final String animeId;

  const AnimeDetailScreen({super.key, required this.animeId});

  @override
  State<AnimeDetailScreen> createState() => _AnimeDetailScreenState();
}

class _AnimeDetailScreenState extends State<AnimeDetailScreen> {
  final ApiService _apiService = ApiService();
  AnimeDetails? _animeDetails;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadAnimeDetails();
  }

  Future<void> _loadAnimeDetails() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final details = await _apiService.getAnimeDetails(widget.animeId);
      setState(() {
        _animeDetails = details;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load anime details';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(_error!),
                      ElevatedButton(
                        onPressed: _loadAnimeDetails,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : _buildContent(),
    );
  }

  Widget _buildContent() {
    if (_animeDetails == null) return const SizedBox();

    return CustomScrollView(
      slivers: [
        // App Bar with Image
        SliverAppBar(
          expandedHeight: 300,
          pinned: true,
          flexibleSpace: FlexibleSpaceBar(
            title: Text(
              _animeDetails!.title,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                shadows: [
                  Shadow(
                    color: Colors.black,
                    blurRadius: 10,
                  ),
                ],
              ),
            ),
            background: Stack(
              fit: StackFit.expand,
              children: [
                Hero(
                  tag: 'anime_${widget.animeId}',
                  child: CachedNetworkImage(
                    imageUrl: _animeDetails!.image,
                    fit: BoxFit.cover,
                    placeholder: (context, url) => Container(
                      color: const Color(AppConfig.cardColor),
                    ),
                    errorWidget: (context, url, error) => Container(
                      color: const Color(AppConfig.cardColor),
                      child: const Icon(Icons.broken_image, size: 50),
                    ),
                  ),
                ),
                Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        Colors.black.withOpacity(0.8),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        
        // Content
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Action Buttons
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _animeDetails!.episodes.isNotEmpty
                            ? () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => VideoPlayerScreen(
                                      episodeId: _animeDetails!.episodes.first.id,
                                      episodeTitle: _animeDetails!.episodes.first.title,
                                    ),
                                  ),
                                );
                              }
                            : null,
                        icon: const Icon(Icons.play_arrow),
                        label: const Text('Play'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    IconButton(
                      onPressed: () {
                        // Add to list
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Added to My List')),
                        );
                      },
                      icon: const Icon(Icons.add),
                      style: IconButton.styleFrom(
                        backgroundColor: const Color(AppConfig.cardColor),
                      ),
                    ),
                    IconButton(
                      onPressed: () {
                        // Share
                      },
                      icon: const Icon(Icons.share),
                      style: IconButton.styleFrom(
                        backgroundColor: const Color(AppConfig.cardColor),
                      ),
                    ),
                  ],
                ),
                
                const SizedBox(height: 20),
                
                // Info Row
                Wrap(
                  spacing: 12,
                  runSpacing: 8,
                  children: [
                    _buildInfoChip(_animeDetails!.type),
                    _buildInfoChip(_animeDetails!.status),
                    if (_animeDetails!.season != null)
                      _buildInfoChip(_animeDetails!.season!),
                    _buildInfoChip('${_animeDetails!.totalEpisodes} Episodes'),
                  ],
                ),
                
                const SizedBox(height: 20),
                
                // Genres
                if (_animeDetails!.genres.isNotEmpty) ...[
                  Text(
                    'Genres',
                    style: Theme.of(context).textTheme.displaySmall,
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _animeDetails!.genres
                        .map((genre) => Chip(
                              label: Text(genre),
                              backgroundColor: const Color(AppConfig.cardColor),
                            ))
                        .toList(),
                  ),
                  const SizedBox(height: 20),
                ],
                
                // Description
                Text(
                  'Description',
                  style: Theme.of(context).textTheme.displaySmall,
                ),
                const SizedBox(height: 8),
                Text(
                  _animeDetails!.description,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                
                const SizedBox(height: 20),
                
                // Episodes List
                Text(
                  'Episodes',
                  style: Theme.of(context).textTheme.displaySmall,
                ),
                const SizedBox(height: 12),
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _animeDetails!.episodes.length,
                  itemBuilder: (context, index) {
                    final episode = _animeDetails!.episodes[index];
                    return _buildEpisodeCard(episode);
                  },
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildInfoChip(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(AppConfig.cardColor),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildEpisodeCard(Episode episode) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: const Color(AppConfig.cardColor),
      child: ListTile(
        leading: Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            color: const Color(AppConfig.primaryColor),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Center(
            child: Text(
              episode.number.toString(),
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ),
        ),
        title: Text(episode.title),
        trailing: const Icon(Icons.play_circle_outline),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => VideoPlayerScreen(
                episodeId: episode.id,
                episodeTitle: episode.title,
              ),
            ),
          );
        },
      ),
    );
  }
}
