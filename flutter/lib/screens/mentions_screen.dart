import 'package:flutter/material.dart';
import '../models/mention.dart';
import '../services/firebase_service.dart';
import '../services/auth_service.dart';
import 'public_chat_screen.dart';

class MentionsScreen extends StatefulWidget {
  const MentionsScreen({super.key});

  @override
  State<MentionsScreen> createState() => _MentionsScreenState();
}

class _MentionsScreenState extends State<MentionsScreen> {
  final AuthService _authService = AuthService();
  List<Mention> _mentions = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadMentions();
  }

  void _loadMentions() {
    final user = _authService.currentUser;
    if (user == null) {
      setState(() => _isLoading = false);
      return;
    }

    FirebaseService.firestore
        .collection('notifications')
        .where('userId', isEqualTo: user.uid)
        .where('type', isEqualTo: 'mention')
        .orderBy('timestamp', descending: true)
        .snapshots()
        .listen((snapshot) {
      setState(() {
        _mentions = snapshot.docs
            .map((doc) => Mention.fromMap(doc.data(), doc.id))
            .toList();
        _isLoading = false;
      });
    });
  }

  Future<void> _markAsRead(String mentionId) async {
    await FirebaseService.firestore
        .collection('notifications')
        .doc(mentionId)
        .update({'read': true});
  }

  void _navigateToChat(String messageId) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const PublicChatScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mentions'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _mentions.isEmpty
              ? const Center(
                  child: Text(
                    'No mentions yet',
                    style: TextStyle(fontSize: 16),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(8),
                  itemCount: _mentions.length,
                  itemBuilder: (context, index) {
                    final mention = _mentions[index];
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: mention.read
                            ? Colors.grey
                            : const Color(0xFF6C63FF),
                        child: const Icon(Icons.alternate_email),
                      ),
                      title: Text(mention.fromUsername),
                      subtitle: Text(mention.content),
                      trailing: mention.read
                          ? null
                          : const Icon(Icons.circle, size: 8, color: Colors.blue),
                      onTap: () {
                        _markAsRead(mention.id);
                        _navigateToChat(mention.messageId);
                      },
                    );
                  },
                ),
    );
  }
}

