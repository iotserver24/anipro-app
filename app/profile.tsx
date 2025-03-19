import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image, ScrollView, ImageSourcePropType } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { isAuthenticated, getCurrentUser, signOut, updateUserAvatar } from '../services/userService';
import AuthModal from '../components/AuthModal';
import AvatarSelectionModal from '../components/AvatarSelectionModal';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { AVATARS, getAvatarById } from '../constants/avatars';

type UserData = {
  username: string;
  email: string;
  createdAt: any;
  avatarId: string;
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

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Effect to fetch the avatar URL when userData changes
  useEffect(() => {
    if (userData?.avatarId) {
      fetchAvatarUrl(userData.avatarId);
    }
  }, [userData]);

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
        try {
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data() as UserData);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    } else {
      setUserData(null);
      setAvatarUrl(null);
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
          )}
          {authenticated && (
            <View style={styles.editOverlay}>
              <MaterialIcons name="edit" size={24} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
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
  },
  avatarWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  editOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#f4511e',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#121212',
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
}); 