import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_provider.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            const SizedBox(height: 20),
            
            // Profile Header
            _buildProfileHeader(context, authProvider),
            
            const SizedBox(height: 30),
            
            // Settings List
            _buildSettingsTile(
              context,
              icon: Icons.person,
              title: 'My List',
              subtitle: 'View your saved anime',
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('My List feature coming soon')),
                );
              },
            ),
            
            _buildSettingsTile(
              context,
              icon: Icons.history,
              title: 'Watch History',
              subtitle: 'View your watch history',
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Watch History feature coming soon')),
                );
              },
            ),
            
            _buildSettingsTile(
              context,
              icon: Icons.download,
              title: 'Downloads',
              subtitle: 'Manage your downloads',
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Downloads feature coming soon')),
                );
              },
            ),
            
            _buildSettingsTile(
              context,
              icon: Icons.notifications,
              title: 'Notifications',
              subtitle: 'Manage notifications',
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Notifications feature coming soon')),
                );
              },
            ),
            
            _buildSwitchTile(
              context,
              icon: Icons.dark_mode,
              title: 'Dark Mode',
              subtitle: 'Toggle dark mode',
              value: themeProvider.isDarkMode,
              onChanged: (value) {
                themeProvider.toggleTheme();
              },
            ),
            
            _buildSettingsTile(
              context,
              icon: Icons.settings,
              title: 'Settings',
              subtitle: 'App settings',
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Settings feature coming soon')),
                );
              },
            ),
            
            _buildSettingsTile(
              context,
              icon: Icons.info,
              title: 'About',
              subtitle: 'Version ${AppConfig.appVersion}',
              onTap: () {
                _showAboutDialog(context);
              },
            ),
            
            const SizedBox(height: 20),
            
            // Sign Out Button
            if (authProvider.isAuthenticated)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: ElevatedButton.icon(
                  onPressed: () async {
                    await authProvider.signOut();
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Signed out successfully')),
                      );
                    }
                  },
                  icon: const Icon(Icons.logout),
                  label: const Text('Sign Out'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    minimumSize: const Size(double.infinity, 50),
                  ),
                ),
              )
            else
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: ElevatedButton.icon(
                  onPressed: () {
                    _showSignInDialog(context);
                  },
                  icon: const Icon(Icons.login),
                  label: const Text('Sign In'),
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size(double.infinity, 50),
                  ),
                ),
              ),
            
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileHeader(BuildContext context, AuthProvider authProvider) {
    return Container(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          CircleAvatar(
            radius: 50,
            backgroundColor: const Color(AppConfig.primaryColor),
            child: authProvider.isAuthenticated
                ? Text(
                    authProvider.user?.email?.substring(0, 1).toUpperCase() ?? 'G',
                    style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold),
                  )
                : const Icon(Icons.person, size: 50),
          ),
          const SizedBox(height: 16),
          Text(
            authProvider.isAuthenticated
                ? authProvider.user?.email ?? 'Guest'
                : 'Guest',
            style: Theme.of(context).textTheme.displaySmall,
          ),
          const SizedBox(height: 8),
          Text(
            authProvider.isAuthenticated ? 'Premium User' : 'Sign in to access all features',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsTile(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: const Color(AppConfig.cardColor),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: const Color(AppConfig.primaryColor)),
      ),
      title: Text(title),
      subtitle: Text(subtitle),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }

  Widget _buildSwitchTile(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: const Color(AppConfig.cardColor),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: const Color(AppConfig.primaryColor)),
      ),
      title: Text(title),
      subtitle: Text(subtitle),
      trailing: Switch(
        value: value,
        onChanged: onChanged,
        activeTrackColor: const Color(AppConfig.primaryColor),
      ),
    );
  }

  void _showAboutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text(AppConfig.appName),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Version: ${AppConfig.appVersion}'),
            SizedBox(height: 8),
            Text(
              'A free anime streaming app that lets you watch your favorite anime shows and movies anytime, anywhere.',
            ),
            const SizedBox(height: 16),
            const Text('Developed with ❤️ using Flutter'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showSignInDialog(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign In'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ElevatedButton.icon(
              onPressed: () async {
                Navigator.pop(context);
                await authProvider.signInWithGoogle();
              },
              icon: const Icon(Icons.login),
              label: const Text('Sign in with Google'),
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(double.infinity, 50),
              ),
            ),
            const SizedBox(height: 12),
            const Text('Or sign in with email (coming soon)'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }
}
