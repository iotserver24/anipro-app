import 'package:flutter/material.dart';

import '../models/anime_result.dart';
import 'anime_card.dart';

class AnimeList extends StatelessWidget {
  final List<AnimeResult> animeList;

  const AnimeList({super.key, required this.animeList});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 260,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: animeList.length,
        separatorBuilder: (context, index) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final anime = animeList[index];
          return SizedBox(
            width: 160,
            child: AnimeCard(anime: anime),
          );
        },
      ),
    );
  }
}
