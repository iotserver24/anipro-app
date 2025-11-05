import 'package:flutter/material.dart';
import '../models/anime_models.dart';
import 'anime_card.dart';

class AnimeListSection extends StatelessWidget {
  final String title;
  final List<AnimeResult> animeList;
  final bool isLoading;
  final Function(AnimeResult) onTap;

  const AnimeListSection({
    super.key,
    required this.title,
    required this.animeList,
    required this.isLoading,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.displaySmall,
              ),
              TextButton(
                onPressed: () {
                  // Navigate to see all
                },
                child: const Text('See All'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 240,
          child: isLoading
              ? _buildLoadingList()
              : animeList.isEmpty
                  ? _buildEmptyState(context)
                  : ListView.builder(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: animeList.length,
                      itemBuilder: (context, index) {
                        final anime = animeList[index];
                        return AnimeCard(
                          anime: anime,
                          onTap: () => onTap(anime),
                        );
                      },
                    ),
        ),
      ],
    );
  }

  Widget _buildLoadingList() {
    return ListView.builder(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: 5,
      itemBuilder: (context, index) {
        return Container(
          width: 150,
          height: 220,
          margin: const EdgeInsets.only(right: 12),
          decoration: BoxDecoration(
            color: Colors.grey[800],
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Center(
            child: CircularProgressIndicator(),
          ),
        );
      },
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Text(
        'No anime available',
        style: Theme.of(context).textTheme.bodyMedium,
      ),
    );
  }
}
