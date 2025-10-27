import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export interface MediaSessionData {
  title: string;
  episodeTitle: string;
  animeTitle: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

class MediaSessionService {
  private notificationId: string | null = null;
  private isActive = false;
  private lastMediaData: MediaSessionData | null = null;

   async initialize() {
     try {
       // Request permissions
       const { status } = await Notifications.requestPermissionsAsync();
       if (status !== 'granted') {
         console.warn('Notification permission not granted');
         return false;
       }

       // Create notification channel for Android
       if (Platform.OS === 'android') {
         await Notifications.setNotificationChannelAsync('media_playback', {
           name: 'Media Playback',
           description: 'Notifications for media playback controls',
           importance: Notifications.AndroidImportance.HIGH,
           sound: false,
           vibrationPattern: [0],
           lightColor: '#f4511e',
           lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
           bypassDnd: false,
           showBadge: false,
         });
       }

       // Set up notification categories with only episode navigation actions
       await Notifications.setNotificationCategoryAsync('media', [
         {
           identifier: 'previous',
           buttonTitle: 'Previous Episode',
           options: { opensAppToForeground: false },
         },
         {
           identifier: 'next',
           buttonTitle: 'Next Episode',
           options: { opensAppToForeground: false },
         },
       ]);

       return true;
     } catch (error) {
       console.error('Failed to initialize media session:', error);
       return false;
     }
   }

  async updateMediaSession(data: MediaSessionData) {
    if (!this.isActive) return;

    // Store the data for potential restoration
    this.lastMediaData = data;

    try {
      const playPauseText = data.isPlaying ? 'Pause' : 'Play';
      
       // Update notification categories with only episode navigation controls
       await Notifications.setNotificationCategoryAsync('media', [
         {
           identifier: 'previous',
           buttonTitle: data.hasPrevious ? 'Previous Episode' : 'No Previous',
           options: { 
             opensAppToForeground: false,
             isDestructive: false,
             isAuthenticationRequired: false
           },
         },
         {
           identifier: 'next',
           buttonTitle: data.hasNext ? 'Next Episode' : 'No Next',
           options: { 
             opensAppToForeground: false,
             isDestructive: false,
             isAuthenticationRequired: false
           },
         },
       ]);

       // Update the notification content
       const content = {
         title: data.animeTitle || 'AniSurge',
         body: data.episodeTitle || 'Episode',
         sound: false,
         categoryIdentifier: 'media',
         sticky: true, // Make notification sticky
         tag: 'anisurge-media-session', // Unique tag to prevent duplicates
         data: {
           type: 'media_session',
           isPlaying: data.isPlaying,
           currentTime: data.currentTime,
           duration: data.duration,
           hasPrevious: data.hasPrevious,
           hasNext: data.hasNext,
           episodeId: data.title, // Add episode ID for reference
           animeId: data.animeTitle, // Add anime ID for reference
         },
         android: {
           channelId: 'media_playback',
           autoDismiss: false,
           sticky: true,
           color: '#f4511e',
           priority: 'high',
           visibility: 'public',
         },
       };

       console.log('🔔 Updating notification with data:', {
         hasPrevious: data.hasPrevious,
         hasNext: data.hasNext,
         episodeTitle: data.episodeTitle,
         animeTitle: data.animeTitle
       });

      if (this.notificationId) {
        // Update existing notification
        await Notifications.scheduleNotificationAsync({
          identifier: this.notificationId,
          content,
          trigger: null,
        });
      } else {
        // Create new notification
        const notificationId = await Notifications.scheduleNotificationAsync({
          content,
          trigger: null,
        });
        this.notificationId = notificationId;
      }
    } catch (error) {
      console.error('Failed to update media session:', error);
    }
  }

  async startMediaSession(data: MediaSessionData) {
    try {
      const initialized = await this.initialize();
      if (!initialized) return false;

      // Cancel any existing notifications with the same tag
      await this.cancelExistingNotifications();

      this.isActive = true;
      await this.updateMediaSession(data);
      return true;
    } catch (error) {
      console.error('Failed to start media session:', error);
      return false;
    }
  }

  async cancelExistingNotifications() {
    try {
      // Cancel notifications with our specific tag
      await Notifications.dismissNotificationAsync('anisurge-media-session');
      
      // Also cancel any existing notifications by our app
      const presentedNotifications = await Notifications.getPresentedNotificationsAsync();
      for (const notification of presentedNotifications) {
        if (notification.request.content.data?.type === 'media_session') {
          await Notifications.dismissNotificationAsync(notification.request.identifier);
        }
      }
    } catch (error) {
      console.error('Failed to cancel existing notifications:', error);
    }
  }

  async stopMediaSession() {
    try {
      if (this.notificationId) {
        await Notifications.dismissNotificationAsync(this.notificationId);
        this.notificationId = null;
      }
      this.isActive = false;
    } catch (error) {
      console.error('Failed to stop media session:', error);
    }
  }

  async restoreNotification() {
    if (!this.lastMediaData) {
      console.warn('No media data available to restore notification');
      return false;
    }

    try {
      this.isActive = true;
      await this.updateMediaSession(this.lastMediaData);
      return true;
    } catch (error) {
      console.error('Failed to restore notification:', error);
      return false;
    }
  }

  async checkNotificationStatus() {
    try {
      if (this.notificationId) {
        // Try to get notification status
        const notifications = await Notifications.getAllScheduledNotificationsAsync();
        const isActive = notifications.some(n => n.identifier === this.notificationId);
        
        if (!isActive && this.isActive) {
          console.log('Notification was dismissed, attempting to restore...');
          await this.restoreNotification();
        }
        
        return isActive;
      }
      return false;
    } catch (error) {
      console.error('Failed to check notification status:', error);
      return false;
    }
  }

  isNotificationActive() {
    return this.isActive && this.notificationId !== null;
  }

  private formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds === Infinity) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

   // Set up notification response listener
   setupNotificationListener(
     onPreviousEpisode: () => void,
     onNextEpisode: () => void
   ) {
     return Notifications.addNotificationResponseReceivedListener(response => {
       const actionIdentifier = response.actionIdentifier;
       const data = response.notification.request.content.data;

       console.log('🔔 Notification action received:', actionIdentifier);
       console.log('🔔 Notification data:', data);
       console.log('🔔 Full response:', response);

       switch (actionIdentifier) {
         case 'previous':
           console.log('🔔 Previous button pressed, hasPrevious:', data?.hasPrevious);
           if (data?.hasPrevious) {
             console.log('🔔 Calling onPreviousEpisode');
             try {
               onPreviousEpisode();
               console.log('🔔 onPreviousEpisode called successfully');
             } catch (error) {
               console.error('🔔 Error calling onPreviousEpisode:', error);
             }
           } else {
             console.log('🔔 No previous episode available');
           }
           break;
         case 'next':
           console.log('🔔 Next button pressed, hasNext:', data?.hasNext);
           if (data?.hasNext) {
             console.log('🔔 Calling onNextEpisode');
             try {
               onNextEpisode();
               console.log('🔔 onNextEpisode called successfully');
             } catch (error) {
               console.error('🔔 Error calling onNextEpisode:', error);
             }
           } else {
             console.log('🔔 No next episode available');
           }
           break;
         default:
           // Handle notification tap
           if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
             // User tapped the notification itself
             console.log('🔔 Notification tapped');
           }
           break;
       }
     });
   }
}

export const mediaSessionService = new MediaSessionService();
