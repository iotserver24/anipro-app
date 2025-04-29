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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
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
    // TODO: Implement navigation to specific chat message
    router.push('/chat');
  };

  // Render mention item
  const renderMentionItem = ({ item }: { item: MentionNotification }) => {
    const timestamp = item.timestamp?.toDate?.() || new Date();
    const timeString = timestamp.toLocaleString();

    return (
      <TouchableOpacity
        style={[styles.mentionItem, !item.read && styles.unreadMention]}
        onPress={() => {
          handleMarkAsRead(item.id);
          navigateToMessage(item.messageId);
        }}
      >
        <View style={styles.mentionHeader}>
          <Text style={styles.username}>@{item.fromUsername}</Text>
          <Text style={styles.timestamp}>{timeString}</Text>
        </View>
        <Text style={styles.content}>{item.content}</Text>
        {!item.read && (
          <View style={styles.unreadIndicator}>
            <MaterialIcons name="fiber-manual-record" size={12} color="#f4511e" />
          </View>
        )}
      </TouchableOpacity>
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
  },
  mentionItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  unreadMention: {
    backgroundColor: 'rgba(244, 81, 30, 0.1)',
    borderColor: 'rgba(244, 81, 30, 0.2)',
  },
  mentionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  username: {
    color: '#f4511e',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timestamp: {
    color: '#666',
    fontSize: 12,
  },
  content: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 8,
  },
}); 