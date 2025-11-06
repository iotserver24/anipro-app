import 'package:flutter/material.dart';
import '../../../models/anime_result.dart';
import '../../../utils/remote_controls.dart';

class AnimeListSection extends StatelessWidget {
  const AnimeListSection({
    required this.title,
    required this.animeList,
    this.onTap,
    super.key,
  });

  final String title;
  final List<AnimeResult> animeList;
  final void Function(AnimeResult anime)? onTap;

  @override
  Widget build(BuildContext context) {
    final RemoteFocusController focusController =
        RemoteFocusController();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 240,
          child: RemoteScaffold(
            focusController: focusController,
            onBack: () {
              Navigator.of(context).maybePop();
            },
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: animeList.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final anime = animeList[index];
                return SizedBox(
                  width: 160,
                  child: RemoteFocusable(
                    focusController: focusController,
                    onPressed: () => onTap?.call(anime),
                    child: _AnimeCard(anime: anime),
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}

class _AnimeCard extends StatelessWidget {
  const _AnimeCard({required this.anime});

  final AnimeResult anime;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: AspectRatio(
              aspectRatio: 2 / 3,
              child: anime.image.isNotEmpty
                  ? Image.network(
                      anime.image,
                      fit: BoxFit.cover,
                    )
                  : Container(
                      color: Colors.grey.shade800,
                      child: const Center(
                        child: Icon(Icons.image_not_supported),
                      ),
                    ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          anime.title,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 4),
        Text(
          '${anime.type} • ${anime.episodes} eps',
          style: Theme.of(context)
              .textTheme
              .labelSmall
              ?.copyWith(color: Colors.grey),
        ),
      ],
    );
  }
}
