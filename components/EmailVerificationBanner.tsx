import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { sendVerificationEmail, reloadUser } from '../services/userService';
import { logger } from '../utils/logger';

interface EmailVerificationBannerProps {
  onVerificationComplete?: () => void;
}

const EmailVerificationBanner = ({ onVerificationComplete }: EmailVerificationBannerProps) => {
  const [isSending, setIsSending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleResendEmail = async () => {
    try {
      setIsSending(true);
      setErrorMessage(null);
      await sendVerificationEmail();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000); // Hide success message after 5 seconds
    } catch (error) {
      logger.error('Error sending verification email:', error);
      setErrorMessage('Failed to send verification email. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCheckVerification = async () => {
    try {
      setIsChecking(true);
      setErrorMessage(null);
      const isVerified = await reloadUser();
      
      if (isVerified) {
        // Email has been verified
        if (onVerificationComplete) {
          onVerificationComplete();
        }
      } else {
        // Still not verified
        setErrorMessage('Your email is not verified yet. Please check your email inbox and verify your email.');
      }
    } catch (error) {
      logger.error('Error checking verification status:', error);
      setErrorMessage('Failed to check verification status. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialIcons name="email" size={24} color="#f4511e" />
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.message}>
          A verification email has been sent to your email address. 
          Please check your inbox and verify your email to access all features.
        </Text>

        {showSuccess && (
          <Text style={styles.successText}>
            Verification email sent successfully!
          </Text>
        )}

        {errorMessage && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.resendButton, isSending && styles.disabledButton]} 
            onPress={handleResendEmail}
            disabled={isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="send" size={18} color="#fff" />
                <Text style={styles.buttonText}>Resend Email</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.checkButton, isChecking && styles.disabledButton]} 
            onPress={handleCheckVerification}
            disabled={isChecking}
          >
            {isChecking ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="refresh" size={18} color="#fff" />
                <Text style={styles.buttonText}>I've Verified</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    flexDirection: 'row',
    borderLeftWidth: 4,
    borderLeftColor: '#f4511e',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    marginRight: 12,
    alignItems: 'center',
    paddingTop: 2,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  message: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  successText: {
    color: '#4CAF50',
    fontSize: 14,
    marginBottom: 8,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    gap: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  resendButton: {
    backgroundColor: '#f4511e',
  },
  checkButton: {
    backgroundColor: '#2196F3',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default EmailVerificationBanner; 