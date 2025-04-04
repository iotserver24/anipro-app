import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  View
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { isAuthenticated, getCurrentUser, signOut } from '../services/userService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import AuthModal from './AuthModal';

type AuthButtonProps = {
  showIcon?: boolean;
  buttonStyle?: any;
  textStyle?: any;
  onAuthChange?: (isAuthenticated: boolean) => void;
};

const AuthButton = ({ 
  showIcon = true, 
  buttonStyle, 
  textStyle,
  onAuthChange
}: AuthButtonProps) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  // Check authentication status and subscribe to changes
  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = isAuthenticated();
      setAuthenticated(isAuth);
      
      if (isAuth) {
        const user = getCurrentUser();
        
        // Try to get username from Firestore for better display
        if (user) {
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setUserName('@' + userData.username || 'User');
            } else {
              setUserName(user.displayName || 'User');
            }
          } catch (error) {
            console.warn('Error fetching user data for display:', error);
            setUserName(user.displayName || 'User');
          }
        } else {
          setUserName('User');
        }
      } else {
        setUserName(null);
      }
      
      if (onAuthChange) {
        onAuthChange(isAuth);
      }
    };
    
    // Initial check
    checkAuth();
    
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const isAuth = !!user;
      setAuthenticated(isAuth);
      
      if (isAuth && user) {
        // When auth state changes, update the username
        checkAuth();
      } else {
        setUserName(null);
        if (onAuthChange) {
          onAuthChange(false);
        }
      }
    });
    
    return () => unsubscribe();
  }, [onAuthChange]);

  // Handle login button press
  const handleLoginPress = () => {
    setShowAuthModal(true);
  };

  // Handle logout button press
  const handleLogoutPress = async () => {
    try {
      setLoading(true);
      await signOut();
      setAuthenticated(false);
      setUserName(null);
      
      if (onAuthChange) {
        onAuthChange(false);
      }
      
      Alert.alert('Success', 'You have been logged out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle successful authentication
  const handleAuthSuccess = () => {
    // Don't need to manually set authenticated state here
    // since the auth state listener will handle it
    setShowAuthModal(false);
  };

  return (
    <View>
      {authenticated ? (
        <TouchableOpacity 
          style={[styles.button, buttonStyle]}
          onPress={handleLogoutPress}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              {showIcon && <MaterialIcons name="logout" size={18} color="#fff" style={styles.icon} />}
              <Text style={[styles.buttonText, textStyle]}>
                Logout {userName ? ` ${userName}` : ''}
              </Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={[styles.button, buttonStyle]}
          onPress={handleLoginPress}
        >
          {showIcon && <MaterialIcons name="login" size={18} color="#fff" style={styles.icon} />}
          <Text style={[styles.buttonText, textStyle]}>Login</Text>
        </TouchableOpacity>
      )}
      
      <AuthModal 
        isVisible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4511e',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  icon: {
    marginRight: 6,
  }
});

export default AuthButton; 