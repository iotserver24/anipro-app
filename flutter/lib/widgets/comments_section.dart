import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../services/comments_service.dart';
import '../services/auth_service.dart';
import '../models/comment.dart';

class CommentsSection extends StatefulWidget {
  final String animeId;

  const CommentsSection({super.key, required this.animeId});

  @override
  State<CommentsSection> createState() => _CommentsSectionState();
}

class _CommentsSectionState extends State<CommentsSection> {
  final CommentsService _commentsService = CommentsService();
  final AuthService _authService = AuthService();
  final TextEditingController _commentController = TextEditingController();

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _submitComment() async {
    if (_commentController.text.trim().isEmpty) return;
    if (!_authService.isSignedIn) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please sign in to comment')),
      );
      return;
    }

    final user = _authService.currentUser!;
    final success = await _commentsService.addComment(
      animeId: widget.animeId,
      userId: user.uid,
      userName: user.displayName ?? user.email?.split('@')[0] ?? 'User',
      userAvatar: user.photoURL ?? '',
      content: _commentController.text.trim(),
    );

    if (success && mounted) {
      _commentController.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Comment added')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Comments',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        if (_authService.isSignedIn)
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _commentController,
                  decoration: const InputDecoration(
                    hintText: 'Write a comment...',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                  ),
                  maxLines: 3,
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.send),
                onPressed: _submitComment,
              ),
            ],
          )
        else
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Text(
              'Sign in to comment',
              style: TextStyle(color: Colors.grey[400]),
            ),
          ),
        const SizedBox(height: 16),
        StreamBuilder<List<Comment>>(
          stream: _commentsService.getComments(widget.animeId),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }

            if (!snapshot.hasData || snapshot.data!.isEmpty) {
              return Padding(
                padding: const EdgeInsets.all(16.0),
                child: Text(
                  'No comments yet. Be the first to comment!',
                  style: TextStyle(color: Colors.grey[400]),
                ),
              );
            }

            final comments = snapshot.data!;

            return ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: comments.length,
              itemBuilder: (context, index) {
                final comment = comments[index];
                return _CommentTile(comment: comment);
              },
            );
          },
        ),
      ],
    );
  }
}

class _CommentTile extends StatefulWidget {
  final Comment comment;

  const _CommentTile({required this.comment});

  @override
  State<_CommentTile> createState() => _CommentTileState();
}

class _CommentTileState extends State<_CommentTile> {
  final CommentsService _commentsService = CommentsService();
  final AuthService _authService = AuthService();
  bool _isLiked = false;

  @override
  void initState() {
    super.initState();
    _checkLiked();
  }

  Future<void> _checkLiked() async {
    if (_authService.isSignedIn) {
      final liked = await _commentsService.hasLiked(
        widget.comment.id,
        _authService.currentUser!.uid,
      );
      setState(() => _isLiked = liked);
    }
  }

  Future<void> _toggleLike() async {
    if (!_authService.isSignedIn) return;

    await _commentsService.toggleLike(
      widget.comment.id,
      _authService.currentUser!.uid,
    );
    _checkLiked();
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundImage: widget.comment.userAvatar.isNotEmpty
                      ? CachedNetworkImageProvider(widget.comment.userAvatar)
                      : null,
                  child: widget.comment.userAvatar.isEmpty
                      ? Text(widget.comment.userName[0].toUpperCase())
                      : null,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.comment.userName,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      Text(
                        _formatDate(widget.comment.createdAt),
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[400],
                        ),
                      ),
                    ],
                  ),
                ),
                if (_authService.isSignedIn &&
                    _authService.currentUser!.uid == widget.comment.userId)
                  IconButton(
                    icon: const Icon(Icons.delete_outline, size: 18),
                    onPressed: () async {
                      await _commentsService.deleteComment(
                        widget.comment.id,
                        _authService.currentUser!.uid,
                      );
                    },
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(widget.comment.content),
            if (widget.comment.gifUrl != null) ...[
              const SizedBox(height: 8),
              CachedNetworkImage(
                imageUrl: widget.comment.gifUrl!,
                height: 150,
                fit: BoxFit.cover,
              ),
            ],
            const SizedBox(height: 8),
            Row(
              children: [
                IconButton(
                  icon: Icon(
                    _isLiked ? Icons.favorite : Icons.favorite_border,
                    color: _isLiked ? Colors.red : null,
                    size: 20,
                  ),
                  onPressed: _toggleLike,
                ),
                Text(
                  '${widget.comment.likes}',
                  style: const TextStyle(fontSize: 14),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays > 7) {
      return '${date.day}/${date.month}/${date.year}';
    } else if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }
}

