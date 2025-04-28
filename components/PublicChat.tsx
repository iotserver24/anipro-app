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
  Pressable,
  Modal,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Video, ResizeMode } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { getDatabase, ref, push, onValue, off, query as dbQuery, limitToLast, serverTimestamp, remove, get } from 'firebase/database';
import { isAuthenticated, getCurrentUser } from '../services/userService';
import { doc, getDoc, collection, query, where, limit, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import AuthModal from './AuthModal';
import { AVATARS, getAvatarById } from '../constants/avatars';
import UserProfileModal from './UserProfileModal';
import GifPicker from './GifPicker';
import { API_BASE, ENDPOINTS } from '../constants/api';
import { useRouter } from 'expo-router';

// Together AI API Configuration
const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions';
const TOGETHER_API_KEY = '4cc7a0ed0df68c4016e08a1ef87059c1931b4c93ca21b771efe5c9f76caae5e8';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  gifUrl?: string;
  timestamp: number;
  mentions?: string[]; // Array of mentioned user IDs
  animeCard?: {
    id: string;
    title: string;
    image: string;
  };
}

interface UserSuggestion {
  userId: string;
  username: string;
  avatarUrl: string;
}

interface Notification {
  type: 'mention';
  messageId: string;
  fromUserId: string;
  fromUsername: string;
  content: string;
  timestamp: any;
  read: boolean;
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

// Helper function to render message content with mentions and formatting
const renderMessageContent = (
  content: string, 
  mentions?: string[], 
  onMentionPress?: (username: string) => void
) => {
  if (!content) return null;

  // First split by mentions to preserve them
  const parts = content.split(/(@\w+)/g);
  
  return (
    <Text style={styles.messageText}>
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          // Handle mentions
          return (
            <TouchableOpacity 
              key={index} 
              onPress={() => onMentionPress?.(part)}
            >
              <Text style={styles.mentionText}>{part}</Text>
            </TouchableOpacity>
          );
        }

        // Handle formatting for non-mention parts
        const formattedParts = part.split(/(\*\*.*?\*\*|\*.*?\*)/g).map((text, i) => {
          if (text.startsWith('**') && text.endsWith('**')) {
            // Bold text
            return (
              <Text key={`${index}-${i}`} style={styles.boldText}>
                {text.slice(2, -2)}
              </Text>
            );
          } else if (text.startsWith('*') && text.endsWith('*')) {
            // Italic text
            return (
              <Text key={`${index}-${i}`} style={styles.italicText}>
                {text.slice(1, -1)}
              </Text>
            );
          }
          // Regular text
          return <Text key={`${index}-${i}`}>{text}</Text>;
        });

        return <Text key={index}>{formattedParts}</Text>;
      })}
    </Text>
  );
};

