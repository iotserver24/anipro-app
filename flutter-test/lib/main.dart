import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'config/firebase_config.dart';
import 'config/app_config.dart';
import 'screens/splash_screen.dart';
import 'screens/home_screen.dart';
import 'screens/search_screen.dart';
import 'screens/profile_screen.dart';
import 'providers/auth_provider.dart';
import 'providers/anime_provider.dart';
import 'providers/theme_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.dumpErrorToConsole(details);
  };

  try {
    // Initialize Firebase
    await FirebaseConfig.initialize();

    // Set preferred orientations
    await SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);

    // Set system UI overlay style
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        systemNavigationBarColor: Color(AppConfig.backgroundColor),
        systemNavigationBarIconBrightness: Brightness.light,
      ),
    );

    runApp(const MyApp());
  } catch (e, st) {
    // If something fails very early, still render a minimal error UI
    debugPrint('Startup error: $e\n$st');
    runApp(const _StartupErrorApp());
  }
}

class _StartupErrorApp extends StatelessWidget {
  const _StartupErrorApp();
  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      home: Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: Text(
            'Failed to start app',
            style: TextStyle(color: Colors.white),
          ),
        ),
      ),
      debugShowCheckedModeBanner: false,
    );
  }
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => AnimeProvider()),
      ],
      child: Consumer<ThemeProvider>(
        builder: (context, themeProvider, _) {
          return MaterialApp(
            title: AppConfig.appName,
            debugShowCheckedModeBanner: false,
            theme: _buildTheme(themeProvider.isDarkMode),
            home: const SplashScreen(),
            routes: {
              '/home': (context) => const HomeScreen(),
              '/search': (context) => const SearchScreen(),
              '/profile': (context) => const ProfileScreen(),
            },
          );
        },
      ),
    );
  }

  ThemeData _buildTheme(bool isDarkMode) {
    return ThemeData(
      useMaterial3: true,
      brightness: isDarkMode ? Brightness.dark : Brightness.light,
      primaryColor: const Color(AppConfig.primaryColor),
      scaffoldBackgroundColor: const Color(AppConfig.backgroundColor),
      cardColor: const Color(AppConfig.cardColor),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(AppConfig.secondaryColor),
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: Colors.white),
        titleTextStyle: TextStyle(
          color: Colors.white,
          fontSize: 20,
          fontWeight: FontWeight.bold,
          fontFamily: 'Poppins',
        ),
      ),
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(AppConfig.primaryColor),
        brightness: isDarkMode ? Brightness.dark : Brightness.light,
        background: const Color(AppConfig.backgroundColor),
        surface: const Color(AppConfig.cardColor),
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(
          fontSize: 32,
          fontWeight: FontWeight.bold,
          fontFamily: 'Poppins',
          color: Colors.white,
        ),
        displayMedium: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.bold,
          fontFamily: 'Poppins',
          color: Colors.white,
        ),
        displaySmall: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          fontFamily: 'Poppins',
          color: Colors.white,
        ),
        bodyLarge: TextStyle(
          fontSize: 16,
          fontFamily: 'Poppins',
          color: Colors.white,
        ),
        bodyMedium: TextStyle(
          fontSize: 14,
          fontFamily: 'Poppins',
          color: Colors.white70,
        ),
        bodySmall: TextStyle(
          fontSize: 12,
          fontFamily: 'Poppins',
          color: Colors.white54,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(AppConfig.primaryColor),
          foregroundColor: Colors.white,
          textStyle: const TextStyle(
            fontFamily: 'Poppins',
            fontWeight: FontWeight.w600,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(AppConfig.cardColor),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        hintStyle: const TextStyle(
          color: Colors.white54,
          fontFamily: 'Poppins',
        ),
      ),
    );
  }
}
