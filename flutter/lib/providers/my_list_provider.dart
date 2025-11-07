import 'package:flutter/foundation.dart';
import '../models/my_list_item.dart';
import '../services/my_list_service.dart';

class MyListProvider with ChangeNotifier {
  final MyListService _service = MyListService();
  List<MyListItem> _myList = [];
  bool _isLoading = false;

  List<MyListItem> get myList => _myList;
  bool get isLoading => _isLoading;

  Future<void> initializeMyList() async {
    _isLoading = true;
    notifyListeners();
    
    _myList = await _service.getMyList();
    
    _isLoading = false;
    notifyListeners();
  }

  Future<void> addAnime(MyListItem anime) async {
    await _service.addAnime(anime);
    await initializeMyList();
  }

  Future<void> removeAnime(String animeId) async {
    await _service.removeAnime(animeId);
    await initializeMyList();
  }

  Future<bool> isBookmarked(String animeId) async {
    return await _service.isBookmarked(animeId);
  }

  Future<void> clearMyList() async {
    await _service.clearMyList();
    await initializeMyList();
  }
}

