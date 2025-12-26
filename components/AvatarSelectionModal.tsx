import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Alert,
  Linking,
  Platform,
  TextInput
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AVATARS, Avatar, getMediaTypeFromUrl } from '../constants/avatars';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import donationService, { hasPremiumAvatarAccess } from '../services/donationService';
import { getCurrentUser } from '../services/userService';
import { logger } from '../utils/logger';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import AvatarDisplay from './AvatarDisplay';

interface PremiumAvatar extends Avatar {
  isGif: boolean;
  isVideo?: boolean;
  donorId?: string;
}

type AvatarSelectionModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (avatar: Avatar | PremiumAvatar) => void;
  selectedAvatarId?: string;
};

const AvatarSelectionModal = ({
  visible,
  onClose,
  onSelect,
  selectedAvatarId
}: AvatarSelectionModalProps) => {
  const [loading, setLoading] = useState(false);
  const [avatars, setAvatars] = useState<Avatar[]>(AVATARS);
  const [premiumAvatars, setPremiumAvatars] = useState<PremiumAvatar[]>([]);
  const [activeTab, setActiveTab] = useState<'regular' | 'premium' | 'custom'>('regular');
  const [customUrl, setCustomUrl] = useState('');
  const [validatingUrl, setValidatingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [showDonationPrompt, setShowDonationPrompt] = useState(false);
  const [selectedPremiumAvatar, setSelectedPremiumAvatar] = useState<PremiumAvatar | null>(null);
  const [hasPremiumAccess, setHasPremiumAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Fetch avatars from API when modal becomes visible
  useEffect(() => {
    if (visible) {
      fetchLatestAvatars();
      fetchPremiumAvatars();
      checkPremiumAccess();
    }
  }, [visible]);

  const checkPremiumAccess = async () => {
    setCheckingAccess(true);
    try {
      // Since this is the last update, give all logged-in users access to premium avatars
      const user = getCurrentUser();
      if (!user) {
        setHasPremiumAccess(false);
        return;
      }

      // All users now have premium avatar access
      setHasPremiumAccess(true);

      logger.info('AvatarModal', `User has premium avatar access: true (unlocked for all users)`);
    } catch (error) {
      logger.error('AvatarModal', `Error checking premium access: ${error}`);
      // Still grant access even on error since this is the last update
      setHasPremiumAccess(true);
    } finally {
      setCheckingAccess(false);
    }
  };

  const fetchLatestAvatars = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://anisurge.me/api/avatars/list');
      if (response.ok) {
        const data = await response.json();
        // Only update if we get valid data
        if (Array.isArray(data) && data.length > 0) {
          setAvatars(data);
          console.log('Successfully fetched', data.length, 'regular avatars');
        } else {
          console.warn('Received empty or invalid avatar list from API');
        }
      } else {
        console.warn('Failed to fetch avatars from API:', response.status);
      }
    } catch (error) {
      console.error('Error fetching avatars:', error);
      // Keep using default avatars if fetch fails
    } finally {
      setLoading(false);
    }
  };

  const fetchPremiumAvatars = async () => {
    try {
      const response = await fetch('https://anisurge.me/api/avatars/premium');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          console.log('Fetched premium avatars:', data);
          setPremiumAvatars(data);
          console.log('Successfully fetched', data.length, 'premium avatars');
        }
      } else {
        console.warn('Failed to fetch premium avatars:', response.status);
      }
    } catch (error) {
      console.error('Error fetching premium avatars:', error);
    }
  };

  const handleAvatarSelect = async (avatar: Avatar | PremiumAvatar) => {
    const mediaType = getMediaTypeFromUrl(avatar.url);
    console.log('Selected avatar:', {
      id: avatar.id,
      name: avatar.name,
      mediaType: mediaType,
      isPremium: 'isGif' in avatar || 'isVideo' in avatar
    });

    // Check if it's a premium avatar
    if ('isGif' in avatar || 'isVideo' in avatar) {
      if (!getCurrentUser()) {
        Alert.alert(
          'Login Required',
          'You need to be logged in to select premium avatars.',
          [
            { text: 'OK', onPress: () => onClose() }
          ]
        );
        return;
      }

      // First check if user has premium access
      if (!hasPremiumAccess) {
        setSelectedPremiumAvatar(avatar);
        setShowDonationPrompt(true);
        return;
      }

      // User has premium access, proceed with selection
      onSelect({
        ...avatar,
        id: avatar.id.trim()
      });
      return;
    }

    // For regular avatars, proceed as normal
    onSelect({
      ...avatar,
      id: avatar.id.trim() // ensure no whitespace
    });
  };

  const openDonationLink = () => {
    donationService.openDonationPage(100); // Suggest a minimum donation of 100
  };

  // Validate custom avatar URL
  const validateCustomUrl = async (url: string): Promise<{ valid: boolean; error?: string }> => {
    // Check if URL is provided
    if (!url.trim()) {
      return { valid: false, error: 'Please enter a URL' };
    }

    // Check for valid URL format
    try {
      new URL(url);
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }

    // Check for allowed file extensions
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.mp4'];
    const urlLower = url.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => urlLower.endsWith(ext));

    if (!hasValidExtension) {
      return { valid: false, error: 'URL must end with .png, .jpg, .jpeg, .webp, .gif, or .mp4' };
    }

    // Check file size (2MB limit)
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');

      if (contentLength) {
        const sizeInMB = parseInt(contentLength) / (1024 * 1024);
        if (sizeInMB > 2) {
          return { valid: false, error: `File size (${sizeInMB.toFixed(2)}MB) exceeds 2MB limit` };
        }
      }

      // Also check if the URL is accessible
      if (!response.ok) {
        return { valid: false, error: 'Could not access the URL. Make sure it is publicly accessible.' };
      }
    } catch (error) {
      // If HEAD request fails, try to just proceed (some servers don't support HEAD)
      console.warn('Could not verify file size, proceeding anyway:', error);
    }

    return { valid: true };
  };

  // Handle custom avatar submission
  const handleCustomAvatarSubmit = async () => {
    if (!getCurrentUser()) {
      Alert.alert('Login Required', 'You need to be logged in to use custom avatars.');
      return;
    }

    setValidatingUrl(true);
    setUrlError(null);

    const result = await validateCustomUrl(customUrl);

    if (!result.valid) {
      setUrlError(result.error || 'Invalid URL');
      setValidatingUrl(false);
      return;
    }

    // Create a custom avatar object - use the URL as the id
    // so that updateUserAvatar in userService can detect it's a custom URL
    const customAvatar: Avatar = {
      id: customUrl.trim(), // Pass URL as id - userService will detect http:// prefix
      name: 'Custom Avatar',
      url: customUrl.trim()
    };

    setValidatingUrl(false);
    onSelect(customAvatar);
  };

  const renderItem = ({ item }: { item: Avatar | PremiumAvatar }) => {
    const isPremiumAvatar = 'isGif' in item || 'isVideo' in item;
    const isSelected = selectedAvatarId === item.id;
    const canSelectPremium = hasPremiumAccess || isSelected;
    const mediaType = getMediaTypeFromUrl(item.url);

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.avatarItem,
          isSelected && styles.selectedAvatarItem,
          isPremiumAvatar && styles.premiumAvatarItem
        ]}
        onPress={() => handleAvatarSelect(item)}
      >
        <View style={styles.avatarImageContainer}>
          <AvatarDisplay
            url={item.url}
            style={styles.avatarImage}
            isPremium={isPremiumAvatar}
            onError={() => {
              console.warn('Failed to load avatar:', item.url);
            }}
          />

          {/* Media type indicator */}
          {(mediaType === 'video' || mediaType === 'gif') && (
            <View style={styles.mediaTypeIndicator}>
              <MaterialIcons
                name={mediaType === 'video' ? 'play-arrow' : 'gif'}
                size={12}
                color="#fff"
              />
            </View>
          )}

          {/* Add blur overlay for premium avatars unless user has access or it's already selected */}
          {isPremiumAvatar && !canSelectPremium && (
            <View style={styles.premiumOverlay}>
              <BlurView intensity={7} style={styles.blurOverlay} tint="dark">
                <MaterialIcons name="lock" size={24} color="#FFD700" />
              </BlurView>
            </View>
          )}
        </View>

        {isSelected && (
          <View style={styles.selectedIndicator}>
            <MaterialIcons name="check-circle" size={24} color="#f4511e" />
          </View>
        )}

        {isPremiumAvatar && (
          <View style={styles.premiumBadge}>
            <MaterialIcons name="star" size={16} color="#FFD700" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderPremiumBanner = () => {
    if (activeTab !== 'premium') return null;

    if (checkingAccess) {
      return (
        <View style={styles.premiumInfoBanner}>
          <ActivityIndicator size="small" color="#FFD700" />
          <Text style={styles.premiumInfoText}>
            Checking premium access status...
          </Text>
        </View>
      );
    }

    if (hasPremiumAccess) {
      return (
        <View style={[styles.premiumInfoBanner, { backgroundColor: 'rgba(0, 128, 0, 0.1)', borderColor: 'rgba(0, 128, 0, 0.3)' }]}>
          <MaterialIcons name="celebration" size={20} color="#4CAF50" />
          <Text style={styles.premiumInfoText}>
            🎉 Premium avatars are now free for all users! Enjoy!
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Avatar</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'regular' && styles.activeTab]}
              onPress={() => setActiveTab('regular')}
            >
              <Text style={[styles.tabText, activeTab === 'regular' && styles.activeTabText]}>
                Regular
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'premium' && styles.activeTab]}
              onPress={() => setActiveTab('premium')}
            >
              <Text style={[styles.tabText, activeTab === 'premium' && styles.activeTabText]}>
                Premium
              </Text>
              <MaterialIcons name="star" size={16} color={activeTab === 'premium' ? "#f4511e" : "#FFD700"} style={styles.tabIcon} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'custom' && styles.activeTab]}
              onPress={() => setActiveTab('custom')}
            >
              <Text style={[styles.tabText, activeTab === 'custom' && styles.activeTabText]}>
                Custom
              </Text>
              <MaterialIcons name="add-photo-alternate" size={16} color={activeTab === 'custom' ? "#f4511e" : "#888"} style={styles.tabIcon} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#f4511e" />
              <Text style={styles.loadingText}>Loading avatars...</Text>
            </View>
          ) : activeTab === 'custom' ? (
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.customTabContent}>
              <View style={styles.customAvatarContainer}>
                <MaterialIcons name="add-photo-alternate" size={48} color="#f4511e" />
                <Text style={styles.customTitle}>Custom Avatar</Text>
                <Text style={styles.customDescription}>
                  Enter a direct link to your avatar image or video. The URL must end with .png, .jpg, .jpeg, .webp, .gif, or .mp4 and be under 2MB.
                </Text>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.urlInput, urlError && styles.urlInputError]}
                    placeholder="https://example.com/avatar.png"
                    placeholderTextColor="#666"
                    value={customUrl}
                    onChangeText={(text) => {
                      setCustomUrl(text);
                      setUrlError(null);
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                  {customUrl.length > 0 && (
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={() => {
                        setCustomUrl('');
                        setUrlError(null);
                      }}
                    >
                      <MaterialIcons name="close" size={20} color="#888" />
                    </TouchableOpacity>
                  )}
                </View>

                {urlError && (
                  <View style={styles.errorContainer}>
                    <MaterialIcons name="error" size={16} color="#ff4444" />
                    <Text style={styles.errorText}>{urlError}</Text>
                  </View>
                )}

                {/* Preview */}
                {customUrl.length > 0 && !urlError && (
                  <View style={styles.previewContainer}>
                    <Text style={styles.previewLabel}>Preview:</Text>
                    <View style={styles.previewImageContainer}>
                      <AvatarDisplay
                        url={customUrl}
                        style={styles.previewImage}
                        isPremium={false}
                        onError={() => setUrlError('Failed to load image preview')}
                      />
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.submitButton, (!customUrl.trim() || validatingUrl) && styles.submitButtonDisabled]}
                  onPress={handleCustomAvatarSubmit}
                  disabled={!customUrl.trim() || validatingUrl}
                >
                  {validatingUrl ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="check" size={20} color="#fff" />
                      <Text style={styles.submitButtonText}>Use This Avatar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <>
              {renderPremiumBanner()}

              <ScrollView style={styles.scrollView}>
                <View style={styles.avatarGrid}>
                  {(activeTab === 'regular' ? avatars : premiumAvatars).map((avatar) => renderItem({ item: avatar }))}
                </View>

                {activeTab === 'premium' && !hasPremiumAccess && (
                  <TouchableOpacity
                    style={styles.donateButton}
                    onPress={openDonationLink}
                  >
                    <LinearGradient
                      colors={['#f4511e', '#e91e63']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.donateGradient}
                    >
                      <MaterialIcons name="favorite" size={18} color="#fff" />
                      <Text style={styles.donateText}>Donate to Support</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </>
          )}
        </View>
      </View>

      {/* Donation Prompt Modal */}
      <Modal
        visible={showDonationPrompt}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDonationPrompt(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.donationPromptContainer}>
            <View style={styles.donationHeader}>
              <MaterialIcons name="stars" size={28} color="#FFD700" />
              <Text style={styles.donationTitle}>Premium Feature</Text>
            </View>

            <Text style={styles.donationDescription}>
              Premium avatars are exclusive to donors who support the app. Your contribution helps keep the app running ad-free and enables new features!
            </Text>

            <View style={styles.donationOptions}>
              <TouchableOpacity
                style={styles.primaryDonateButton}
                onPress={() => {
                  setShowDonationPrompt(false);
                  openDonationLink();
                }}
              >
                <LinearGradient
                  colors={['#f4511e', '#e91e63']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.donateGradient}
                >
                  <MaterialIcons name="favorite" size={18} color="#fff" />
                  <Text style={styles.donateText}>Donate Now</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowDonationPrompt(false)}
              >
                <Text style={styles.cancelText}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const { width } = Dimensions.get('window');
const avatarSize = (width - 100) / 4;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    height: '80%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tabIcon: {
    marginLeft: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#f4511e',
  },
  tabText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#f4511e',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#ccc',
    marginTop: 16,
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: 16,
  },
  avatarItem: {
    marginBottom: 16,
    width: avatarSize,
    height: avatarSize,
    position: 'relative',
  },
  selectedAvatarItem: {
    borderWidth: 2,
    borderColor: '#f4511e',
    borderRadius: 10,
  },
  premiumAvatarItem: {
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 10,
  },
  avatarImageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 2,
  },
  premiumBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 2,
  },
  premiumOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaTypeIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumInfoBanner: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    margin: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  premiumInfoText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  donateButton: {
    marginVertical: 20,
    marginHorizontal: 24,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  donateGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  donateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  donationPromptContainer: {
    width: '85%',
    backgroundColor: '#212121',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  donationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  donationTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  donationDescription: {
    color: '#ddd',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  donationOptions: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 12,
  },
  primaryDonateButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '500',
  },
  // Custom avatar styles
  customTabContent: {
    flexGrow: 1,
    padding: 20,
  },
  customAvatarContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  customTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  customDescription: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  inputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444',
    paddingHorizontal: 12,
  },
  urlInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 14,
  },
  urlInputError: {
    borderColor: '#ff4444',
  },
  clearButton: {
    padding: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 13,
    marginLeft: 6,
  },
  previewContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  previewLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 10,
  },
  previewImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#f4511e',
    backgroundColor: '#2a2a2a',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4511e',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
    minWidth: 180,
  },
  submitButtonDisabled: {
    backgroundColor: '#555',
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default AvatarSelectionModal; 