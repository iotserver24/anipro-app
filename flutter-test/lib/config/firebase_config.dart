import 'package:firebase_core/firebase_core.dart';

/// Firebase configuration for AniSurge app
class FirebaseConfig {
  static const String apiKey = 'AIzaSyDwnApvEV4stf1L5etAaGZG9cOkAAo__7M';
  static const String authDomain = 'anisurge-11808.firebaseapp.com';
  static const String projectId = 'anisurge-11808';
  static const String storageBucket = 'anisurge-11808.firebasestorage.app';
  static const String messagingSenderId = '151470089122';
  static const String appId = '1:151470089122:web:41f2c84a70e28a8cc3c8fb';
  static const String measurementId = 'G-V9SPTVJS18';
  static const String databaseUrl = 'https://anisurge-11808-default-rtdb.asia-southeast1.firebasedatabase.app';

  static FirebaseOptions get platformOptions {
    return const FirebaseOptions(
      apiKey: apiKey,
      authDomain: authDomain,
      projectId: projectId,
      storageBucket: storageBucket,
      messagingSenderId: messagingSenderId,
      appId: appId,
      measurementId: measurementId,
      databaseURL: databaseUrl,
    );
  }

  static Future<void> initialize() async {
    // If default app already exists (auto-init), do nothing
    try {
      Firebase.app();
      return;
    } catch (_) {
      // No default app yet; proceed to initialize
    }
    try {
      await Firebase.initializeApp(
        options: platformOptions,
      );
    } on FirebaseException catch (e) {
      if (e.code == 'duplicate-app') {
        // Another initializer raced us; treat as initialized
        return;
      }
      rethrow;
    }
  }
}
