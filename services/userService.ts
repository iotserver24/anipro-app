import { auth } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile, 
  signOut as firebaseSignOut,
  User,
  onAuthStateChanged,
  signInWithCustomToken,
  getAuth,
  setPersistence,
  browserLocalPersistence,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, Timestamp, updateDoc, writeBatch, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Avatar } from '../constants/avatars';
import { logger } from '../utils/logger';

// Constants for AsyncStorage keys
const USER_AUTH_KEY = 'user_auth';
const USER_DATA_KEY = 'user_data';
const USER_CREDENTIALS_KEY = 'user_credentials';

// Enhanced user session storage
export const storeUserSession = async (user: User, credentials?: { email: string, password: string }) => {
  try {
    // Store basic auth data
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      createdAt: user.metadata.creationTime,
      lastLoginAt: user.metadata.lastSignInTime
    };
    
    await AsyncStorage.setItem(USER_AUTH_KEY, JSON.stringify(userData));
    
    // If provided, securely store credentials for session restoration
    if (credentials) {
      await AsyncStorage.setItem(USER_CREDENTIALS_KEY, JSON.stringify(credentials));
    }
    
    // Also fetch and store Firestore user data if available
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userDoc.data()));
      }
    } catch (error) {
      console.warn('Could not store Firestore user data:', error);
    }
    
    console.log('User session stored successfully');
  } catch (error) {
    console.error('Error storing user session:', error);
  }
};

// Clear user session
export const clearUserSession = async () => {
  try {
    await AsyncStorage.removeItem(USER_AUTH_KEY);
    await AsyncStorage.removeItem(USER_DATA_KEY);
    await AsyncStorage.removeItem(USER_CREDENTIALS_KEY);
    console.log('User session cleared successfully');
  } catch (error) {
    console.error('Error clearing user session:', error);
  }
};

// Restore user session on app start (to be called in _layout.tsx or similar)
export const restoreUserSession = async (): Promise<boolean> => {
  try {
    // Check for stored credentials first
    const storedCredentials = await AsyncStorage.getItem(USER_CREDENTIALS_KEY);
    
    if (storedCredentials) {
      const credentials = JSON.parse(storedCredentials);
      console.log('[DEBUG] Restoring session using stored credentials');
      
      try {
        // Try to silently sign in with stored credentials
        await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
        console.log('[DEBUG] Session restored successfully with stored credentials');
        return true;
      } catch (error) {
        console.warn('[DEBUG] Failed to restore session with credentials:', error);
        // If sign-in fails, clear the stored credentials to prevent future failed attempts
        await AsyncStorage.removeItem(USER_CREDENTIALS_KEY);
      }
    }
    
    // If no credentials or sign-in failed, check if user is already authenticated
    if (auth.currentUser) {
      console.log('[DEBUG] User already authenticated in Firebase');
      return true;
    }
    
    // Fallback: check for stored user data
    const userData = await AsyncStorage.getItem(USER_AUTH_KEY);
    if (userData) {
      console.log('[DEBUG] Found stored user data but could not automatically sign in');
      // We won't be able to auto-restore the session completely,
      // but we can let the app know there was a previous session
      return false;
    }
    
    return false;
  } catch (error) {
    console.error('Error restoring user session:', error);
    return false;
  }
};

// Check if username is already taken
const isUsernameTaken = async (username: string): Promise<boolean> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username.toLowerCase()));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking username:', error);
    // If we can't check (e.g., due to permissions), assume it's not taken
    // The final write will still fail if there's a conflict
    return false;
  }
};

// Register new user with email and password
export const registerUser = async (email: string, password: string, username: string): Promise<User> => {
  try {
    // First check if username is taken
    const taken = await isUsernameTaken(username);
    if (taken) {
      throw { code: 'username-taken', message: 'Username is already taken' };
    }

    // If username is available, create the user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    try {
      // Try to save user data to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        username: username.toLowerCase(),
        createdAt: Timestamp.now(),
        avatarId: 'default', // Set default avatar
        emailVerified: false // Track email verification status
      });
      
      // Send verification email
      await sendEmailVerification(user);
      
    } catch (error) {
      // If saving to Firestore fails, delete the auth user
      await user.delete();
      throw error;
    }
    
    // Store session with credentials for auto-login
    await storeUserSession(user, { email, password });
    
    return user;
  } catch (error: any) {
    console.error('Registration error:', error);
    throw error;
  }
};

