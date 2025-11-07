import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/character.dart';
import '../services/ai_service.dart';
import '../services/auth_service.dart';
import '../constants/characters.dart';
import 'auth_screen.dart';

class AIChatScreen extends StatefulWidget {
  final Character? character;

  const AIChatScreen({super.key, this.character});

  @override
  State<AIChatScreen> createState() => _AIChatScreenState();
}

class _AIChatScreenState extends State<AIChatScreen> {
  final AIService _aiService = AIService();
  final AuthService _authService = AuthService();
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  Character? _selectedCharacter;
  List<Map<String, String>> _conversationHistory = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _selectedCharacter = widget.character ?? CharacterConstants.getAvailableCharacters().first;
    if (_selectedCharacter != null) {
      _conversationHistory.add({
        'role': 'assistant',
        'content': _selectedCharacter!.greeting,
      });
    }
  }

  Future<void> _sendMessage() async {
    if (!_authService.isSignedIn) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => const AuthScreen()),
      );
      return;
    }

    final messageText = _messageController.text.trim();
    if (messageText.isEmpty || _selectedCharacter == null) return;

    setState(() {
      _conversationHistory.add({'role': 'user', 'content': messageText});
      _isLoading = true;
    });

    _messageController.clear();

    try {
      final response = await _aiService.getAIResponse(
        character: _selectedCharacter!,
        userMessage: messageText,
        conversationHistory: _conversationHistory,
      );

      setState(() {
        _conversationHistory.add({'role': 'assistant', 'content': response});
        _isLoading = false;
      });

      // Auto-scroll to bottom
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
        }
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _conversationHistory.add({
          'role': 'assistant',
          'content': 'Sorry, I encountered an error. Please try again.',
        });
      });
    }
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            if (_selectedCharacter != null) ...[
              CircleAvatar(
                radius: 16,
                backgroundImage: CachedNetworkImageProvider(_selectedCharacter!.avatar),
              ),
              const SizedBox(width: 8),
              Text(_selectedCharacter!.name),
            ],
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.person),
            onPressed: () {
              Navigator.pushNamed(context, '/character-select');
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _conversationHistory.length,
              itemBuilder: (context, index) {
                final message = _conversationHistory[index];
                final isUser = message['role'] == 'user';

                return Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Row(
                    mainAxisAlignment:
                        isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (!isUser && _selectedCharacter != null) ...[
                        CircleAvatar(
                          radius: 16,
                          backgroundImage: CachedNetworkImageProvider(
                            _selectedCharacter!.avatar,
                          ),
                        ),
                        const SizedBox(width: 8),
                      ],
                      Flexible(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isUser
                                ? const Color(0xFF6C63FF)
                                : const Color(0xFF1F1F1F),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Text(
                            message['content'] ?? '',
                            style: const TextStyle(fontSize: 14),
                          ),
                        ),
                      ),
                      if (isUser) ...[
                        const SizedBox(width: 8),
                        CircleAvatar(
                          radius: 16,
                          backgroundColor: const Color(0xFF6C63FF),
                          child: const Icon(Icons.person, size: 16),
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
          ),
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.all(16),
              child: CircularProgressIndicator(),
            ),
          _buildMessageInput(),
        ],
      ),
    );
  }

  Widget _buildMessageInput() {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: const Color(0xFF1F1F1F),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 4,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _messageController,
              decoration: const InputDecoration(
                hintText: 'Type a message...',
                border: InputBorder.none,
                hintStyle: TextStyle(color: Colors.grey),
              ),
              style: const TextStyle(color: Colors.white),
              maxLines: null,
              textCapitalization: TextCapitalization.sentences,
            ),
          ),
          IconButton(
            icon: const Icon(Icons.send),
            onPressed: _isLoading ? null : _sendMessage,
          ),
        ],
      ),
    );
  }
}

