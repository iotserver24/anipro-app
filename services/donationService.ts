import { getDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { getCurrentUser } from './userService';
import { logger } from '../utils/logger';
import { Alert, Linking, Platform } from 'react-native';

// Donation tiers for backward compatibility
export enum DonationTier {
  NONE = 'none',
  BASIC = 'basic',
  PREMIUM = 'premium',
  VIP = 'vip'
}

// Simplified interface for premium status
interface UserPremiumStatus {
  isPremium: boolean;
}

// Default premium status
const DEFAULT_PREMIUM_STATUS: UserPremiumStatus = {
  isPremium: false
};

/**
 * Check if a user has access to premium avatars by checking the isPremium field
 * in their user document
 */
export const hasPremiumAvatarAccess = async (): Promise<boolean> => {
  try {
    const user = getCurrentUser();
    if (!user) return false;

    // Get the user document to check the isPremium field
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) return false;
    
    // If the isPremium field exists and is true, they have premium access
    const userData = userDoc.data();
    return userData.isPremium === true;
  } catch (error) {
    logger.error('Premium Access', `Error checking premium avatar access: ${error}`);
    return false;
  }
};

/**
 * Check if user can select this specific premium avatar
 */
export const canSelectPremiumAvatar = async (avatarId: string): Promise<boolean> => {
  if (!avatarId.startsWith('premium_')) return true; // Not a premium avatar
  
  try {
    return await hasPremiumAvatarAccess();
  } catch (error) {
    logger.error('Premium Access', `Error checking avatar permission: ${error}`);
    return false;
  }
};

/**
 * Get the user's premium status
 */
export const getUserPremiumStatus = async (): Promise<UserPremiumStatus> => {
  try {
    const user = getCurrentUser();
    if (!user) return DEFAULT_PREMIUM_STATUS;

    // Get the user document to check the isPremium field
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) return DEFAULT_PREMIUM_STATUS;
    
    // Return premium status from user document
    const userData = userDoc.data();
    return { 
      isPremium: userData.isPremium === true
    };
  } catch (error) {
    logger.error('Premium Access', `Error getting premium status: ${error}`);
    return DEFAULT_PREMIUM_STATUS;
  }
};

/**
 * Open the donation page
 */
export const openDonationPage = (amount?: number) => {
  const baseUrl = 'https://anisurge.me/donate';
  const donationUrl = amount ? `${baseUrl}?amount=${amount}` : baseUrl;
  
  Linking.canOpenURL(donationUrl).then(supported => {
    if (supported) {
      Linking.openURL(donationUrl);
    } else {
      logger.error('Premium', `Don't know how to open URI: ${donationUrl}`);
      
      // Fallback message for the user
      if (Platform.OS === 'android') {
        Alert.alert(
          'Unable to Open Link',
          `Please visit ${baseUrl} to support the app and unlock premium features.`,
          [{ text: 'OK' }]
        );
      }
    }
  });
};

export default {
  hasPremiumAvatarAccess,
  canSelectPremiumAvatar,
  getUserPremiumStatus,
  openDonationPage
}; 