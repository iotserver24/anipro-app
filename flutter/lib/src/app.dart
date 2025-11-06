import 'package:flutter/material.dart';
import 'features/details/screens/details_screen.dart';
import 'features/home/screens/home_screen.dart';
import 'features/home/screens/search_screen.dart';
import 'features/player/screens/player_screen.dart';
import 'theme/app_theme.dart';

class AniSurgeApp extends StatelessWidget {
  const AniSurgeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AniSurge 2',
      theme: AppTheme.lightTheme(),
      darkTheme: AppTheme.darkTheme(),
      themeMode: ThemeMode.dark,
      debugShowCheckedModeBanner: false,
      home: const HomeScreen(),
      onGenerateRoute: (settings) {
        switch (settings.name) {
          case '/search':
            return MaterialPageRoute(builder: (_) => const SearchScreen());
          case '/details':
            final animeId = settings.arguments as String;
            return MaterialPageRoute(
              builder: (_) => DetailsScreen(animeId: animeId),
            );
          case '/player':
            final episodeId = settings.arguments as String;
            return MaterialPageRoute(
              builder: (_) => PlayerScreen(episodeId: episodeId),
            );
          default:
            return null;
        }
      },
    );
  }
}
