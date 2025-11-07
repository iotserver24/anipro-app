import 'package:flutter/material.dart';
import '../providers/watch_history_provider.dart';
import '../models/anime.dart';
import '../widgets/anime_card.dart';
import 'video_player_screen.dart';
import 'package:provider/provider.dart';

class ContinueWatchingScreen extends StatelessWidget {
  const ContinueWatchingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final watchHistory = Provider.of<WatchHistoryProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Continue Watching'),
      ),
      body: watchHistory.history.isEmpty
          ? const Center(
              child: Text(
                'No watch history yet',
                style: TextStyle(fontSize: 16),
              ),
            )
          : GridView.builder(
              padding: const EdgeInsets.all(8),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
                childAspectRatio: 0.6,
              ),
              itemCount: watchHistory.history.length,
              itemBuilder: (context, index) {
                final item = watchHistory.history[index];
                return GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => VideoPlayerScreen(
                          episodeId: item.episodeId,
                          episodeNumber: item.episodeNumber,
                          animeTitle: item.name,
                        ),
                      ),
                    );
                  },
                  child: Stack(
                    children: [
                      AnimeCard(
                        anime: AnimeResult(
                          id: item.id,
                          title: item.name,
                          image: item.img,
                          japaneseTitle: '',
                        ),
                        onTap: () {},
                      ),
                      Positioned(
                        bottom: 0,
                        left: 0,
                        right: 0,
                        child: LinearProgressIndicator(
                          value: item.duration > 0
                              ? item.progress / item.duration
                              : 0.0,
                          backgroundColor: Colors.black.withValues(alpha: 0.3),
                          valueColor: const AlwaysStoppedAnimation<Color>(
                            Color(0xFF6C63FF),
                          ),
                          minHeight: 3,
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}

