import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Image, Alert, Platform, ImageBackground, NativeModules, ActivityIndicator, Modal, TextInput } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { APP_CONFIG, getAppVersion, getAppVersionCode } from '../constants/appConfig';
import { useTheme } from '../hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWatchHistoryStore } from '../store/watchHistoryStore';
import { useMyListStore } from '../store/myListStore';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import * as Device from 'expo-device';
import { getArchitectureSpecificDownloadUrl, getDeviceArchitectureUrlKey } from '../utils/deviceUtils';
import UpdateModal from '../components/UpdateModal';
import WhatsNewModal from '../components/WhatsNewModal';
import { fetchWhatsNewInfo, WhatsNewInfo } from '../utils/whatsNewUtils';
import { logger } from '../utils/logger';
import { auth, db } from '../services/firebase';
import { getCurrentUser } from '../services/userService';
import { getDoc, doc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Video from 'react-native-video';

interface ChangelogItem {
  type: 'text' | 'image' | 'video' | 'url';
  content: string;
  title?: string;
  description?: string;
  format?: 'bold' | 'italic' | 'normal';
}

interface UpdateInfo {
  latestVersion: string;
  minVersion: string;
  versionCode: number;
  changelog: ChangelogItem[];
  downloadUrls: {
    universal: string;
    'arm64-v8a': string;
    x86_64: string;
    x86: string;
  };
  releaseDate: string;
  isForced: boolean;
  showUpdate: boolean;
  aboutUpdate?: string;
  currentAppVersion?: string;
}

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (feedback: { type: string; message: string; }) => void;
}

