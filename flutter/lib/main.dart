import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'screens/main_navigation_screen.dart';
import 'providers/watch_history_provider.dart';
import 'providers/my_list_provider.dart';
import 'providers/global_provider.dart';
import 'services/firebase_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  try {
    await FirebaseService.initialize();
  } catch (e) {
    print('Firebase initialization error: $e');
    // Continue without Firebase if initialization fails
  }
  
  // Set preferred orientations
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => WatchHistoryProvider()..initializeHistory()),
        ChangeNotifierProvider(create: (_) => MyListProvider()..initializeMyList()),
        ChangeNotifierProvider(create: (_) => GlobalProvider()),
      ],
      child: MaterialApp(
        title: 'AniSurge',
        debugShowCheckedModeBanner: false,
        theme: ThemeData.dark().copyWith(
          primaryColor: const Color(0xFF6C63FF),
          scaffoldBackgroundColor: const Color(0xFF121212),
          appBarTheme: const AppBarTheme(
            backgroundColor: Color(0xFF1F1F1F),
            elevation: 0,
          ),
          cardTheme: CardThemeData(
            color: const Color(0xFF1F1F1F),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF6C63FF),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
          chipTheme: ChipThemeData(
            backgroundColor: const Color(0xFF1F1F1F),
            labelStyle: const TextStyle(color: Colors.white),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFF6C63FF),
            secondary: Color(0xFF03DAC6),
            surface: Color(0xFF1F1F1F),
            error: Color(0xFFCF6679),
          ),
        ),
        home: const MainNavigationScreen(),
      ),
    );
  }
}
