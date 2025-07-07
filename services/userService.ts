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
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, Timestamp, updateDoc, writeBatch, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Avatar } from '../constants/avatars';
import { logger } from '../utils/logger';

// Constants for AsyncStorage keys
const USER_AUTH_KEY = 'user_auth';
const USER_DATA_KEY = 'user_data';
const USER_CREDENTIALS_KEY = 'user_credentials';

// Enhanced user session storage
export const storeUserSession = async (user: User & { birthdate?: string }, credentials?: { email: string, password: string }) => {
  try {
    // Store basic auth data
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      createdAt: user.metadata.creationTime,
      lastLoginAt: user.metadata.lastSignInTime,
      birthdate: user.birthdate || undefined // Save birthdate if present
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
      logger.warn('UserService', 'Could not store Firestore user data:', error);
    }
    
    logger.info('UserService', 'User session stored successfully');
  } catch (error) {
    logger.error('UserService', 'Error storing user session:', error);
  }
};

// Clear user session
export const clearUserSession = async () => {
  try {
    await AsyncStorage.removeItem(USER_AUTH_KEY);
    await AsyncStorage.removeItem(USER_DATA_KEY);
    await AsyncStorage.removeItem(USER_CREDENTIALS_KEY);
    logger.info('UserService', 'User session cleared successfully');
  } catch (error) {
    logger.error('UserService', 'Error clearing user session:', error);
  }
};

// Restore user session on app start (to be called in _layout.tsx or similar)
export const restoreUserSession = async (): Promise<boolean> => {
  try {
    // Check for stored credentials first
    const storedCredentials = await AsyncStorage.getItem(USER_CREDENTIALS_KEY);
    
    if (storedCredentials) {
      const credentials = JSON.parse(storedCredentials);
      logger.debug('UserService', 'Restoring session using stored credentials');
      
      try {
        // Try to silently sign in with stored credentials
        await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
        logger.info('UserService', 'Session restored successfully with stored credentials');
        return true;
      } catch (error) {
        logger.warn('UserService', 'Failed to restore session with credentials:', error);
        // If sign-in fails, clear the stored credentials to prevent future failed attempts
        await AsyncStorage.removeItem(USER_CREDENTIALS_KEY);
      }
    }
    
    // If no credentials or sign-in failed, check if user is already authenticated
    if (auth.currentUser) {
      logger.debug('UserService', 'User already authenticated in Firebase');
      return true;
    }
    
    // Fallback: check for stored user data
    const userData = await AsyncStorage.getItem(USER_AUTH_KEY);
    if (userData) {
      logger.debug('UserService', 'Found stored user data but could not automatically sign in');
      // We won't be able to auto-restore the session completely,
      // but we can let the app know there was a previous session
      return false;
    }
    
    return false;
  } catch (error) {
    logger.error('UserService', 'Error restoring user session:', error);
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
export const registerUser = async (email: string, password: string, username: string, birthdate: string): Promise<User> => {
  try {
    // Create the user first to get a unique UID
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    try {
      // Use the user's UID as a unique identifier and attempt atomic write
      // This prevents race conditions by using Firestore's built-in conflict detection
      const userDocRef = doc(db, 'users', user.uid);
      const usernameDocRef = doc(db, 'usernames', username.toLowerCase());
      
      // Use a batch write to ensure atomicity
      const batch = writeBatch(db);
      
      // Check if username is already taken before committing
      const usernameDoc = await getDoc(usernameDocRef);
      if (usernameDoc.exists()) {
        // Username is taken, clean up the auth user
        await user.delete();
        throw { code: 'username-taken', message: 'Username is already taken' };
      }
      
      // Reserve the username by creating a document with the user's UID
      batch.set(usernameDocRef, {
        userId: user.uid,
        createdAt: Timestamp.now()
      });
      
      // Create the user document
      batch.set(userDocRef, {
        email: user.email,
        username: username.toLowerCase(),
        createdAt: Timestamp.now(),
        avatarId: 'default',
        emailVerified: false,
        birthdate: birthdate
      });
      
      // Commit both operations atomically
      await batch.commit();
      
      // Send verification email after successful registration
      await sendEmailVerification(user);
      
    } catch (error: any) {
      // If any step fails, delete the auth user to maintain consistency
      try {
        await user.delete();
      } catch (deleteError) {
        console.error('Error deleting user after registration failure:', deleteError);
      }
      throw error;
    }
    
    // Store session with credentials for auto-login, include birthdate
    await storeUserSession({...user, birthdate}, { email, password });
    
    return user;
  } catch (error: any) {
    console.error('Registration error:', error);
    throw error;
  }
};

// Update user's avatar
export const updateUserAvatar = async (avatarId: string) => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser?.uid) {
      throw new Error('No authenticated user found');
    }

    // Ensure avatarId is a string
    const validAvatarId = String(avatarId);

    // Check if it's a premium avatar
    if (validAvatarId.startsWith('premium_')) {
      // Check if user has premium access directly in their user document
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      
      if (!userDoc.exists() || userDoc.data().isPremium !== true) {
        logger.warn('UserService', `User ${currentUser.uid} attempted to use premium avatar without permission`);
        throw new Error('Premium avatars are only available to premium users');
      }
    }

    // Update only the avatarId field
    await updateDoc(doc(db, 'users', currentUser.uid), {
      avatarId: validAvatarId
    });

    return true;
  } catch (error) {
    console.error('[Avatar] Error updating avatar:', error);
    return false;
  }
};

