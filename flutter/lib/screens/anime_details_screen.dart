import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../models/anime_details.dart';
import '../models/anime_result.dart';
import '../services/anime_api_service.dart';
import '../widgets/anime_list.dart';
import '../widgets/episode_tile.dart';

class AnimeDetailsScreen extends StatefulWidget {
  final String animeId;

  const AnimeDetailsScreen({super.key, required this.animeId});

  @override
  State<AnimeDetailsScreen> createState() => _AnimeDetailsScreenState();
}

class _AnimeDetailsScreenState extends State<AnimeDetailsScreen> {
  final AnimeApiService _apiService = AnimeApiService();
  AnimeDetails? _details;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadDetails();
  }

  Future<void> _loadDetails() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final details = await _apiService.getAnimeDetails(widget.animeId);
      if (details == null) {
        setState(() {
          _errorMessage = 'Failed to load anime details';
          _isLoading = false;
        });
        return;
      }

      if (mounted) {
        setState(() {
          _details = details;
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'An error occurred while loading details';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Anime Details'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_errorMessage!),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadDetails,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : _details == null
                  ? const Center(child: Text('No details available'))
                  : _buildContent(context),
    );
  }

  Widget _buildContent(BuildContext context) {
    final details = _details!;
    final animeResult = AnimeResult(
      id: details.id,
      title: details.title,
      url: details.url,
      image: details.image,
      japaneseTitle: details.japaneseTitle,
      type: details.type,
      sub: details.hasSub ? details.totalEpisodes : 0,
      dub: details.hasDub ? details.totalEpisodes : 0,
      episodes: details.totalEpisodes,
      duration: null,
      nsfw: null,
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        final isLargeScreen = constraints.maxWidth > 900;
        final content = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (isLargeScreen)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildPoster(context, width: 260, height: 360),
                  const SizedBox(width: 24),
                  Expanded(child: _buildDetails(context, animeResult)),
                ],
              )
            else ...[
              Center(child: _buildPoster(context, width: 200, height: 300)),
              const SizedBox(height: 16),
              _buildDetails(context, animeResult),
            ],
            const SizedBox(height: 24),
            Text(
              'Episodes',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: details.episodes.length,
              itemBuilder: (context, index) {
                final episode = details.episodes[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: EpisodeTile(
                    episode: episode,
                    anime: animeResult,
                  ),
                );
              },
            ),
            if ((details.recommendations ?? []).isNotEmpty) ...[
              const SizedBox(height: 24),
              Text(
                'Recommendations',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 12),
              AnimeList(
                animeList: (details.recommendations ?? [])
                    .map(
                      (rec) => AnimeResult(
                        id: rec.id,
                        title: rec.title,
                        url: '',
                        image: rec.image,
                        japaneseTitle: '',
                        type: rec.type,
                        sub: 0,
                        dub: 0,
                        episodes: rec.episodes,
                        duration: null,
                        nsfw: null,
                      ),
                    )
                    .toList(),
              ),
            ],
          ],
        );

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: content,
        );
      },
    );
  }

  Widget _buildPoster(BuildContext context, {required double width, required double height}) {
    final details = _details!;
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: CachedNetworkImage(
        imageUrl: details.image,
        width: width,
        height: height,
        fit: BoxFit.cover,
        placeholder: (context, url) => Container(
          width: width,
          height: height,
          alignment: Alignment.center,
          color: Colors.grey[800],
          child: const CircularProgressIndicator(),
        ),
        errorWidget: (context, url, error) => Container(
          width: width,
          height: height,
          color: Colors.grey[800],
          child: const Icon(Icons.broken_image, size: 48),
        ),
      ),
    );
  }

  Widget _buildDetails(BuildContext context, AnimeResult anime) {
    final details = _details!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          details.title,
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _buildChip('Type: ${details.type}'),
            _buildChip('Status: ${details.status}'),
            if (details.genres.isNotEmpty)
              ...details.genres.map(_buildChip),
          ],
        ),
        const SizedBox(height: 16),
        Text(
          details.description,
          style: const TextStyle(fontSize: 16, height: 1.4),
        ),
      ],
    );
  }

  Widget _buildChip(String label) {
    return Chip(
      label: Text(label),
      backgroundColor: Colors.blueGrey[800],
    );
  }
}
