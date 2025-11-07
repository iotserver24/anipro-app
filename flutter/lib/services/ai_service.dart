import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/character.dart';

class AIService {
  static const String pollinationsApiUrl = 'https://text.pollinations.ai/openai?token=uNoesre5jXDzjhiY';
  static const String pollinationsApiKey = 'uNoesre5jXDzjhiY';

  // Get AI response from Pollinations API
  Future<String> getAIResponse({
    required Character character,
    required String userMessage,
    required List<Map<String, String>> conversationHistory,
  }) async {
    try {
      final List<Map<String, String>> messages = [
        {'role': 'system', 'content': character.systemPrompt},
        ...conversationHistory,
        {'role': 'user', 'content': userMessage},
      ];

      final response = await http.post(
        Uri.parse(pollinationsApiUrl),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $pollinationsApiKey',
        },
        body: jsonEncode({
          'model': character.model,
          'messages': messages,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['choices'][0]['message']['content'] ?? 'Sorry, I could not generate a response.';
      } else {
        throw Exception('AI API error: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to get AI response: $e');
    }
  }
}

