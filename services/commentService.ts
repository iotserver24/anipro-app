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
export const getAnimeComments = async (animeId: string) => {
  try {
    const commentsQuery = query(
      collection(db, 'comments'),
      where('animeId', '==', animeId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(commentsQuery);
    const comments: Comment[] = [];
    
    querySnapshot.forEach((doc) => {
      comments.push({ id: doc.id, ...doc.data() } as Comment);
    });
    
    return comments;
  } catch (error) {
    console.error('Error fetching comments:', error);
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
    console.log('Starting comment avatar migration...');
    
    // Fetch all available avatars from the API
    let avatarsMap = new Map();
    try {
      const avatarsResponse = await fetch('https://app.animeverse.cc/api/avatars/list');
      if (avatarsResponse.ok) {
        const avatars = await avatarsResponse.json();
        // Create a map for quick lookups
        avatars.forEach((avatar: any) => {
          if (avatar.id && avatar.url) {
            avatarsMap.set(avatar.id, avatar.url);
          }
        });
        console.log(`Loaded ${avatarsMap.size} avatars from API`);
      }
    } catch (error) {
      console.warn('Error fetching avatars for migration:', error);
      // Continue with migration even if we can't get the avatars
    }
    
    // Get all comments that need avatar updating
    const commentsQuery = query(
      collection(db, 'comments'),
      where('userAvatar', '==', null)
    );
    
    try {
      const commentsSnapshot = await getDocs(commentsQuery);
      
      if (commentsSnapshot.empty) {
        console.log('No comments require avatar migration');
        return { success: true, updatedCount: 0 };
      }
      
      console.log(`Found ${commentsSnapshot.size} comments that need avatar migration`);
      
      // Group comments by userId to minimize Firestore reads
      const userComments = new Map<string, {id: string, userId: string}[]>();
      commentsSnapshot.forEach(doc => {
        const data = doc.data();
        // Only process if userId exists
        if (data.userId) {
          const comment = { id: doc.id, userId: data.userId };
          if (!userComments.has(data.userId)) {
            userComments.set(data.userId, []);
          }
          userComments.get(data.userId)?.push(comment);
        }
      });
      
      // Process comments in batches by user
      let totalUpdated = 0;
      const batch = writeBatch(db);
      let batchSize = 0;
      const MAX_BATCH_SIZE = 500; // Firestore limit is 500 operations per batch
      
      // For each user, get their avatar and update all their comments
      for (const [userId, comments] of userComments.entries()) {
        try {
          // Get user's current avatar
          const userDoc = await getDoc(doc(db, 'users', userId));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const avatarId = userData.avatarId;
            
            // If user has an avatar, use it to update their comments
            if (avatarId && avatarsMap.has(avatarId)) {
              const avatarUrl = avatarsMap.get(avatarId);
              
              // Update all comments by this user
              for (const comment of comments) {
                if (batchSize >= MAX_BATCH_SIZE) {
                  // Commit the current batch and start a new one
                  await batch.commit();
                  console.log(`Committed batch with ${batchSize} updates`);
                  totalUpdated += batchSize;
                  batchSize = 0;
                }
                
                // Add the update to the batch
                batch.update(doc(db, 'comments', comment.id), { userAvatar: avatarUrl });
                batchSize++;
              }
            }
          }
        } catch (userError) {
          console.warn(`Error processing user ${userId} for comment migration:`, userError);
        }
      }
      
      // Commit any remaining updates
      if (batchSize > 0) {
        await batch.commit();
        totalUpdated += batchSize;
        console.log(`Final batch committed with ${batchSize} updates`);
      }
      
      console.log(`Comment avatar migration completed. Updated ${totalUpdated} comments.`);
      return { success: true, updatedCount: totalUpdated };
      
    } catch (queryError) {
      console.error('Error querying comments for migration:', queryError);
      return { success: false, error: queryError };
    }
  } catch (error) {
    console.error('Error in comment avatar migration:', error);
    return { success: false, error };
  }
}; 