function FeedbackModal({ visible, onClose, onSubmit }: FeedbackModalProps) {
  const [feedbackType, setFeedbackType] = useState('general');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ url: string, type: string, name: string }>>([]);

  const uploadFile = async (fileUri: string, fileType: string, fileName: string): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('reqtype', 'fileupload');
      formData.append('fileToUpload', {
        uri: fileUri,
        name: fileName,
        type: fileType
      } as any);

      const response = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: formData,
      });

      const url = await response.text();
      if (url.startsWith('http')) {
        return url;
      }
      throw new Error('Invalid response from Catbox');
    } catch (error) {
      console.error('Error uploading to Catbox:', error);
      throw error;
    }
  };

  const pickAndUploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true
      });

      if (!result.canceled && result.assets.length > 0) {
        setUploadingFile(true);

        for (const asset of result.assets) {
          // Check file size (300MB limit)
          const maxSize = 300 * 1024 * 1024; // 300MB in bytes
          const fileSize = asset.size || 0;

          if (fileSize > maxSize) {
            Alert.alert('File Too Large', `${asset.name} exceeds the 300MB limit`);
            continue;
          }

          try {
            const url = await uploadFile(asset.uri, asset.mimeType || 'application/octet-stream', asset.name);
            setAttachments(prev => [...prev, {
              url,
              type: asset.mimeType || 'application/octet-stream',
              name: asset.name
            }]);
          } catch (error) {
            Alert.alert('Upload Failed', `Failed to upload ${asset.name}`);
          }
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload file. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter your feedback message');
      return;
    }

    try {
      setIsSubmitting(true);

      const deviceInfo = {
        model: Device.modelName || 'Unknown',
        architecture: Device.supportedCpuArchitectures?.[0] || 'unknown',
        appVersion: APP_CONFIG.VERSION
      };

      const feedbackData = {
        type: feedbackType,
        message: message.trim(),
        email: email.trim() || undefined,
        deviceInfo,
        attachments: attachments.length > 0 ? attachments : undefined
      };

      const response = await fetch(`${APP_CONFIG.API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(feedbackData)
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      Alert.alert(
        'Success',
        'Thank you for your feedback! We will review it shortly.',
        [{ text: 'OK', onPress: () => {
          setMessage('');
          setEmail('');
          setFeedbackType('general');
          setAttachments([]);
          onClose();
        }}]
      );

    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAttachment = (attachment: { url: string, type: string, name: string }, index: number) => {
    const isImage = attachment.type.startsWith('image/');

    return (
      <View key={index} style={styles.attachmentContainer}>
        {isImage ? (
          <Image 
            source={{ uri: attachment.url }} 
            style={styles.attachmentPreview} 
            resizeMode="contain"
          />
        ) : (
          <View style={styles.filePreview}>
            <MaterialIcons name="insert-drive-file" size={24} color="#fff" />
            <Text style={styles.fileName} numberOfLines={1}>{attachment.name}</Text>
          </View>
        )}
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={() => removeAttachment(index)}
        >
          <MaterialIcons name="close" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Send Feedback</Text>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={onClose}
              disabled={isSubmitting}
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.feedbackTypeContainer}>
            <TouchableOpacity 
              style={[
                styles.typeButton, 
                feedbackType === 'general' && styles.selectedType,
                styles.typeButtonGeneral
              ]}
              onPress={() => setFeedbackType('general')}
            >
              <MaterialIcons name="chat" size={20} color={feedbackType === 'general' ? '#fff' : '#666'} />
              <Text style={[styles.typeText, feedbackType === 'general' && styles.selectedTypeText]}>
                General
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.typeButton, 
                feedbackType === 'bug' && styles.selectedType,
                styles.typeButtonBug
              ]}
              onPress={() => setFeedbackType('bug')}
            >
              <MaterialIcons name="bug-report" size={20} color={feedbackType === 'bug' ? '#fff' : '#666'} />
              <Text style={[styles.typeText, feedbackType === 'bug' && styles.selectedTypeText]}>
                Bug Report
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.typeButton, 
                feedbackType === 'feature' && styles.selectedType,
                styles.typeButtonFeature
              ]}
              onPress={() => setFeedbackType('feature')}
            >
              <MaterialIcons name="lightbulb" size={20} color={feedbackType === 'feature' ? '#fff' : '#666'} />
              <Text style={[styles.typeText, feedbackType === 'feature' && styles.selectedTypeText]}>
                Feature
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Your Message</Text>
            <TextInput
              style={[styles.feedbackInput, styles.messageInput]}
              placeholder="What would you like to tell us?"
              placeholderTextColor="#666"
              multiline
              numberOfLines={5}
              value={message}
              onChangeText={setMessage}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email (optional)</Text>
            <View style={styles.emailInputContainer}>
              <MaterialIcons name="email" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.emailInput}
                placeholder="We'll keep you updated"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.attachmentSection}>
            <TouchableOpacity
              style={[
                styles.attachButton,
                attachments.length > 0 && styles.attachButtonActive,
                uploadingFile && styles.attachButtonUploading
              ]}
              onPress={pickAndUploadFile}
              disabled={uploadingFile || isSubmitting}
            >
              {uploadingFile ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialIcons 
                    name="attach-file" 
                    size={20} 
                    color={attachments.length > 0 ? '#fff' : '#666'} 
                  />
                  <Text style={[
                    styles.attachButtonText,
                    attachments.length > 0 && styles.attachButtonTextActive
                  ]}>
                    {attachments.length > 0 
                      ? `${attachments.length} File${attachments.length !== 1 ? 's' : ''} Attached` 
                      : 'Attach Files'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {attachments.length > 0 && (
              <Text style={styles.attachmentHint}>
                Tap 'Attach Files' to add more
              </Text>
            )}
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.cancelButton, isSubmitting && styles.buttonDisabled]} 
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.submitButton, 
                isSubmitting && styles.buttonDisabled,
                !message.trim() && styles.buttonDisabled
              ]} 
              onPress={handleSubmit}
              disabled={isSubmitting || !message.trim()}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="send" size={20} color="#fff" style={styles.submitIcon} />
                  <Text style={styles.submitButtonText}>Submit</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface DeviceInfo {
  deviceArchitecture: string;
  detectedUrlKey: string;
}

export default function AboutScreen() {
  const { theme } = useTheme();
  const appVersion = getAppVersion();
  const [clearingCache, setClearingCache] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState({
    deviceArchitecture: '',
    detectedUrlKey: ''
  });
  const [stats, setStats] = useState({
    watchedAnime: 0,
    bookmarkedAnime: 0
  });
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);
  const [simulatedArchitecture, setSimulatedArchitecture] = useState<string | null>(null);
  
  // Add state for the "What's New" modal
  const [whatsNewInfo, setWhatsNewInfo] = useState<WhatsNewInfo | null>(null);
  const [showWhatsNewModal, setShowWhatsNewModal] = useState(false);
  const [isLoadingWhatsNew, setIsLoadingWhatsNew] = useState(false);
  const [hasUnreadMentions, setHasUnreadMentions] = useState(false);
  const [isCheckingMentions, setIsCheckingMentions] = useState(false);

  const { history } = useWatchHistoryStore();
  const { myList } = useMyListStore();

  // Add refs for each section
  const scrollViewRef = useRef<ScrollView>(null);
  const aboutSectionRef = useRef<View>(null);
  const donationSectionRef = useRef<View>(null);
  const statsSectionRef = useRef<View>(null);
  const versionSectionRef = useRef<View>(null);
  const userContentSectionRef = useRef<View>(null);
  const deviceInfoSectionRef = useRef<View>(null);
  const dataManagementSectionRef = useRef<View>(null);
  const appSectionRef = useRef<View>(null);
  const developerSectionRef = useRef<View>(null);

  // Get section param from deep link
  const { section } = useLocalSearchParams();

  // Function to scroll to a specific section
  const scrollToSection = (sectionRef: React.RefObject<View>) => {
    if (sectionRef.current && scrollViewRef.current) {
      sectionRef.current.measureLayout(
        // @ts-ignore - Known issue with ScrollView ref type
        scrollViewRef.current,
        (_, y) => {
          scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
        },
        () => console.log('Failed to measure')
      );
    }
  };

  // Handle deep linking
  useEffect(() => {
    if (section) {
      const sectionRefs: { [key: string]: React.RefObject<View> } = {
        about: aboutSectionRef,
        donate: donationSectionRef,
        stats: statsSectionRef,
        version: versionSectionRef,
        content: userContentSectionRef,
        device: deviceInfoSectionRef,
        data: dataManagementSectionRef,
        app: appSectionRef,
        developer: developerSectionRef
      };

      const targetRef = sectionRefs[section as string];
      if (targetRef) {
        // Add a small delay to ensure the layout is ready
        setTimeout(() => scrollToSection(targetRef), 300);
      }
    }
  }, [section]);

  // Function to create deep link
  const createDeepLink = (section: string) => {
    const scheme = APP_CONFIG.APP_SCHEME || 'anisurge';
    return `${scheme}://about/${section}`;
  };

  // Update the getArchitectureInfo function to return the info instead of setting state
  const getArchitectureInfo = async (): Promise<DeviceInfo> => {
    try {
      // Get device architecture
      const deviceArch = Device.supportedCpuArchitectures;
      const primaryArch = deviceArch && deviceArch.length > 0 ? deviceArch[0] : 'unknown';
      
      // Get the URL key that would be used for downloads
      const urlKey = getDeviceArchitectureUrlKey(simulatedArchitecture);
      
      // Format architecture for display
      const formatArchitecture = (arch: string) => {
        switch(arch.toLowerCase()) {
          case 'arm64':
            return 'ARM64 (64-bit)';
          case 'arm64-v8a':
            return 'ARM64-v8a (64-bit)';
          case 'arm':
            return 'ARM (32-bit)';
          case 'x86_64':
            return 'x86_64 (64-bit Intel/AMD)';
          case 'x86':
            return 'x86 (32-bit Intel/AMD)';
          default:
            return arch;
        }
      };
      
      return {
        deviceArchitecture: formatArchitecture(primaryArch),
        detectedUrlKey: urlKey
      };
    } catch (error) {
      console.error('Error getting architecture info:', error);
      return {
        deviceArchitecture: 'unknown',
        detectedUrlKey: 'universal'
      };
    }
  };

  // Update the useEffect to properly set the device info
  useEffect(() => {
    const updateDeviceInfo = async () => {
      const info = await getArchitectureInfo();
      setDeviceInfo(info);
    };
    
    updateDeviceInfo();
  }, [simulatedArchitecture]);

  // Preload the background video
  useEffect(() => {
    const preloadVideo = async () => {
      try {
        setIsLoading(true);
        // Preload the video using Expo's Asset system
        const asset = Asset.fromModule(require('../assets/back.mp4'));
        await asset.downloadAsync();
        setImageReady(true);
      } catch (error) {
        console.error('Error preloading video:', error);
        // If preloading fails, still mark as ready to avoid blocking UI
        setImageReady(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    preloadVideo();
  }, []);

  useEffect(() => {
    // Calculate statistics from real user data
    const calculateStats = () => {
      // Count unique anime by creating a Set of unique anime IDs from watch history
      const uniqueAnime = new Set(history.map(item => item.id));
      
      // Set real statistics based on user's actual data
      setStats({
        watchedAnime: uniqueAnime.size, // Number of unique anime watched
        bookmarkedAnime: myList.length // Number of bookmarked anime
      });
    };
    
    calculateStats();
  }, [history, myList]);

  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) => console.error('Error opening URL:', err));
  };

  const shareApp = async () => {
    try {
      await Share.share({
        message: `Check out ${APP_CONFIG.APP_NAME}, the best anime streaming app! Download now: ${APP_CONFIG.WEBSITE_URL}`,
      });
    } catch (error) {
      console.error('Error sharing app:', error);
    }
  };

  const [isFeedbackModalVisible, setIsFeedbackModalVisible] = useState(false);

  const sendFeedback = () => {
    setIsFeedbackModalVisible(true);
  };

  const handleFeedbackSubmit = async (feedback: { type: string; message: string; }) => {
    try {
      const deviceInfo = await getArchitectureInfo();
      const emailBody = `
Type: ${feedback.type}
Message: ${feedback.message}

App Version: ${APP_CONFIG.VERSION}
Device: ${Device.modelName || 'Unknown'}
Architecture: ${deviceInfo.deviceArchitecture}
      `.trim();

      await Linking.openURL(`mailto:${APP_CONFIG.SUPPORT_EMAIL}?subject=${encodeURIComponent(`${APP_CONFIG.APP_NAME} Feedback - ${feedback.type}`)}&body=${encodeURIComponent(emailBody)}`);
    } catch (error) {
      Alert.alert('Error', 'Could not open email client. Please try again later.');
    }
  };

  /**
   * Checks for updates manually - now only used for debugging purposes
   * since updates are automatically checked in the background.
   */
  const checkForUpdates = async () => {
    try {
      const response = await fetch(`${APP_CONFIG.API_BASE_URL}/updates/latest`);
      if (!response.ok) {
        throw new Error(`Failed to check for updates: ${response.status}`);
      }
      
      const data: UpdateInfo = await response.json();
      logger.debug('Update check response:', JSON.stringify(data));
      
      // Validate the required fields
      if (!data || !data.latestVersion || !data.downloadUrls || !data.downloadUrls.universal) {
        logger.error('Invalid update data received:', JSON.stringify(data));
        Alert.alert('Update Check Failed', 'Received invalid update data from server.');
        return;
      }
      
      // Ensure required fields exist
      if (data.isForced === undefined) {
        data.isForced = false;
      }
      
      if (data.changelog === undefined) {
        data.changelog = [];
      }
      
      // Handle legacy format (string[] instead of ChangelogItem[])
      if (data.changelog && Array.isArray(data.changelog) && 
          data.changelog.length > 0 && typeof data.changelog[0] === 'string') {
        data.changelog = (data.changelog as unknown as string[]).map(item => ({
          type: 'text',
          content: item,
          format: 'normal'
        }));
      }
      
      // Set currentAppVersion to our actual app version (overriding any server value)
      // This ensures we're displaying the correct current version in the UI
      data.currentAppVersion = getAppVersion();
      
      const currentVersion = getAppVersion();
      const currentVersionCode = getAppVersionCode();
      
      // Compare our actual app version with the server's latest version
      if (data.versionCode > currentVersionCode) {
        logger.info('New version available:', data.latestVersion);
        
        // Store update info
        setUpdateInfo(data);
        
        // Show update modal
        setShowUpdateModal(true);
      } else {
        logger.info('App is up to date', '');
        Alert.alert('Up to Date', 'You are using the latest version of the app.');
      }
    } catch (error) {
      logger.error('Error checking for updates:', error instanceof Error ? error.message : String(error));
      Alert.alert('Update Check Failed', 'Failed to check for updates. Please try again later.');
    }
  };
  
  const handleUpdate = () => {
    if (!updateInfo) return;
    
    // The URL opening is now handled in the UpdateModal component
    // This function is called after the URL is opened
    logger.info('Update initiated for version:', updateInfo.latestVersion);
  };

  const navigateToHistory = () => {
    router.push('/history');
  };

  const clearAppCache = async () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear the app cache? This will remove all temporary data but won\'t affect your watch history or bookmarks.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              setClearingCache(true);
              // Clear all cache keys
              const keys = Object.values(APP_CONFIG.CACHE_KEYS);
              await AsyncStorage.multiRemove(keys);
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              console.error('Error clearing cache:', error);
              Alert.alert('Error', 'Failed to clear cache');
            } finally {
              setClearingCache(false);
            }
          }
        }
      ]
    );
  };

  const navigateToDownloads = () => {
    // This would navigate to a downloads management page
    // router.push('/downloads');
    Alert.alert('Coming Soon', 'Downloads management will be available in a future update.');
  };

  const showThemeOptions = () => {
    // This would show theme options in a future update
    Alert.alert('Coming Soon', 'Theme customization will be available in a future update.');
  };

  const handleDebugCheckForUpdates = async () => {
    setIsCheckingForUpdates(true);
    try {
      await checkForUpdates();
    } catch (error) {
      logger.error('Error checking for updates:', error instanceof Error ? error.message : String(error));
      Alert.alert('Update Check Failed', 'Failed to check for updates. Please try again later.');
    } finally {
      setIsCheckingForUpdates(false);
    }
  };

  const simulateArchitecture = async (architecture: string | null) => {
    setSimulatedArchitecture(architecture);
    // Force refresh device info
    await getArchitectureInfo();
    // If we have update info, refresh the debug section
    if (updateInfo) {
      setUpdateInfo({...updateInfo});
    }
  };

  const showTestUpdateModal = () => {
    if (updateInfo) {
      setShowUpdateModal(true);
    } else {
      Alert.alert(
        'No Update Info', 
        'Please check for updates first to load update information.',
        [{ text: 'OK' }]
      );
    }
  };

  const refreshArchitectureInfo = () => {
    // Implementation not needed since this is debug-only
    console.log('Debug: refreshArchitectureInfo called');
  };

  const testArchitectureSpecificDownloadUrl = () => {
    // Implementation not needed since this is debug-only
    console.log('Debug: testArchitectureSpecificDownloadUrl called');
  };

  const showVersionDetails = () => {
    Alert.alert(
      'Version Information',
      `App version is defined in constants/appConfig.ts:\n\n` +
      `APP_CONFIG.VERSION = "${APP_CONFIG.VERSION}"\n\n` +
      `The getAppVersion() function returns this value:\n\n` +
      `export const getAppVersion = (): string => {\n` +
      `  return APP_CONFIG.VERSION;\n` +
      `};\n\n` +
      `This is the actual version used throughout the app.`,
      [{ text: 'OK' }]
    );
  };

  // Add a function to show the "What's New" modal
  const handleShowWhatsNew = async () => {
    try {
      setIsLoadingWhatsNew(true);
      
      // Fetch the "What's New" information
      const info = await fetchWhatsNewInfo();
      
      if (info) {
        setWhatsNewInfo(info);
        setShowWhatsNewModal(true);
      } else {
        Alert.alert('Error', 'Failed to load "What\'s New" information. Please try again later.');
      }
    } catch (error) {
      logger.error('Error showing "What\'s New":', error instanceof Error ? error.message : String(error));
      Alert.alert('Error', 'Failed to load "What\'s New" information. Please try again later.');
    } finally {
      setIsLoadingWhatsNew(false);
    }
  };

  // Add functions to handle donations like in profile.tsx
  const handlePremiumUpgrade = () => {
    // Get current user ID
    const user = getCurrentUser();
    if (!user) {
      Alert.alert('Login Required', 'Please log in to upgrade to Premium.');
      return;
    }

    // Create a callback URL for deep linking back to the app
    const callbackUrl = Linking.createURL('profile/premium-success');
    
    // Create the payment URL with user information
    const paymentUrl = `https://mg.anishkumar.tech/anime-premium.html?userId=${user.uid}&email=${encodeURIComponent(user.email || '')}&callback=${encodeURIComponent(callbackUrl)}`;
    
    // Log the attempt
    logger.info('Premium', `Opening payment page for user: ${user.uid}`);
    
    // Open the payment page in the device's browser
    Linking.openURL(paymentUrl).catch(err => {
      logger.error('Premium', `Error opening payment URL: ${err}`);
      Alert.alert('Error', 'Could not open the payment page. Please try again later.');
    });
  };

  const handleDonate = () => {
    // Get current user ID
    const user = getCurrentUser();
    if (!user) {
      Alert.alert('Login Required', 'Please log in to make a donation.');
      return;
    }

    // Create a callback URL for deep linking back to the app
    const callbackUrl = Linking.createURL('profile/donation-success');
    
    // Create the donation URL with user information
    const donationUrl = `https://mg.anishkumar.tech/donate.html?userId=${user.uid}&email=${encodeURIComponent(user.email || '')}&callback=${encodeURIComponent(callbackUrl)}`;
    
    // Log the attempt
    logger.info('Donation', `Opening donation page for user: ${user.uid}`);
    
    // Open the donation page in the device's browser
    Linking.openURL(donationUrl).catch(err => {
      logger.error('Donation', `Error opening donation URL: ${err}`);
      Alert.alert('Error', 'Could not open the donation page. Please try again later.');
    });
  };

  const [hasPremium, setHasPremium] = useState(false);
  const [checkingPremium, setCheckingPremium] = useState(true);

  // Add useEffect to check premium status
  useEffect(() => {
    checkPremiumStatus();
  }, []);

  const checkPremiumStatus = async () => {
    try {
      const user = getCurrentUser();
      if (!user) {
        setHasPremium(false);
        setCheckingPremium(false);
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setHasPremium(userDoc.data().isPremium === true);
      }
    } catch (error) {
      logger.error('About', `Error checking premium status: ${error}`);
    } finally {
      setCheckingPremium(false);
    }
  };

  // Add a function to check for unread mentions
  const checkUnreadMentions = async () => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) return;
      
      setIsCheckingMentions(true);
      
      // Query the notifications collection for unread mention notifications
      const notificationsRef = collection(db, 'notifications');
      const mentionsQuery = query(
        notificationsRef,
        where('userId', '==', currentUser.uid),
        where('type', '==', 'mention'),
        where('read', '==', false),
        limit(1)
      );
      
      const snapshot = await getDocs(mentionsQuery);
      setHasUnreadMentions(!snapshot.empty);
    } catch (error) {
      console.error('Error checking unread mentions:', error);
    } finally {
      setIsCheckingMentions(false);
    }
  };
  
  // Check for unread mentions when the screen loads
  useEffect(() => {
    checkUnreadMentions();
    
    // Set up an interval to periodically check for new mentions
    const mentionsInterval = setInterval(checkUnreadMentions, 60000); // Check every minute
    
    return () => {
      clearInterval(mentionsInterval);
    };
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'About',
          headerStyle: {
            backgroundColor: '#1a1a1a',
          },
          headerTintColor: '#fff',
        }}
      />
      
      {/* Update Modal */}
      {updateInfo && (
        <UpdateModal 
          visible={showUpdateModal}
          updateInfo={updateInfo}
          onClose={() => setShowUpdateModal(false)}
          onUpdate={handleUpdate}
          simulatedArch={simulatedArchitecture}
        />
      )}
      
      {/* What's New Modal */}
      {whatsNewInfo && (
        <WhatsNewModal 
          visible={showWhatsNewModal}
          whatsNewInfo={whatsNewInfo}
          onClose={() => setShowWhatsNewModal(false)}
        />
      )}
      
      <ScrollView 
        ref={scrollViewRef}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        {/* App Header */}
        {isLoading ? (
          <LinearGradient
            colors={[APP_CONFIG.PRIMARY_COLOR, APP_CONFIG.SECONDARY_COLOR]}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <View style={styles.appInfoContainer}>
                <Image
                  source={require('../assets/icon.png')}
                  style={styles.appIcon}
                  resizeMode="contain"
                />
                <Text style={[styles.appName, { color: theme.colors.text }]}>{APP_CONFIG.APP_NAME}</Text>
                <Text style={[styles.appVersion, { color: theme.colors.textSecondary }]}>Version {appVersion}</Text>
              </View>
              <View style={styles.socialButtons}>
                <TouchableOpacity 
                  style={styles.discordButton}
                  onPress={() => openLink('https://anisurge.me/discord')}
                >
                  <Image 
                    source={require('../assets/discord-white.png')}
                    style={styles.socialIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.socialButtonText}>Discord</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        ) : (
          <View style={styles.header}>
            <Video
              source={require('../assets/back.mp4')}
              style={styles.backgroundVideo}
              resizeMode="cover"
              repeat
              muted
              paused={false}
            />
            <View style={styles.videoOverlay} />
            <View style={styles.headerContent}>
              <View style={styles.appInfoContainer}>
                <Image
                  source={require('../assets/icon.png')}
                  style={styles.appIcon}
                  resizeMode="contain"
                />
                <Text style={[styles.appName, { color: theme.colors.text }]}>{APP_CONFIG.APP_NAME}</Text>
                <Text style={[styles.appVersion, { color: theme.colors.textSecondary }]}>Version {appVersion}</Text>
              </View>
              <View style={styles.socialButtons}>
                <TouchableOpacity 
                  style={styles.discordButton}
                  onPress={() => openLink('https://anisurge.me/discord')}
                >
                  <Image 
                    source={require('../assets/discord-white.png')}
                    style={styles.socialIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.socialButtonText}>Discord</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* About Section */}
        <View ref={aboutSectionRef} style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.infoCard}>
            <Text style={styles.aboutText}>
              {APP_CONFIG.APP_NAME} is a free anime streaming app that lets you watch your favorite anime shows and movies anytime, anywhere.
            </Text>
            <Text style={styles.aboutText}>
              With a vast library of content, {APP_CONFIG.APP_NAME} provides a seamless viewing experience with high-quality streams and a user-friendly interface.
            </Text>
          </View>
          {/* Schedule Page Button */}
          <TouchableOpacity 
            style={[styles.profileButton, {marginBottom: 16}]}
            onPress={() => router.push('/schedule')}
          >
            <MaterialIcons name="event" size={24} color="#fff" />
            <Text style={styles.profileButtonText}>Schedule</Text>
          </TouchableOpacity>
        </View>

        {/* User Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Account</Text>
          <View style={styles.infoCard}>
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => router.push('/profile')}
            >
              <MaterialIcons name="person" size={24} color="#fff" />
              <Text style={styles.profileButtonText}>
                {auth.currentUser ? "View Profile" : "Login / Register"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => router.push('/importExport')}
            >
              <MaterialIcons name="import-export" size={24} color="#fff" />
              <Text style={styles.profileButtonText}>Import/Export List</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => router.push('/notifications')}
            >
              <MaterialIcons name="notifications" size={24} color="#fff" />
              <Text style={styles.profileButtonText}>Notifications</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Donation Section - Updated */}
        <View ref={donationSectionRef} style={styles.section}>
          <Text style={styles.sectionTitle}>Support Development</Text>
          <View style={styles.donationCard}>
            <Text style={styles.donationText}>
              If you enjoy using {APP_CONFIG.APP_NAME}, please consider supporting the development. Your donations help keep the app free and ad-free!
            </Text>
            
            <View style={styles.premiumFeaturesContainer}>
              <Text style={styles.premiumFeaturesTitle}>Premium Benefits:</Text>
              <View style={styles.premiumFeatureItem}>
                <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                <Text style={styles.premiumFeatureText}>Premium Avatars</Text>
              </View>
              <View style={styles.premiumFeatureItem}>
                <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                <Text style={styles.premiumFeatureText}>Early Access to Features</Text>
              </View>
              <View style={styles.premiumFeatureItem}>
                <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                <Text style={styles.premiumFeatureText}>Unlimited Comments (No Rate Limits)</Text>
              </View>
            </View>
            
            <View style={styles.donationButtonsContainer}>
              {checkingPremium ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#f4511e" />
                  <Text style={styles.loadingText}>Checking premium status...</Text>
                </View>
              ) : !hasPremium ? (
                <TouchableOpacity 
                  style={styles.premiumButton}
                  onPress={handlePremiumUpgrade}
                >
                  <MaterialIcons name="verified" size={20} color="#FFFFFF" />
                  <Text style={styles.donationButtonText}>Premium Upgrade</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.premiumStatusContainer}>
                  <MaterialIcons name="verified" size={20} color="#4CAF50" />
                  <Text style={styles.premiumStatusText}>You have Premium access!</Text>
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.donateButton}
                onPress={handleDonate}
              >
                <MaterialIcons name="favorite" size={20} color="#FFFFFF" />
                <Text style={styles.donationButtonText}>Make a Donation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Support & Feedback Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Feedback</Text>
          <View style={styles.infoCard}>
            <TouchableOpacity 
              style={styles.supportButton}
              onPress={() => router.push('/gallery')}
            >
              <MaterialIcons name="photo-library" size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.supportButtonText}>Gallery</Text>
            </TouchableOpacity>
            
            <SectionDivider />
            
            <TouchableOpacity 
              style={styles.supportButton}
              onPress={() => router.push('/mentions')}
            >
              <View style={styles.mentionsButtonContent}>
                <MaterialIcons name="alternate-email" size={24} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.supportButtonText}>Mentions</Text>
                {isCheckingMentions ? (
                  <ActivityIndicator size="small" color="#f4511e" style={styles.mentionIndicator} />
                ) : hasUnreadMentions ? (
                  <View style={styles.mentionBadge}>
                    <MaterialIcons name="circle" size={10} color="#f4511e" />
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
            
            <SectionDivider />
            
            <TouchableOpacity 
              style={styles.supportButton}
              onPress={() => setIsFeedbackModalVisible(true)}
            >
              <MaterialIcons name="feedback" size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.supportButtonText}>Send Feedback</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Section */}
        <View ref={statsSectionRef} style={styles.section}>
          <Text style={styles.sectionTitle}>Your Statistics</Text>
          <View style={styles.infoCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MaterialIcons name="tv" size={24} color="#f4511e" />
                <Text style={styles.statValue}>{stats.watchedAnime}</Text>
                <Text style={styles.statLabel}>Anime Watched</Text>
              </View>
              
              <View style={styles.statItem}>
                <MaterialIcons name="bookmark" size={24} color="#f4511e" />
                <Text style={styles.statValue}>{stats.bookmarkedAnime}</Text>
                <Text style={styles.statLabel}>Anime Bookmarked</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Version Section */}
        <View ref={versionSectionRef} style={styles.section}>
          <Text style={styles.sectionTitle}>Version Information</Text>
          <View style={styles.infoCard}>
            <TouchableOpacity onPress={showVersionDetails}>
              <InfoRow 
                icon="info" 
                label="App Version" 
                value={appVersion} 
                isLink
              />
            </TouchableOpacity>
            <SectionDivider />
            <TouchableOpacity onPress={handleShowWhatsNew} disabled={isLoadingWhatsNew}>
              <InfoRow 
                icon="new-releases" 
                label="What's New" 
                value={isLoadingWhatsNew ? "Loading..." : "View"} 
                isLink
              />
            </TouchableOpacity>
            <SectionDivider />
            <InfoRow 
              icon="tag" 
              label="Version Code" 
              value={getAppVersionCode().toString()} 
            />
          </View>
        </View>

        {/* User Content Section */}
        <View ref={userContentSectionRef} style={styles.section}>
          <Text style={styles.sectionTitle}>Your Content</Text>
          <View style={styles.infoCard}>
            <TouchableOpacity onPress={navigateToHistory}>
              <InfoRow icon="history" label="Watch History" value="View" isLink />
            </TouchableOpacity>
            <SectionDivider />
            <TouchableOpacity onPress={() => router.push('/notifications')}>
              <InfoRow 
                icon="notifications" 
                label="Notifications" 
                value="View" 
                isLink 
              />
            </TouchableOpacity>
            <SectionDivider />
            <TouchableOpacity onPress={() => router.push('/mylist')}>
              <InfoRow icon="bookmark" label="My List" value="View" isLink />
            </TouchableOpacity>
            <SectionDivider />
            <TouchableOpacity onPress={() => router.push('/importExport')}>
              <InfoRow icon="import-export" label="Import/Export List" value="Open" isLink />
            </TouchableOpacity>
            <SectionDivider />
            <TouchableOpacity onPress={navigateToDownloads}>
              <InfoRow icon="file-download" label="Downloads" value="Manage" isLink />
            </TouchableOpacity>
          </View>
        </View>

        {/* Device Information Section */}
        <View ref={deviceInfoSectionRef} style={styles.section}>
          <Text style={styles.sectionTitle}>Device Information</Text>
          <View style={styles.infoCard}>
            <InfoRow 
              icon="smartphone" 
              label="Device" 
              value={`${Device.modelName || 'Unknown'}`} 
            />
            <SectionDivider />
            <InfoRow 
              icon="memory" 
              label="Device Architecture" 
              value={deviceInfo.deviceArchitecture} 
            />
            <SectionDivider />
            <InfoRow 
              icon="system-update" 
              label="Update Package Type" 
              value={deviceInfo.detectedUrlKey} 
            />
          </View>
        </View>

        {/* Data Management Section */}
        <View ref={dataManagementSectionRef} style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <View style={styles.infoCard}>
            <TouchableOpacity onPress={clearAppCache} disabled={clearingCache}>
              <InfoRow 
                icon="cleaning-services" 
                label="Clear Cache" 
                value={clearingCache ? "Clearing..." : "Clear"} 
                isLink 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Section */}
        <View ref={appSectionRef} style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity 
              style={styles.discordButton}
              onPress={() => openLink('https://anisurge.me/discord')}
            >
              <Image 
                source={require('../assets/discord-white.png')}
                style={styles.socialIcon}
                resizeMode="contain"
              />
              <Text style={styles.socialButtonText}>Discord</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.telegramButton}
              onPress={() => openLink('https://anisurge.me/telegram')}
            >
              <Image 
                source={require('../assets/telegram-white.png')}
                style={styles.socialIcon}
                resizeMode="contain"
              />
              <Text style={styles.socialButtonText}>Telegram</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoCard}>
            <TouchableOpacity onPress={shareApp}>
              <InfoRow icon="share" label="Share App" value="Share" isLink />
            </TouchableOpacity>
            <SectionDivider />
            <TouchableOpacity onPress={sendFeedback}>
              <InfoRow icon="feedback" label="Send Feedback" value="Send" isLink />
            </TouchableOpacity>
          </View>
        </View>

        {/* Developer Section */}
        <View ref={developerSectionRef} style={styles.section}>
          <Text style={styles.sectionTitle}>Developer</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="code" label="Developed By" value={`${APP_CONFIG.APP_NAME} Team`} />
            <SectionDivider />
            <TouchableOpacity onPress={() => openLink(`mailto:${APP_CONFIG.SUPPORT_EMAIL}`)}>
              <InfoRow icon="email" label="Contact" value={APP_CONFIG.SUPPORT_EMAIL} isLink />
            </TouchableOpacity>
            <SectionDivider />
            <TouchableOpacity onPress={() => openLink('https://www.buymeacoffee.com/r3ap3redit')}>
              <InfoRow icon="favorite" label="Support Development(buy me a coffee)" value="Donate" isLink />
            </TouchableOpacity>
            <SectionDivider />
            <TouchableOpacity onPress={() => openLink('https://www.buymeacoffee.com/r3ap3redit')}>
              <View style={styles.buyMeCoffeeButton}>
                <Image 
                  source={{ uri: 'https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png' }}
                  style={styles.buyMeCoffeeImage}
                  resizeMode="contain"
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with ❤️ for anime fans</Text>
        </View>
      </ScrollView>
      <FeedbackModal
        visible={isFeedbackModalVisible}
        onClose={() => setIsFeedbackModalVisible(false)}
        onSubmit={handleFeedbackSubmit}
      />
    </>
  );
}

