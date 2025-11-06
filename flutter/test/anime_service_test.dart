import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:anisurge2/src/services/anime_service.dart';

void main() {
  group('AnimeService', () {
    test('searchAnime parses list payload', () async {
      final mockClient = MockClient((request) async {
        return http.Response(jsonEncode([
          {
            'id': 'naruto',
            'title': 'Naruto',
            'image': 'https://example.com/naruto.jpg',
            'episodes': 220,
          }
        ]), 200, headers: {'content-type': 'application/json'});
      });

      final service = AnimeService(client: mockClient);
      final results = await service.searchAnime('naruto');

      expect(results, hasLength(1));
      expect(results.first.title, 'Naruto');
    });

    test('getAnimeDetails returns null on non-200', () async {
      final mockClient = MockClient((request) async {
        return http.Response('Not found', 404);
      });

      final service = AnimeService(client: mockClient);
      final details = await service.getAnimeDetails('unknown');

      expect(details, isNull);
    });
  });
}
