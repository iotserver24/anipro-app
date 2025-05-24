import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image, ScrollView, ImageSourcePropType, ToastAndroid, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { DOMParser } from 'xmldom';
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
import donationService, { DonationTier } from '../services/donationService';
import { useMyListStore } from '../store/myListStore';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import * as Linking from 'expo-linking';
import { API_BASE, ENDPOINTS } from '../constants/api';
import LoadingModal from '../components/LoadingModal';

type UserData = {
  username: string;
  email: string;
  createdAt: any;
  avatarId: string;
  emailVerified?: boolean;
  donationAmount?: number;
  premiumAmount?: number;
  isPremium?: boolean;
};

// Define UserDonation type here since we're not importing it anymore
type UserDonation = {
  tier: DonationTier;
  amount: number;
  lastDonationDate?: any;
  features: {
    premiumAvatars: boolean;
    disableAds: boolean;
    earlyAccess: boolean;
    customThemes: boolean;
  };
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
  const [donationStatus, setDonationStatus] = useState<UserDonation | null>(null);
  const [donationLoading, setDonationLoading] = useState(false);
  const [loadingModal, setLoadingModal] = useState({
    visible: false,
    title: '',
    message: '',
    progress: {
      current: 0,
      total: 0,
      success: 0,
      failed: 0
    }
  });

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

  // Add useEffect to fetch donation status
  useEffect(() => {
    const fetchDonationStatus = async () => {
      if (!authenticated || !getCurrentUser()) return;
      
      setDonationLoading(true);
      try {
        // Get current user data to check donation amount
        const user = getCurrentUser();
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Check for both fields for backward compatibility
            const totalDonated = userData.donationAmount || userData.premiumAmount || 0;
            const isPremium = userData.isPremium || false;
            
            // Convert to UserDonation format for backward compatibility
            const status: UserDonation = {
              tier: isPremium ? DonationTier.VIP : DonationTier.NONE,
              amount: totalDonated,
              features: {
                premiumAvatars: isPremium,
                disableAds: isPremium,
                earlyAccess: isPremium,
                customThemes: isPremium
              }
            };
            
            setDonationStatus(status);
            logger.info('ProfileScreen', `Premium status fetched: ${isPremium}, Donation amount: ${totalDonated}`);
          }
        }
      } catch (error) {
        logger.error('ProfileScreen', `Error fetching donation status: ${error}`);
      } finally {
        setDonationLoading(false);
      }
    };
    
    fetchDonationStatus();
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
      setDonationStatus(null);
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
    if (!avatar?.id) {
      Alert.alert('Error', 'Invalid avatar selected');
      return;
    }

    try {
      setUpdatingAvatar(true);
      setShowAvatarModal(false); // Close modal immediately to show loading state
      
      // Update the avatar
      const success = await updateUserAvatar(avatar.id);
      
      if (success) {
        // Update local state
        if (userData) {
          setUserData({ ...userData, avatarId: avatar.id });
        }
        // Fetch the new avatar URL
        await fetchAvatarUrl(avatar.id);
        
        // Show success message
        if (Platform.OS === 'android') {
          ToastAndroid.show('Avatar updated successfully!', ToastAndroid.SHORT);
        } else {
          Alert.alert('Success', 'Avatar updated successfully!');
        }
      } else {
        throw new Error('Failed to update avatar');
      }
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
      logger.error('Error sending verification email:', error instanceof Error ? error.message : String(error));
      showToast('Failed to send verification email. Please try again.');
    }
  };

  const handleDonate = () => {
    // Get current user ID
    const user = getCurrentUser();
    if (!user) {
      Alert.alert('Login Required', 'Please log in to upgrade to Premium.');
      return;
    }

    // Create a callback URL for deep linking back to the app
    const callbackUrl = Linking.createURL('profile/premium-success');
    
    // Create the payment URL with user information
    const paymentUrl = `https://megavault.in/anime-premium.html?userId=${user.uid}&email=${encodeURIComponent(userData?.email || '')}&callback=${encodeURIComponent(callbackUrl)}`;
    
    // Log the attempt
    logger.info('Premium', `Opening payment page for user: ${user.uid}`);
    
    // Open the payment page in the device's browser
    Linking.openURL(paymentUrl).catch(err => {
      logger.error('Premium', `Error opening payment URL: ${err}`);
      Alert.alert('Error', 'Could not open the payment page. Please try again later.');
    });
  };

  // Function to handle opening the donation page
  const handleDonateMore = () => {
    // Get current user ID
    const user = getCurrentUser();
    if (!user) {
      Alert.alert('Login Required', 'Please log in to make a donation.');
      return;
    }

    // Create a callback URL for deep linking back to the app
    const callbackUrl = Linking.createURL('profile/donation-success');
    
    // Create the donation URL with user information
    const donationUrl = `https://megavault.in/donate.html?userId=${user.uid}&email=${encodeURIComponent(userData?.email || '')}&callback=${encodeURIComponent(callbackUrl)}`;
    
    // Log the attempt
    logger.info('Donation', `Opening donation page for user: ${user.uid}`);
    
    // Open the donation page in the device's browser
    Linking.openURL(donationUrl).catch(err => {
      logger.error('Donation', `Error opening donation URL: ${err}`);
      Alert.alert('Error', 'Could not open the donation page. Please try again later.');
    });
  };

  // Add a new function to handle deep link processing
  useEffect(() => {
    // Subscribe to deep link events
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Check for initial URL that launched the app
    const getInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink({ url: initialUrl });
      }
    };

    getInitialURL();
    
    return () => {
      // Clean up event listener on unmount
      subscription.remove();
    };
  }, []);

  // Function to handle premium success deep links
  const handleDeepLink = (event: { url: string }) => {
    const { url } = event;
    
    // Check if this is a premium success callback
    if (url.includes('premium-success')) {
      const params = Linking.parse(url);
      
      // Check status parameter
      if (params.queryParams?.status === 'success') {
        logger.info('Premium', 'Premium upgrade successful via deep link');
        
        // Navigate to the Profile screen
        // If we're already on the profile screen, this ensures we're at the top of it
        router.navigate('/profile');
        
        // Refresh the premium status to show updated donation information
        refreshPremiumStatus();
        
        // Show success message to user
        setTimeout(() => {
          Alert.alert(
            'Premium Upgrade Successful!',
            'Your account has been upgraded to Premium. You now have access to all premium features and avatars!'
          );
        }, 500);
      }
    }
    // Check if this is a donation success callback
    else if (url.includes('donation-success')) {
      const params = Linking.parse(url);
      
      // Check status parameter
      if (params.queryParams?.status === 'success') {
        logger.info('Donation', 'Donation successful via deep link');
        
        // Navigate to the Profile screen
        // If we're already on the profile screen, this ensures we're at the top of it
        router.navigate('/profile');
        
        // Refresh the premium status to show updated donation information
        refreshPremiumStatus();
        
        // Show success message to user with slight delay to allow navigation
        setTimeout(() => {
          Alert.alert(
            'Donation Successful!',
            'Thank you for your donation! Your support helps us improve the app for everyone.'
          );
        }, 500);
      }
    }
  };

  // Function to refresh premium status after payment
  const refreshPremiumStatus = async () => {
    setDonationLoading(true);
    try {
      // Refresh the user data from Firestore
      const currentUser = getCurrentUser();
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserData;
          setUserData(data);
          
          // Get donation amount and premium status - check both fields
          const totalDonated = data.donationAmount || data.premiumAmount || 0;
          const isPremium = data.isPremium || false;
          
          // Update the state
          setDonationStatus({
            tier: isPremium ? DonationTier.VIP : DonationTier.NONE,
            amount: totalDonated,
            features: {
              premiumAvatars: isPremium,
              disableAds: isPremium,
              earlyAccess: isPremium,
              customThemes: isPremium
            }
          });
          
          logger.info('ProfileScreen', `Premium status refreshed: ${isPremium}, Donation amount: ${totalDonated}`);
        }
      }
    } catch (error) {
      logger.error('ProfileScreen', `Error refreshing premium status: ${error}`);
    } finally {
      setDonationLoading(false);
    }
  };

  // Function to handle importing watchlist from XML
  const handleImportWatchlist = async () => {
    if (!authenticated) {
      Alert.alert('Login Required', 'Please log in to import a watchlist.');
      return;
    }

    try {
      // Pick document
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/xml',
        copyToCacheDirectory: true
      });
      
      if (result.canceled === false && result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        
        // Show initial loading state
        setLoadingModal({
          visible: true,
          title: 'Reading File',
          message: 'Processing your anime list...',
          progress: {
            current: 0,
            total: 0,
            success: 0,
            failed: 0
          }
        });
        
        // Read file content
        const fileContent = await FileSystem.readAsStringAsync(fileUri);
        
        // Parse XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(fileContent, 'text/xml');
        
        // Get all anime entries
        const animeNodes = xmlDoc.getElementsByTagName('anime');
        
        if (animeNodes.length === 0) {
          setLoadingModal(prev => ({ ...prev, visible: false }));
          Alert.alert('Error', 'No anime entries found in the imported file.');
          return;
        }
        
        // Update loading modal with total count
        setLoadingModal(prev => ({
          ...prev,
          title: 'Importing Anime',
          message: 'Searching and adding anime to your list...',
          progress: {
            ...prev.progress,
            total: animeNodes.length
          }
        }));
        
        // Access MyListStore functions
        const { addAnime } = useMyListStore.getState();
        
        // Process in batches to prevent UI freezing
        const BATCH_SIZE = 3;
        
        // Function to search for an anime by title and match MAL ID
        const searchAndAddAnime = async (malId: string, title: string) => {
          try {
            const searchQuery = title.toLowerCase().trim().replace(/\s+/g, '-');
            const apiUrl = `${API_BASE}${ENDPOINTS.SEARCH.replace(':query', searchQuery)}`;
            
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
              throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.results && data.results.length > 0) {
              let matchedAnime = null;
              
              for (const result of data.results) {
                if (
                  (result.malId && result.malId === malId) ||
                  (result.idMal && result.idMal === malId) ||
                  (result.mappings && result.mappings.mal === malId)
                ) {
                  matchedAnime = result;
                  break;
                }
              }
              
              if (!matchedAnime) {
                matchedAnime = data.results[0];
              }
              
              await addAnime({
                id: matchedAnime.id,
                name: matchedAnime.title || title,
                img: matchedAnime.image || '',
                addedAt: Date.now(),
                malId: malId
              });
              
              setLoadingModal(prev => ({
                ...prev,
                progress: {
                  ...prev.progress,
                  success: prev.progress.success + 1
                }
              }));
              
              return true;
            }
            return false;
          } catch (error) {
            return false;
          }
        };
        
        // Process anime in batches
        const processBatch = async (startIndex: number) => {
          const endIndex = Math.min(startIndex + BATCH_SIZE, animeNodes.length);
          
          for (let i = startIndex; i < endIndex; i++) {
            const animeNode = animeNodes[i];
            
            try {
              const idNode = animeNode.getElementsByTagName('series_animedb_id')[0];
              const titleNode = animeNode.getElementsByTagName('series_title')[0];
              
              if (idNode && titleNode) {
                const malId = idNode.textContent || '';
                const title = titleNode.textContent || '';
                
                if (malId && title) {
                  const success = await searchAndAddAnime(malId, title);
                  if (!success) {
                    setLoadingModal(prev => ({
                      ...prev,
                      progress: {
                        ...prev.progress,
                        failed: prev.progress.failed + 1
                      }
                    }));
                  }
                } else {
                  setLoadingModal(prev => ({
                    ...prev,
                    progress: {
                      ...prev.progress,
                      failed: prev.progress.failed + 1
                    }
                  }));
                }
              }
            } catch (error) {
              setLoadingModal(prev => ({
                ...prev,
                progress: {
                  ...prev.progress,
                  failed: prev.progress.failed + 1
                }
              }));
            }
            
            setLoadingModal(prev => ({
              ...prev,
              progress: {
                ...prev.progress,
                current: prev.progress.current + 1
              }
            }));
          }
          
          if (endIndex < animeNodes.length) {
            setTimeout(() => processBatch(endIndex), 1000);
          } else {
            // All done
            setTimeout(() => {
              setLoadingModal(prev => ({ ...prev, visible: false }));
              Alert.alert(
                'Import Complete',
                `Successfully imported ${loadingModal.progress.success} anime.\nFailed to import ${loadingModal.progress.failed} anime.`
              );
            }, 1000);
          }
        };
        
        // Start processing
        processBatch(0);
      }
    } catch (error) {
      setLoadingModal(prev => ({ ...prev, visible: false }));
      Alert.alert('Error', 'Failed to import list. Please try again.');
    }
  };

  // Function to handle exporting watchlist to XML
  const handleExportWatchlist = async () => {
    if (!authenticated) {
      Alert.alert('Login Required', 'Please log in to export your watchlist.');
      return;
    }

    try {
      // Show loading modal
      setLoadingModal({
        visible: true,
        title: 'Exporting List',
        message: 'Preparing your anime list for export...',
        progress: {
          current: 0,
          total: 1,
          success: 0,
          failed: 0
        }
      });

      // Get anime list from store
      const { myList } = useMyListStore.getState();
      
      if (myList.length === 0) {
        setLoadingModal(prev => ({ ...prev, visible: false }));
        Alert.alert('Empty List', 'Your watchlist is empty. Nothing to export.');
        return;
      }
      
      // Generate XML content
      let xmlContent = '<?xml version="1.0"?>\n<myanimelist>\n';
      xmlContent += '  <myinfo>\n    <user_export_type>1</user_export_type>\n  </myinfo>\n';
      
      for (const anime of myList) {
        xmlContent += '  <anime>\n';
        xmlContent += `    <series_animedb_id>${anime.malId || anime.id}</series_animedb_id>\n`;
        xmlContent += `    <series_title>${anime.name}</series_title>\n`;
        xmlContent += '    <my_status>Watching</my_status>\n';
        xmlContent += '    <update_on_import>1</update_on_import>\n';
        xmlContent += '  </anime>\n';
      }
      
      xmlContent += '</myanimelist>';
      
      // Update progress
      setLoadingModal(prev => ({
        ...prev,
        message: 'Creating export file...',
        progress: {
          ...prev.progress,
          current: 1
        }
      }));
      
      // Save file
      const fileName = `anipro_export_${Date.now()}.xml`;
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, xmlContent);
      
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        // Hide loading modal before share dialog
        setLoadingModal(prev => ({ ...prev, visible: false }));
        
        // Share file
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/xml',
          dialogTitle: 'Export Watchlist',
          UTI: 'public.xml'
        });
      } else {
        setLoadingModal(prev => ({ ...prev, visible: false }));
        Alert.alert('Sharing not available', 'Sharing is not available on this device.');
      }
    } catch (error) {
      setLoadingModal(prev => ({ ...prev, visible: false }));
      Alert.alert('Error', 'Failed to export list. Please try again.');
    }
  };

  // Function to render donor tier badge
  const renderDonorBadge = () => {
    if (!donationStatus || donationStatus.tier === DonationTier.NONE) return null;
    
    const isPremium = donationStatus?.features?.premiumAvatars === true;
    
    let badgeColor = '#FFD700'; // Default gold
    let badgeIcon: keyof typeof MaterialIcons.glyphMap = 'favorite';
    let badgeText = 'Donor';
    
    switch (donationStatus.tier) {
      case DonationTier.VIP:
        badgeColor = '#e91e63'; // Pink
        badgeIcon = 'military-tech';
        badgeText = 'VIP Supporter';
        break;
      case DonationTier.PREMIUM:
        badgeColor = '#9c27b0'; // Purple
        badgeIcon = 'star-rate';
        badgeText = 'Premium Supporter';
        break;
      case DonationTier.BASIC:
        badgeColor = '#FFD700'; // Gold
        badgeIcon = 'star';
        badgeText = 'Supporter';
        break;
    }
    
    return (
      <View style={[styles.donorBadge, { borderColor: badgeColor }]}>
        <MaterialIcons name={badgeIcon} size={16} color={badgeColor} />
        <Text style={[styles.donorBadgeText, { color: badgeColor }]}>{badgeText}</Text>
      </View>
    );
  };

  // Replace or enhance the renderDonorBadge function to make it more attractive:
  const renderPremiumSection = () => {
    if (!donationStatus) return null;
    
    const isPremium = donationStatus.features.premiumAvatars === true;
    const donationAmount = donationStatus.amount || 0;
    const PREMIUM_THRESHOLD = 70; // Define the premium threshold
    
    if (donationAmount === 0) {
      // Show upgrade option for non-donors
      return (
        <View style={styles.upgradePremiumContainer}>
          <Text style={styles.upgradeTitle}>Support AniSurge</Text>
          <Text style={styles.upgradeDescription}>
            Make a donation of ₹{PREMIUM_THRESHOLD} or more to support our app and get premium features!
          </Text>
          
          <TouchableOpacity 
            style={styles.upgradePremiumButton}
            onPress={handleDonate}
          >
            <MaterialIcons name="favorite" size={24} color="#fff" />
            <Text style={styles.buttonText}>Donate Now</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // For users who have donated but not enough for premium
    if (!isPremium && donationAmount < PREMIUM_THRESHOLD) {
      const remainingAmount = PREMIUM_THRESHOLD - donationAmount;
      const progressPercentage = (donationAmount / PREMIUM_THRESHOLD) * 100;
      
      return (
        <LinearGradient
          colors={['#1e1e1e', '#2a2a2a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.donorContainer}
        >
          <View style={styles.donorHeader}>
            <MaterialIcons name="favorite" size={24} color="#f4511e" />
            <Text style={styles.donorTitle}>AniSurge Supporter</Text>
          </View>
          
          <View style={styles.donorAmountContainer}>
            <Text style={styles.donorAmountLabel}>Total Donated</Text>
            <Text style={styles.donorAmount}>₹{donationAmount.toFixed(2)}</Text>
          </View>
          
          <View style={styles.premiumProgressContainer}>
            <Text style={styles.premiumProgressText}>
              Donate ₹{remainingAmount.toFixed(2)} more to unlock Premium!
            </Text>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {progressPercentage.toFixed(0)}% to Premium
            </Text>
            
            <View style={styles.premiumMissingFeatures}>
              <Text style={styles.premiumMissingTitle}>Unlock Premium to get:</Text>
              <View style={styles.premiumMissingItem}>
                <MaterialIcons name="star" size={14} color="#FFD700" />
                <Text style={styles.premiumMissingText}>Premium Avatars</Text>
              </View>
              <View style={styles.premiumMissingItem}>
                <MaterialIcons name="comment" size={14} color="#FFD700" />
                <Text style={styles.premiumMissingText}>Unlimited Comments (No Rate Limits)</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.completePremiumButton}
            onPress={handleDonate}
          >
            <MaterialIcons name="star" size={18} color="#fff" />
            <Text style={styles.donateText}>Complete Premium Upgrade</Text>
          </TouchableOpacity>
          
          <Text style={styles.donorThankYou}>
            Thank you for supporting AniSurge! Your donations help us improve the app for everyone.
          </Text>
        </LinearGradient>
      );
    }
    
    // Show donor info for premium users
    return (
      <LinearGradient
        colors={['#1e1e1e', '#2a2a2a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.donorContainer}
      >
        <View style={styles.donorHeader}>
          <MaterialIcons 
            name="verified" 
            size={24} 
            color="#FFD700" 
          />
          <Text style={styles.donorTitle}>Premium Member</Text>
        </View>
        
        <View style={styles.donorAmountContainer}>
          <Text style={styles.donorAmountLabel}>Total Donated</Text>
          <Text style={styles.donorAmount}>₹{donationAmount.toFixed(2)}</Text>
        </View>
        
        <View style={styles.premiumBenefitsContainer}>
          <Text style={styles.premiumBenefitsTitle}>Your Premium Benefits:</Text>
          <View style={styles.premiumBenefitItem}>
            <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.premiumBenefitText}>Premium Avatars</Text>
          </View>
          <View style={styles.premiumBenefitItem}>
            <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.premiumBenefitText}>Early Access to Features</Text>
          </View>
          <View style={styles.premiumBenefitItem}>
            <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.premiumBenefitText}>Unlimited Comments (No Rate Limits)</Text>
          </View>
        </View>
        
        <Text style={styles.donorThankYou}>
          Thank you for supporting AniSurge! Your premium membership helps us improve the app for everyone.
        </Text>
      </LinearGradient>
    );
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
          onPress={() => authenticated && !updatingAvatar && setShowAvatarModal(true)}
          disabled={!authenticated || updatingAvatar}
        >
          {updatingAvatar ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#f4511e" />
              <Text style={styles.loadingText}>Updating avatar...</Text>
            </View>
          ) : avatarLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#f4511e" />
            </View>
          ) : (
            <>
              <View style={styles.avatarWrapper}>
                <Image 
                  source={getCurrentAvatar()} 
                  style={styles.avatar}
                  resizeMode="cover"
                  onError={(e) => {
                    console.warn('Failed to load profile avatar');
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
        {authenticated && renderDonorBadge()}
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

          {/* Donation Status Section */} 
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Supporter Status</Text>
            {donationLoading ? (
              <ActivityIndicator size="small" color="#f4511e" />
            ) : donationStatus ? (
              <View style={styles.supporterContainer}>
                {/* Add donation amount with large font */}
                {donationStatus.amount > 0 && (
                  <Text style={styles.donationTotalAmount}>
                    ₹{donationStatus.amount.toFixed(2)}
                  </Text>
                )}
                
                <Text style={styles.infoValue}>
                  {donationStatus.tier === DonationTier.VIP ? 'VIP Supporter' : 
                   donationStatus.tier === DonationTier.PREMIUM ? 'Premium Supporter' : 
                   donationStatus.amount > 0 ? 'Supporter' : 'Not a supporter yet'}
                </Text>
                
                {donationStatus.amount > 0 ? (
                  <Text style={styles.donationAmount}>
                    Total donated so far
                  </Text>
                ) : (
                  <Text style={styles.supporterText}>
                    Support the app to unlock premium features!
                  </Text>
                )}
                
                {/* Premium Features List */}
                {donationStatus.tier !== DonationTier.NONE && (
                  <View style={styles.featuresContainer}>
                    <Text style={styles.featuresTitle}>Your Premium Features:</Text>
                    
                    {donationStatus.features.premiumAvatars && (
                      <View style={styles.featureItem}>
                        <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.featureText}>Premium Avatars</Text>
                      </View>
                    )}
                    
                    {donationStatus.features.disableAds && (
                      <View style={styles.featureItem}>
                        <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.featureText}>Ad-Free Experience</Text>
                      </View>
                    )}
                    
                    {donationStatus.features.earlyAccess && (
                      <View style={styles.featureItem}>
                        <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.featureText}>Early Access to New Features</Text>
                      </View>
                    )}
                    
                    {donationStatus.features.customThemes && (
                      <View style={styles.featureItem}>
                        <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.featureText}>Custom App Themes</Text>
                      </View>
                    )}

                    {donationStatus.features.premiumAvatars && (
                      <View style={styles.featureItem}>
                        <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.featureText}>Unlimited Comments (No Rate Limits)</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.supporterContainer}>
                <Text style={styles.infoValue}>Not a supporter yet</Text>
                <Text style={styles.supporterText}>
                  Support the app to unlock premium features!
                </Text>
                
                <TouchableOpacity 
                  style={styles.donateButton}
                  onPress={handleDonate}
                >
                  <LinearGradient
                    colors={['#f4511e', '#e91e63']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.donateGradient}
                  >
                    <MaterialIcons name="favorite" size={18} color="#fff" />
                    <Text style={styles.donateText}>Upgrade to Premium</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Add premium section here */}
          {renderPremiumSection()}

          {/* Donate More Button */}
          <TouchableOpacity 
            style={styles.donateMoreButton}
            onPress={handleDonateMore}
          >
            <MaterialIcons name="volunteer-activism" size={24} color="#fff" />
            <Text style={styles.buttonText}>Donate More</Text>
          </TouchableOpacity>

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

      {/* Premium Benefits Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Premium Benefits</Text>
        <View style={styles.benefitItem}>
          <MaterialIcons name="star" size={24} color="#FFD700" />
          <Text style={styles.benefitText}>Exclusive premium avatars</Text>
        </View>
        <View style={styles.benefitItem}>
          <MaterialIcons name="timer" size={24} color="#FFD700" />
          <Text style={styles.benefitText}>Early access to new features</Text>
        </View>
      </View>

      {/* Watchlist Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Watchlist Management</Text>
        <Text style={styles.infoText}>Import your anime list from MyAnimeList or export your current watchlist.</Text>
        
        <View style={styles.watchlistActionsContainer}>
          <TouchableOpacity 
            style={[styles.watchlistActionButton, {backgroundColor: '#4CAF50'}]}
            onPress={handleImportWatchlist}
          >
            <MaterialIcons name="file-upload" size={24} color="#fff" />
            <Text style={styles.buttonText}>Import List</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.watchlistActionButton, {backgroundColor: '#2196F3'}]}
            onPress={handleExportWatchlist}
          >
            <MaterialIcons name="file-download" size={24} color="#fff" />
            <Text style={styles.buttonText}>Export List</Text>
          </TouchableOpacity>
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

      <LoadingModal
        visible={loadingModal.visible}
        title={loadingModal.title}
        message={loadingModal.message}
        progress={loadingModal.progress}
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
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
  donorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },
  donorBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
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
  supporterContainer: {
    marginTop: 4,
  },
  supporterText: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 4,
  },
  featuresContainer: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
  },
  featuresTitle: {
    fontSize: 16,
    color: '#ddd',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureText: {
    fontSize: 14,
    color: '#ccc',
    marginLeft: 8,
  },
  donationAmount: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 4,
  },
  donateButton: {
    marginTop: 16,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  donateGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  donateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  premiumButton: {
    marginTop: 20,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  donateAgainButton: {
    marginTop: 16,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  donateAgainText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
  donateMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
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
  loadingText: {
    color: '#f4511e',
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
  },
  premiumContainer: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    shadowColor: "#6200ee",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumTextContainer: {
    marginLeft: 12,
  },
  premiumTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  premiumSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  upgradePremiumContainer: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  upgradeTitle: {
    color: '#f4511e',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  upgradeDescription: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  upgradePremiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4511e',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  donationInfoContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  
  donationInfoText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
  },
  
  nonPremiumDonationInfo: {
    backgroundColor: 'rgba(244, 81, 30, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(244, 81, 30, 0.2)',
  },
  
  nonPremiumDonationText: {
    color: '#ddd',
    fontSize: 14,
    textAlign: 'center',
  },
  donationTotalAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#f4511e',
    marginBottom: 8,
    textAlign: 'center',
  },
  donorContainer: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    shadowColor: "#6200ee",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  donorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  donorTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  donorAmountContainer: {
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  donorAmountLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 4,
  },
  donorAmount: {
    color: '#f4511e',
    fontSize: 28,
    fontWeight: 'bold',
  },
  donorThankYou: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  premiumProgressContainer: {
    marginVertical: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
  },
  premiumProgressText: {
    color: '#FFD700',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 5,
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#f4511e',
  },
  progressText: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
  },
  completePremiumButton: {
    marginTop: 16,
    backgroundColor: '#f4511e',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  premiumBenefitsContainer: {
    marginVertical: 12,
    padding: 12,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  premiumBenefitsTitle: {
    color: '#FFD700',
    fontSize: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  premiumBenefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  premiumBenefitText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 8,
  },
  premiumMissingFeatures: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
  },
  premiumMissingTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  premiumMissingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  premiumMissingText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 8,
  },
  watchlistActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    width: '100%',
  },
  watchlistActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    flex: 0.48, // To allow two buttons side by side with space
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
}); 