// Helper component for info rows
interface InfoRowProps {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  value: string;
  isLink?: boolean;
}

function InfoRow({ icon, label, value, isLink = false }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <MaterialIcons name={icon} size={20} color="#f4511e" style={styles.infoIcon} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, isLink && styles.linkText]}>{value}</Text>
    </View>
  );
}

// Add this component after the InfoRow component
function SectionDivider() {
  return <View style={styles.sectionDivider} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(5px)',
  },
  headerContent: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 2,
  },
  appInfoContainer: {
    alignItems: 'center',
    flex: 1,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 10,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  appVersion: {
    fontSize: 14,
  },
  socialButtons: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  discordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5865F2',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  telegramButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0088cc',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  socialIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  socialButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoIcon: {
    marginRight: 10,
  },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    color: '#ccc',
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'right',
    flex: 1,
  },
  linkText: {
    color: '#f4511e',
  },
  aboutText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 10,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#999',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
    padding: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 10,
  },
  debugSection: {
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    margin: 16,
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  debugSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
    color: '#555',
  },
  debugRow: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  debugLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    width: 100,
  },
  debugValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  debugButtonContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  debugButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  debugButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  simulatorContainer: {
    marginVertical: 12,
  },
  simulatorButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  simulatorButton: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  simulatorButtonActive: {
    backgroundColor: '#007AFF',
  },
  simulatorButtonText: {
    fontSize: 14,
    color: '#333',
  },
  simulationActive: {
    marginTop: 8,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  highlightedText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  debugButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  smallDebugButton: {
    backgroundColor: '#555',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  smallDebugButtonText: {
    color: 'white',
    fontSize: 14,
  },
  donationCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  donationText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 15,
    lineHeight: 20,
  },
  donationButtonsContainer: {
    marginTop: 15,
  },
  premiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4511e',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  donationButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4511e',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  profileButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  premiumFeaturesContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  premiumFeaturesTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  premiumFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  premiumFeatureText: {
    color: '#ccc',
    marginLeft: 8,
    fontSize: 14,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  loadingText: {
    color: '#ccc',
    marginLeft: 8,
    fontSize: 14,
  },
  premiumStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  premiumStatusText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  feedbackTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#2C2C2C',
  },
  typeButtonGeneral: {
    borderColor: '#2196F3',
    borderWidth: 1,
  },
  typeButtonBug: {
    borderColor: '#f44336',
    borderWidth: 1,
  },
  typeButtonFeature: {
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  selectedType: {
    backgroundColor: '#f4511e',
    borderColor: '#f4511e',
  },
  typeText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedTypeText: {
    color: '#fff',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  feedbackInput: {
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  messageInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  emailInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  emailInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12,
  },
  attachmentSection: {
    marginBottom: 20,
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2C2C2C',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#666',
    borderStyle: 'dashed',
  },
  attachButtonActive: {
    backgroundColor: '#2C2C2C',
    borderColor: '#f4511e',
    borderStyle: 'solid',
  },
  attachButtonUploading: {
    backgroundColor: '#2C2C2C',
    borderColor: '#f4511e',
    opacity: 0.7,
  },
  attachButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  attachButtonTextActive: {
    color: '#fff',
  },
  attachmentHint: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#2C2C2C',
    alignItems: 'center',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f4511e',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitIcon: {
    marginRight: 8,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    marginVertical: 5,
    gap: 12,
  },
  buttonIcon: {
    marginRight: 0,
  },
  supportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  attachmentContainer: {
    position: 'relative',
    marginVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#2C2C2C',
  },
  attachmentPreview: {
    width: '100%',
    height: 150,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  fileName: {
    color: '#fff',
    flex: 1,
    fontSize: 14,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  buyMeCoffeeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  buyMeCoffeeImage: {
    width: 217,
    height: 60,
  },
  mentionsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mentionBadge: {
    backgroundColor: 'rgba(244, 81, 30, 0.2)',
    borderRadius: 12,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  mentionIndicator: {
    marginLeft: 8,
  },
} as const); 