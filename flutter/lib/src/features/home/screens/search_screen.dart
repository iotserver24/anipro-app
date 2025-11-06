import 'dart:async';

import 'package:flutter/material.dart';
import '../../../models/anime_result.dart';
import '../../../state/anime_repository.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final AnimeRepository _repository = AnimeRepository();
  final TextEditingController _controller = TextEditingController();
  final ValueNotifier<List<AnimeResult>> _results = ValueNotifier<List<AnimeResult>>([]);
  Timer? _debounce;
  bool _isLoading = false;

  @override
  void dispose() {
    _controller.dispose();
    _results.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onQueryChanged(String query) {
    _debounce?.cancel();
    if (query.trim().isEmpty) {
      _results.value = [];
      return;
    }

    _debounce = Timer(const Duration(milliseconds: 350), () async {
      setState(() => _isLoading = true);
      final fetched = await _repository.search(query.trim());
      _results.value = fetched;
      setState(() => _isLoading = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Search')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: _controller,
              textInputAction: TextInputAction.search,
              onChanged: _onQueryChanged,
              decoration: InputDecoration(
                hintText: 'Search anime...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _controller.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _controller.clear();
                          _results.value = [];
                          setState(() {});
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
          if (_isLoading) const LinearProgressIndicator(),
          Expanded(
            child: ValueListenableBuilder<List<AnimeResult>>(
              valueListenable: _results,
              builder: (context, results, _) {
                if (results.isEmpty) {
                  return const Center(
                    child: Text('Start typing to search your favorite anime.'),
                  );
                }

                return ListView.separated(
                  padding: const EdgeInsets.all(16.0),
                  itemCount: results.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final anime = results[index];
                    return ListTile(
                      leading: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          anime.image,
                          width: 60,
                          height: 60,
                          fit: BoxFit.cover,
                        ),
                      ),
                      title: Text(anime.title),
                      subtitle: Text(anime.type),
                      onTap: () {
                        Navigator.of(context).pushNamed(
                          '/details',
                          arguments: anime.id,
                        );
                      },
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
