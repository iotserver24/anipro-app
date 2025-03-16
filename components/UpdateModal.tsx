import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions,
  Linking,
  Platform,
  Animated,
  BackHandler,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import RichChangelog from './RichChangelog';
import LoadingOverlay from './LoadingOverlay';
import { getArchitectureSpecificDownloadUrl } from '../utils/deviceUtils';
import { logger } from '../utils/logger';
import { getAppVersionCode } from '../constants/appConfig';

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

interface UpdateModalProps {
  visible: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
  onUpdate?: () => void;
  simulatedArch?: string | null;
}

const { width, height } = Dimensions.get('window');

const UpdateModal: React.FC<UpdateModalProps> = ({ 
  visible, 
  onClose, 
  updateInfo, 
  onUpdate, 
  simulatedArch
}) => {
  const [downloading, setDownloading] = useState(false);
  const [currentTab, setCurrentTab] = useState<'changelog' | 'info'>('changelog');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  // If updateInfo is null, don't render the modal
  if (!updateInfo) {
    return null;
  }

  useEffect(() => {
    if (visible && updateInfo) {
      // Animate modal entrance
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();

      // Handle back button on Android
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (updateInfo.isForced) {
          return true; // Prevent going back if update is forced
        } else {
          onClose();
          return true;
        }
      });

      return () => backHandler.remove();
    } else {
      // Reset animations when modal is hidden
      fadeAnim.setValue(0);
      slideAnim.setValue(100);
    }
  }, [visible, updateInfo, fadeAnim, slideAnim, onClose]);

  const handleUpdate = async () => {
    setDownloading(true);
    
    try {
      // Simulate a small delay before opening the URL
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get the appropriate download URL based on device architecture
      const downloadUrl = getArchitectureSpecificDownloadUrl(
        updateInfo.downloadUrls,
        simulatedArch
      );
      
      // Open the URL
      await Linking.openURL(downloadUrl);
      
      // Keep the loading state a bit longer to ensure the URL opens
      setTimeout(() => {
        setDownloading(false);
        
        // Call the onUpdate callback if it exists
        if (onUpdate) {
          onUpdate();
        }
      }, 1000);
    } catch (error) {
      logger.error('Error opening download URL:', error);
      setDownloading(false);
      Alert.alert('Download Error', 'Failed to open download URL. Please try again later.');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (e) {
      return 'Unknown date';
    }
  };

  const renderTabContent = () => {
    if (currentTab === 'changelog') {
      return (
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          <RichChangelog items={updateInfo.changelog || []} />
        </ScrollView>
      );
    } else {
      return (
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.infoContentContainer}
        >
          {updateInfo.aboutUpdate && (
            <View style={styles.aboutUpdateSection}>
              <Text style={styles.aboutUpdateTitle}>About This Update</Text>
              <Text style={styles.aboutUpdateText}>{updateInfo.aboutUpdate}</Text>
            </View>
          )}
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Update Version</Text>
            <Text style={styles.infoValue}>{updateInfo.latestVersion} (Code: {updateInfo.versionCode})</Text>
          </View>
          
          {updateInfo.currentAppVersion && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Current Version</Text>
              <Text style={styles.infoValue}>{updateInfo.currentAppVersion} (Code: {getAppVersionCode()})</Text>
            </View>
          )}
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Release Date</Text>
            <Text style={styles.infoValue}>{formatDate(updateInfo.releaseDate)}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Update Type</Text>
            <View style={[
              styles.badge, 
              updateInfo.isForced ? styles.forcedBadge : styles.optionalBadge
            ]}>
              <Text style={styles.badgeText}>
                {updateInfo.isForced ? 'Required' : 'Optional'}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Minimum Version</Text>
            <Text style={styles.infoValue}>{updateInfo.minVersion}</Text>
          </View>
          
          {!updateInfo.aboutUpdate && (
            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>About This Update</Text>
              <Text style={styles.infoDescription}>
                This update includes important improvements and new features to enhance your experience.
                {updateInfo.isForced ? ' This update is required to continue using the app.' : ''}
              </Text>
            </View>
          )}
        </ScrollView>
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={updateInfo.isForced ? undefined : onClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <MaterialIcons name="system-update" size={24} color="#f4511e" />
              <View style={styles.headerTextContainer}>
                <Text style={styles.title}>Update Available</Text>
                <Text style={styles.version}>Version {updateInfo.latestVersion}</Text>
              </View>
            </View>
            
            {!updateInfo.isForced && (
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={onClose}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.tabs}>
            <TouchableOpacity 
              style={[styles.tab, currentTab === 'changelog' && styles.activeTab]}
              onPress={() => setCurrentTab('changelog')}
            >
              <Text style={[styles.tabText, currentTab === 'changelog' && styles.activeTabText]}>
                What's New
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tab, currentTab === 'info' && styles.activeTab]}
              onPress={() => setCurrentTab('info')}
            >
              <Text style={[styles.tabText, currentTab === 'info' && styles.activeTabText]}>
                Details
              </Text>
            </TouchableOpacity>
          </View>
          
          {renderTabContent()}
          
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.updateButton}
              onPress={handleUpdate}
              disabled={downloading}
            >
              <MaterialIcons name="file-download" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.updateButtonText}>
                {downloading ? 'Preparing Download...' : 'Update Now'}
              </Text>
            </TouchableOpacity>
            
            {!updateInfo.isForced && (
              <TouchableOpacity
                style={styles.laterButton}
                onPress={onClose}
                disabled={downloading}
              >
                <Text style={styles.laterButtonText}>Remind Me Later</Text>
              </TouchableOpacity>
            )}
          </View>

          <LoadingOverlay 
            visible={downloading} 
            type="dots" 
            text="Preparing download..." 
            backgroundColor="rgba(0, 0, 0, 0.8)"
          />
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.9,
    maxHeight: height * 0.8,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#222',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    marginLeft: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  version: {
    fontSize: 16,
    color: '#f4511e',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#222',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#f4511e',
  },
  tabText: {
    fontSize: 16,
    color: '#aaa',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    maxHeight: height * 0.5,
  },
  contentContainer: {
    padding: 16,
  },
  infoContentContainer: {
    padding: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  infoLabel: {
    fontSize: 16,
    color: '#aaa',
  },
  infoValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  forcedBadge: {
    backgroundColor: '#f44336',
  },
  optionalBadge: {
    backgroundColor: '#4caf50',
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoSection: {
    marginTop: 20,
  },
  infoSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    color: '#ddd',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  updateButton: {
    backgroundColor: '#f4511e',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  laterButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  laterButtonText: {
    color: '#ccc',
    fontSize: 16,
  },
  aboutUpdateSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  aboutUpdateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  aboutUpdateText: {
    fontSize: 14,
    color: '#ddd',
    lineHeight: 20,
  },
});

export default UpdateModal; 