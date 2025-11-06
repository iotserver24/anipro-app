import 'package:flutter/material.dart';
import '../models/anime_result.dart';
import 'anime_card.dart';

class AnimeGrid extends StatelessWidget {
  final List<AnimeResult> animeList;

  const AnimeGrid({super.key, required this.animeList});

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final crossAxisCount = _getCrossAxisCount(screenWidth);

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        childAspectRatio: 0.65,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: animeList.length > 12 ? 12 : animeList.length,
      itemBuilder: (context, index) {
        return AnimeCard(anime: animeList[index]);
      },
    );
  }

  int _getCrossAxisCount(double screenWidth) {
    if (screenWidth >= 1200) return 6;
    if (screenWidth >= 900) return 5;
    if (screenWidth >= 600) return 4;
    return 2;
  }
}
