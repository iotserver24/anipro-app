import 'package:cloud_firestore/cloud_firestore.dart';
import 'firebase_service.dart';
import '../models/comment.dart';

class CommentsService {
  final FirebaseFirestore _firestore = FirebaseService.firestore;

  Stream<List<Comment>> getComments(String animeId) {
    return _firestore
        .collection('comments')
        .where('animeId', isEqualTo: animeId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => _commentFromFirestore(doc))
            .toList());
  }

  Comment _commentFromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Comment(
      id: doc.id,
      animeId: data['animeId'] ?? '',
      userId: data['userId'] ?? '',
      userName: data['userName'] ?? '',
      userAvatar: data['userAvatar'] ?? '',
      content: data['content'] ?? '',
      gifUrl: data['gifUrl'],
      likes: data['likes'] ?? 0,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Future<bool> addComment({
    required String animeId,
    required String userId,
    required String userName,
    required String userAvatar,
    required String content,
    String? gifUrl,
  }) async {
    try {
      await _firestore.collection('comments').add({
        'animeId': animeId,
        'userId': userId,
        'userName': userName,
        'userAvatar': userAvatar,
        'content': content,
        'gifUrl': gifUrl,
        'likes': 0,
        'createdAt': FieldValue.serverTimestamp(),
      });
      return true;
    } catch (e) {
      print('Error adding comment: $e');
      return false;
    }
  }

  Future<bool> toggleLike(String commentId, String userId) async {
    try {
      final likeRef = _firestore
          .collection('comment_likes')
          .doc('${commentId}_$userId');

      final likeDoc = await likeRef.get();
      final commentRef = _firestore.collection('comments').doc(commentId);

      if (likeDoc.exists) {
        // Unlike
        await likeRef.delete();
        await commentRef.update({
          'likes': FieldValue.increment(-1),
        });
      } else {
        // Like
        await likeRef.set({
          'userId': userId,
          'commentId': commentId,
          'timestamp': FieldValue.serverTimestamp(),
        });
        await commentRef.update({
          'likes': FieldValue.increment(1),
        });
      }
      return true;
    } catch (e) {
      print('Error toggling like: $e');
      return false;
    }
  }

  Future<bool> hasLiked(String commentId, String userId) async {
    try {
      final likeDoc = await _firestore
          .collection('comment_likes')
          .doc('${commentId}_$userId')
          .get();
      return likeDoc.exists;
    } catch (e) {
      return false;
    }
  }

  Future<bool> deleteComment(String commentId, String userId) async {
    try {
      final commentDoc = await _firestore.collection('comments').doc(commentId).get();
      if (commentDoc.exists && commentDoc.data()?['userId'] == userId) {
        await _firestore.collection('comments').doc(commentId).delete();
        return true;
      }
      return false;
    } catch (e) {
      print('Error deleting comment: $e');
      return false;
    }
  }
}
