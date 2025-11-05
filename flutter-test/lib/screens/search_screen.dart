import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/anime_provider.dart';
import '../widgets/anime_card.dart';
import 'anime_detail_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  
  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _performSearch(String query) {
    if (query.isNotEmpty) {
      Provider.of<AnimeProvider>(context, listen: false).searchAnime(query);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _searchController,
          autofocus: true,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: 'Search anime...',
            hintStyle: const TextStyle(color: Colors.white54),
            border: InputBorder.none,
            suffixIcon: _searchController.text.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear, color: Colors.white),
                    onPressed: () {
                      _searchController.clear();
                      Provider.of<AnimeProvider>(context, listen: false)
                          .clearSearchResults();
                    },
                  )
                : null,
          ),
          onSubmitted: _performSearch,
          onChanged: (value) {
            setState(() {});
          },
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () => _performSearch(_searchController.text),
          ),
        ],
      ),
      body: Consumer<AnimeProvider>(
        builder: (context, animeProvider, _) {
          if (animeProvider.isSearching) {
            return const Center(child: CircularProgressIndicator());
          }

          if (_searchController.text.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.search,
                    size: 100,
                    color: Colors.white.withValues(alpha: 0.3),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Search for your favorite anime',
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                ],
              ),
            );
          }

          if (animeProvider.searchResults.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.search_off,
                    size: 100,
                    color: Colors.white.withValues(alpha: 0.3),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'No results found',
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Try searching with different keywords',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            );
          }

          return GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 0.7,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            itemCount: animeProvider.searchResults.length,
            itemBuilder: (context, index) {
              final anime = animeProvider.searchResults[index];
              return AnimeCard(
                anime: anime,
                width: double.infinity,
                height: double.infinity,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => AnimeDetailScreen(animeId: anime.id),
                    ),
                  );
                },
              );
            },
          );
        },
      ),
    );
  }
}
