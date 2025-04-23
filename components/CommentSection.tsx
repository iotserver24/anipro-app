import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Platform,
  RefreshControl,
  ToastAndroid,
  Animated
} from 'react-native';
import { Video } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
import UserProfileModal from './UserProfileModal';
import { migrateCommentsWithAvatars } from '../services/commentService';
import { logger } from '../utils/logger';
import UserDonationBadge from './UserDonationBadge';
import { getUserPremiumStatus } from '../services/donationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GifPicker from './GifPicker';

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
  const [refreshedAvatarUrl, setRefreshedAvatarUrl] = useState<string | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  
  // Create animated value for press animation
  const avatarScale = useRef(new Animated.Value(1)).current;
  
  // Handle profile click with enhanced logging
  const handleProfileClick = () => {
    // Animate avatar press
    Animated.sequence([
      Animated.timing(avatarScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(avatarScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
    
    setShowUserProfile(true);
  };
  
  // Debug logging when profile modal visibility changes
  useEffect(() => {
  }, [showUserProfile, comment.userId]);

  const getAvatarUrl = useCallback(() => {
    // First check if we have a refreshed avatar URL from a manual fetch
    if (refreshedAvatarUrl) return { uri: refreshedAvatarUrl };
    
    // If the comment has an avatar URL, use it
    if (comment.userAvatar) {
      // If it's already a full URL, use it directly
      if (comment.userAvatar.startsWith('http')) {
        return { uri: comment.userAvatar };
      }
      
      // Otherwise, try to resolve the avatar from our constants
      try {
        const avatarId = comment.userAvatar;
        // Fix the typing issue by using find() instead of bracket notation
        const avatarItem = Array.isArray(AVATARS) 
          ? AVATARS.find(avatar => avatar.id === avatarId)
          : null;
        
        // Fall back to default if not found
        if (avatarItem) {
          return { uri: avatarItem.url };
        } else {
          // Get the default avatar (first one in array)
          const defaultAvatar = Array.isArray(AVATARS) && AVATARS.length > 0 
            ? AVATARS[0] 
            : { url: 'https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_1280.png' };
          return { uri: defaultAvatar.url };
        }
      } catch (e) {
        // Get the default avatar (first one in array)
        const defaultAvatar = Array.isArray(AVATARS) && AVATARS.length > 0 
          ? AVATARS[0] 
          : { url: 'https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_1280.png' };
        return { uri: defaultAvatar.url };
      }
    }
    
    // Fallback to default avatar
    const defaultAvatar = Array.isArray(AVATARS) && AVATARS.length > 0 
      ? AVATARS[0] 
      : { url: 'https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_1280.png' };
    return { uri: defaultAvatar.url };
  }, [comment.userAvatar, refreshedAvatarUrl]);

  // Format the timestamp to a readable date
  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <View style={styles.commentItem}>
      <View style={styles.commentRow}>
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={handleProfileClick}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
            <Image 
              source={getAvatarUrl()} 
              style={styles.avatar}
              onError={() => {
              }}
            />
          </Animated.View>
        </TouchableOpacity>
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <View style={styles.userInfoColumn}>
              <TouchableOpacity 
                onPress={handleProfileClick}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.userName}>{comment.userName}</Text>
              </TouchableOpacity>
              
              {/* Add donation badge if there's a userId, now positioned below username */}
              {comment.userId && (
                <UserDonationBadge userId={comment.userId} compact={true} />
              )}
            </View>
            <Text style={styles.commentDate}>{formatDate(comment.createdAt)}</Text>
          </View>
          
          <Text style={styles.commentText}>{comment.content}</Text>
          
          {/* Display GIF if present - now supporting MP4 */}
          {comment.gifUrl && (
            <View style={styles.gifContainer}>
              {comment.gifUrl.endsWith('.mp4') ? (
                <Video 
                  source={{ uri: comment.gifUrl }}
                  style={styles.commentGif}
                  resizeMode="contain"
                  isLooping
                  shouldPlay
                  isMuted={true}
                  useNativeControls={false}
                />
              ) : (
                <Image 
                  source={{ uri: comment.gifUrl }} 
                  style={styles.commentGif}
                  resizeMode="contain"
                />
              )}
            </View>
          )}
          
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
      
      {/* Add the UserProfileModal with improved props */}
      {comment.userId && (
        <UserProfileModal 
          visible={Boolean(showUserProfile)}
          onClose={() => {
            setShowUserProfile(false);
          }}
          userId={comment.userId}
        />
      )}
    </View>
  );
};

const CommentSection = ({ animeId, fullscreen = false }: CommentSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [forceRefresh, setForceRefresh] = useState(0); // Counter to force re-renders
  
  // Add GIF picker state
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [selectedGifUrl, setSelectedGifUrl] = useState<string | null>(null);
  
  // Add state to track keyboard visibility
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const keyboardDidShowListener = useRef<any>(null);
  const keyboardDidHideListener = useRef<any>(null);
  
  // Add premium status state
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [lastCommentTime, setLastCommentTime] = useState<Date | null>(null);
  const [commentCooldown, setCommentCooldown] = useState(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add keyboard event listeners
  useEffect(() => {
    keyboardDidShowListener.current = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    keyboardDidHideListener.current = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.current?.remove();
      keyboardDidHideListener.current?.remove();
    };
  }, []);

  // Load comments when component mounts
  useEffect(() => {
    loadComments();
  }, [animeId, forceRefresh]);
  
  // Also load comments when the component comes into focus
  useFocusEffect(
    useCallback(() => {
      loadComments();
      
      // We could also use this opportunity to trigger the avatar migration
      // if we want to ensure avatars are always up to date when viewing comments
      const triggerAvatarCheck = async () => {
        try {
          // Use the directly imported function instead of dynamic import
          await migrateCommentsWithAvatars();
        } catch (error) {
          logger.warn('CommentSection', `Failed to trigger avatar check on focus: ${error}`);
        }
      };
      
      // Only run avatar check occasionally to avoid unnecessary API calls
      if (Math.random() < 0.2) { // 20% chance on each focus
        triggerAvatarCheck();
      }
      
      return () => {
      };
    }, [animeId])
  );

  // Load premium status when component mounts
  useEffect(() => {
    const loadPremiumStatus = async () => {
      if (isAuthenticated()) {
        try {
          const premiumStatus = await getUserPremiumStatus();
          setIsPremiumUser(premiumStatus.isPremium);
          
          // Load last comment time from storage
          const lastCommentTimeStr = await AsyncStorage.getItem('lastCommentTime');
          if (lastCommentTimeStr) {
            setLastCommentTime(new Date(parseInt(lastCommentTimeStr)));
          }
        } catch (error) {
          console.error('Error loading premium status:', error);
          setIsPremiumUser(false);
        }
      }
    };
    
    loadPremiumStatus();
  }, []);
  
  // Update cooldown timer
  useEffect(() => {
    if (!isPremiumUser && lastCommentTime) {
      const updateCooldown = () => {
        const now = new Date();
        const timeSinceLastComment = now.getTime() - lastCommentTime.getTime();
        const cooldownTime = 60000; // 60000ms = 1 minute
        
        if (timeSinceLastComment < cooldownTime) {
          // Calculate remaining seconds
          const remainingMs = cooldownTime - timeSinceLastComment;
          const remainingSeconds = Math.ceil(remainingMs / 1000);
          setCommentCooldown(remainingSeconds);
          
          // Schedule next update
          cooldownTimerRef.current = setTimeout(updateCooldown, 1000);
        } else {
          setCommentCooldown(0);
        }
      };
      
      // Start the countdown
      updateCooldown();
      
      // Clear timer on cleanup
      return () => {
        if (cooldownTimerRef.current) {
          clearTimeout(cooldownTimerRef.current);
        }
      };
    }
  }, [isPremiumUser, lastCommentTime]);

  // Function to load comments
  const loadComments = async () => {
    if (loading) return Promise.resolve(); // Prevent multiple simultaneous loads
    
    setLoading(true);
    try {
      const fetchedComments = await getAnimeComments(animeId);
      setComments(fetchedComments);
      
      // Check which comments the current user has liked
      if (isAuthenticated()) {
        const newLikedComments = new Set<string>();
        await Promise.all(
          fetchedComments.map(async (comment) => {
            if (comment.id) {
              const hasLiked = await hasUserLikedComment(comment.id, getCurrentUser()?.uid || '');
              if (hasLiked) {
                newLikedComments.add(comment.id);
              }
            }
          })
        );
        setLikedComments(newLikedComments);
      }
      
      return fetchedComments; // Return the fetched comments for chaining
    } catch (error) {
      console.error('Error loading comments:', error);
      Alert.alert('Error', 'Failed to load comments. Please try again.');
      return []; // Return empty array on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Function to refresh comments and trigger avatar updates
  const refreshComments = async () => {
    setRefreshing(true);
    setForceRefresh(prev => prev + 1); // Increment to force re-render of child components
    await loadComments();
  };

  // Modify handleSubmitComment to include GIF
  const handleSubmitComment = async () => {
    if (!isAuthenticated()) {
      setShowAuthModal(true);
      return;
    }

    if (!commentText.trim() && !selectedGifUrl) {
      Alert.alert('Error', 'Please enter a comment or select a GIF');
      return;
    }
    
    // Check rate limit for non-premium users
    if (!isPremiumUser && lastCommentTime) {
      const now = new Date();
      const timeSinceLastComment = now.getTime() - lastCommentTime.getTime();
      
      if (timeSinceLastComment < 60000) { // 60000ms = 1 minute
        // Show premium upgrade prompt
        Alert.alert(
          'Comment Rate Limit',
          `Please wait ${commentCooldown} seconds before posting another comment.\n\nPremium users can comment without limits!`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Upgrade to Premium', 
              onPress: () => {
                // Navigate to profile/premium page
                router.navigate('/profile');
              },
              style: 'default'
            }
          ]
        );
        return;
      }
    }

    // Dismiss keyboard first to prevent layout jumping
    Keyboard.dismiss();
    
    setSubmitting(true);
    
    // Create a timeout to stop the loading state after 5 seconds
    const timeoutId = setTimeout(() => {
      setSubmitting(false);
      // Only show this if we're still submitting after 5 seconds
      if (Platform.OS === 'android') {
        ToastAndroid.show('Comment submitted in background', ToastAndroid.SHORT);
      }
    }, 5000);
    
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get the user's username and avatar from the users collection
      let userData;
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (!userDoc.exists()) {
          throw new Error('User data not found');
        }
        userData = userDoc.data();
      } catch (error) {
        // If we can't get user data, proceed with minimal information
        console.warn('Error fetching user data for comment:', error);
        userData = {
          username: 'user',
          avatarId: null
        };
      }
      
      // Get avatar URL from user data
      let userAvatarUrl = '';
      
      // Try to get the latest avatar URL from the API first
      if (userData.avatarId) {
        try {
          const avatarsResponse = await fetch('https://anisurge.me/api/avatars/list');
          if (avatarsResponse.ok) {
            const avatars = await avatarsResponse.json();
            const avatar = avatars.find((a: any) => a.id === userData.avatarId);
            if (avatar && avatar.url) {
              userAvatarUrl = avatar.url;
            }
          }
        } catch (avatarError) {
          // Simplify this error logging
          console.warn('Error fetching avatar');
        }
        
        // If we couldn't get it from the API, fall back to local AVATARS
        if (!userAvatarUrl) {
          const avatar = AVATARS.find(a => a.id === userData.avatarId);
          if (avatar) {
            userAvatarUrl = avatar.url;
          }
        }
      }
      
      // Save the commented text locally before clearing
      const commentContent = commentText.trim();
      
      // Clear input text and selected GIF before updating UI
      setCommentText('');
      
      const comment: Omit<Comment, 'id' | 'likes' | 'createdAt'> = {
        animeId,
        userId: currentUser.uid,
        userName: '@' + (userData.username || 'user'), // Add @ symbol for display
        content: commentContent,
        userAvatar: userAvatarUrl // Add avatar URL from user profile
      };
      
      // Add GIF URL if selected
      if (selectedGifUrl) {
        comment.gifUrl = selectedGifUrl;
        // Clear selected GIF after adding to comment
        setSelectedGifUrl(null);
      }
      
      // Optimistically add comment to UI immediately
      const optimisticComment: Comment = {
        ...comment,
        id: `temp_${Date.now()}`, // Temporary ID that will be replaced
        likes: 0,
        createdAt: Timestamp.now()
      };

      // Update UI with the optimistic comment
      setComments(prevComments => [optimisticComment, ...prevComments]);
      
      // Now actually send to server
      try {
        const addedComment = await addComment(comment);
        
        // Replace the optimistic comment with the real one
        setComments(prevComments => 
          prevComments.map(c => 
            c.id === optimisticComment.id ? addedComment : c
          )
        );
        
        // Update last comment time for non-premium users
        if (!isPremiumUser) {
          const now = new Date();
          setLastCommentTime(now);
          await AsyncStorage.setItem('lastCommentTime', now.getTime().toString());
        }
        
        // Show success message
        if (Platform.OS === 'android') {
          ToastAndroid.show('Comment posted', ToastAndroid.SHORT);
        }
      } catch (serverError) {
        console.error('Server error submitting comment:', serverError);
        
        // Don't remove optimistic comment - maintain for user experience
        // Just silently log the error
        
        // Only show toast for specific errors
        if (serverError.message && serverError.message.includes('Document already exists')) {
          // This is a duplicate comment error
          if (Platform.OS === 'android') {
            ToastAndroid.show('Comment already posted', ToastAndroid.SHORT);
          }
        }
      }
      
    } catch (error) {
      console.error('Error submitting comment:', error);
      
      // Only remove optimistic comment for critical errors
      setComments(prevComments => 
        prevComments.filter(c => !c.id?.startsWith('temp_'))
      );
      
      // Provide user-friendly error message
      let errorMessage = 'Failed to submit comment. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('User not authenticated')) {
          errorMessage = 'Please sign in to comment.';
          setShowAuthModal(true);
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Comment saved locally.';
        }
      }
      
      Alert.alert('Error', errorMessage);
      
      // Keep the comment text so user doesn't lose their input
      setCommentText(commentText);
    } finally {
      clearTimeout(timeoutId); // Clear the timeout
      setSubmitting(false); // Always ensure submitting is reset
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

      const isCurrentlyLiked = likedComments.has(commentId);
      
      // Update UI immediately for better user experience
      if (isCurrentlyLiked) {
        setLikedComments(prev => new Set(Array.from(prev).filter(id => id !== commentId)));
      } else {
        setLikedComments(prev => new Set(prev.add(commentId)));
      }
      
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

      // Try the like operation, but handle failure gracefully
      try {
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
        // Don't revert the UI or show an error message
        // The UI change was already made and we'll keep it that way
        // Just log the error silently
        console.warn('Error updating like status in database, UI is optimistic:', error);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Don't alert the user, just silently maintain the UI state
      // Since we've already updated the UI optimistically
    }
  };

  // Handle delete action
  const handleDeleteComment = async (commentId: string) => {
    // Show confirmation dialog
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteComment(commentId);
              
              // Remove the comment from the UI
              setComments(comments.filter(comment => comment.id !== commentId));
              
              // Show success message
              if (Platform.OS === 'android') {
                ToastAndroid.show('Comment deleted successfully', ToastAndroid.SHORT);
              }
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment. Please try again.');
            }
          }
        }
      ],
      { cancelable: true }
    );
  };

  // Update the isCommentOwner function to handle nullable userId values
  const isCommentOwner = (userId: string | undefined | null): boolean => {
    if (!userId) return false;
    const currentUser = getCurrentUser();
    return Boolean(currentUser && currentUser.uid === userId);
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

  // Show a tooltip occasionally to help users understand they can view profiles
  const showProfileTooltip = useCallback(() => {
    // Only show this tooltip occasionally (10% chance)
    if (Math.random() < 0.1 && comments.length > 0) {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Tap on avatar or username to view user profile', ToastAndroid.SHORT);
      }
    }
  }, [comments.length]);

  // Add to the useEffect that loads comments
  useEffect(() => {
    loadComments().then(() => {
      // Show tooltip hint after comments are loaded
      showProfileTooltip();
    });
  }, [animeId, forceRefresh, showProfileTooltip]);

  // Handle GIF selection
  const handleSelectGif = (gifUrl: string) => {
    setSelectedGifUrl(gifUrl);
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, fullscreen && styles.fullscreenContainer]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Comments header */}
      {!fullscreen && (
        <View style={styles.headerContainer}>
          <Text style={styles.sectionTitle}>Comments</Text>
          <View style={styles.headerRight}>
            <Text style={styles.commentCount}>{comments.length} comments</Text>
          </View>
        </View>
      )}
      
      {/* Comments List */}
      <View style={[
        styles.commentsContainer,
        keyboardVisible && styles.commentsContainerWithKeyboard
      ]}>
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id || Math.random().toString()}
          renderItem={({ item }) => (
            <CommentItem 
              comment={item} 
              onLike={() => handleLikeComment(item.id as string)} 
              onDelete={() => handleDeleteComment(item.id as string)}
              isOwner={isCommentOwner(item.userId)}
              isLiked={likedComments.has(item.id as string)}
            />
          )}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator size="large" color="#f4511e" style={styles.loader} />
            ) : (
              <View style={styles.emptyCommentsContainer}>
                <Text style={styles.emptyCommentsText}>No comments yet. Be the first!</Text>
              </View>
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshComments}
              colors={['#f4511e']}
              tintColor="#f4511e"
            />
          }
          contentContainerStyle={[
            styles.commentsList,
            comments.length === 0 && { flex: 1 }
          ]}
        />
      </View>
      
      {/* Comment Input - Fixed position at bottom */}
      <View style={styles.inputContainer}>
        {!isAuthenticated() ? (
          <TouchableOpacity 
            style={styles.loginToComment}
            onPress={() => setShowAuthModal(true)}
          >
            <MaterialIcons name="login" size={20} color="#fff" />
            <Text style={styles.loginText}>Login to comment</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.inputRow}>
              {/* Display GIF preview if selected */}
              {selectedGifUrl && (
                <View style={styles.selectedGifContainer}>
                  {selectedGifUrl.endsWith('.mp4') ? (
                    <Video
                      source={{ uri: selectedGifUrl }}
                      style={styles.selectedGifPreview}
                      resizeMode="cover"
                      isLooping
                      shouldPlay
                      isMuted={true}
                      useNativeControls={false}
                    />
                  ) : (
                    <Image 
                      source={{ uri: selectedGifUrl }} 
                      style={styles.selectedGifPreview} 
                      resizeMode="cover"
                    />
                  )}
                  <TouchableOpacity 
                    style={styles.removeGifButton}
                    onPress={() => setSelectedGifUrl(null)}
                  >
                    <MaterialIcons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
              
              <TextInput
                style={[styles.input, selectedGifUrl && styles.inputWithGif]}
                placeholder="Add a comment..."
                placeholderTextColor="#999"
                value={commentText}
                onChangeText={setCommentText}
                multiline={true}
                maxLength={280}
              />
            </View>
            
            <View style={styles.actionButtonsRow}>
              {/* GIF Button */}
              <TouchableOpacity 
                style={styles.gifButton}
                onPress={() => setShowGifPicker(true)}
              >
                <Text style={styles.gifButtonText}>GIF</Text>
              </TouchableOpacity>
              
              {/* Submit Button */}
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  (submitting || (!isPremiumUser && commentCooldown > 0)) && styles.disabledButton
                ]}
                onPress={handleSubmitComment}
                disabled={submitting || (!isPremiumUser && commentCooldown > 0)}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialIcons name="send" size={24} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
            
            {/* Show cooldown indicator for non-premium users */}
            {!isPremiumUser && commentCooldown > 0 && (
              <View style={styles.cooldownContainer}>
                <MaterialIcons name="timer" size={14} color="#f4511e" />
                <Text style={styles.cooldownText}>
                  {commentCooldown}s
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      'Comment Cooldown',
                      'Non-premium users can post one comment per minute.\n\nUpgrade to Premium to comment without limits!',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'Upgrade to Premium', 
                          onPress: () => {
                            // Navigate to profile/premium page
                            router.navigate('/profile');
                          }
                        }
                      ]
                    );
                  }}
                >
                  <MaterialIcons name="info-outline" size={14} color="#f4511e" />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
      
      {/* GIF Picker Modal */}
      <GifPicker 
        isVisible={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelectGif={handleSelectGif}
      />
      
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
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  inputRow: {
    flexDirection: 'column',
    width: '100%',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  input: {
    color: '#fff',
    fontSize: 14,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#232323',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    width: '100%',
  },
  inputWithGif: {
    marginTop: 8,
  },
  gifButton: {
    backgroundColor: '#333',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  gifButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  submitButton: {
    backgroundColor: '#f4511e',
    borderRadius: 24,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderRadius: 20,
    overflow: 'hidden',
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(244, 81, 30, 0.3)',
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
  userInfoColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginRight: 12,
  },
  userName: {
    color: '#f4511e',
    fontWeight: 'bold',
    marginBottom: 4,
    fontSize: 15,
  },
  commentDate: {
    color: '#666',
    fontSize: 12,
  },
  commentText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
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
  emptyCommentsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCommentsText: {
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
  },
  commentsContainerWithKeyboard: {
    paddingBottom: Platform.OS === 'android' ? 48 : 0, // Add additional padding when keyboard is visible
  },
  loginToComment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f4511e',
    borderRadius: 24,
  },
  loginText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cooldownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: 8,
    right: 64,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cooldownText: {
    color: '#f4511e',
    fontSize: 12,
    marginHorizontal: 4,
    fontWeight: 'bold',
  },
  selectedGifContainer: {
    position: 'relative',
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  selectedGifPreview: {
    width: '100%',
    height: '100%',
  },
  removeGifButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gifContainer: {
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  commentGif: {
    width: '100%',
    height: 180,
  },
});

export default CommentSection; 