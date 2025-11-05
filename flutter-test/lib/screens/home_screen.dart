import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../providers/anime_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/anime_card.dart';
import '../widgets/anime_list_section.dart';
import 'anime_detail_screen.dart';
import 'search_screen.dart';
import 'profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;
  
  @override
  void initState() {
    super.initState();
    // Load initial data
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final animeProvider = Provider.of<AnimeProvider>(context, listen: false);
      animeProvider.refreshAllData();
    });
  }

  void _onBottomNavTap(int index) {
    setState(() {
      _selectedIndex = index;
    });
    
    switch (index) {
      case 0:
        // Home - already here
        break;
      case 1:
        // Search
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const SearchScreen()),
        );
        break;
      case 2:
        // Profile
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const ProfileScreen()),
        );
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(AppConfig.appName),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {
              // Handle notifications
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('No new notifications')),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await Provider.of<AnimeProvider>(context, listen: false)
              .refreshAllData();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Hero Banner
              _buildHeroBanner(),
              
              const SizedBox(height: 20),
              
              // Continue Watching Section
              _buildContinueWatchingSection(),
              
              const SizedBox(height: 20),
              
              // Trending Anime Section
              Consumer<AnimeProvider>(
                builder: (context, animeProvider, _) {
                  return AnimeListSection(
                    title: 'Trending Now',
                    animeList: animeProvider.trendingAnime,
                    isLoading: animeProvider.isLoadingTrending,
                    onTap: (anime) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => AnimeDetailScreen(animeId: anime.id),
                        ),
                      );
                    },
                  );
                },
              ),
              
              const SizedBox(height: 20),
              
              // Recent Episodes Section
              Consumer<AnimeProvider>(
                builder: (context, animeProvider, _) {
                  return AnimeListSection(
                    title: 'Recent Episodes',
                    animeList: animeProvider.recentEpisodes,
                    isLoading: animeProvider.isLoadingRecent,
                    onTap: (anime) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => AnimeDetailScreen(animeId: anime.id),
                        ),
                      );
                    },
                  );
                },
              ),
              
              const SizedBox(height: 20),
              
              // Popular Anime Section
              Consumer<AnimeProvider>(
                builder: (context, animeProvider, _) {
                  return AnimeListSection(
                    title: 'Most Popular',
                    animeList: animeProvider.popularAnime,
                    isLoading: animeProvider.isLoadingPopular,
                    onTap: (anime) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => AnimeDetailScreen(animeId: anime.id),
                        ),
                      );
                    },
                  );
                },
              ),
              
              const SizedBox(height: 20),
              
              // New Releases Section
              Consumer<AnimeProvider>(
                builder: (context, animeProvider, _) {
                  return AnimeListSection(
                    title: 'New Releases',
                    animeList: animeProvider.newReleases,
                    isLoading: animeProvider.isLoadingNewReleases,
                    onTap: (anime) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => AnimeDetailScreen(animeId: anime.id),
                        ),
                      );
                    },
                  );
                },
              ),
              
              const SizedBox(height: 20),
              
              // Latest Completed Section
              Consumer<AnimeProvider>(
                builder: (context, animeProvider, _) {
                  return AnimeListSection(
                    title: 'Latest Completed',
                    animeList: animeProvider.latestCompleted,
                    isLoading: animeProvider.isLoadingLatestCompleted,
                    onTap: (anime) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => AnimeDetailScreen(animeId: anime.id),
                        ),
                      );
                    },
                  );
                },
              ),
              
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: _onBottomNavTap,
        backgroundColor: const Color(AppConfig.cardColor),
        selectedItemColor: const Color(AppConfig.primaryColor),
        unselectedItemColor: Colors.white54,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.search),
            label: 'Search',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }

  Widget _buildHeroBanner() {
    return Container(
      height: 250,
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(AppConfig.primaryColor),
            const Color(AppConfig.primaryColor).withOpacity(0.7),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(AppConfig.primaryColor).withOpacity(0.3),
            blurRadius: 15,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -50,
            bottom: -50,
            child: Icon(
              Icons.play_circle_filled,
              size: 200,
              color: Colors.white.withOpacity(0.1),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'Welcome to ${AppConfig.appName}',
                  style: Theme.of(context).textTheme.displayMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Watch thousands of anime episodes for free',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: Colors.white.withOpacity(0.9),
                      ),
                ),
                const SizedBox(height: 20),
                ElevatedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const SearchScreen()),
                    );
                  },
                  icon: const Icon(Icons.search),
                  label: const Text('Explore Now'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(AppConfig.primaryColor),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContinueWatchingSection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Continue Watching',
            style: Theme.of(context).textTheme.displaySmall,
          ),
          const SizedBox(height: 12),
          Container(
            height: 100,
            alignment: Alignment.center,
            child: Text(
              'No recent anime',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}