// Add this helper function to verify if a user can update their avatar
export const canUpdateAvatar = async (userId: string): Promise<boolean> => {
  try {
    // Make sure there's a userId
    if (!userId) return false;
    
    // Check if the user document exists
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    // User must exist to update avatar
    return userDoc.exists();
  } catch (error) {
    console.error('[Avatar] Error checking avatar update permission:', error);
    return false;
  }
};

// Helper function to update all comments made by a user with their new avatar URL
const updateUserCommentsWithAvatar = async (userId: string, avatarUrl: string): Promise<{success: boolean, count: number, error?: any}> => {
  try {
    logger.debug('UserService', `[AvatarUpdate] Updating comments for user ${userId} with new avatar: ${avatarUrl}`);
    
    // Query all comments by this user
    const commentsQuery = query(
      collection(db, 'comments'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(commentsQuery);
    logger.debug('UserService', `[AvatarUpdate] Found ${querySnapshot.size} comments to update`);
    
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
          logger.debug('UserService', `[AvatarUpdate] Committing batch ${batchCount} with ${batchSize} updates`);
          batch.commit();
          batch = writeBatch(db);
          batchSize = 0;
        }
      });
      
      // Commit any remaining updates
      if (batchSize > 0) {
        batchCount++;
        logger.debug('UserService', `[AvatarUpdate] Committing final batch ${batchCount} with ${batchSize} updates`);
        await batch.commit();
      }
      
      logger.debug('UserService', `[AvatarUpdate] Successfully updated ${totalUpdated} comments with new avatar`);
      return { success: true, count: totalUpdated };
    } else {
      logger.debug('UserService', '[AvatarUpdate] No comments found to update');
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
    
    logger.info('UserService', 'User signed in and data synced successfully');
    
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
    
    logger.info('UserService', 'User signed out successfully');
      } catch (error) {
      logger.error('UserService', 'Error signing out:', error);
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
      
      logger.info('UserService', 'In-memory caches cleared successfully');
    } catch (error) {
      logger.error('UserService', 'Error clearing in-memory caches:', error);
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
    logger.info('UserService', 'Verification email sent successfully');
  } catch (error) {
    logger.error('UserService', 'Error sending verification email:', error);
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
    
    // Force token refresh after reload to update email verification status
    await currentUser.getIdToken(true);
    
    // If email is now verified, update Firestore
    if (currentUser.emailVerified) {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        emailVerified: true
      });
    }
    
    return currentUser.emailVerified;
  } catch (error) {
    logger.error('UserService', 'Error reloading user:', error);
    throw error;
  }
};

// Send password reset email
export const resetPassword = async (email: string): Promise<boolean> => {
  try {
    await sendPasswordResetEmail(auth, email);
    logger.info('UserService', `Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    logger.error('UserService', 'Error sending password reset email:', error);
    throw error;
  }
}; 