import 'package:flutter/foundation.dart';

class GlobalProvider with ChangeNotifier {
  bool _isVideoFullscreen = false;
  bool _isWatchPage = false;
  bool _emailVerified = false;

  bool get isVideoFullscreen => _isVideoFullscreen;
  bool get isWatchPage => _isWatchPage;
  bool get emailVerified => _emailVerified;

  void setIsVideoFullscreen(bool value) {
    _isVideoFullscreen = value;
    notifyListeners();
  }

  void setIsWatchPage(bool value) {
    _isWatchPage = value;
    notifyListeners();
  }

  void setEmailVerificationStatus(bool value) {
    _emailVerified = value;
    notifyListeners();
  }
}

