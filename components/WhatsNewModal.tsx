import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions,
  Animated,
  BackHandler
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import RichChangelog from './RichChangelog';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppVersion } from '../constants/appConfig';
import { logger } from '../utils/logger';
import { LAST_SHOWN_VERSION_KEY } from '../utils/whatsNewUtils';

interface ChangelogItem {
  type: 'text' | 'image' | 'video' | 'url';
  content: string;
  title?: string;
  description?: string;
  format?: 'bold' | 'italic' | 'normal';
}

interface WhatsNewInfo {
  version: string;
  changelog: ChangelogItem[];
  releaseDate: string;
}

interface WhatsNewModalProps {
  visible: boolean;
  onClose: () => void;
  whatsNewInfo: WhatsNewInfo | null;
}

const { width, height } = Dimensions.get('window');

const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ 
  visible, 
  onClose, 
  whatsNewInfo
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  // If whatsNewInfo is null, don't render the modal
  if (!whatsNewInfo) {
    return null;
  }

  useEffect(() => {
    if (visible && whatsNewInfo) {
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
        onClose();
        return true;
      });

      return () => backHandler.remove();
    } else {
      // Reset animations when modal is hidden
      fadeAnim.setValue(0);
      slideAnim.setValue(100);
    }
  }, [visible, whatsNewInfo, fadeAnim, slideAnim, onClose]);

  const handleClose = async () => {
    try {
      // Save the current version as the last shown version
      await AsyncStorage.setItem(LAST_SHOWN_VERSION_KEY, getAppVersion());
      
      onClose();
    } catch (error) {
      logger.error('Error saving last shown version:', error);
      onClose();
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
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
              <MaterialIcons name="new-releases" size={24} color="#f4511e" />
              <View style={styles.headerTextContainer}>
                <Text style={styles.title}>What's New</Text>
                <Text style={styles.version}>Version {whatsNewInfo.version}</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={handleClose}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            <View style={styles.releaseInfoContainer}>
              <Text style={styles.releaseDate}>
                Released on {formatDate(whatsNewInfo.releaseDate)}
              </Text>
            </View>
            
            <RichChangelog items={whatsNewInfo.changelog || []} />
          </ScrollView>
          
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.gotItButton}
              onPress={handleClose}
            >
              <Text style={styles.gotItButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
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
  content: {
    maxHeight: height * 0.5,
  },
  contentContainer: {
    padding: 16,
  },
  releaseInfoContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  releaseDate: {
    fontSize: 14,
    color: '#aaa',
    fontStyle: 'italic',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  gotItButton: {
    backgroundColor: '#f4511e',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  gotItButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WhatsNewModal; 