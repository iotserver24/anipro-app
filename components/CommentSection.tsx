import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Alert,
  Keyboard,
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { 
  Comment, 
  addComment, 
  getAnimeComments, 
  likeComment, 
  deleteComment,
  hasUserLikedComment 
} from '../services/commentService';
import { isAuthenticated, getCurrentUser } from '../services/userService';
import { Timestamp, getDoc, doc, deleteDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../services/firebase';
import AuthModal from './AuthModal';
import { AVATARS } from '../constants/avatars';
import { useFocusEffect } from '@react-navigation/native';

type CommentSectionProps = {
  animeId: string;
  fullscreen?: boolean;
};

const CommentItem = ({ 
  comment, 
  onLike, 
  onDelete, 
  isOwner,
  isLiked 
}: { 
  comment: Comment; 
  onLike: () => void; 
  onDelete: () => void; 
  isOwner: boolean;
  isLiked: boolean;
}) => {
  // Format the timestamp to a readable date
  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Get avatar URL from avatarId or use default
  const getAvatarUrl = () => {
    if (comment.userAvatar) {
      return { uri: comment.userAvatar };
    }
    // Fallback to default avatar
    return { uri: AVATARS[0].url };
  };

  return (
    <View style={styles.commentItem}>
      <View style={styles.commentRow}>
        <View style={styles.avatarContainer}>
          <Image 
            source={getAvatarUrl()} 
            style={styles.avatar}
            onError={() => console.warn('Failed to load comment avatar')}
          />
        </View>
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.userName}>{comment.userName}</Text>
            <Text style={styles.commentDate}>{formatDate(comment.createdAt)}</Text>
          </View>
          
          <Text style={styles.commentText}>{comment.content}</Text>
          
          <View style={styles.commentActions}>
            <TouchableOpacity style={styles.likeButton} onPress={onLike}>
              <MaterialIcons 
                name={isLiked ? "thumb-up" : "thumb-up-off-alt"} 
                size={18} 
                color={isLiked ? "#f4511e" : "#666"} 
              />
              <Text style={[styles.likeCount, isLiked && styles.likedText]}>
                {comment.likes}
              </Text>
            </TouchableOpacity>
            
            {isOwner && (
              <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
                <MaterialIcons name="delete" size={18} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const CommentSection = ({ animeId, fullscreen = false }: CommentSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [likedComments, setLikedComments] = useState<{ [key: string]: boolean }>({});

  // Load comments when the component mounts
  useEffect(() => {
    loadComments();
  }, [animeId]);
  
  // Reload comments when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('Comment section focused, reloading comments');
      loadComments();
      return () => {
        // This runs when the screen is unfocused
        console.log('Comment section unfocused');
      };
    }, [animeId])
  );

  // Load comments from Firebase
  const loadComments = async () => {
    try {
      setLoading(true);
      const animeComments = await getAnimeComments(animeId);
      setComments(animeComments);

      // Load liked status for each comment if user is authenticated
      if (isAuthenticated()) {
        const currentUser = getCurrentUser();
        if (currentUser) {
          const likes: { [key: string]: boolean } = {};
          for (const comment of animeComments) {
            if (comment.id) {
              const hasLiked = await hasUserLikedComment(comment.id, currentUser.uid);
              likes[comment.id] = hasLiked;
            }
          }
          setLikedComments(likes);
        }
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      Alert.alert('Error', 'Failed to load comments. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle comment submission
  const handleSubmitComment = async () => {
    if (!isAuthenticated()) {
      setShowAuthModal(true);
      return;
    }

    if (!commentText.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    setSubmitting(true);
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get the user's username and avatar from the users collection
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists()) {
        throw new Error('User data not found');
      }

      const userData = userDoc.data();
      
      // Get avatar URL from user data
      let userAvatarUrl = '';
      
      // Try to get the latest avatar URL from the API first
      if (userData.avatarId) {
        try {
          const avatarsResponse = await fetch('https://app.animeverse.cc/api/avatars/list');
          if (avatarsResponse.ok) {
            const avatars = await avatarsResponse.json();
            const avatar = avatars.find((a: any) => a.id === userData.avatarId);
            if (avatar && avatar.url) {
              userAvatarUrl = avatar.url;
            }
          }
        } catch (avatarError) {
          console.warn('Error fetching avatar from API:', avatarError);
        }
        
        // If we couldn't get it from the API, fall back to local AVATARS
        if (!userAvatarUrl) {
          const avatar = AVATARS.find(a => a.id === userData.avatarId);
          if (avatar) {
            userAvatarUrl = avatar.url;
          }
        }
      }
      
      const comment = {
        animeId,
        userId: currentUser.uid,
        userName: '@' + userData.username, // Add @ symbol for display
        content: commentText.trim(),
        userAvatar: userAvatarUrl // Add avatar URL from user profile
      };

      await addComment(comment);
      setCommentText('');
      Keyboard.dismiss();
      await loadComments(); // Refresh comments
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to submit comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle like action
  const handleLikeComment = async (commentId: string) => {
    if (!isAuthenticated()) {
      setShowAuthModal(true);
      return;
    }
    
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) return;

      const isCurrentlyLiked = likedComments[commentId] || false;
      
      // Update UI immediately for better user experience
      setLikedComments(prev => ({
        ...prev,
        [commentId]: !isCurrentlyLiked
      }));
      
      setComments(prev => 
        prev.map(comment => 
          comment.id === commentId 
            ? { 
                ...comment, 
                likes: comment.likes + (isCurrentlyLiked ? -1 : 1)
              } 
            : comment
        )
      );

      // Create or delete the like document
      const likeRef = doc(db, 'comment_likes', `${currentUser.uid}_${commentId}`);
      if (isCurrentlyLiked) {
        // Unlike: Delete the like document and decrement the count
        await deleteDoc(likeRef);
        await updateDoc(doc(db, 'comments', commentId), {
          likes: increment(-1)
        });
      } else {
        // Like: Create the like document and increment the count
        await setDoc(likeRef, {
          userId: currentUser.uid,
          commentId,
          timestamp: Timestamp.now()
        });
        await updateDoc(doc(db, 'comments', commentId), {
          likes: increment(1)
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert UI changes if the operation failed
      loadComments();
    }
  };

  // Handle delete action
  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      
      // Remove the comment from the UI
      setComments(comments.filter(comment => comment.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      Alert.alert('Error', 'Failed to delete comment. Please try again.');
    }
  };

  // Check if a comment belongs to the current user
  const isCommentOwner = (userId: string) => {
    const currentUser = getCurrentUser();
    return currentUser && currentUser.uid === userId;
  };

  // Handle pull-to-refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadComments();
  };

  // Handle successful authentication
  const handleAuthSuccess = () => {
    // Reload comments to update the UI with the new user state
    loadComments();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={fullscreen ? 90 : 60}
    >
      {!fullscreen && (
        <View style={styles.headerContainer}>
          <Text style={styles.sectionTitle}>Comments</Text>
          <View style={styles.headerRight}>
            <Text style={styles.commentCount}>{comments.length} comments</Text>
          </View>
        </View>
      )}
      
      {/* Comments List */}
      <View style={styles.commentsContainer}>
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#f4511e" style={styles.loader} />
        ) : (
          <FlatList
            data={comments}
            renderItem={({ item }) => (
              <CommentItem 
                comment={item} 
                onLike={() => handleLikeComment(item.id as string)} 
                onDelete={() => handleDeleteComment(item.id as string)}
                isOwner={isCommentOwner(item.userId)}
                isLiked={likedComments[item.id as string] || false}
              />
            )}
            keyExtractor={item => item.id as string}
            ListEmptyComponent={() => (
              <Text style={styles.emptyText}>No comments yet. Be the first to comment!</Text>
            )}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            contentContainerStyle={styles.commentsList}
          />
        )}
      </View>
      
      {/* Comment Input - Now at the bottom */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder={isAuthenticated() ? "Add a comment..." : "Sign in to comment..."}
          placeholderTextColor="#666"
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={300}
          onFocus={() => {
            if (!isAuthenticated()) {
              Keyboard.dismiss();
              setShowAuthModal(true);
            }
          }}
        />
        <TouchableOpacity 
          style={[
            styles.submitButton, 
            (!commentText.trim() || submitting) && styles.disabledButton
          ]}
          onPress={handleSubmitComment}
          disabled={!commentText.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialIcons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
      
      {/* Auth Modal */}
      <AuthModal 
        isVisible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  fullscreenContainer: {
    paddingTop: 0,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  commentsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  commentsList: {
    paddingBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  commentCount: {
    color: '#666',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  commentInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    minHeight: 40,
    backgroundColor: '#232323',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  submitButton: {
    backgroundColor: '#f4511e',
    borderRadius: 24,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
  loader: {
    marginVertical: 20,
  },
  commentItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  commentRow: {
    flexDirection: 'row',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  userName: {
    color: '#f4511e',
    fontSize: 14,
    fontWeight: 'bold',
  },
  commentDate: {
    color: '#666',
    fontSize: 12,
  },
  commentText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  commentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeCount: {
    color: '#666',
    fontSize: 14,
  },
  deleteButton: {
    padding: 4,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  likedText: {
    color: '#f4511e',
  }
});

export default CommentSection; 