import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'home_screen.dart';
import 'search_screen.dart';
import 'my_list_screen.dart';
import 'watch_history_screen.dart';
import 'profile_screen.dart';
import 'schedule_screen.dart';
import 'notifications_screen.dart';
import 'public_chat_screen.dart';
import 'character_select_screen.dart';
import 'mentions_screen.dart';
import 'gallery_screen.dart';
import 'continue_watching_screen.dart';
import 'about_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  final List<FocusNode> _navFocusNodes = List.generate(5, (_) => FocusNode());

  final List<Widget> _screens = [
    const HomeScreen(),
    const SearchScreen(),
    const MyListScreen(),
    const WatchHistoryScreen(),
    const ProfileScreen(),
  ];

  bool get _isDesktopOrTablet {
    final width = MediaQuery.of(context).size.width;
    return width >= 768;
  }

  @override
  void initState() {
    super.initState();
    // Auto-focus first nav item on TV
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _navFocusNodes[0].requestFocus();
    });
  }

  @override
  void dispose() {
    _navFocusNodes.forEach((node) => node.dispose());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isDesktopOrTablet) {
      return Scaffold(
        key: _scaffoldKey,
        body: Row(
          children: [
            _buildSideNavigation(),
            Expanded(
              child: IndexedStack(
                index: _currentIndex,
                children: _screens,
              ),
            ),
          ],
        ),
      );
    }

    return FocusScope(
      child: Scaffold(
        body: IndexedStack(
          index: _currentIndex,
          children: _screens,
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _currentIndex,
          onDestinationSelected: (index) {
            setState(() {
              _currentIndex = index;
            });
          },
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home),
              label: 'Home',
            ),
            NavigationDestination(
              icon: Icon(Icons.search_outlined),
              selectedIcon: Icon(Icons.search),
              label: 'Search',
            ),
            NavigationDestination(
              icon: Icon(Icons.bookmark_outline),
              selectedIcon: Icon(Icons.bookmark),
              label: 'My List',
            ),
            NavigationDestination(
              icon: Icon(Icons.history_outlined),
              selectedIcon: Icon(Icons.history),
              label: 'History',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'Profile',
            ),
          ],
        ),
        drawer: _buildDrawer(),
      ),
    );
  }

  Widget _buildSideNavigation() {
    return Container(
      width: 250,
      color: const Color(0xFF1F1F1F),
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          const DrawerHeader(
            child: Text(
              'AniSurge',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Color(0xFF6C63FF),
              ),
            ),
          ),
          _buildNavItem(Icons.home, 'Home', 0),
          _buildNavItem(Icons.search, 'Search', 1),
          _buildNavItem(Icons.bookmark, 'My List', 2),
          _buildNavItem(Icons.history, 'History', 3),
          _buildNavItem(Icons.schedule, 'Schedule', null, onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const ScheduleScreen()),
            );
          }),
          _buildNavItem(Icons.chat, 'Public Chat', null, onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const PublicChatScreen()),
            );
          }),
          _buildNavItem(Icons.smart_toy, 'AI Chat', null, onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const CharacterSelectScreen()),
            );
          }),
          _buildNavItem(Icons.notifications, 'Notifications', null, onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const NotificationsScreen()),
            );
          }),
          _buildNavItem(Icons.alternate_email, 'Mentions', null, onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const MentionsScreen()),
            );
          }),
          _buildNavItem(Icons.photo_library, 'Gallery', null, onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const GalleryScreen()),
            );
          }),
          _buildNavItem(Icons.play_circle, 'Continue Watching', null, onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const ContinueWatchingScreen()),
            );
          }),
          const Divider(),
          _buildNavItem(Icons.person, 'Profile', 4),
          _buildNavItem(Icons.info, 'About', null, onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const AboutScreen()),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildDrawer() {
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          const DrawerHeader(
            child: Text(
              'AniSurge',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Color(0xFF6C63FF),
              ),
            ),
          ),
          _buildNavItem(Icons.schedule, 'Schedule', null, onTap: () {
            Navigator.pop(context);
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const ScheduleScreen()),
            );
          }),
          _buildNavItem(Icons.chat, 'Public Chat', null, onTap: () {
            Navigator.pop(context);
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const PublicChatScreen()),
            );
          }),
          _buildNavItem(Icons.smart_toy, 'AI Chat', null, onTap: () {
            Navigator.pop(context);
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const CharacterSelectScreen()),
            );
          }),
          _buildNavItem(Icons.notifications, 'Notifications', null, onTap: () {
            Navigator.pop(context);
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const NotificationsScreen()),
            );
          }),
          _buildNavItem(Icons.alternate_email, 'Mentions', null, onTap: () {
            Navigator.pop(context);
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const MentionsScreen()),
            );
          }),
          _buildNavItem(Icons.photo_library, 'Gallery', null, onTap: () {
            Navigator.pop(context);
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const GalleryScreen()),
            );
          }),
          _buildNavItem(Icons.play_circle, 'Continue Watching', null, onTap: () {
            Navigator.pop(context);
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const ContinueWatchingScreen()),
            );
          }),
          const Divider(),
          _buildNavItem(Icons.info, 'About', null, onTap: () {
            Navigator.pop(context);
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const AboutScreen()),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String title, int? index, {VoidCallback? onTap}) {
    final isSelected = index != null && _currentIndex == index;
    final focusNode = index != null ? _navFocusNodes[index] : null;
    
    return Focus(
      focusNode: focusNode,
      onKeyEvent: (node, event) {
        if (event is KeyDownEvent) {
          if (event.logicalKey == LogicalKeyboardKey.select ||
              event.logicalKey == LogicalKeyboardKey.enter) {
            if (onTap != null) {
              onTap();
            } else if (index != null) {
              setState(() {
                _currentIndex = index;
              });
            }
            return KeyEventResult.handled;
          }
          // Handle D-pad navigation
          if (index != null) {
            if (event.logicalKey == LogicalKeyboardKey.arrowDown &&
                index < _navFocusNodes.length - 1) {
              _navFocusNodes[index + 1].requestFocus();
              return KeyEventResult.handled;
            }
            if (event.logicalKey == LogicalKeyboardKey.arrowUp && index > 0) {
              _navFocusNodes[index - 1].requestFocus();
              return KeyEventResult.handled;
            }
          }
        }
        return KeyEventResult.ignored;
      },
      child: Builder(
        builder: (context) {
          final hasFocus = Focus.of(context).hasFocus;
          return ListTile(
            leading: Icon(
              icon,
              color: isSelected || hasFocus
                  ? const Color(0xFF6C63FF)
                  : null,
            ),
            title: Text(title),
            selected: isSelected,
            tileColor: hasFocus
                ? const Color(0xFF6C63FF).withValues(alpha: 0.1)
                : null,
            onTap: onTap ?? () {
              if (index != null) {
                setState(() {
                  _currentIndex = index;
                });
              }
              if (!_isDesktopOrTablet) {
                Navigator.pop(context);
              }
            },
          );
        },
      ),
    );
  }
}