// Update user's avatar
export const updateUserAvatar = async (avatarId: string): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to update avatar');
    }

    console.log(`[AvatarUpdate] Starting avatar update to ${avatarId} for user ${currentUser.uid}`);

    // Get the avatar URL
    let avatarUrl = '';
    try {
      // Try multiple domain patterns to ensure we can reach the API even with domain changes
      const apiUrls = [
        'https://anisurge.me/api/avatars/list',
        'https://app.animeverse.cc/api/avatars/list',
        'https://api.animeverse.cc/avatars/list'
      ];
      
      let fetchSuccess = false;
      for (const url of apiUrls) {
        try {
          console.log(`[AvatarUpdate] Trying to fetch avatars from: ${url}`);
          const avatarResponse = await fetch(url, { 
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' } 
          });
          
          if (avatarResponse.ok) {
            const avatars = await avatarResponse.json();
            const avatar = avatars.find((a: any) => a.id === avatarId);
            if (avatar && avatar.url) {
              avatarUrl = avatar.url;
              console.log(`[AvatarUpdate] Successfully found avatar URL: ${avatarUrl}`);
              fetchSuccess = true;
              break;
            }
          } else {
            console.warn(`[AvatarUpdate] Failed to fetch from ${url}: ${avatarResponse.status}`);
          }
        } catch (urlError) {
          console.warn(`[AvatarUpdate] Error fetching from ${url}:`, urlError);
        }
      }
      
      if (!fetchSuccess) {
        // Try to find it in the local AVATARS array as fallback
        console.log(`[AvatarUpdate] Falling back to local AVATARS array`);
        const { AVATARS } = await import('../constants/avatars');
        const avatar = AVATARS.find(a => a.id === avatarId);
        if (avatar) {
          avatarUrl = avatar.url;
          console.log(`[AvatarUpdate] Found avatar in local array: ${avatarUrl}`);
        } else {
          console.warn(`[AvatarUpdate] Avatar with ID ${avatarId} not found even in local array`);
        }
      }
    } catch (error) {
      console.error('[AvatarUpdate] Error fetching avatar URL:', error);
    }

    if (!avatarUrl) {
      console.warn('[AvatarUpdate] Could not determine avatar URL, only updating avatarId in user profile');
    }

    // Update the avatar in Firestore
    console.log(`[AvatarUpdate] Updating user profile in Firestore with avatarId: ${avatarId}`);
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
      avatarId: avatarId
    });
    console.log(`[AvatarUpdate] User profile updated successfully`);

    // Update all comments by this user with the new avatar URL
    if (avatarUrl) {
      console.log(`[AvatarUpdate] Starting comment updates with avatar URL: ${avatarUrl}`);
      const result = await updateUserCommentsWithAvatar(currentUser.uid, avatarUrl);
      console.log(`[AvatarUpdate] Comment updates complete:`, result);
    } else {
      console.warn('[AvatarUpdate] Skipping comment updates due to missing avatar URL');
    }
    
    // Force a comment avatar migration for this user specifically
    try {
      const { migrateCommentsWithAvatars } = await import('./commentService');
      console.log(`[AvatarUpdate] Running comment avatar migration as a fallback`);
      await migrateCommentsWithAvatars();
    } catch (migrationError) {
      console.error('[AvatarUpdate] Error during migration fallback:', migrationError);
    }
  } catch (error) {
    console.error('[AvatarUpdate] Error updating avatar:', error);
    throw error;
  }
};

