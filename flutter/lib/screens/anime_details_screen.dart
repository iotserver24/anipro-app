import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:readmore/readmore.dart';
import 'package:share_plus/share_plus.dart';
import '../models/anime.dart';
import '../models/my_list_item.dart';
import '../services/anime_api_service.dart';
import '../providers/my_list_provider.dart';
import '../widgets/comments_section.dart';
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
  bool _isBookmarked = false;
  bool _isSubbed = true;

  @override
  void initState() {
    super.initState();
    _loadDetails();
    _checkBookmarkStatus();
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

  Future<void> _checkBookmarkStatus() async {
    final myListProvider = Provider.of<MyListProvider>(context, listen: false);
    final isBookmarked = await myListProvider.isBookmarked(widget.animeId);
    setState(() {
      _isBookmarked = isBookmarked;
    });
  }

  Future<void> _toggleBookmark() async {
    final myListProvider = Provider.of<MyListProvider>(context, listen: false);
    
    if (_isBookmarked) {
      await myListProvider.removeAnime(widget.animeId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Removed from My List')),
        );
      }
    } else {
      if (_animeDetails != null) {
        await myListProvider.addAnime(MyListItem.fromAnimeResult(_animeDetails!));
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Added to My List')),
          );
        }
      }
    }
    
    setState(() {
      _isBookmarked = !_isBookmarked;
    });
  }

  List<Episode> get _filteredEpisodes {
    if (_animeDetails == null) return [];
    return _animeDetails!.episodes.where((episode) {
      return _isSubbed ? episode.isSubbed : episode.isDubbed;
    }).toList();
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
            actions: [
              IconButton(
                icon: Icon(_isBookmarked ? Icons.bookmark : Icons.bookmark_border),
                onPressed: _toggleBookmark,
              ),
              IconButton(
                icon: const Icon(Icons.share),
                onPressed: () {
                  Share.share('Check out ${_animeDetails!.title} on AniSurge!');
                },
              ),
            ],
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
                  ReadMoreText(
                    _animeDetails!.description,
                    trimLines: 4,
                    colorClickableText: const Color(0xFF6C63FF),
                    trimMode: TrimMode.Line,
                    trimCollapsedText: 'Show more',
                    trimExpandedText: 'Show less',
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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Episodes',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (_animeDetails!.hasSub && _animeDetails!.hasDub)
                        ToggleButtons(
                          isSelected: [_isSubbed, !_isSubbed],
                          onPressed: (index) {
                            setState(() {
                              _isSubbed = index == 0;
                            });
                          },
                          borderRadius: BorderRadius.circular(8),
                          selectedColor: Colors.white,
                          fillColor: const Color(0xFF6C63FF),
                          color: Colors.grey,
                          constraints: const BoxConstraints(
                            minHeight: 32,
                            minWidth: 60,
                          ),
                          children: const [
                            Padding(
                              padding: EdgeInsets.symmetric(horizontal: 12),
                              child: Text('Sub'),
                            ),
                            Padding(
                              padding: EdgeInsets.symmetric(horizontal: 12),
                              child: Text('Dub'),
                            ),
                          ],
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (_filteredEpisodes.isEmpty)
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
                      itemCount: _filteredEpisodes.length,
                      itemBuilder: (context, index) {
                        final episode = _filteredEpisodes[index];
                        return ElevatedButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => VideoPlayerScreen(
                                  episodeId: episode.id,
                                  episodeNumber: episode.number,
                                  animeTitle: _animeDetails!.title,
                                  animeId: widget.animeId,
                                  animeImage: _animeDetails!.image,
                                  isDub: !_isSubbed,
                                ),
                              ),
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: episode.isFiller == true
                                ? Colors.orange.withValues(alpha: 0.3)
                                : const Color(0xFF1F1F1F),
                          ),
                          child: Text(
                            '${episode.number}',
                            style: TextStyle(
                              color: episode.isFiller == true
                                  ? Colors.orange
                                  : Colors.white,
                            ),
                          ),
                        );
                      },
                    ),
                  const SizedBox(height: 24),
                  CommentsSection(animeId: widget.animeId),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