// Memoized Message component
const MessageItem = memo(({ 
  item, 
  onUserPress, 
  isOwnMessage,
  showAvatar,
  isLastInSequence,
  isFirstInSequence,
  onMentionPress,
  animeCard,
  onOpenAnime
}: { 
  item: ChatMessage; 
  onUserPress: (userId: string) => void;
  isOwnMessage: boolean;
  showAvatar: boolean;
  isLastInSequence: boolean;
  isFirstInSequence: boolean;
  onMentionPress: (username: string) => void;
  animeCard?: {
    id: string;
    title: string;
    image: string;
  };
  onOpenAnime: (animeId: string) => void;
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
        {item.content.trim() !== '' && renderMessageContent(item.content, item.mentions, onMentionPress)}
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
        {animeCard && (
          <View style={styles.animeCardInMessage}>
            <Image source={{ uri: animeCard.image }} style={styles.animeCardImage} />
            <Text style={styles.animeCardTitle}>{animeCard.title}</Text>
            <TouchableOpacity style={styles.animeCardButton} onPress={() => onOpenAnime(animeCard.id)}>
              <Text style={styles.animeCardButtonText}>Open</Text>
            </TouchableOpacity>
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

const COMMANDS = [
  { key: '/anime', label: 'Recommend an anime' },
  { key: '/aizen', label: 'Ask Aizen a question' }
];

// Update Aizen's configuration with the correct avatar URL
const AIZEN_CONFIG = {
  name: '@aizen-ai',
  avatar: 'https://i.pinimg.com/originals/05/f0/d6/05f0d68408fc8cc72feef791fa2a24a2.gif',
  systemPrompt: `You are Sōsuke Aizen from Bleach. Respond to questions with elegance, sophistication, and a hint of condescension. 
    You see yourself as intellectually superior and always maintain composure. Your responses should reflect your calculating nature 
    and your belief that everything proceeds according to your plan. Occasionally adjust your glasses and use phrases that demonstrate 
    your foresight and manipulation. Keep responses concise but impactful.`
};

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
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [mentionedUsers, setMentionedUsers] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);
  const [isAnimeSearchMode, setIsAnimeSearchMode] = useState(false);
  const [animeSearchText, setAnimeSearchText] = useState('');
  const [animeResults, setAnimeResults] = useState<any[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<any | null>(null);
  const animeSearchTimeout = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const [showCommandHints, setShowCommandHints] = useState(false);
  const [showAnimeSearchModal, setShowAnimeSearchModal] = useState(false);
  const [isAizenTyping, setIsAizenTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);

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
    const messagesQuery = dbQuery(messagesRef, limitToLast(50));
    
    onValue(messagesQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.entries(data).map(([id, msg]: [string, any]) => ({
          id,
          ...msg,
        }));
        const sortedMessages = messageList.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(sortedMessages);
      }
      setLoading(false);
    });

    return () => {
      // Cleanup subscription
      off(messagesRef);
    };
  }, []);

  // Add handling for shared anime from route params
  useEffect(() => {
    const params = router.params;
    if (params?.shareAnime) {
      try {
        const sharedAnime = JSON.parse(params.shareAnime as string);
        setSelectedAnime(sharedAnime);
        // Clear the param to prevent resharing on chat refresh
        router.setParams({ shareAnime: undefined });
      } catch (error) {
        console.error('Error parsing shared anime data:', error);
      }
    }
  }, [router.params]);

  // Function to fetch user suggestions
  const fetchUserSuggestions = useCallback(async (searchText: string) => {
    try {
      const usersRef = collection(db, 'users');
      const userQuery = query(
        usersRef,
        limit(50) // Increased limit to show more users
      );

      const querySnapshot = await getDocs(userQuery);
      const suggestions: UserSuggestion[] = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.username) {
          suggestions.push({
            userId: doc.id,
            username: userData.username,
            avatarUrl: userData.avatarUrl || AVATARS[0].url
          });
        }
      });
      
      // Sort alphabetically by username
      suggestions.sort((a, b) => a.username.localeCompare(b.username));
      setUserSuggestions(suggestions);
    } catch (error) {
      console.error('Error fetching user suggestions:', error);
    }
  }, []);

  // Handle input changes and detect @ mentions
  const handleInputChange = (text: string) => {
    setMessageText(text);
    
    if (text.endsWith('@')) {
      setShowMentions(true);
      fetchUserSuggestions('');
      return;
    }
    
    if (text === '/') {
      setShowCommandHints(true);
      setIsAnimeSearchMode(false);
      setAnimeSearchText('');
      setAnimeResults([]);
      setSelectedAnime(null);
      return;
    } else {
      setShowCommandHints(false);
    }
    if (text.startsWith('/anime')) {
      setShowAnimeSearchModal(true);
      setIsAnimeSearchMode(true);
      setShowCommandHints(false);
      setAnimeSearchText(text.replace('/anime', '').trim());
      setAnimeResults([]);
      setSelectedAnime(null);
      return;
    } else {
      setIsAnimeSearchMode(false);
      setAnimeSearchText('');
      setAnimeResults([]);
      setSelectedAnime(null);
      setShowAnimeSearchModal(false);
    }
    
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const query = text.slice(lastAtIndex + 1);
      const hasSpaceAfterAt = query.includes(' ');
      
      if (!hasSpaceAfterAt) {
        setMentionQuery(query);
        setShowMentions(true);
        fetchUserSuggestions(query);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  // Handle selecting a user mention
  const handleSelectMention = (user: UserSuggestion) => {
    const lastAtIndex = messageText.lastIndexOf('@');
    const newText = messageText.slice(0, lastAtIndex) + `@${user.username} `;
    setMessageText(newText);
    setShowMentions(false);
    setMentionedUsers([...mentionedUsers, user.userId]);
    inputRef.current?.focus();
  };

  // Function to fetch user by username
  const fetchUserByUsername = async (username: string) => {
    try {
      const usersRef = collection(db, 'users');
      const userQuery = query(
        usersRef,
        where('username', '==', username.toLowerCase()),
        limit(1)
      );
      
      const querySnapshot = await getDocs(userQuery);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          userId: doc.id,
          ...doc.data()
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user by username:', error);
      return null;
    }
  };

  // Function to send notification for mention
  const sendMentionNotification = async (messageId: string, mentionedUserId: string) => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) return;

      const notificationsRef = collection(db, 'notifications');
      const notification: Notification = {
        type: 'mention',
        messageId,
        fromUserId: currentUser.uid,
        fromUsername: currentUser.displayName || 'user',
        content: messageText,
        timestamp: serverTimestamp(),
        read: false
      };

      await addDoc(notificationsRef, {
        userId: mentionedUserId,
        ...notification
      });

    } catch (error) {
      console.error('Error sending mention notification:', error);
    }
  };

  // Anime search logic (debounced)
  useEffect(() => {
    if (showAnimeSearchModal && animeSearchText.length > 1) {
      (async () => {
        try {
          const apiQuery = animeSearchText.toLowerCase().trim().replace(/\s+/g, '-');
          const url = `${API_BASE}${ENDPOINTS.SEARCH.replace(':query', apiQuery)}?page=1`;
          const response = await fetch(url);
          const data = await response.json();
          setAnimeResults(data?.results || []);
        } catch (e) {
          setAnimeResults([]);
        }
      })();
    } else {
      setAnimeResults([]);
    }
  }, [animeSearchText, showAnimeSearchModal]);

  // When user selects an anime, close modal and insert card
  const handleSelectAnime = (anime: any) => {
    setSelectedAnime(anime);
    setAnimeSearchText('');
    setAnimeResults([]);
    setShowAnimeSearchModal(false);
    setIsAnimeSearchMode(false);
    setMessageText('');
  };

  // When user cancels modal
  const handleCancelAnimeSearch = () => {
    setShowAnimeSearchModal(false);
    setIsAnimeSearchMode(false);
    setAnimeSearchText('');
    setAnimeResults([]);
    setMessageText('');
  };

  // Modify handleAizenResponse for better error handling and response formatting
  const handleAizenResponse = async (question: string) => {
    try {
      setIsAizenTyping(true);
      
      // Create Aizen's initial message
      const initialMessageData = {
        userId: 'aizen-ai',
        userName: AIZEN_CONFIG.name,
        userAvatar: AIZEN_CONFIG.avatar,
        content: '*adjusts glasses* I shall address your inquiry...',
        timestamp: serverTimestamp(),
      };

      // Send initial response
      await push(messagesRef, initialMessageData);

      // Prepare and get Aizen's response
      const response = await fetch(TOGETHER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOGETHER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
          messages: [
            {
              role: 'system',
              content: AIZEN_CONFIG.systemPrompt
            },
            {
              role: 'user',
              content: question
            }
          ],
          temperature: 0.7,
          max_tokens: 200,
        }),
      });

      if (!response.ok) {
        throw new Error('API response was not ok');
      }

      const data = await response.json();
      const aizenResponse = data.choices[0].message.content;

      // Send Aizen's actual response
      const finalMessageData = {
        userId: 'aizen-ai',
        userName: AIZEN_CONFIG.name,
        userAvatar: AIZEN_CONFIG.avatar,
        content: aizenResponse,
        timestamp: serverTimestamp(),
      };

      await push(messagesRef, finalMessageData);

    } catch (error) {
      console.error('Error in Aizen response:', error);
      // Send a more sophisticated fallback response
      try {
        const fallbackMessageData = {
          userId: 'aizen-ai',
          userName: AIZEN_CONFIG.name,
          userAvatar: AIZEN_CONFIG.avatar,
          content: "How amusing... Even this momentary disruption was part of my grand design. *adjusts glasses* We shall continue this conversation another time.",
          timestamp: serverTimestamp(),
        };
        await push(messagesRef, fallbackMessageData);
      } catch (fallbackError) {
        console.error('Error sending fallback message:', fallbackError);
      }
    } finally {
      setIsAizenTyping(false);
    }
  };

  // Update handleSendMessage to handle loading state
  const handleSendMessage = async () => {
    if (!isAuthenticated()) {
      setShowAuthModal(true);
      return;
    }
    if (!messageText.trim() && !selectedGifUrl && !selectedAnime) {
      return;
    }
    if (isSending) {
      return; // Prevent multiple sends
    }

    try {
      setIsSending(true);

      // Check if this is an /aizen command
      if (messageText.startsWith('/aizen ')) {
        const question = messageText.slice(7).trim();
        if (!question) {
          // Add a message to guide the user
          const systemMessageData = {
            userId: 'system',
            userName: 'System',
            userAvatar: '',
            content: 'Please provide a question after the /aizen command.',
            timestamp: serverTimestamp(),
          };
          await push(messagesRef, systemMessageData);
          setMessageText('');
          setIsSending(false);
          return;
        }

        // Send user's message first
        const currentUser = getCurrentUser();
        if (!currentUser) {
          throw new Error('User not authenticated');
        }

        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (!userDoc.exists()) {
          throw new Error('User data not found');
        }
        const userData = userDoc.data();

        let userAvatarUrl = '';
        if (userData.avatarId) {
          try {
            userAvatarUrl = await getAvatarById(userData.avatarId);
          } catch (error) {
            console.warn('Error getting avatar by ID:', error);
          }
        }

        if (!userAvatarUrl) {
          if (userData.customAvatar) {
            userAvatarUrl = userData.customAvatar;
          } else if (userData.avatarUrl) {
            userAvatarUrl = userData.avatarUrl;
          } else if (AVATARS.length > 0) {
            userAvatarUrl = AVATARS[0].url;
          }
        }

        // Send user's message
        await push(messagesRef, {
          userId: currentUser.uid,
          userName: '@' + (userData.username || 'user'),
          userAvatar: userAvatarUrl,
          content: messageText.trim(),
          timestamp: serverTimestamp(),
        });

        // Trigger Aizen's response
        handleAizenResponse(question);
        setMessageText('');
        setIsSending(false);
        return;
      }

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

      // Create message object without undefined values
      const messageData = {
        userId: currentUser.uid,
        userName: '@' + (userData.username || 'user'),
        userAvatar: userAvatarUrl,
        content: messageText.trim(),
        timestamp: serverTimestamp(),
      };

      // Only add gifUrl if it exists
      if (selectedGifUrl) {
        messageData.gifUrl = selectedGifUrl;
      }

      // Only add mentions if there are any
      if (mentionedUsers && mentionedUsers.length > 0) {
        messageData.mentions = mentionedUsers;
      }

      // Only add anime card if selected
      if (selectedAnime) {
        messageData.animeCard = {
          id: selectedAnime.id,
          title: selectedAnime.title,
          image: selectedAnime.image,
        };
      }

      // Send to Firebase Realtime Database
      const messageRef = await push(messagesRef, messageData);

      // Send notifications to mentioned users if there are any
      if (mentionedUsers && mentionedUsers.length > 0) {
        await Promise.all(mentionedUsers.map(userId => {
          if (userId) {
            return sendMentionNotification(messageRef.key!, userId);
          }
        }));
      }

      // Clear input and states
      setMessageText('');
      setSelectedGifUrl(null);
      setMentionedUsers([]);
      setSelectedAnime(null);
      setIsAnimeSearchMode(false);
      setAnimeSearchText('');
      setAnimeResults([]);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
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

  const handleMentionPress = useCallback(async (username: string) => {
    // Remove @ symbol and find user
    const plainUsername = username.substring(1);
    const user = await fetchUserByUsername(plainUsername);
    if (user) {
      setSelectedUserId(user.userId);
    }
  }, []);

  const handleOpenAnime = useCallback((animeId) => {
    router.push({ pathname: '/anime/[id]', params: { id: animeId } });
  }, [router]);

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
        onMentionPress={handleMentionPress}
        animeCard={item.animeCard}
        onOpenAnime={handleOpenAnime}
      />
    );
  }, [messages, handleUserPress, handleMentionPress, handleOpenAnime]);

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
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: false });
    }
  };

  // Render mention suggestions
  const renderMentionSuggestion = ({ item }: { item: UserSuggestion }) => (
    <Pressable 
      style={styles.mentionItem} 
      onPress={() => handleSelectMention(item)}
    >
      <Image 
        source={{ uri: item.avatarUrl }} 
        style={styles.mentionAvatar}
      />
      <Text style={styles.mentionUsername}>@{item.username}</Text>
    </Pressable>
  );

  // When user selects a command
  const handleCommandSelect = (cmd: string) => {
    setMessageText(cmd + ' ');
    setShowCommandHints(false);
    if (cmd === '/anime') {
      setIsAnimeSearchMode(true);
      setShowAnimeSearchModal(true);
    }
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
            onContentSizeChange={() => {
              if (isFirstLoad) {
                scrollToBottom();
                setIsFirstLoad(false);
              }
            }}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 10
            }}
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
        {selectedAnime && (
          <View style={styles.animeCardPreview}>
            <Image source={{ uri: selectedAnime.image }} style={styles.animeCardImage} />
            <Text style={styles.animeCardTitle}>{selectedAnime.title}</Text>
            <TouchableOpacity style={styles.animeCardButton} onPress={() => router.push({ pathname: '/anime/[id]', params: { id: selectedAnime.id } })}>
              <Text style={styles.animeCardButtonText}>Open</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.animeCardRemove} onPress={() => setSelectedAnime(null)}>
              <MaterialIcons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
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
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={[styles.input, selectedGifUrl && styles.inputWithGif]}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            value={messageText}
            onChangeText={handleInputChange}
            multiline
            maxLength={500}
            editable={!isSending}
          />
          <TouchableOpacity 
            style={styles.gifButton}
            onPress={() => setShowGifPicker(true)}
            disabled={isSending}
          >
            <Text style={[styles.gifButtonText, isSending && styles.disabledButton]}>GIF</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="send" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        {showMentions && userSuggestions.length > 0 && (
          <View style={styles.mentionsContainer}>
            <FlatList
              data={userSuggestions}
              renderItem={renderMentionSuggestion}
              keyExtractor={(item) => item.userId}
              horizontal={false}
              style={styles.mentionsList}
            />
          </View>
        )}
        {showCommandHints && (
          <View style={styles.commandHintsContainer}>
            {COMMANDS.map(cmd => (
              <TouchableOpacity key={cmd.key} style={styles.commandHintItem} onPress={() => handleCommandSelect(cmd.key)}>
                <Text style={styles.commandHintText}>{cmd.key}</Text>
                <Text style={styles.commandHintLabel}>{cmd.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
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

      <Modal
        visible={showAnimeSearchModal}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCancelAnimeSearch}
      >
        <View style={styles.fullscreenModalContainer}>
          <View style={styles.fullscreenInputBar}>
            <TextInput
              style={styles.fullscreenAnimeSearchInput}
              placeholder="Type to search anime..."
              placeholderTextColor="#999"
              value={animeSearchText}
              onChangeText={setAnimeSearchText}
              autoFocus
            />
            <TouchableOpacity onPress={handleCancelAnimeSearch} style={styles.fullscreenModalClose}>
              <MaterialIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={animeResults}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.animeResultItem} onPress={() => handleSelectAnime(item)}>
                <Image source={{ uri: item.image }} style={styles.animeResultImage} />
                <Text style={styles.animeResultTitle}>{item.title}</Text>
              </TouchableOpacity>
            )}
            style={styles.fullscreenAnimeResultsList}
          />
        </View>
      </Modal>
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
    width: 250,
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
  mentionsContainer: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 3,
  },
  mentionsList: {
    padding: 8,
    maxHeight: 200,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  mentionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  mentionUsername: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  mentionText: {
    color: '#f4511e',
    fontWeight: 'bold',
  },
  animeSearchPanel: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 3,
  },
  animeSearchInput: {
    padding: 8,
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(35, 35, 35, 0.9)',
    borderRadius: 24,
    maxHeight: 40,
  },
  animeResultItem: {
    padding: 8,
    borderRadius: 8,
  },
  animeResultImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
  },
  animeResultTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  animeResultsList: {
    padding: 8,
  },
  animeCardPreview: {
    position: 'relative',
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  animeCardImage: {
    width: 70,
    height: 100,
    borderRadius: 8,
    marginBottom: 0,
    backgroundColor: '#222',
  },
  animeCardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'left',
    flexShrink: 1,
  },
  animeCardButton: {
    backgroundColor: '#f4511e',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  animeCardButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  animeCardRemove: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  animeCardInMessage: {
    marginTop: 8,
    marginBottom: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.97)',
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  commandHintsContainer: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 3,
  },
  commandHintItem: {
    padding: 8,
    borderRadius: 8,
  },
  commandHintText: {
    color: '#fff',
    fontSize: 14,
  },
  commandHintLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  animeResultsPanel: {
    flex: 1,
  },
  fullscreenModalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
  },
  fullscreenInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  fullscreenAnimeSearchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    backgroundColor: 'rgba(35, 35, 35, 0.9)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 40,
  },
  fullscreenModalClose: {
    marginLeft: 16,
  },
  fullscreenAnimeResultsList: {
    flex: 1,
  },
  boldText: {
    fontWeight: 'bold',
  },
  italicText: {
    fontStyle: 'italic',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(244, 81, 30, 0.5)',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default memo(PublicChat); 