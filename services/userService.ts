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
  browserLocalPersistence
} from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, Timestamp, updateDoc, writeBatch, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Avatar } from '../constants/avatars';

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
        avatarId: 'default' // Set default avatar
      });
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

    // Get the avatar URL
    let avatarUrl = '';
    try {
      // Find the avatar in the AVATARS array
      const avatarResponse = await fetch('https://app.animeverse.cc/api/avatars/list');
      if (avatarResponse.ok) {
        const avatars = await avatarResponse.json();
        const avatar = avatars.find((a: any) => a.id === avatarId);
        if (avatar && avatar.url) {
          avatarUrl = avatar.url;
        }
      }
    } catch (error) {
      console.warn('Error fetching avatar URL:', error);
      // Continue even if we can't get the URL - we'll still update the avatarId
    }

    // Update the avatar in Firestore
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
      avatarId: avatarId
    });

    // Update all comments by this user with the new avatar URL
    if (avatarUrl) {
      await updateUserCommentsWithAvatar(currentUser.uid, avatarUrl);
    }
  } catch (error) {
    console.error('Error updating avatar:', error);
    throw error;
  }
};

// Helper function to update all comments made by a user with their new avatar URL
const updateUserCommentsWithAvatar = async (userId: string, avatarUrl: string): Promise<void> => {
  try {
    console.log(`Updating comments for user ${userId} with new avatar: ${avatarUrl}`);
    
    // Query all comments by this user
    const commentsQuery = query(
      collection(db, 'comments'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(commentsQuery);
    
    // Use a batch to update all comments at once
    const batch = writeBatch(db);
    let updateCount = 0;
    
    querySnapshot.forEach((commentDoc) => {
      batch.update(commentDoc.ref, { userAvatar: avatarUrl });
      updateCount++;
    });
    
    // Commit the batch if there are updates to make
    if (updateCount > 0) {
      await batch.commit();
      console.log(`Updated avatar in ${updateCount} comments`);
    } else {
      console.log('No comments found to update');
    }
  } catch (error) {
    console.error('Error updating user comments with new avatar:', error);
    // Don't throw an error here - we don't want to fail the avatar update
    // if comment updates fail
  }
};

// Sign in existing user
export const signInUser = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const { user } = userCredential;
    
    // Store session with credentials for auto-login
    await storeUserSession(user, { email, password });
    
    return user;
  } catch (error) {
    console.error('Error signing in user:', error);
    throw error;
  }
};

// Sign out user
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
    await clearUserSession();
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Get current authenticated user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return auth.currentUser !== null;
}; 