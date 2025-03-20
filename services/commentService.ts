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
    
    const docRef = await addDoc(collection(db, 'comments'), cleanComment);
    return { id: docRef.id, ...cleanComment };
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
        const latestAvatar = await getLatestUserAvatar(userId);
        if (latestAvatar) {
          userAvatarsToUpdate[userId].newAvatar = latestAvatar;
        }
      })
    );
    
    // Third pass: update comments with new avatars and queue Firestore updates
    const updates: Promise<void>[] = [];
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
        
        // Queue Firestore updates (but don't wait for them)
        commentIds.forEach(commentId => {
          updates.push(
            updateDoc(doc(db, 'comments', commentId), {
              userAvatar: newAvatar
            }).catch(err => {
              logger.warn('commentService', `Failed to update avatar for comment ${commentId}: ${err}`);
            })
          );
        });
      }
    }
    
    // Start updates but don't wait for them (to keep UI responsive)
    if (updates.length > 0) {
      logger.info('commentService', `Updating avatars for ${updates.length} comments in background`);
      Promise.all(updates).then(() => {
        logger.info('commentService', 'Avatar updates completed successfully');
      }).catch(error => {
        logger.error('commentService', `Error updating comment avatars: ${error}`);
      });
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
    
    try {
      // Check if user has already liked this comment
      const alreadyLiked = await hasUserLikedComment(commentId, userId);
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
      // just continue with incrementing the likes count
      console.warn('Permission error with comment_likes collection, falling back to basic like functionality:', permissionError);
    }
    
    // Increment the like count on the comment
    const commentRef = doc(db, 'comments', commentId);
    await updateDoc(commentRef, {
      likes: increment(1)
    });
    
    return true;
  } catch (error) {
    console.error('Error liking comment:', error);
    throw error;
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
  try {
    console.log('[AvatarMigration] Starting comment avatar migration...');
    
    // Fetch all available avatars from the API
    let avatarsMap = new Map();
    try {
      // Try multiple domain patterns to ensure we can reach the API
      const apiUrls = [
        'https://anisurge.me/api/avatars/list',
        'https://app.animeverse.cc/api/avatars/list',
        'https://api.animeverse.cc/avatars/list'
      ];
      
      let fetchSuccess = false;
      for (const url of apiUrls) {
        try {
          console.log(`[AvatarMigration] Trying to fetch avatars from: ${url}`);
          const avatarsResponse = await fetch(url, { 
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' } 
          });
          
          if (avatarsResponse.ok) {
            const avatars = await avatarsResponse.json();
            // Create a map for quick lookups
            avatars.forEach((avatar: any) => {
              if (avatar.id && avatar.url) {
                avatarsMap.set(avatar.id, avatar.url);
              }
            });
            console.log(`[AvatarMigration] Loaded ${avatarsMap.size} avatars from API`);
            fetchSuccess = true;
            break;
          } else {
            console.warn(`[AvatarMigration] Failed to fetch from ${url}: ${avatarsResponse.status}`);
          }
        } catch (urlError) {
          console.warn(`[AvatarMigration] Error fetching from ${url}:`, urlError);
        }
      }
      
      if (!fetchSuccess) {
        console.warn('[AvatarMigration] Could not fetch avatars from any endpoint');
      }
    } catch (error) {
      console.warn('[AvatarMigration] Error fetching avatars for migration:', error);
      // Continue with migration even if we can't get the avatars
    }
    
    if (avatarsMap.size === 0) {
      // If we couldn't get avatars from the API, use the local AVATARS array
      console.log('[AvatarMigration] Using local AVATARS as fallback');
      const { AVATARS } = await import('../constants/avatars');
      AVATARS.forEach(avatar => {
        if (avatar.id && avatar.url) {
          avatarsMap.set(avatar.id, avatar.url);
        }
      });
    }
    
    if (avatarsMap.size === 0) {
      console.error('[AvatarMigration] No avatars available for migration, aborting');
      return { success: false, error: 'No avatars available' };
    }
    
    // Strategy: Instead of just finding comments with null userAvatar,
    // we'll get all comments for users and update them all
    
    // First get all users
    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      
      if (usersSnapshot.empty) {
        console.log('[AvatarMigration] No users found for avatar migration');
        return { success: true, updatedCount: 0 };
      }
      
      console.log(`[AvatarMigration] Found ${usersSnapshot.size} users for potential comment avatar updates`);
      
      // Process each user
      let totalUpdated = 0;
      let totalErrors = 0;
      
      for (const userDoc of usersSnapshot.docs) {
        try {
          const userData = userDoc.data();
          const userId = userDoc.id;
          const avatarId = userData.avatarId;
          
          if (!avatarId) {
            console.log(`[AvatarMigration] User ${userId} has no avatarId, skipping`);
            continue;
          }
          
          // Get the avatar URL for this user
          let avatarUrl = avatarsMap.get(avatarId);
          if (!avatarUrl) {
            console.log(`[AvatarMigration] No avatar URL found for avatarId ${avatarId}, skipping user ${userId}`);
            continue;
          }
          
          console.log(`[AvatarMigration] Processing comments for user ${userId} with avatar ${avatarId}`);
          
          // Get all comments by this user
          const commentsQuery = query(
            collection(db, 'comments'),
            where('userId', '==', userId)
          );
          
          const commentsSnapshot = await getDocs(commentsQuery);
          
          if (commentsSnapshot.empty) {
            console.log(`[AvatarMigration] No comments found for user ${userId}`);
            continue;
          }
          
          console.log(`[AvatarMigration] Found ${commentsSnapshot.size} comments for user ${userId}`);
          
          // Update comments in batches
          const MAX_BATCH_SIZE = 500; // Firestore limit
          let batch = writeBatch(db);
          let batchSize = 0;
          let userUpdated = 0;
          
          commentsSnapshot.forEach(commentDoc => {
            const commentData = commentDoc.data();
            // Only update if the avatar URL is different
            if (commentData.userAvatar !== avatarUrl) {
              batch.update(commentDoc.ref, { userAvatar: avatarUrl });
              batchSize++;
              userUpdated++;
              
              if (batchSize >= MAX_BATCH_SIZE) {
                // Commit the current batch and start a new one
                batch.commit();
                console.log(`[AvatarMigration] Committed batch with ${batchSize} updates for user ${userId}`);
                batch = writeBatch(db);
                batchSize = 0;
              }
            }
          });
          
          // Commit any remaining updates
          if (batchSize > 0) {
            await batch.commit();
            console.log(`[AvatarMigration] Committed final batch with ${batchSize} updates for user ${userId}`);
          }
          
          console.log(`[AvatarMigration] Updated ${userUpdated} comments for user ${userId}`);
          totalUpdated += userUpdated;
        } catch (userError) {
          console.warn(`[AvatarMigration] Error processing user ${userDoc.id}:`, userError);
          totalErrors++;
        }
      }
      
      console.log(`[AvatarMigration] Comment avatar migration completed. Updated ${totalUpdated} comments, encountered ${totalErrors} errors.`);
      return { success: true, updatedCount: totalUpdated, errors: totalErrors };
      
    } catch (error) {
      console.error('[AvatarMigration] Error during comment avatar migration:', error);
      return { success: false, error };
    }
  } catch (error) {
    console.error('[AvatarMigration] Error in comment avatar migration:', error);
    return { success: false, error };
  }
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