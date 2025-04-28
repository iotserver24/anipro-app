import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Video, ResizeMode } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { getDatabase, ref, push, onValue, off, query, limitToLast, serverTimestamp, remove } from 'firebase/database';
import { isAuthenticated, getCurrentUser } from '../services/userService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import AuthModal from './AuthModal';
import { AVATARS, getAvatarById } from '../constants/avatars';
import UserProfileModal from './UserProfileModal';
import GifPicker from './GifPicker';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  gifUrl?: string;
  timestamp: number;
}

const USERNAME_COLORS = [
  '#f4511e', // Original orange
  '#2196F3', // Blue
  '#4CAF50', // Green
  '#9C27B0', // Purple
  '#FF9800', // Dark Orange
  '#00BCD4', // Cyan
  '#E91E63', // Pink
  '#3F51B5', // Indigo
  '#8BC34A', // Light Green
  '#FF5252', // Red
];

const getUsernameColor = (userId: string) => {
  // Use the sum of char codes to get a consistent index
  const sum = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return USERNAME_COLORS[sum % USERNAME_COLORS.length];
};

// Memoized Avatar component
const Avatar = memo(({ userAvatar }: { userAvatar: string }) => {
  const avatarUrl = userAvatar || AVATARS[0].url;
  const isGif = avatarUrl.toLowerCase().endsWith('.gif');

  return (
    <View style={styles.avatarContainer}>
      <Image
        source={{ uri: avatarUrl }}
        style={[styles.avatar, isGif && styles.gifAvatar]}
        defaultSource={{ uri: AVATARS[0].url }}
        onError={(error) => {
          console.warn('Avatar failed to load:', error.nativeEvent.error);
        }}
      />
    </View>
  );
});

// Memoized Message component
const MessageItem = memo(({ 
  item, 
  onUserPress, 
  isOwnMessage,
  showAvatar,
  isLastInSequence,
  isFirstInSequence
}: { 
  item: ChatMessage; 
  onUserPress: (userId: string) => void;
  isOwnMessage: boolean;
  showAvatar: boolean;
  isLastInSequence: boolean;
  isFirstInSequence: boolean;
}) => {
  const usernameColor = getUsernameColor(item.userId);

  const handlePress = useCallback(() => {
    onUserPress(item.userId);
  }, [item.userId, onUserPress]);

  return (
    <View style={[
      styles.messageItem, 
      isOwnMessage && styles.ownMessageItem,
      !isLastInSequence && styles.consecutiveMessage
    ]}>
      <View style={[styles.avatarContainer, !showAvatar && styles.hiddenAvatar]}>
        {showAvatar && (
          <TouchableOpacity onPress={handlePress}>
            <Avatar userAvatar={item.userAvatar} />
          </TouchableOpacity>
        )}
      </View>
      <View style={[
        styles.messageContent, 
        isOwnMessage && styles.ownMessageContent,
        !isLastInSequence && styles.consecutiveMessageContent
      ]}>
        {isFirstInSequence && (
          <TouchableOpacity onPress={handlePress}>
            <Text style={[styles.userName, { color: usernameColor }]}>{item.userName}</Text>
          </TouchableOpacity>
        )}
        {item.content.trim() !== '' && (
          <Text style={styles.messageText}>{item.content}</Text>
        )}
        {item.gifUrl && (
          <View style={styles.gifContainer}>
            {item.gifUrl.endsWith('.mp4') ? (
              <Video
                source={{ uri: item.gifUrl }}
                style={styles.messageGif}
                resizeMode={ResizeMode.CONTAIN}
                isLooping
                shouldPlay
                isMuted={true}
                useNativeControls={false}
              />
            ) : (
              <Image
                source={{ uri: item.gifUrl }}
                style={styles.messageGif}
                resizeMode="contain"
                loading="lazy"
              />
            )}
          </View>
        )}
        <Text style={styles.messageTime}>
          {new Date(item.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          })}
        </Text>
      </View>
    </View>
  );
});

const PublicChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [selectedGifUrl, setSelectedGifUrl] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Initialize Firebase Realtime Database
  const database = getDatabase();
  const messagesRef = ref(database, 'public_chat');
  
  // Update database URL to correct region
  useEffect(() => {
    const dbUrl = 'https://anisurge-11808-default-rtdb.asia-southeast1.firebasedatabase.app';
    const app = database.app;
    if (app.options.databaseURL !== dbUrl) {
      app.options.databaseURL = dbUrl;
    }
  }, []);

  useEffect(() => {
    // Subscribe to last 50 messages
    const messagesQuery = query(messagesRef, limitToLast(50));
    
    onValue(messagesQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.entries(data).map(([id, msg]: [string, any]) => ({
          id,
          ...msg,
        }));
        setMessages(messageList.sort((a, b) => a.timestamp - b.timestamp));
        // Only scroll to bottom on first load
        if (isFirstLoad) {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
            setIsFirstLoad(false);
          }, 100);
        }
      }
      setLoading(false);
    });

    return () => {
      // Cleanup subscription
      off(messagesRef);
    };
  }, [isFirstLoad]);

  const handleSendMessage = async () => {
    if (!isAuthenticated()) {
      setShowAuthModal(true);
      return;
    }

    if (!messageText.trim() && !selectedGifUrl) {
      return;
    }

    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists()) {
        throw new Error('User data not found');
      }
      const userData = userDoc.data();
      
      console.log('User Data:', {
        avatarUrl: userData.avatarUrl,
        avatarId: userData.avatarId,
        customAvatar: userData.customAvatar,
        avatar: userData.avatar
      });

      // Get avatar URL using the same method as profile
      let userAvatarUrl = '';
      if (userData.avatarId) {
        try {
          userAvatarUrl = await getAvatarById(userData.avatarId);
          console.log('Got avatar URL from getAvatarById:', userAvatarUrl);
        } catch (error) {
          console.warn('Error getting avatar by ID:', error);
        }
      }

      // Fallbacks if getAvatarById fails
      if (!userAvatarUrl) {
        if (userData.customAvatar) {
          userAvatarUrl = userData.customAvatar;
        } else if (userData.avatarUrl) {
          userAvatarUrl = userData.avatarUrl;
        } else if (AVATARS.length > 0) {
          userAvatarUrl = AVATARS[0].url;
        }
      }

      console.log('Final avatar URL:', userAvatarUrl);

      // Create message object with GIF support
      const message = {
        userId: currentUser.uid,
        userName: '@' + (userData.username || 'user'),
        userAvatar: userAvatarUrl,
        content: messageText.trim(),
        gifUrl: selectedGifUrl,
        timestamp: serverTimestamp(),
      };

      console.log('Sending message with avatar:', message.userAvatar);

      // Send to Firebase Realtime Database
      await push(messagesRef, message);

      // Clear input and selected GIF
      setMessageText('');
      setSelectedGifUrl(null);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const handleDeleteMessage = async (messageId: string, userId: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.uid !== userId) {
      return;
    }

    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const messageRef = ref(database, `public_chat/${messageId}`);
              await remove(messageRef);
            } catch (error) {
              console.error('Error deleting message:', error);
              Alert.alert('Error', 'Failed to delete message');
            }
          }
        }
      ]
    );
  };

  const handleUserPress = useCallback((userId: string) => {
    setSelectedUserId(userId);
  }, []);

  const renderMessage = useCallback(({ item, index }: { item: ChatMessage; index: number }) => {
    const currentUser = getCurrentUser();
    const isOwnMessage = currentUser && currentUser.uid === item.userId;
    
    // Check if this message is part of a consecutive sequence
    const nextMessage = messages[index + 1];
    const prevMessage = messages[index - 1];
    
    const isLastInSequence = !nextMessage || nextMessage.userId !== item.userId;
    const isFirstInSequence = !prevMessage || prevMessage.userId !== item.userId;
    
    // Only show avatar for the last message in a sequence
    const showAvatar = isLastInSequence;

    return (
      <MessageItem 
        item={item} 
        onUserPress={handleUserPress}
        isOwnMessage={isOwnMessage}
        showAvatar={showAvatar}
        isLastInSequence={isLastInSequence}
        isFirstInSequence={isFirstInSequence}
      />
    );
  }, [messages, handleUserPress]);

  const keyExtractor = useCallback((item: ChatMessage) => 
    item.id || Math.random().toString()
  , []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 80,
    offset: 80 * index,
    index,
  }), []);

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    setShowScrollButton(distanceFromBottom > 100);
  };

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Image 
        source={require('../assets/public-chat-bg.jpg')}
        style={styles.backgroundGif}
        resizeMode="cover"
      />
      
      <View style={styles.chatContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#f4511e" style={styles.loader} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={5}
            contentContainerStyle={styles.messagesList}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          />
        )}

        {showScrollButton && (
          <TouchableOpacity 
            style={styles.scrollButton}
            onPress={scrollToBottom}
          >
            <MaterialIcons name="keyboard-arrow-down" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.inputContainer}>
        {!isAuthenticated() ? (
          <TouchableOpacity 
            style={styles.loginToChat}
            onPress={() => setShowAuthModal(true)}
          >
            <MaterialIcons name="login" size={20} color="#fff" />
            <Text style={styles.loginText}>Login to chat</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, selectedGifUrl && styles.inputWithGif]}
                placeholder="Type a message..."
                placeholderTextColor="#999"
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity 
                style={styles.gifButton}
                onPress={() => setShowGifPicker(true)}
              >
                <Text style={styles.gifButtonText}>GIF</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.sendButton}
                onPress={handleSendMessage}
              >
                <MaterialIcons name="send" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            {selectedGifUrl && (
              <View style={styles.selectedGifContainer}>
                {selectedGifUrl.endsWith('.mp4') ? (
                  <Video
                    source={{ uri: selectedGifUrl }}
                    style={styles.selectedGifPreview}
                    resizeMode={ResizeMode.CONTAIN}
                    isLooping
                    shouldPlay
                    isMuted={true}
                    useNativeControls={false}
                  />
                ) : (
                  <Image 
                    source={{ uri: selectedGifUrl }} 
                    style={styles.selectedGifPreview} 
                    resizeMode={ResizeMode.CONTAIN}
                  />
                )}
                <TouchableOpacity 
                  style={styles.removeGifButton}
                  onPress={() => setSelectedGifUrl(null)}
                >
                  <MaterialIcons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>

      <AuthModal 
        isVisible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={() => setShowAuthModal(false)}
      />

      <GifPicker 
        isVisible={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelectGif={(gifUrl) => {
          setSelectedGifUrl(gifUrl);
          setShowGifPicker(false);
        }}
      />

      {selectedUserId && (
        <UserProfileModal 
          visible={Boolean(selectedUserId)}
          onClose={() => setSelectedUserId(null)}
          userId={selectedUserId}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backgroundGif: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    opacity: 0.9,
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 16,
    zIndex: 1,
  },
  messagesList: {
    paddingVertical: 16,
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
    paddingHorizontal: 8,
    zIndex: 1,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 8,
    backgroundColor: '#333',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: '#333',
    borderWidth: 1.5,
    borderColor: '#f4511e',
  },
  gifAvatar: {
    borderColor: '#6366f1',
  },
  messageContent: {
    backgroundColor: 'rgba(26, 26, 26, 0.85)',
    borderRadius: 16,
    padding: 8,
    paddingVertical: 6,
    maxWidth: '75%',
    minWidth: 80,
  },
  ownMessageItem: {
    flexDirection: 'row-reverse',
  },
  ownMessageContent: {
    backgroundColor: 'rgba(244, 81, 30, 0.85)',
    marginLeft: 0,
    marginRight: 8,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 2,
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 18,
  },
  messageTime: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  inputContainer: {
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 51, 51, 0.8)',
    padding: 10,
    zIndex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(35, 35, 35, 0.9)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 40,
  },
  gifButton: {
    backgroundColor: '#333',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gifButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  sendButton: {
    backgroundColor: '#f4511e',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginToChat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f4511e',
    borderRadius: 24,
  },
  loginText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedGifContainer: {
    position: 'relative',
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  selectedGifPreview: {
    width: '100%',
    height: '100%',
  },
  removeGifButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gifContainer: {
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  messageGif: {
    width: '100%',
    height: 160,
    borderRadius: 8,
  },
  inputWithGif: {
    marginTop: 8,
  },
  consecutiveMessage: {
    marginBottom: 2,
  },
  consecutiveMessageContent: {
    borderRadius: 16,
  },
  hiddenAvatar: {
    width: 32,
    height: 0,
    marginBottom: 0,
  },
  scrollButton: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    backgroundColor: 'rgba(244, 81, 30, 0.9)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 2,
  },
});

export default memo(PublicChat); 