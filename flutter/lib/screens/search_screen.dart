import 'package:flutter/material.dart';
import '../models/anime.dart';
import '../services/anime_api_service.dart';
import '../widgets/anime_card.dart';
import 'anime_details_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final AnimeApiService _apiService = AnimeApiService();
  final TextEditingController _searchController = TextEditingController();
  List<AnimeResult> _searchResults = [];
  bool _isLoading = false;

  Future<void> _performSearch(String query) async {
    if (query.trim().isEmpty) {
      setState(() {
        _searchResults = [];
      });
      return;
    }

    setState(() => _isLoading = true);
    try {
      final results = await _apiService.searchAnime(query);
      setState(() {
        _searchResults = results;
        _isLoading = false;
      });
    } catch (e) {
      print('Error searching: $e');
      setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _searchController,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Search anime...',
            border: InputBorder.none,
            hintStyle: TextStyle(color: Colors.grey),
          ),
          style: const TextStyle(color: Colors.white),
          onSubmitted: _performSearch,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () => _performSearch(_searchController.text),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _searchResults.isEmpty
              ? const Center(
                  child: Text(
                    'Search for your favorite anime',
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
                  itemCount: _searchResults.length,
                  itemBuilder: (context, index) {
                    return AnimeCard(
                      anime: _searchResults[index],
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => AnimeDetailsScreen(
                              animeId: _searchResults[index].id,
                            ),
                          ),
                        );
                      },
                    );
                  },
                ),
    );
  }
}
