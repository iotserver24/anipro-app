import React, { useState, useEffect } from 'react';
import { 
  View, 
  Modal, 
  StyleSheet, 
  TouchableOpacity, 
  Text, 
  Image, 
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { logger } from '../utils/logger';
import { AVATARS, getAvatarById } from '../constants/avatars';
import UserDonationBadge from './UserDonationBadge';

interface UserProfileModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  visible,
  onClose,
  userId
}) => {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [commentCount, setCommentCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [donationAmount, setDonationAmount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [donationLoading, setDonationLoading] = useState(true);
  
  // Fetch avatar URL when userData changes
  useEffect(() => {
    const fetchAvatar = async () => {
      if (userData?.avatarId) {
        try {
          const url = await getAvatarById(userData.avatarId);
          setAvatarUrl(url);
        } catch (error) {
          logger.warn('UserProfileModal', `Failed to fetch avatar: ${error}`);
          // If there's an error, we'll fall back to the default avatar
        }
      }
    };
    
    if (userData) {
      fetchAvatar();
    }
  }, [userData]);
  
  useEffect(() => {
    // Debug the component mount/update
    logger.debug('UserProfileModal', 'Modal state changed', { visible, userId });
    
    const fetchUserData = async () => {
      if (!visible || !userId) {
        logger.debug('UserProfileModal', 'Not fetching data - modal not visible or no userId');
        return;
      }
      
      logger.profileModal.open(userId);
      setLoading(true);
      setError(null);
      
      try {
        // Fetch user data from Firestore
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          logger.profileModal.dataFetch(userId, true, data);
          
          setUserData({
            username: data.username,
            avatarId: data.avatarId,
            avatar: data.avatar,
            avatarUrl: data.avatarUrl,
            createdAt: data.createdAt,
            // Don't include sensitive data like email
          });
          
          // Count user's comments
          const commentsQuery = query(
            collection(db, 'comments'),
            where('userId', '==', userId),
            limit(100) // We just want to count, not fetch all
          );
          
          const commentsSnapshot = await getDocs(commentsQuery);
          setCommentCount(commentsSnapshot.size);
          logger.info('UserProfileModal', `Comment count fetched: ${commentsSnapshot.size}`);
        } else {
          logger.warn('UserProfileModal', `No user found with ID: ${userId}`);
          setError('User not found');
          logger.profileModal.dataFetch(userId, false, { error: 'User not found' });
        }
      } catch (err) {
        logger.error('UserProfileModal', `Error fetching user data: ${err}`);
        setError('Failed to load user data');
        logger.profileModal.dataFetch(userId, false, { error: err });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
    
    return () => {
      if (visible && userId) {
        logger.profileModal.close(userId);
      }
    };
  }, [visible, userId]);
  
  useEffect(() => {
    const fetchDonationInfo = async () => {
      if (!userId) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Check for both donationAmount and premiumAmount for backward compatibility
          const totalDonated = userData.donationAmount || userData.premiumAmount || 0;
          setDonationAmount(totalDonated);
          setIsPremium(userData.isPremium || false);
        }
      } catch (error) {
        logger.error('UserProfileModal', `Error fetching donation info: ${error}`);
      } finally {
        setDonationLoading(false);
      }
    };
    
    fetchDonationInfo();
  }, [userId]);
  
  // Handle modal close
  const handleClose = () => {
    logger.uiEvent('UserProfileModal', 'Modal closed by user');
    onClose();
  };
  
  // Update the getAvatarSource function
  const getAvatarSource = () => {
    // First try the fetched avatar URL
    if (avatarUrl) {
      return { uri: avatarUrl };
    }
    
    // Then try various fields from userData
    if (userData) {
      if (userData.avatar && userData.avatar.startsWith('http')) {
        return { uri: userData.avatar };
      }
      if (userData.avatarUrl && userData.avatarUrl.startsWith('http')) {
        return { uri: userData.avatarUrl };
      }
    }
    
    // Default avatar if none provided or invalid
    return { uri: 'https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_1280.png' };
  };
  
  // Enhanced modal with improved styling and visibility
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={handleClose}
      supportedOrientations={['portrait', 'landscape']}
      statusBarTranslucent={true}
    >
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={0.7}
        onPress={handleClose}
      >
        <View 
          style={[
            styles.modalContent,
            Platform.OS === 'android' ? styles.modalContentAndroid : null
          ]}
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => {
            e.stopPropagation();
            return false;
          }}
        >
          <View style={styles.header}>
            <Text style={styles.title}>User Profile</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#f4511e" />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={40} color="#f4511e" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : userData ? (
            <View style={styles.profileContainer}>
              <Image 
                source={getAvatarSource()}
                style={styles.avatar}
                onError={(e) => {
                  logger.warn('UserProfileModal', 'Failed to load avatar, using default');
                }}
                defaultSource={{ uri: 'https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_1280.png' }}
              />
              <Text style={styles.username}>{userData?.username || 'Unknown User'}</Text>
              
              {(isPremium || donationAmount > 0) && (
                <View style={[styles.badgeContainer, isPremium ? styles.premiumBadge : styles.supporterBadge]}>
                  {isPremium ? (
                    <>
                      <MaterialIcons name="verified" size={16} color="#FFD700" />
                      <Text style={styles.premiumBadgeText}>Premium Member</Text>
                    </>
                  ) : (
                    <>
                      <MaterialIcons name="favorite" size={16} color="#f4511e" />
                      <Text style={styles.supporterBadgeText}>Supporter</Text>
                    </>
                  )}
                </View>
              )}
              
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <MaterialIcons name="comment" size={20} color="#f4511e" />
                  <Text style={styles.statValue}>{commentCount}</Text>
                  <Text style={styles.statLabel}>Comments</Text>
                </View>
                
                <View style={styles.statItem}>
                  <MaterialIcons name="date-range" size={20} color="#f4511e" />
                  <Text style={styles.statValue}>
                    {userData.createdAt ? new Date(userData.createdAt.toDate()).toLocaleDateString() : 'Unknown'}
                  </Text>
                  <Text style={styles.statLabel}>Joined</Text>
                </View>

                {!donationLoading && (
                  <View style={styles.statItem}>
                    {isPremium ? (
                      <MaterialIcons name="verified" size={20} color="#FFD700" />
                    ) : donationAmount > 0 ? (
                      <MaterialIcons name="favorite" size={20} color="#f4511e" />
                    ) : (
                      <MaterialIcons name="favorite-border" size={20} color="#666" />
                    )}
                    <Text style={[styles.statValue, isPremium ? styles.premiumText : donationAmount > 0 ? styles.donationText : null]}>
                      {donationAmount > 0 ? `₹${donationAmount.toFixed(0)}` : (isPremium ? 'Active' : 'None')}
                    </Text>
                    <Text style={styles.statLabel}>
                      {isPremium ? 'Premium' : donationAmount > 0 ? 'Donated' : 'Support'}
                    </Text>
                  </View>
                )}
              </View>

              {donationAmount > 0 && (
                <Text style={styles.thanksMessage}>
                  Thanks for supporting AniSurge!
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>No user data available</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: Dimensions.get('window').width * 0.85,
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#222',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 5,
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#aaa',
    fontSize: 16,
  },
  errorContainer: {
    padding: 30,
    alignItems: 'center',
  },
  errorText: {
    marginTop: 10,
    color: '#f4511e',
    fontSize: 16,
    textAlign: 'center',
  },
  profileContainer: {
    padding: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#333',
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#f4511e',
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
    backgroundColor: '#252525',
    borderRadius: 10,
    padding: 15,
  },
  statItem: {
    alignItems: 'center',
    marginHorizontal: 10,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 3,
  },
  modalContentAndroid: {
    elevation: 10,
    zIndex: 1000
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginVertical: 8,
  },
  premiumBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  supporterBadge: {
    backgroundColor: 'rgba(244, 81, 30, 0.15)',
  },
  premiumBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
    color: '#FFD700',
  },
  supporterBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
    color: '#f4511e',
  },
  premiumText: {
    color: '#FFD700',
  },
  donationText: {
    color: '#f4511e',
  },
  thanksMessage: {
    fontSize: 13,
    color: '#aaa',
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
  },
});

export default UserProfileModal; 