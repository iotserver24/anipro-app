import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { registerUser, signInUser, isEmailVerified, getCurrentUser, resetPassword } from '../services/userService';
import { collection, query, where, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import EmailVerificationBanner from './EmailVerificationBanner';

type AuthModalProps = {
  isVisible: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
};

const AuthModal = ({ isVisible, onClose, onAuthSuccess }: AuthModalProps) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgotPassword'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Check if user is authenticated but email not verified
  useEffect(() => {
    if (authenticated) {
      const user = getCurrentUser();
      if (user && !user.emailVerified) {
        setShowVerificationBanner(true);
      } else {
        setShowVerificationBanner(false);
        // If email is verified, complete auth process
        if (authenticated && user?.emailVerified) {
          handleAuthSuccess();
        }
      }
    }
  }, [authenticated]);

  // Reset form when modal closes or mode changes
  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setUsername('');
    setBirthdate('');
    setErrors({});
    setResetSent(false);
  };

  // Handle mode toggle
  const toggleMode = () => {
    resetForm();
    if (mode === 'login') {
      setMode('register');
    } else if (mode === 'register' || mode === 'forgotPassword') {
      setMode('login');
    }
  };

  // Switch to forgot password mode
  const toggleForgotPassword = () => {
    resetForm();
    setMode(mode === 'forgotPassword' ? 'login' : 'forgotPassword');
  };

  // Validate username format
  const isValidUsername = (username: string): boolean => {
    // Only allow letters, numbers and underscores, length between 3-20 characters
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    // Check if username ends with -ai
    if (username.toLowerCase().endsWith('-ai')) {
      return false;
    }
    return usernameRegex.test(username);
  };

  // Validate form fields
  const validateForm = async (): Promise<boolean> => {
    const newErrors: typeof errors = {};
    
    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Invalid email format';
    }
    
    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    // Additional validation for registration
    if (mode === 'register') {
      if (!username.trim()) {
        newErrors.username = 'Username is required';
      } else if (username.toLowerCase().endsWith('-ai')) {
        newErrors.username = 'Username cannot end with "-ai" as this is reserved for AI characters';
      } else if (!isValidUsername(username)) {
        newErrors.username = 'Username can only contain letters, numbers and underscores (3-20 characters)';
      }
      
      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
      
      if (!birthdate) {
        newErrors.birthdate = 'Birthdate is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle login
  const handleLogin = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      await signInUser(email.trim(), password);
      setAuthenticated(true);
      
      // Check if email is verified
      if (isEmailVerified()) {
        handleAuthSuccess();
      }
      // If not verified, the useEffect will show the verification banner
    } catch (error: any) {
      let errorMessage = 'Failed to sign in';
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later.';
      }
      
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle registration
  const handleRegister = async () => {
    if (!await validateForm()) return;
    
    try {
      setLoading(true);
      
      // First try to register the user
      await registerUser(email.trim(), password, username.trim(), birthdate);
      setAuthenticated(true);
      
      // Show verification banner since new users need to verify email
      setShowVerificationBanner(true);
      
      // Show success message but don't close modal yet
      Alert.alert('Success', 'Account created successfully! Please verify your email to continue.');
    } catch (error: any) {
      let errorMessage = 'Failed to create account';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      } else if (error.code === 'username-taken') {
        errorMessage = 'This username is already taken';
        setErrors({ ...errors, username: 'Username is already taken' });
      }
      
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle auth success after email verification
  const handleAuthSuccess = () => {
    setShowVerificationBanner(false);
    onAuthSuccess();
    onClose();
  };

  // Handle password reset
  const handlePasswordReset = async () => {
    // Validate email
    if (!email.trim()) {
      setErrors({ email: 'Email is required' });
      return;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: 'Invalid email format' });
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email.trim());
      setResetSent(true);
      setErrors({});
    } catch (error: any) {
      let errorMessage = 'Failed to send password reset email';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      }
      
      Alert.alert('Password Reset Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {!authenticated ? 
                  (mode === 'login' ? 'Sign In' : 
                   mode === 'register' ? 'Create Account' : 
                   'Forgot Password') : 
                  'Email Verification'}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {!authenticated && (
              <View style={styles.formContainer}>
                {mode === 'register' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Username</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Choose a unique username"
                      placeholderTextColor="#666"
                      value={username}
                      onChangeText={(text) => setUsername(text.trim().toLowerCase())}
                      autoCapitalize="none"
                      maxLength={20}
                    />
                    {errors.username && (
                      <Text style={styles.errorText}>{errors.username}</Text>
                    )}
                  </View>
                )}
                
                {/* Email */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#666"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {errors.email && (
                    <Text style={styles.errorText}>{errors.email}</Text>
                  )}
                </View>
                
                {/* Password - only show in login or register modes */}
                {(mode === 'login' || mode === 'register') && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor="#666"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                    {errors.password && (
                      <Text style={styles.errorText}>{errors.password}</Text>
                    )}
                  </View>
                )}
                
                {/* Confirm Password (Register only) */}
                {mode === 'register' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm your password"
                      placeholderTextColor="#666"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                    />
                    {errors.confirmPassword && (
                      <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                    )}
                  </View>
                )}
                
                {/* Birthdate */}
                {mode === 'register' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Birthdate</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#666"
                      value={birthdate}
                      onChangeText={setBirthdate}
                      keyboardType="numeric"
                      maxLength={10}
                    />
                    {errors.birthdate && (
                      <Text style={styles.errorText}>{errors.birthdate}</Text>
                    )}
                  </View>
                )}
                
                {/* Forgot Password Link (Login mode only) */}
                {mode === 'login' && (
                  <TouchableOpacity
                    onPress={toggleForgotPassword}
                    style={styles.forgotPasswordLink}
                  >
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>
                )}
                
                {/* Password Reset Success Message */}
                {mode === 'forgotPassword' && resetSent && (
                  <View style={styles.successContainer}>
                    <MaterialIcons name="check-circle" size={48} color="#4CAF50" />
                    <Text style={styles.successText}>
                      Password reset email sent! Check your inbox for instructions.
                    </Text>
                  </View>
                )}
                
                {/* Submit Button */}
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={
                    mode === 'login' ? handleLogin : 
                    mode === 'register' ? handleRegister : 
                    handlePasswordReset
                  }
                  disabled={loading || (mode === 'forgotPassword' && resetSent)}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {mode === 'login' ? 'Sign In' : 
                       mode === 'register' ? 'Create Account' : 
                       resetSent ? 'Email Sent' : 'Reset Password'}
                    </Text>
                  )}
                </TouchableOpacity>
                
                {/* Toggle Mode */}
                <View style={styles.toggleContainer}>
                  <Text style={styles.toggleText}>
                    {mode === 'login' ? "Don't have an account?" : 
                     mode === 'register' ? "Already have an account?" :
                     "Remember your password?"}
                  </Text>
                  <TouchableOpacity onPress={toggleMode}>
                    <Text style={styles.toggleLink}>
                      {mode === 'login' ? 'Register' : 'Sign In'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* Email Verification Banner */}
            {showVerificationBanner && (
              <View style={styles.verificationContainer}>
                <EmailVerificationBanner 
                  onVerificationComplete={handleAuthSuccess} 
                />
                <Text style={styles.verificationNote}>
                  You need to verify your email address before you can fully use your account.
                  Check your inbox for a verification link.
                </Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f4511e',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  formContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 16,
  },
  errorText: {
    color: '#f4511e',
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#f4511e',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  toggleText: {
    color: '#ccc',
    fontSize: 14,
  },
  toggleLink: {
    color: '#f4511e',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  verificationContainer: {
    padding: 16,
    paddingBottom: 24,
    width: '100%',
  },
  verificationNote: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
    fontStyle: 'italic'
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 12,
  },
  forgotPasswordText: {
    color: '#f4511e',
    fontSize: 14,
    fontWeight: 'bold',
  },
  successContainer: {
    alignItems: 'center',
    padding: 16,
    marginVertical: 12,
  },
  successText: {
    color: '#4CAF50',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  }
});

export default AuthModal; 