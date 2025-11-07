import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import 'auth_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = AuthService();

    return StreamBuilder(
      stream: authService.authStateChanges,
      builder: (context, snapshot) {
        final isSignedIn = authService.isSignedIn;
        final user = authService.currentUser;

        return Scaffold(
          appBar: AppBar(
            title: const Text('Profile'),
          ),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const SizedBox(height: 32),
              CircleAvatar(
                radius: 50,
                backgroundColor: const Color(0xFF6C63FF),
                backgroundImage: user?.photoURL != null
                    ? NetworkImage(user!.photoURL!)
                    : null,
                child: user?.photoURL == null
                    ? const Icon(
                        Icons.person,
                        size: 50,
                        color: Colors.white,
                      )
                    : null,
              ),
              const SizedBox(height: 16),
              Center(
                child: Text(
                  isSignedIn
                      ? (user?.displayName ?? user?.email?.split('@')[0] ?? 'User')
                      : 'Guest User',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Center(
                child: Text(
                  isSignedIn
                      ? (user?.email ?? '')
                      : 'Sign in to sync your data',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[400],
                  ),
                ),
              ),
              if (isSignedIn && !authService.isEmailVerified) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.orange.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.warning, color: Colors.orange),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Email not verified',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            TextButton(
                              onPressed: () async {
                                await authService.sendEmailVerification();
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Verification email sent'),
                                    ),
                                  );
                                }
                              },
                              child: const Text('Resend verification'),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 32),
              ListTile(
                leading: const Icon(Icons.bookmark_outline),
                title: const Text('My List'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  // Already accessible via bottom nav
                },
              ),
              ListTile(
                leading: const Icon(Icons.history),
                title: const Text('Watch History'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  // Already accessible via bottom nav
                },
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.settings_outlined),
                title: const Text('Settings'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  // TODO: Navigate to settings
                },
              ),
              ListTile(
                leading: const Icon(Icons.info_outline),
                title: const Text('About'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  showAboutDialog(
                    context: context,
                    applicationName: 'AniSurge',
                    applicationVersion: '1.0.0',
                    applicationLegalese: '© 2024 AniSurge',
                  );
                },
              ),
              const Divider(),
              if (isSignedIn)
                ListTile(
                  leading: const Icon(Icons.logout),
                  title: const Text('Sign Out'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () async {
                    await authService.signOut();
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Signed out')),
                      );
                    }
                  },
                )
              else
                ListTile(
                  leading: const Icon(Icons.login),
                  title: const Text('Sign In'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const AuthScreen(),
                      ),
                    );
                  },
                ),
            ],
          ),
        );
      },
    );
  }
}
