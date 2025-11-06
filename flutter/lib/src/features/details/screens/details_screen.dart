import 'package:flutter/material.dart';
import '../../../models/anime_details.dart';
import '../../../state/anime_repository.dart';

class DetailsScreen extends StatefulWidget {
  const DetailsScreen({required this.animeId, super.key});

  final String animeId;

  @override
  State<DetailsScreen> createState() => _DetailsScreenState();
}

class _DetailsScreenState extends State<DetailsScreen> {
  final AnimeRepository _repository = AnimeRepository();
  AnimeDetails? _details;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDetails();
  }

  Future<void> _loadDetails() async {
    setState(() => _isLoading = true);
    final details = await _repository.loadDetails(widget.animeId);
    setState(() {
      _details = details;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Loading...')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_details == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Error')),
        body: const Center(
          child: Text('Failed to load anime details.'),
        ),
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
                _details!.title,
                style: const TextStyle(
                  shadows: [
                    Shadow(
                      color: Colors.black87,
                      blurRadius: 8,
                    ),
                  ],
                ),
              ),
              background: _details!.image.isNotEmpty
                  ? Image.network(_details!.image, fit: BoxFit.cover)
                  : Container(color: Colors.grey),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.all(16.0),
            sliver: SliverList(
              delegate: SliverChildListDelegate(
                [
                  const SizedBox(height: 8),
                  Text(
                    _details!.description,
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    children: [
                      Chip(label: Text(_details!.type)),
                      Chip(label: Text(_details!.status)),
                      Chip(label: Text('${_details!.totalEpisodes} episodes')),
                    ],
                  ),
                  const SizedBox(height: 16),
                  if (_details!.genres.isNotEmpty) ...[
                    Text(
                      'Genres',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _details!.genres
                          .map((g) => Chip(label: Text(g)))
                          .toList(),
                    ),
                    const SizedBox(height: 16),
                  ],
                  if (_details!.episodes.isNotEmpty) ...[
                    Text(
                      'Episodes',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    ..._details!.episodes.map((ep) {
                      return ListTile(
                        leading: CircleAvatar(
                          child: Text('${ep.number}'),
                        ),
                        title: Text(ep.title),
                        trailing: const Icon(Icons.play_arrow),
                        onTap: () {
                          Navigator.of(context).pushNamed(
                            '/player',
                            arguments: ep.id,
                          );
                        },
                      );
                    }),
                  ],
                  const SizedBox(height: 24),
                  if (_details!.recommendations.isNotEmpty) ...[
                    Text(
                      'Recommendations',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      height: 200,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _details!.recommendations.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 12),
                        itemBuilder: (context, index) {
                          final rec = _details!.recommendations[index];
                          return SizedBox(
                            width: 140,
                            child: GestureDetector(
                              onTap: () {
                                Navigator.of(context).pushReplacementNamed(
                                  '/details',
                                  arguments: rec.id,
                                );
                              },
                              child: Column(
                                children: [
                                  Expanded(
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(8),
                                      child: Image.network(
                                        rec.image,
                                        fit: BoxFit.cover,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    rec.title,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: Theme.of(context).textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