// Helper function to update all comments made by a user with their new avatar URL
const updateUserCommentsWithAvatar = async (userId: string, avatarUrl: string): Promise<{success: boolean, count: number, error?: any}> => {
  try {
    console.log(`[AvatarUpdate] Updating comments for user ${userId} with new avatar: ${avatarUrl}`);
    
    // Query all comments by this user
    const commentsQuery = query(
      collection(db, 'comments'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(commentsQuery);
    console.log(`[AvatarUpdate] Found ${querySnapshot.size} comments to update`);
    
    // Use a batch to update all comments at once
    const MAX_BATCH_SIZE = 500; // Firestore limit
    let totalUpdated = 0;
    let batchCount = 0;
    
    if (querySnapshot.size > 0) {
      let batch = writeBatch(db);
      let batchSize = 0;
      
      querySnapshot.forEach((commentDoc) => {
        batch.update(commentDoc.ref, { userAvatar: avatarUrl });
        batchSize++;
        totalUpdated++;
        
        // If we reach the batch limit, commit and start a new batch
        if (batchSize >= MAX_BATCH_SIZE) {
          batchCount++;
          console.log(`[AvatarUpdate] Committing batch ${batchCount} with ${batchSize} updates`);
          batch.commit();
          batch = writeBatch(db);
          batchSize = 0;
        }
      });
      
      // Commit any remaining updates
      if (batchSize > 0) {
        batchCount++;
        console.log(`[AvatarUpdate] Committing final batch ${batchCount} with ${batchSize} updates`);
        await batch.commit();
      }
      
      console.log(`[AvatarUpdate] Successfully updated ${totalUpdated} comments with new avatar`);
      return { success: true, count: totalUpdated };
    } else {
      console.log('[AvatarUpdate] No comments found to update');
      return { success: true, count: 0 };
    }
  } catch (error) {
    console.error('[AvatarUpdate] Error updating user comments with new avatar:', error);
    // Don't throw an error here - return a result object instead
    return { success: false, count: 0, error };
  }
};

// Sign in existing user
export const signInUser = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const { user } = userCredential;
    
    // Store session with credentials for auto-login
    await storeUserSession(user, { email, password });
    
    // Check if email is verified
    if (!user.emailVerified) {
      // Update Firestore to match auth verification status
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        emailVerified: false
      });
      
      // Option: Send a new verification email if not verified
      // Uncomment below if you want to always send a new verification email on login
      // await sendEmailVerification(user);
    } else {
      // Update Firestore to match auth verification status
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        emailVerified: true
      });
    }
    
    // Initialize stores and sync data
    const { useWatchHistoryStore } = await import('../store/watchHistoryStore');
    const { useMyListStore } = await import('../store/myListStore');
    
    // Initialize both stores which will handle merging local and cloud data
    await Promise.all([
      useWatchHistoryStore.getState().initializeHistory(),
      useMyListStore.getState().initializeList()
    ]);
    
    logger.info('User signed in and data synced successfully');
    
    return user;
  } catch (error) {
    console.error('Error signing in user:', error);
    throw error;
  }
};

// Sign out user
export const signOut = async (): Promise<void> => {
  try {
    // Import syncService here to avoid circular dependency
    const { syncService } = await import('./syncService');
    
    // Clear all pending sync operations first
    syncService.clearSyncQueue();
    
    // Sign out from Firebase
    await firebaseSignOut(auth);
    
    // Clear local storage
    await clearUserSession();
    
    // Clear any in-memory caches
    await clearInMemoryCaches();
    
    logger.info('User signed out successfully');
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Helper function to clear in-memory caches
async function clearInMemoryCaches() {
  try {
    // Clear watch history store
    const { useWatchHistoryStore } = await import('../store/watchHistoryStore');
    useWatchHistoryStore.getState().clearHistory();
    
    // Clear watchlist store
    const { useMyListStore } = await import('../store/myListStore');
    useMyListStore.getState().clearList();
    
    logger.info('In-memory caches cleared successfully');
  } catch (error) {
    console.error('Error clearing in-memory caches:', error);
  }
}

// Get current authenticated user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return auth.currentUser !== null;
};

// Send email verification
export const sendVerificationEmail = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No user is currently signed in');
    }
    
    await sendEmailVerification(currentUser);
    logger.info('Verification email sent successfully');
  } catch (error) {
    logger.error('Error sending verification email:', error);
    throw error;
  }
};

// Check if email is verified
export const isEmailVerified = (): boolean => {
  const currentUser = auth.currentUser;
  return currentUser?.emailVerified || false;
};

// Reload user to check for updated verification status
export const reloadUser = async (): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No user is currently signed in');
    }
    
    await currentUser.reload();
    
    // If email is now verified, update Firestore
    if (currentUser.emailVerified) {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        emailVerified: true
      });
    }
    
    return currentUser.emailVerified;
  } catch (error) {
    logger.error('Error reloading user:', error);
    throw error;
  }
}; 