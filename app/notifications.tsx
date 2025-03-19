import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image, Modal, ScrollView, Dimensions, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { APP_CONFIG } from '../constants/appConfig';
import { logger } from '../utils/logger';
import * as Linking from 'expo-linking';
import EventEmitter from 'eventemitter3';
import { Video, ResizeMode } from 'expo-av';

// Create a global event emitter for notification updates
export const notificationEmitter = new EventEmitter();

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'update' | 'announcement' | 'feature' | 'maintenance';
  deepLink?: string;
  imageUrl?: string;
  videoUrl?: string;
  createdAt: string;
  expiresAt?: string;
  priority: 'high' | 'medium' | 'low';
  isRead?: boolean;
}

// Device ID for tracking read notifications
const DEVICE_ID_KEY = 'device_id';
const READ_NOTIFICATIONS_KEY = 'read_notifications';

// Background task name
const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';
const NOTIFICATION_CHECK_INTERVAL = 5 * 60; // 5 minutes in seconds

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Define the background task
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
  try {
    // Get device ID
    const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) return 2; // BackgroundFetch.Status.Failed

    // Get last notification check timestamp
    const lastCheck = await AsyncStorage.getItem('last_notification_check');
    const now = Date.now();
    
    if (lastCheck && (now - parseInt(lastCheck)) < NOTIFICATION_CHECK_INTERVAL * 1000) {
      return 1; // BackgroundFetch.Status.NoData
    }

    // Fetch notifications
    const response = await fetch(`${APP_CONFIG.API_BASE_URL}/notifications`);
    if (!response.ok) return 2; // BackgroundFetch.Status.Failed
    
    const notifications = await response.json();
    
    // Get read notifications
    const readIds = await AsyncStorage.getItem(READ_NOTIFICATIONS_KEY);
    const readNotifications = readIds ? JSON.parse(readIds) : [];
    
    // Filter unread notifications
    const unreadNotifications = notifications.filter(
      (notification: Notification) => !readNotifications.includes(notification.id)
    );

    // Show notifications for unread items
    for (const notification of unreadNotifications) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.message,
          data: { 
            id: notification.id,
            deepLink: notification.deepLink,
            type: notification.type,
            priority: notification.priority
          },
        },
        trigger: null, // Show immediately
      });
    }

    // Update last check timestamp
    await AsyncStorage.setItem('last_notification_check', now.toString());
    
    return unreadNotifications.length > 0 
      ? 3 // BackgroundFetch.Status.Available
      : 1; // BackgroundFetch.Status.NoData
  } catch (error) {
    logger.error('Background notification check failed:', error);
    return 2; // BackgroundFetch.Status.Failed
  }
});

// Register background task
async function registerBackgroundTask() {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
      minimumInterval: NOTIFICATION_CHECK_INTERVAL, // 30 minutes
      stopOnTerminate: false, // Keep running after app is closed
      startOnBoot: true, // Start after device reboot
    });
  } catch (err) {
    logger.error('Task registration failed:', err);
  }
}

