import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image, ScrollView, ImageSourcePropType, ToastAndroid, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { 
  isAuthenticated, 
  getCurrentUser, 
  signOut, 
  updateUserAvatar, 
  isEmailVerified,
  reloadUser,
  sendVerificationEmail
} from '../services/userService';
import AuthModal from '../components/AuthModal';
import AvatarSelectionModal from '../components/AvatarSelectionModal';
import EmailVerificationBanner from '../components/EmailVerificationBanner';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { AVATARS, getAvatarById } from '../constants/avatars';
import { logger } from '../utils/logger';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

type UserData = {
  username: string;
  email: string;
  createdAt: any;
  avatarId: string;
  emailVerified?: boolean;
};

export default function ProfileScreen() {
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Effect to fetch the avatar URL when userData changes
  useEffect(() => {
    if (userData?.avatarId) {
      fetchAvatarUrl(userData.avatarId);
    }
  }, [userData]);

  // Add useEffect to fetch comment count
  useEffect(() => {
    const fetchCommentCount = async () => {
      if (!authenticated || !getCurrentUser()) return;
      
      const userId = getCurrentUser()?.uid;
      if (!userId) return;
      
      setCommentLoading(true);
      try {
        const commentsQuery = query(
          collection(db, 'comments'),
          where('userId', '==', userId),
          limit(100) // We just want to count, not fetch all
        );
        
        const commentsSnapshot = await getDocs(commentsQuery);
        setCommentCount(commentsSnapshot.size);
        logger.info('ProfileScreen', `Comment count fetched: ${commentsSnapshot.size}`);
      } catch (error) {
        logger.error('ProfileScreen', `Error fetching comment count: ${error}`);
      } finally {
        setCommentLoading(false);
      }
    };
    
    fetchCommentCount();
  }, [authenticated]);

  const fetchAvatarUrl = async (avatarId: string) => {
    setAvatarLoading(true);
    try {
      // Use the helper function to get the avatar URL
      const url = await getAvatarById(avatarId);
      setAvatarUrl(url);
    } catch (error) {
      console.warn('Error fetching avatar:', error);
      // Fallback to default
      setAvatarUrl(AVATARS[0].url);
    } finally {
      setAvatarLoading(false);
    }
  };

  const checkAuthStatus = async () => {
    const isAuth = isAuthenticated();
    setAuthenticated(isAuth);
    
    if (isAuth) {
      const currentUser = getCurrentUser();
      if (currentUser) {
        // Set email verification status
        setEmailVerified(currentUser.emailVerified);
        
        try {
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserData;
            setUserData(data);
            
            // Update Firestore if auth email verification status has changed
            if (data.emailVerified !== currentUser.emailVerified) {
              await updateDoc(doc(db, 'users', currentUser.uid), {
                emailVerified: currentUser.emailVerified
              });
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    } else {
      setUserData(null);
      setAvatarUrl(null);
      setEmailVerified(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await signOut();
      setAuthenticated(false);
      setUserData(null);
      setAvatarUrl(null);
      Alert.alert('Success', 'You have been logged out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    checkAuthStatus();
  };

  const handleAvatarSelect = async (avatar: { id: string }) => {
    try {
      setUpdatingAvatar(true);
      await updateUserAvatar(avatar.id);
      // Update local state
      if (userData) {
        setUserData({ ...userData, avatarId: avatar.id });
      }
      // Immediately fetch the new avatar URL
      await fetchAvatarUrl(avatar.id);
      setShowAvatarModal(false);
    } catch (error) {
      console.error('Error updating avatar:', error);
      Alert.alert('Error', 'Failed to update avatar. Please try again.');
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const getCurrentAvatar = () => {
    if (avatarUrl) {
      return { uri: avatarUrl };
    }
    // Default fallback
    return { uri: AVATARS[0].url };
  };

  const handleVerificationComplete = async () => {
    // Reload the user to get the latest verification status
    const isVerified = await reloadUser();
    setEmailVerified(isVerified);
    
    // Update the UI
    if (isVerified) {
      Alert.alert('Success', 'Your email has been verified successfully!');
      checkAuthStatus(); // Refresh user data
      
      // Show a toast message about enabled features
      showToast('All app features are now enabled!');
    }
  };
  
  // Helper function to show toast or alert based on platform
  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.LONG);
    } else {
      // For iOS use Alert as a fallback
      Alert.alert('Notice', message);
    }
  };
  
  // Function to handle resending verification email
  const handleResendVerificationEmail = async () => {
    try {
      await sendVerificationEmail();
      showToast('Verification email sent. Please check your inbox.');
    } catch (error) {
      logger.error('Error sending verification email:', error);
      showToast('Failed to send verification email. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f4511e" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={() => authenticated && setShowAvatarModal(true)}
          disabled={!authenticated || updatingAvatar}
        >
          {updatingAvatar || avatarLoading ? (
            <ActivityIndicator size="large" color="#f4511e" />
          ) : (
            <>
              <View style={styles.avatarWrapper}>
                <Image 
                  source={getCurrentAvatar()} 
                  style={styles.avatar}
                  resizeMode="cover"
                  onError={(e) => {
                    console.warn('Failed to load profile avatar');
                    // If the image fails to load, we'll fall back to the default avatar
                    setAvatarUrl(AVATARS[0].url);
                  }}
                />
              </View>
              {authenticated && (
                <View style={styles.editOverlay}>
                  <MaterialIcons name="edit" size={22} color="#fff" />
                </View>
              )}
            </>
          )}
        </TouchableOpacity>

        {/* Show email verification banner for authenticated but unverified users */}
        {authenticated && !emailVerified && (
          <View style={styles.verificationBannerContainer}>
            <EmailVerificationBanner onVerificationComplete={handleVerificationComplete} />
          </View>
        )}

        <Text style={styles.title}>User Profile</Text>
      </View>

      {authenticated && userData ? (
        <View style={styles.profileContainer}>
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Username</Text>
            <Text style={styles.infoValue}>@{userData.username}</Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{userData.email}</Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Account Created</Text>
            <Text style={styles.infoValue}>
              {userData.createdAt?.toDate().toLocaleDateString() || 'Unknown'}
            </Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Comments Posted</Text>
            {commentLoading ? (
              <ActivityIndicator size="small" color="#f4511e" />
            ) : (
              <Text style={styles.infoValue}>
                {commentCount !== null ? commentCount : 'Loading...'}
              </Text>
            )}
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialIcons name="logout" size={24} color="#fff" />
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.unauthenticatedContainer}>
          <Text style={styles.messageText}>
            You are not logged in. Sign in to access your profile.
          </Text>
          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={() => setShowAuthModal(true)}
          >
            <MaterialIcons name="login" size={24} color="#fff" />
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Benefits</Text>
        <View style={styles.benefitItem}>
          <MaterialIcons name="comment" size={24} color="#f4511e" />
          <Text style={styles.benefitText}>Comment on anime episodes</Text>
        </View>
        <View style={styles.benefitItem}>
          <MaterialIcons name="thumb-up" size={24} color="#f4511e" />
          <Text style={styles.benefitText}>Like comments from other users</Text>
        </View>
        <View style={styles.benefitItem}>
          <MaterialIcons name="bookmark" size={24} color="#f4511e" />
          <Text style={styles.benefitText}>Sync your watchlist across devices</Text>
        </View>
      </View>

      {/* Add an extra info section about email verification if not verified */}
      {authenticated && !emailVerified && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Limited Access Mode</Text>
          <Text style={styles.infoText}>
            Your email is not verified yet. Some features like syncing watch history and
            watchlist across devices, commenting, and liking comments require email verification.
          </Text>
          <TouchableOpacity 
            style={styles.verifyButton} 
            onPress={handleResendVerificationEmail}
          >
            <MaterialIcons name="email" size={20} color="#fff" />
            <Text style={styles.buttonText}>Resend Verification Email</Text>
          </TouchableOpacity>
        </View>
      )}

      <AuthModal 
        isVisible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <AvatarSelectionModal
        visible={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        onSelect={handleAvatarSelect}
        selectedAvatarId={userData?.avatarId}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    position: 'relative',
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  avatarWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: '#333',
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  editOverlay: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#121212',
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  profileContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  infoSection: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    color: '#fff',
  },
  unauthenticatedContainer: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  messageText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4511e',
    padding: 12,
    borderRadius: 8,
    width: '60%',
    justifyContent: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4511e',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  benefitText: {
    fontSize: 16,
    color: '#ccc',
    marginLeft: 12,
  },
  verificationBannerContainer: {
    width: '100%',
    marginBottom: 16,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 16,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3', // Blue to differentiate from other buttons
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    marginBottom: 16,
  },
}); 