import 'package:firebase_database/firebase_database.dart';
import '../models/chat_message.dart';

class ChatService {
  final DatabaseReference _chatRef = FirebaseDatabase.instance.ref('publicChat/messages');
  final DatabaseReference _rateLimitRef = FirebaseDatabase.instance.ref('publicChat/rateLimits');

  // Send a message to public chat
  Future<void> sendMessage(ChatMessage message) async {
    try {
      await _chatRef.push().set(message.toMap());
    } catch (e) {
      throw Exception('Failed to send message: $e');
    }
  }

  // Get messages stream
  Stream<List<ChatMessage>> getMessagesStream({int limit = 50}) {
    return _chatRef
        .limitToLast(limit)
        .onValue
        .map((event) {
      if (event.snapshot.value == null) return <ChatMessage>[];
      
      final Map<dynamic, dynamic> data = event.snapshot.value as Map<dynamic, dynamic>;
      final List<ChatMessage> messages = [];
      
      data.forEach((key, value) {
        messages.add(ChatMessage.fromMap(Map<String, dynamic>.from(value), key.toString()));
      });
      
      messages.sort((a, b) => a.timestamp.compareTo(b.timestamp));
      return messages;
    });
  }

  // Delete a message
  Future<void> deleteMessage(String messageId) async {
    try {
      await _chatRef.child(messageId).remove();
    } catch (e) {
      throw Exception('Failed to delete message: $e');
    }
  }

  // Check rate limit
  Future<bool> checkRateLimit(String userId) async {
    try {
      final snapshot = await _rateLimitRef.child(userId).get();
      if (!snapshot.exists) return true;
      
      final data = Map<String, dynamic>.from(snapshot.value as Map);
      final dailyRequests = data['dailyRequests'] ?? 0;
      final lastReset = data['lastReset'] ?? 0;
      
      final now = DateTime.now().millisecondsSinceEpoch;
      final oneDay = 24 * 60 * 60 * 1000;
      
      // Reset if more than a day has passed
      if (now - lastReset > oneDay) {
        await _rateLimitRef.child(userId).set({
          'dailyRequests': 1,
          'lastReset': now,
        });
        return true;
      }
      
      // Check if under limit (100 requests per day)
      if (dailyRequests < 100) {
        await _rateLimitRef.child(userId).update({
          'dailyRequests': dailyRequests + 1,
        });
        return true;
      }
      
      return false;
    } catch (e) {
      // If error, allow the request
      return true;
    }
  }
}

