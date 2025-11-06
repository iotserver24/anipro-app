import 'package:flutter/material.dart';

import '../models/anime_result.dart';
import '../models/episode.dart';
import '../screens/video_player_screen.dart';
import 'focusable_anime_card.dart';

class EpisodeTile extends StatelessWidget {
  final Episode episode;
  final AnimeResult anime;

  const EpisodeTile({super.key, required this.episode, required this.anime});

  @override
  Widget build(BuildContext context) {
    return FocusableAnimeCard(
      borderRadius: 8,
      onPressed: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => VideoPlayerScreen(
              episode: episode,
              anime: anime,
            ),
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: Theme.of(context).colorScheme.primary,
              child: Text(
                episode.number.toString(),
                style: const TextStyle(color: Colors.white),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    episode.title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (episode.isSubbed)
                        _buildTag('SUB', Colors.blue, context),
                      if (episode.isDubbed)
                        Padding(
                          padding: const EdgeInsets.only(left: 8),
                          child: _buildTag('DUB', Colors.orange, context),
                        ),
                      if (episode.isFiller == true)
                        Padding(
                          padding: const EdgeInsets.only(left: 8),
                          child: _buildTag('FILLER', Colors.grey, context),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            const Icon(Icons.play_arrow_rounded, size: 28),
          ],
        ),
      ),
    );
  }

  Widget _buildTag(String label, Color color, BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.9),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: Theme.of(context)
            .textTheme
            .labelSmall
            ?.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
      ),
    );
  }
}
