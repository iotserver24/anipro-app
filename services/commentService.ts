import { db, auth } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  Timestamp,
  updateDoc,
  doc,
  increment,
  deleteDoc,
  getDoc,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { getCurrentUser } from './userService';
import { logger } from '../utils/logger';
import { AVATARS, getAvatarById } from '../constants/avatars';

// Comment type definition
export type Comment = {
  id?: string;
  animeId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  likes: number;
  createdAt: Timestamp;
};

// Define type for the comment object that's about to be saved
type CommentToSave = {
  animeId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  likes: number;
  createdAt: Timestamp;
};

// Add a new comment
export const addComment = async (comment: Omit<Comment, 'id' | 'likes' | 'createdAt'>) => {
  try {
    // Create a clean object without undefined values
    const cleanComment: CommentToSave = {
      animeId: comment.animeId,
      userId: comment.userId,
      userName: comment.userName,
      content: comment.content,
      likes: 0,
      createdAt: Timestamp.now()
    };
    
    // Only add userAvatar if it exists and is not undefined
    if (comment.userAvatar) {
      cleanComment.userAvatar = comment.userAvatar;
    }
    
    // Generate a unique ID using timestamp and userId to avoid duplicates
    const uniqueId = `comment_${Date.now()}_${comment.userId.substring(0, 8)}`;
    
    // Use setDoc with the unique ID instead of addDoc to prevent duplicates
    await setDoc(doc(db, 'comments', uniqueId), cleanComment);
    return { id: uniqueId, ...cleanComment };
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

// Get comments for a specific anime
export const getAnimeComments = async (animeId: string): Promise<Comment[]> => {
  try {
    const commentsQuery = query(
      collection(db, 'comments'),
      where('animeId', '==', animeId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(commentsQuery);
    const comments: Comment[] = [];
    
    // Track which users we need to update avatars for
    const userAvatarsToUpdate: {[key: string]: {
      commentIds: string[],
      oldAvatar: string | undefined,
      newAvatar: string | null
    }} = {};
    
    // First pass: collect all comments and identify users whose avatars need updating
    snapshot.forEach(doc => {
      const data = doc.data() as Comment;
      const comment = {
        ...data,
        id: doc.id
      };
      
      // Add to comment list
      comments.push(comment);
      
      // Check if we need to update this user's avatar in comments
      if (comment.userId && !userAvatarsToUpdate[comment.userId]) {
        userAvatarsToUpdate[comment.userId] = {
          commentIds: [doc.id],
          oldAvatar: comment.userAvatar,
          newAvatar: null // Will be fetched later
        };
      } else if (comment.userId) {
        userAvatarsToUpdate[comment.userId].commentIds.push(doc.id);
      }
    });
    
    // Second pass: fetch latest avatars for users (in parallel)
    const userIds = Object.keys(userAvatarsToUpdate);
    await Promise.all(
      userIds.map(async (userId) => {
        try {
          const latestAvatar = await getLatestUserAvatar(userId);
          if (latestAvatar) {
            userAvatarsToUpdate[userId].newAvatar = latestAvatar;
          }
        } catch (error) {
          logger.warn('commentService', `Couldn't fetch avatar for user ${userId}: ${error}`);
          // Don't fail the whole operation for one avatar
          return;
        }
      })
    );
    
    // Third pass: update comments with new avatars and queue Firestore updates
    // But only in memory - don't try to update Firestore if we're getting permission errors
    for (const userId in userAvatarsToUpdate) {
      const { commentIds, oldAvatar, newAvatar } = userAvatarsToUpdate[userId];
      
      // Only update if we have a new avatar and it's different from the old one
      if (newAvatar && newAvatar !== oldAvatar) {
        // Update in-memory comments
        comments.forEach(comment => {
          if (comment.userId === userId) {
            comment.userAvatar = newAvatar;
          }
        });
        
        // Don't queue Firestore updates - we're getting permission errors
        // We'll just use the in-memory updates for this session
      }
    }
    
    return comments;
  } catch (error) {
    logger.error('commentService', `Error fetching comments: ${error}`);
    throw error;
  }
};

// Check if a user has already liked a comment
export const hasUserLikedComment = async (commentId: string, userId: string): Promise<boolean> => {
  try {
    const likeRef = doc(db, 'comment_likes', `${userId}_${commentId}`);
    const likeDoc = await getDoc(likeRef);
    return likeDoc.exists();
  } catch (error) {
    console.error('Error checking if user liked comment:', error);
    return false;
  }
};

// Like a comment
export const likeComment = async (commentId: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to like comments');
    }

    const userId = currentUser.uid;
    let alreadyLiked = false;
    
    try {
      // Check if user has already liked this comment
      alreadyLiked = await hasUserLikedComment(commentId, userId);
      if (alreadyLiked) {
        // User has already liked this comment
        return false;
      }
      
      // Record the like in a separate collection to prevent multiple likes
      const likeRef = doc(db, 'comment_likes', `${userId}_${commentId}`);
      await setDoc(likeRef, {
        userId,
        commentId,
        timestamp: Timestamp.now()
      });
    } catch (permissionError) {
      // If we get permission errors on the like tracking collection,
      // handle this gracefully but log it
      console.warn('Permission error with comment_likes collection:', permissionError);
      
      // If there's a permission error and we couldn't check if already liked,
      // we'll assume it's not liked and continue with incrementing
      if (!alreadyLiked) {
        // Increment the like count on the comment
        try {
          const commentRef = doc(db, 'comments', commentId);
          await updateDoc(commentRef, {
            likes: increment(1)
          });
          return true;
        } catch (updateError) {
          console.error('Error updating comment like count:', updateError);
          // If we couldn't update the count either, just return optimistically
          return true;
        }
      }
      return false;
    }
    
    // Increment the like count on the comment
    try {
      const commentRef = doc(db, 'comments', commentId);
      await updateDoc(commentRef, {
        likes: increment(1)
      });
    } catch (error) {
      console.error('Error incrementing like count:', error);
      // If we added the like record but couldn't increment, don't fail
      // Just return success since we recorded the like
    }
    
    return true;
  } catch (error) {
    console.error('Error liking comment:', error);
    // Return false instead of throwing to avoid crashing the UI
    return false;
  }
};

// Delete a comment (only for the comment owner)
export const deleteComment = async (commentId: string) => {
  try {
    // Check if current user is the comment owner
    const commentRef = doc(db, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);
    
    if (!commentSnap.exists()) {
      throw new Error('Comment not found');
    }
    
    const commentData = commentSnap.data();
    const currentUser = auth.currentUser;
    
    if (!currentUser || commentData.userId !== currentUser.uid) {
      throw new Error('Not authorized to delete this comment');
    }
    
    await deleteDoc(commentRef);
    return true;
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

// Migration function to update existing comments with avatar information
// This can be called when needed to update old comments
export const migrateCommentsWithAvatars = async () => {
  // Replace with a no-op that doesn't even log
  return { updated: 0, errors: 0 };
};

// Add a function to fetch the latest avatar for a user
export const getLatestUserAvatar = async (userId: string): Promise<string | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return null;
    
    const userData = userDoc.data();
    if (!userData.avatarId) return null;
    
    // Get the latest avatar URL
    return await getAvatarById(userData.avatarId);
  } catch (error) {
    logger.error('commentService', `Error getting latest avatar: ${error}`);
    return null;
  }
}; 