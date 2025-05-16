import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getCurrentUser } from '../services/userService';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';

interface MentionNotification {
  id: string;
  content: string;
  fromUserId: string;
  fromUsername: string;
  messageId: string;
  timestamp: any;
  read: boolean;
  type: 'mention';
}

export default function MentionsScreen() {
  const [mentions, setMentions] = useState<MentionNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  // Function to fetch mentions
  const fetchMentions = () => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const notificationsRef = collection(db, 'notifications');
    const mentionsQuery = query(
      notificationsRef,
      where('userId', '==', currentUser.uid),
      where('type', '==', 'mention'),
      orderBy('timestamp', 'desc')
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(mentionsQuery, (snapshot) => {
      const mentionsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MentionNotification[];

      setMentions(mentionsList);
      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  };

  useEffect(() => {
    const unsubscribe = fetchMentions();
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchMentions();
  };

  // Handle marking notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Navigate to chat message
  const navigateToMessage = (messageId: string) => {
    // Navigate to public chat where the message was sent
    router.push('/chat');
  };
  
  // Helper function to render message content with @mentions highlighted
  const renderMessageContent = (content: string) => {
    if (!content) return null;
    
    // Split content by @mentions
    const parts = content.split(/(@\w+)/g);
    
    return (
      <Text style={styles.messageText}>
        {parts.map((part, index) => {
          if (part.startsWith('@')) {
            // It's a mention, highlight it
            return <Text key={index} style={styles.highlightedMention}>{part}</Text>;
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
  };

  // Check if the message is from an AI character
  const isAICharacter = (userId: string) => {
    return userId.endsWith('-ai');
  };

  // Render mention item
  const renderMentionItem = ({ item }: { item: MentionNotification }) => {
    const timestamp = item.timestamp?.toDate?.() || new Date();
    const timeString = timestamp.toLocaleString();
    const isAI = isAICharacter(item.fromUserId);

    return (
      <View
        style={[styles.mentionItem, !item.read && styles.unreadMention]}
      >
        <View style={styles.mentionHeader}>
          <View style={styles.userInfoContainer}>
            {isAI && (
              <View style={styles.aiIndicator}>
                <MaterialIcons name="smart-toy" size={12} color="#fff" />
              </View>
            )}
            <Text style={styles.username}>@{item.fromUsername}</Text>
            {!item.read && (
              <View style={styles.unreadIndicator}>
                <MaterialIcons name="fiber-manual-record" size={10} color="#f4511e" />
              </View>
            )}
          </View>
          <Text style={styles.timestamp}>{timeString}</Text>
        </View>
        
        <View style={styles.messageContainer}>
          {renderMessageContent(item.content)}
        </View>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              handleMarkAsRead(item.id);
              navigateToMessage(item.messageId);
            }}
          >
            <MaterialIcons name="chat" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>View in Chat</Text>
          </TouchableOpacity>
          
          {!item.read && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.markReadButton]}
              onPress={() => handleMarkAsRead(item.id)}
            >
              <MaterialIcons name="done-all" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Mark as Read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Handle marking all notifications as read
  const handleMarkAllAsRead = async () => {
    setIsProcessing(true);
    try {
      for (const notification of mentions) {
        await handleMarkAsRead(notification.id);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle deleting all notifications
  const handleDeleteAll = async () => {
    Alert.alert(
      'Delete All Notifications',
      'Are you sure you want to delete all your notifications? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsProcessing(true);
              const batch = writeBatch(db);
              
              mentions.forEach(mention => {
                const notificationRef = doc(db, 'notifications', mention.id);
                batch.delete(notificationRef);
              });
              
              await batch.commit();
            } catch (error) {
              console.error('Error deleting all notifications:', error);
              Alert.alert('Error', 'Failed to delete all notifications');
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.headerButton, isProcessing && styles.disabledButton]}
          onPress={handleMarkAllAsRead}
          disabled={isProcessing || mentions.length === 0}
        >
          <MaterialIcons name="done-all" size={20} color="#fff" />
          <Text style={styles.headerButtonText}>Mark All as Read</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.headerButton, styles.deleteButton, isProcessing && styles.disabledButton]}
          onPress={handleDeleteAll}
          disabled={isProcessing || mentions.length === 0}
        >
          <MaterialIcons name="delete" size={20} color="#fff" />
          <Text style={styles.headerButtonText}>Delete All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={mentions}
        renderItem={renderMentionItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#f4511e']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="notifications-none" size={48} color="#666" />
            <Text style={styles.emptyText}>No mentions yet</Text>
            <Text style={styles.emptySubtext}>
              When someone mentions you in a chat or an AI responds to you, 
              those mentions will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100, // Extra padding at bottom for better scrolling
  },
  mentionItem: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadMention: {
    backgroundColor: 'rgba(244, 81, 30, 0.1)',
    borderColor: 'rgba(244, 81, 30, 0.2)',
  },
  mentionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiIndicator: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  username: {
    color: '#f4511e',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timestamp: {
    color: '#888',
    fontSize: 12,
  },
  messageContainer: {
    backgroundColor: 'rgba(40, 40, 40, 0.8)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  messageText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
  },
  highlightedMention: {
    color: '#f4511e',
    fontWeight: 'bold',
  },
  unreadIndicator: {
    marginLeft: 6,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  markReadButton: {
    backgroundColor: '#444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyText: {
    color: '#888',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  disabledButton: {
    backgroundColor: '#444',
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#f4511e',
  },
}); 