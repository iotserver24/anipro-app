import 'package:flutter/material.dart';
import '../models/character.dart';
import '../services/firebase_service.dart';
import '../services/auth_service.dart';

class CreateCharacterScreen extends StatefulWidget {
  const CreateCharacterScreen({super.key});

  @override
  State<CreateCharacterScreen> createState() => _CreateCharacterScreenState();
}

class _CreateCharacterScreenState extends State<CreateCharacterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _animeController = TextEditingController();
  final _avatarController = TextEditingController();
  final _systemPromptController = TextEditingController();
  final _greetingController = TextEditingController();
  final _primaryColorController = TextEditingController(text: '#6C63FF');
  final _secondaryColorController = TextEditingController(text: '#03DAC6');
  final AuthService _authService = AuthService();

  @override
  void dispose() {
    _nameController.dispose();
    _animeController.dispose();
    _avatarController.dispose();
    _systemPromptController.dispose();
    _greetingController.dispose();
    _primaryColorController.dispose();
    _secondaryColorController.dispose();
    super.dispose();
  }

  Future<void> _createCharacter() async {
    if (!_formKey.currentState!.validate()) return;

    final user = _authService.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please sign in to create a character')),
      );
      return;
    }

    try {
      final character = Character(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        name: _nameController.text,
        anime: _animeController.text,
        avatar: _avatarController.text,
        primaryColor: _primaryColorController.text,
        secondaryColor: _secondaryColorController.text,
        systemPrompt: _systemPromptController.text,
        greeting: _greetingController.text,
        model: 'mistral',
        features: [],
        personalityTags: [],
        isPersonal: true,
        createdBy: user.uid,
      );

      await FirebaseService.firestore
          .collection('characters')
          .doc(character.id)
          .set(character.toMap());

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Character created successfully!')),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create character: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Character'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Character Name',
                border: OutlineInputBorder(),
              ),
              validator: (value) =>
                  value?.isEmpty ?? true ? 'Please enter a name' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _animeController,
              decoration: const InputDecoration(
                labelText: 'Anime/Series',
                border: OutlineInputBorder(),
              ),
              validator: (value) =>
                  value?.isEmpty ?? true ? 'Please enter anime name' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _avatarController,
              decoration: const InputDecoration(
                labelText: 'Avatar URL',
                border: OutlineInputBorder(),
              ),
              validator: (value) =>
                  value?.isEmpty ?? true ? 'Please enter avatar URL' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _systemPromptController,
              decoration: const InputDecoration(
                labelText: 'System Prompt',
                border: OutlineInputBorder(),
              ),
              maxLines: 5,
              validator: (value) =>
                  value?.isEmpty ?? true ? 'Please enter system prompt' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _greetingController,
              decoration: const InputDecoration(
                labelText: 'Greeting Message',
                border: OutlineInputBorder(),
              ),
              validator: (value) =>
                  value?.isEmpty ?? true ? 'Please enter greeting' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _primaryColorController,
              decoration: const InputDecoration(
                labelText: 'Primary Color (Hex)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _secondaryColorController,
              decoration: const InputDecoration(
                labelText: 'Secondary Color (Hex)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: _createCharacter,
              child: const Text('Create Character'),
            ),
          ],
        ),
      ),
    );
  }
}

