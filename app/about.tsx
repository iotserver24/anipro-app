import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Share, Image, Alert, Platform, ImageBackground, NativeModules } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { APP_CONFIG, getAppVersion, getAppVersionCode } from '../constants/appConfig';
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
import { auth } from '../services/firebase';

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

export default function AboutScreen() {
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

  // Move the getArchitectureInfo function outside the useEffect
  const getArchitectureInfo = async () => {
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
      
      setDeviceInfo({
        deviceArchitecture: formatArchitecture(primaryArch),
        detectedUrlKey: urlKey
      });
    } catch (error) {
      console.error('Error getting architecture info:', error);
      setDeviceInfo({
        deviceArchitecture: 'unknown',
        detectedUrlKey: 'universal'
      });
    }
  };

  // Update the useEffect to call the function
  useEffect(() => {
    getArchitectureInfo();
  }, [simulatedArchitecture]);

  // Preload the background image
  useEffect(() => {
    const preloadImage = async () => {
      try {
        setIsLoading(true);
        // Preload the image using Expo's Asset system
        const asset = Asset.fromModule(require('../assets/final.jpg'));
        await asset.downloadAsync();
        setImageReady(true);
      } catch (error) {
        console.error('Error preloading image:', error);
        // If preloading fails, still mark as ready to avoid blocking UI
        setImageReady(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    preloadImage();
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

  const sendFeedback = () => {
    const subject = encodeURIComponent(`${APP_CONFIG.APP_NAME} Feedback - v${appVersion}`);
    const body = encodeURIComponent(
      `\n\n\n` +
      `------------------\n` +
      `App Version: ${appVersion}\n` +
      `Device: ${Platform.OS} ${Platform.Version}\n` +
      `------------------`
    );
    openLink(`mailto:${APP_CONFIG.SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
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
      logger.debug('Update check response:', data);
      
      // Validate the required fields
      if (!data || !data.latestVersion || !data.downloadUrls || !data.downloadUrls.universal) {
        logger.error('Invalid update data received:', data);
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
        logger.info('App is up to date');
        Alert.alert('Up to Date', 'You are using the latest version of the app.');
      }
    } catch (error) {
      logger.error('Error checking for updates:', error);
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
      logger.error('Error checking for updates:', error);
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

  const refreshArchitectureInfo = async () => {
    // Force refresh device info
    await getArchitectureInfo();
    Alert.alert('Refreshed', 'Architecture information has been refreshed.');
  };

  const testArchitectureSpecificDownloadUrl = async () => {
    if (!updateInfo) {
      Alert.alert('No Update Info', 'Please check for updates first to load update information.');
      return;
    }
    
    try {
      const downloadUrl = getArchitectureSpecificDownloadUrl(
        updateInfo.downloadUrls,
        simulatedArchitecture
      );
      
      Alert.alert(
        'Download URL',
        `The selected download URL is:\n\n${downloadUrl}\n\nWould you like to open it?`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Open URL',
            onPress: () => Linking.openURL(downloadUrl)
          }
        ]
      );
    } catch (error) {
      console.error('Error getting download URL:', error);
      Alert.alert('Error', 'Failed to get download URL.');
    }
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
      logger.error('Error showing "What\'s New":', error);
      Alert.alert('Error', 'Failed to load "What\'s New" information. Please try again later.');
    } finally {
      setIsLoadingWhatsNew(false);
    }
  };

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
        style={styles.container}
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
                <Text style={styles.appName}>{APP_CONFIG.APP_NAME}</Text>
                <Text style={styles.appVersion}>Version {appVersion}</Text>
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
          <ImageBackground
            source={require('../assets/final.jpg')}
            style={styles.header}
            blurRadius={5}
            defaultSource={require('../assets/icon.png')}
          >
            <View style={styles.headerContent}>
              <View style={styles.appInfoContainer}>
                <Image
                  source={require('../assets/icon.png')}
                  style={styles.appIcon}
                  resizeMode="contain"
                />
                <Text style={styles.appName}>{APP_CONFIG.APP_NAME}</Text>
                <Text style={styles.appVersion}>Version {appVersion}</Text>
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
          </ImageBackground>
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
          </View>
        </View>

        {/* Donation Section */}
        <View ref={donationSectionRef} style={styles.section}>
          <Text style={styles.sectionTitle}>Support Development</Text>
          <View style={styles.donationCard}>
            <TouchableOpacity 
              style={styles.customDonationButton}
              onPress={() => openLink('https://www.buymeacoffee.com/R3AP3Redit')}
            >
              <Text style={styles.customDonationButtonText}>☕ Donate here</Text>
            </TouchableOpacity>
            <Text style={styles.donationText}>
              If you enjoy using {APP_CONFIG.APP_NAME}, please consider supporting the development. Your donations help keep the app free and ad-free!
            </Text>
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
            <TouchableOpacity onPress={() => openLink('https://www.buymeacoffee.com/R3AP3Redit')}>
              <InfoRow icon="favorite" label="Support Development" value="Donate" isLink />
            </TouchableOpacity>
          </View>
        </View>

        {/* Debug Section */}
        {__DEV__ && updateInfo && (
          <>
            <SectionDivider />
            <DebugSection 
              updateInfo={updateInfo} 
              simulatedArch={simulatedArchitecture}
              onSimulate={simulateArchitecture} 
            />
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with ❤️ for anime fans</Text>
        </View>
      </ScrollView>
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

// Add this new component after the InfoRow component
const DebugSection = ({ 
  updateInfo, 
  simulatedArch, 
  onSimulate 
}: { 
  updateInfo: UpdateInfo | null, 
  simulatedArch: string | null,
  onSimulate: (arch: string | null) => Promise<void> 
}) => {
  // Get access to the deviceInfo from the parent component
  const [deviceInfo, setDeviceInfo] = useState({
    deviceArchitecture: '',
    detectedUrlKey: ''
  });

  // Get raw architecture information
  const rawArchitectures = Device.supportedCpuArchitectures || [];
  const primaryRawArch = rawArchitectures.length > 0 ? rawArchitectures[0] : 'unknown';

  // Function to refresh architecture info
  const refreshArchitectureInfo = async () => {
    try {
      // Get device architecture
      const deviceArch = Device.supportedCpuArchitectures;
      const primaryArch = deviceArch && deviceArch.length > 0 ? deviceArch[0] : 'unknown';
      
      // Get the URL key that would be used for downloads
      const urlKey = getDeviceArchitectureUrlKey(simulatedArch);
      
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
      
      setDeviceInfo({
        deviceArchitecture: formatArchitecture(primaryArch),
        detectedUrlKey: urlKey
      });
      
      Alert.alert('Refreshed', 'Architecture information has been refreshed.');
    } catch (error) {
      console.error('Error refreshing architecture info:', error);
      Alert.alert('Error', 'Failed to refresh architecture information.');
    }
  };

  // Function to test architecture-specific download URL
  const testArchitectureSpecificDownloadUrl = async () => {
    if (!updateInfo) {
      Alert.alert('No Update Info', 'Please check for updates first to load update information.');
      return;
    }
    
    try {
      const downloadUrl = getArchitectureSpecificDownloadUrl(
        updateInfo.downloadUrls,
        simulatedArch
      );
      
      Alert.alert(
        'Download URL',
        `The selected download URL is:\n\n${downloadUrl}\n\nWould you like to open it?`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Open URL',
            onPress: () => Linking.openURL(downloadUrl)
          }
        ]
      );
    } catch (error) {
      console.error('Error getting download URL:', error);
      Alert.alert('Error', 'Failed to get download URL.');
    }
  };
  
  // Update deviceInfo when component mounts or simulatedArch changes
  useEffect(() => {
    refreshArchitectureInfo();
  }, [simulatedArch]);
  
  if (!updateInfo) return null;
  
  return (
    <View style={styles.debugSection}>
      <Text style={styles.debugTitle}>Debug Information</Text>
      
      <ArchitectureSimulator 
        currentSimulation={simulatedArch} 
        onSimulate={onSimulate} 
      />
      
      <Text style={styles.debugSubtitle}>Device Architecture:</Text>
      <View style={styles.debugRow}>
        <Text style={styles.debugLabel}>Raw Value:</Text>
        <Text style={styles.debugValue}>{primaryRawArch}</Text>
      </View>
      <View style={styles.debugRow}>
        <Text style={styles.debugLabel}>All Values:</Text>
        <Text style={styles.debugValue}>{rawArchitectures.join(', ')}</Text>
      </View>
      <View style={styles.debugRow}>
        <Text style={styles.debugLabel}>Mapped Key:</Text>
        <Text style={styles.debugValue}>{deviceInfo.detectedUrlKey}</Text>
      </View>
      
      <Text style={styles.debugSubtitle}>Available Download URLs:</Text>
      {Object.entries(updateInfo.downloadUrls).map(([key, url]) => (
        <View key={key} style={styles.debugRow}>
          <Text style={[
            styles.debugLabel, 
            key === deviceInfo.detectedUrlKey && styles.highlightedText
          ]}>
            {key}:
          </Text>
          <Text style={[
            styles.debugValue, 
            key === deviceInfo.detectedUrlKey && styles.highlightedText
          ]} numberOfLines={1} ellipsizeMode="middle">
            {url}
          </Text>
        </View>
      ))}
      
      <Text style={styles.debugSubtitle}>Selected URL:</Text>
      <Text style={styles.debugValue}>
        {getArchitectureSpecificDownloadUrl(updateInfo.downloadUrls, simulatedArch)}
      </Text>

      <View style={styles.debugButtonRow}>
        <TouchableOpacity 
          style={styles.smallDebugButton}
          onPress={() => refreshArchitectureInfo()}
        >
          <Text style={styles.smallDebugButtonText}>Refresh Architecture Info</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.smallDebugButton, { marginLeft: 10, backgroundColor: '#f4511e' }]}
          onPress={() => testArchitectureSpecificDownloadUrl()}
        >
          <Text style={styles.smallDebugButtonText}>Test Download URL</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const ArchitectureSimulator = ({ 
  currentSimulation, 
  onSimulate 
}: { 
  currentSimulation: string | null, 
  onSimulate: (arch: string | null) => Promise<void> 
}) => {
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulate = async (arch: string | null) => {
    setIsSimulating(true);
    try {
      await onSimulate(arch);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <View style={styles.simulatorContainer}>
      <Text style={styles.debugSubtitle}>Simulate Architecture:</Text>
      <View style={styles.simulatorButtons}>
        <TouchableOpacity 
          style={[
            styles.simulatorButton, 
            currentSimulation === null && styles.simulatorButtonActive
          ]}
          onPress={() => handleSimulate(null)}
          disabled={isSimulating}
        >
          <Text style={styles.simulatorButtonText}>Default</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.simulatorButton, 
            currentSimulation === 'arm64' && styles.simulatorButtonActive
          ]}
          onPress={() => handleSimulate('arm64')}
          disabled={isSimulating}
        >
          <Text style={styles.simulatorButtonText}>ARM64</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.simulatorButton, 
            currentSimulation === 'x86_64' && styles.simulatorButtonActive
          ]}
          onPress={() => handleSimulate('x86_64')}
          disabled={isSimulating}
        >
          <Text style={styles.simulatorButtonText}>x86_64</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.simulatorButton, 
            currentSimulation === 'x86' && styles.simulatorButtonActive
          ]}
          onPress={() => handleSimulate('x86')}
          disabled={isSimulating}
        >
          <Text style={styles.simulatorButtonText}>x86</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.simulatorButton, 
            currentSimulation === 'arm64-v8a' && styles.simulatorButtonActive
          ]}
          onPress={() => handleSimulate('arm64-v8a')}
          disabled={isSimulating}
        >
          <Text style={styles.simulatorButtonText}>ARM64-v8a</Text>
        </TouchableOpacity>
      </View>
      {currentSimulation && (
        <Text style={styles.simulationActive}>
          Simulating: {currentSimulation}
        </Text>
      )}
      {isSimulating && (
        <Text style={styles.simulationActive}>
          Updating...
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  headerContent: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    color: '#fff',
    marginBottom: 5,
  },
  appVersion: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
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
    alignItems: 'center',
  },
  customDonationButton: {
    backgroundColor: '#FFDD00',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#000000',
    marginVertical: 15,
  },
  customDonationButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  donationText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
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
}); 