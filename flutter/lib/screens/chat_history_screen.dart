import 'package:flutter/material.dart';
import '../services/firebase_service.dart';
import '../services/auth_service.dart';
import 'ai_chat_screen.dart';
import '../models/character.dart';

class ChatHistoryScreen extends StatefulWidget {
  const ChatHistoryScreen({super.key});

  @override
  State<ChatHistoryScreen> createState() => _ChatHistoryScreenState();
}

class _ChatHistoryScreenState extends State<ChatHistoryScreen> {
  final AuthService _authService = AuthService();

  @override
  Widget build(BuildContext context) {
    final user = _authService.currentUser;
    if (user == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Chat History')),
        body: const Center(
          child: Text('Please sign in to view chat history'),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chat History'),
      ),
      body: StreamBuilder(
        stream: FirebaseService.firestore
            .collection('chatHistory')
            .where('userId', isEqualTo: user.uid)
            .orderBy('lastMessageTime', descending: true)
            .snapshots(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          final chats = snapshot.data!.docs;

          if (chats.isEmpty) {
            return const Center(
              child: Text('No chat history yet'),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(8),
            itemCount: chats.length,
            itemBuilder: (context, index) {
              final chat = chats[index].data();
              final character = Character.fromMap(chat['character']);

              return ListTile(
                leading: CircleAvatar(
                  backgroundImage: NetworkImage(character.avatar),
                ),
                title: Text(character.name),
                subtitle: Text(chat['lastMessage'] ?? ''),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => AIChatScreen(character: character),
                    ),
                  );
                },
              );
            },
          );
        },
      ),
    );
  }
}