// Handle notification taps
Notifications.addNotificationResponseReceivedListener((response) => {
  const data = response.notification.request.content.data;
  if (data.deepLink) {
    Linking.openURL(data.deepLink);
  }
});

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    const initializeDeviceId = async () => {
      try {
        // Get or create device ID
        let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
        if (!id) {
          id = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          await AsyncStorage.setItem(DEVICE_ID_KEY, id);
        }
        setDeviceId(id);
        
        // Load locally stored read notifications
        const readIds = await AsyncStorage.getItem(READ_NOTIFICATIONS_KEY);
        if (readIds) {
          setReadNotificationIds(JSON.parse(readIds));
        }
      } catch (error) {
        logger.error('Error initializing device ID:', error);
      }
    };
    
    initializeDeviceId();
  }, []);

  useEffect(() => {
    if (deviceId) {
      fetchNotifications();
    }
  }, [deviceId]);

  useEffect(() => {
    // Register background task when component mounts
    registerBackgroundTask();
    
    // Configure notifications
    const configurePushNotifications = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        logger.warn('Notification permissions not granted');
      }
    };
    
    configurePushNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // Fetch notifications from API
      const response = await fetch(`${APP_CONFIG.API_BASE_URL}/notifications`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Fetch read status from API
      if (deviceId) {
        const readResponse = await fetch(`${APP_CONFIG.API_BASE_URL}/notifications/read?deviceId=${deviceId}`);
        
        if (readResponse.ok) {
          const readData = await readResponse.json();
          
          if (readData.readNotificationIds) {
            // Merge local and server read IDs
            const mergedReadIds = [...new Set([...readNotificationIds, ...readData.readNotificationIds])];
            setReadNotificationIds(mergedReadIds);
            
            // Update local storage
            await AsyncStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(mergedReadIds));
          }
        }
      }
      
      setNotifications(data);
    } catch (error) {
      logger.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (notificationId: string) => {
    try {
      if (!deviceId) return;
      
      // Skip if already marked as read
      if (readNotificationIds.includes(notificationId)) return;
      
      // Update local state
      const updatedReadIds = [...readNotificationIds, notificationId];
      setReadNotificationIds(updatedReadIds);
      
      // Update local storage
      await AsyncStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(updatedReadIds));
      
      // Send to server
      await fetch(`${APP_CONFIG.API_BASE_URL}/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationIds: [notificationId],
          deviceId,
        }),
      });

      // Emit event to update notification banner
      notificationEmitter.emit('notificationUpdate');
      
    } catch (error) {
      logger.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    try {
      // Mark as read
      await markAsRead(notification.id);
      
      // Show notification detail modal
      setSelectedNotification(notification);
      setShowDetailModal(true);
    } catch (error) {
      logger.error('Error handling notification press:', error);
    }
  };

  const handleDeepLink = async (deepLink: string) => {
    try {
      if (deepLink.startsWith('anisurge://')) {
        // Handle internal deep links
        const path = deepLink.replace('anisurge://', '');
        if (path.startsWith('anime/')) {
          const animeId = path.split('/')[1];
          router.push(`/anime/${animeId}`);
        } else if (path === 'mylist') {
          router.push('/mylist');
        } else if (path === 'settings') {
          router.push('/settings');
        } else {
          // For other internal routes
          router.push(path);
        }
      } else {
        // Handle external links
        await Linking.openURL(deepLink);
      }
      setShowDetailModal(false);
    } catch (error) {
      logger.error('Error handling deep link:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'update':
        return 'system-update';
      case 'announcement':
        return 'campaign';
      case 'feature':
        return 'new-releases';
      case 'maintenance':
        return 'build';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#f44336';
      case 'medium':
        return '#ff9800';
      case 'low':
        return '#4caf50';
      default:
        return '#2196f3';
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const isRead = readNotificationIds.includes(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.notificationItem, isRead && styles.readNotification]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.priority) }]}>
          <MaterialIcons name={getNotificationIcon(item.type)} size={24} color="#fff" />
        </View>
        
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle} numberOfLines={1}>{item.title}</Text>
            {!isRead && <View style={styles.unreadDot} />}
          </View>
          
          <Text style={styles.notificationMessage} numberOfLines={2}>{item.message}</Text>
          
          {item.imageUrl && (
            <Image 
              source={{ uri: item.imageUrl }} 
              style={styles.notificationImage} 
              resizeMode="cover" 
            />
          )}

          {item.videoUrl && (
            <View style={styles.notificationVideo}>
              <Video
                source={{ uri: item.videoUrl }}
                style={styles.notificationVideo}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                isLooping={false}
                shouldPlay={false}
                isMuted={true}
              />
              <View style={styles.videoOverlay}>
                <MaterialIcons name="play-circle-outline" size={48} color="#fff" />
              </View>
            </View>
          )}
          
          <View style={styles.notificationFooter}>
            <Text style={styles.notificationTime}>{formatDate(item.createdAt)}</Text>
            
            <View style={styles.mediaIndicators}>
              {item.videoUrl && (
                <View style={styles.mediaIndicator}>
                  <MaterialIcons name="videocam" size={14} color="#666" />
                </View>
              )}
              {item.imageUrl && (
                <View style={styles.mediaIndicator}>
                  <MaterialIcons name="image" size={14} color="#666" />
                </View>
              )}
              {item.deepLink && (
                <View style={styles.mediaIndicator}>
                  <MaterialIcons name="link" size={14} color="#666" />
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const NotificationDetailModal = () => {
    if (!selectedNotification) return null;

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={[
                styles.priorityBadge, 
                { backgroundColor: getNotificationColor(selectedNotification.priority) }
              ]}>
                <Text style={styles.priorityText}>{selectedNotification.priority}</Text>
              </View>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowDetailModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Type Icon */}
              <View style={[
                styles.detailIconContainer, 
                { backgroundColor: getNotificationColor(selectedNotification.priority) }
              ]}>
                <MaterialIcons 
                  name={getNotificationIcon(selectedNotification.type)} 
                  size={32} 
                  color="#fff" 
                />
              </View>

              {/* Title */}
              <Text style={styles.detailTitle}>{selectedNotification.title}</Text>

              {/* Timestamp */}
              <Text style={styles.detailTime}>
                {formatDate(selectedNotification.createdAt)}
              </Text>

              {/* Video if present */}
              {selectedNotification.videoUrl && (
                <View style={styles.detailVideoContainer}>
                  <Video
                    source={{ uri: selectedNotification.videoUrl }}
                    style={styles.detailVideo}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    isLooping={false}
                    shouldPlay={true}
                  />
                </View>
              )}

              {/* Image if present */}
              {selectedNotification.imageUrl && (
                <Image 
                  source={{ uri: selectedNotification.imageUrl }} 
                  style={styles.detailImage}
                  resizeMode="cover"
                />
              )}

              {/* Message */}
              <Text style={styles.detailMessage}>{selectedNotification.message}</Text>

              {/* Deep Link Button */}
              {selectedNotification.deepLink && (
                <TouchableOpacity
                  style={styles.deepLinkButton}
                  onPress={() => handleDeepLink(selectedNotification.deepLink!)}
                >
                  <MaterialIcons name="link" size={20} color="#fff" />
                  <Text style={styles.deepLinkButtonText}>
                    {selectedNotification.deepLink.startsWith('anisurge://') 
                      ? 'Open in App' 
                      : 'Open Link'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Additional Info */}
              <View style={styles.detailInfo}>
                <View style={styles.infoRow}>
                  <MaterialIcons name="label" size={16} color="#999" />
                  <Text style={styles.infoText}>Type: {selectedNotification.type}</Text>
                </View>
                {selectedNotification.expiresAt && (
                  <View style={styles.infoRow}>
                    <MaterialIcons name="timer" size={16} color="#999" />
                    <Text style={styles.infoText}>
                      Expires: {formatDate(selectedNotification.expiresAt)}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerStyle: {
            backgroundColor: '#1a1a1a',
          },
          headerTintColor: '#fff',
        }}
      />
      
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f4511e" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="notifications-none" size={64} color="#666" />
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>
              We'll notify you when there are updates or announcements
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefresh}
            >
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#f4511e']}
                tintColor="#f4511e"
              />
            }
          />
        )}

        <NotificationDetailModal />
      </View>
    </>
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
  },
  loadingText: {
    marginTop: 16,
    color: '#ccc',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#ccc',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 32,
  },
  refreshButton: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f4511e',
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  readNotification: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f4511e',
    marginLeft: 8,
  },
  notificationMessage: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
  },
  notificationImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  notificationVideo: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#000',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTime: {
    color: '#999',
    fontSize: 12,
  },
  mediaIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mediaIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Dimensions.get('window').height * 0.9,
    minHeight: Dimensions.get('window').height * 0.5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  closeButton: {
    padding: 4,
  },
  modalScroll: {
    padding: 16,
  },
  detailIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  detailTime: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
    textAlign: 'center',
  },
  detailImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  detailMessage: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
    marginBottom: 24,
  },
  deepLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4511e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  deepLinkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  detailInfo: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    color: '#999',
    fontSize: 14,
    marginLeft: 8,
  },
  detailVideoContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  detailVideo: {
    width: '100%',
    height: '100%',
  },
}); 