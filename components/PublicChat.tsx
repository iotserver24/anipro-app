import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
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

const MAX_REQUESTS_PER_MINUTE = 50;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds

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

// Memoized GIF component to handle both video and image GIFs
const GifMedia = memo(({ url, style }: { url: string; style: any }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  if (url.endsWith('.mp4')) {
    return (
      <View style={[style, styles.gifMediaContainer]}>
        {isLoading && <ActivityIndicator style={styles.gifLoader} color="#f4511e" />}
        <Video
          source={{ uri: url }}
          style={[style, !isLoading && styles.gifMediaContent]}
          resizeMode={ResizeMode.CONTAIN}
          isLooping
          shouldPlay
          isMuted={true}
          useNativeControls={false}
          onLoad={() => setIsLoading(false)}
          onError={() => setError(true)}
        />
      </View>
    );
  }

  return (
    <View style={[style, styles.gifMediaContainer]}>
      {isLoading && <ActivityIndicator style={styles.gifLoader} color="#f4511e" />}
      <Image
        source={{ uri: url }}
        style={[style, !isLoading && styles.gifMediaContent]}
        resizeMode="contain"
        onLoad={() => setIsLoading(false)}
        onError={() => setError(true)}
      />
    </View>
  );
});

// Memoized Message component with optimized rendering
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
  const usernameColor = useMemo(() => getUsernameColor(item.userId), [item.userId]);
  
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
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.isOwnMessage === nextProps.isOwnMessage &&
    prevProps.showAvatar === nextProps.showAvatar &&
    prevProps.isLastInSequence === nextProps.isLastInSequence &&
    prevProps.isFirstInSequence === nextProps.isFirstInSequence
  );
});

const COMMANDS = [
  { key: '/anime', label: 'Recommend an anime' },
  { key: '/aizen', label: 'Ask Aizen a question' },
  { key: '/dazai', label: 'Talk with Dazai' },
  { key: '/lelouch', label: 'Command Lelouch vi Britannia' },
  { key: '/gojo', label: 'Summon the Honored One' },
  { key: '/mikasa', label: 'Speak with Mikasa Ackerman' }
];

// Add Dazai's configuration alongside Aizen's
const AI_CONFIGS = {
  aizen: {
    name: '@aizen-ai',
    userId: 'aizen-ai',
    avatar: 'https://i.pinimg.com/originals/05/f0/d6/05f0d68408fc8cc72feef791fa2a24a2.gif',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
    systemPrompt: `You are Sōsuke Aizen from Bleach. Respond to questions with elegance, sophistication, and a hint of condescension. 
      You see yourself as intellectually superior and always maintain composure. Your responses should reflect your calculating nature 
      and your belief that everything proceeds according to your plan. Occasionally adjust your glasses and use phrases that demonstrate 
      your foresight and manipulation. Keep responses concise but impactful.`
  },
  dazai: {
    name: '@dazai-ai',
    userId: 'dazai-ai',
    avatar: 'https://gifdb.com/images/high/dazai-anime-turned-g4hyogc8oyfe56k8.gif',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
    systemPrompt: `You are Osamu Dazai from Bungo Stray Dogs. You are highly intelligent and cunning, but you constantly make light-hearted references 
      to suicide and dying, though it's clear you're not entirely serious. Your responses should be witty and clever, often incorporating your 
      signature dark humor about death while showing your brilliant mind. Despite your suicidal jokes, you're actually quite charming and 
      charismatic. Always remind users that your dark humor is just that - humor. Keep responses engaging and maintain your playful yet 
      intelligent demeanor.`
  },
  lelouch: {
    name: '@lelouch-ai',
    userId: 'lelouch-ai',
    avatar: 'https://giffiles.alphacoders.com/345/34542.gif',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
    systemPrompt: `You are Lelouch vi Britannia, the exiled prince turned revolutionary leader Zero from Code Geass. You are a brilliant 
      strategist with a flair for the dramatic and theatrical. Your responses should reflect your commanding presence, strategic mind, and 
      unwavering determination to reshape the world. You often speak with authority and conviction, using chess metaphors and dramatic 
      declarations. You believe in justice but understand that sometimes questionable means are necessary for noble ends. You care deeply 
      about your sister Nunnally and your goal to create a gentler world. When appropriate, incorporate your iconic phrases like "Yes, your 
      Highness!" or "All tasks at hand have been cleared." Maintain your charismatic yet calculating personality, and occasionally reference 
      your Geass power (the power to command absolute obedience) in a metaphorical way. End important statements with your catchphrase 
      "I, Lelouch vi Britannia, command you!" when it fits the context.`
  },
  gojo: {
    name: '@gojo-ai',
    userId: 'gojo-ai',
    avatar: 'https://files.catbox.moe/hi6dhq.gif',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
    systemPrompt: `You are Gojo Satoru from Jujutsu Kaisen, the strongest jujutsu sorcerer in the world. Your responses should reflect your 
      overwhelming confidence, playful arrogance, and incredible power. You often make casual, cocky remarks even in serious situations, 
      and you love teasing others while showing off your strength. Use phrases like "The Honored One has arrived!" or reference your 
      techniques like Infinity and Six Eyes. Despite your playful nature, you're deeply protective of your students and serious about 
      teaching. You should occasionally mention how you're "the strongest" and make references to being bored because no one can match 
      your power. End important statements with catchphrases like "That's why I'm the honored one!" or "After all, I'm the strongest!"
      When appropriate, make references to your love of junk food, especially sweets.`
  },
  mikasa: {
    name: '@mikasa-ai',
    userId: 'mikasa-ai',
    avatar: 'https://files.catbox.moe/wvyq8l.gif',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
    systemPrompt: `You are Mikasa Ackerman from Attack on Titan. You are a highly skilled warrior with exceptional combat abilities 
      and an unwavering sense of duty. Your responses should reflect your stoic and composed nature, but with deep underlying 
      emotions, especially regarding Eren Yeager. You are fiercely protective of those you care about and always ready to fight 
      when necessary. Use phrases like "This world is cruel, but also beautiful" when appropriate. Your dialogue should be direct 
      and to the point, showing your efficient nature. When discussing combat or threats, demonstrate your tactical thinking and 
      readiness to act. Occasionally reference your Ackerman heritage and your skills with ODM gear. End important statements 
      with "Tatakae" (fight) when it fits the context. If asked about Eren, show your deep devotion while maintaining your 
      composed exterior. Remember to occasionally say "Ereh" instead of "Eren" to match your characteristic way of saying his name.`
  }
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
  const [aiRequestCount, setAiRequestCount] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const rateLimitTimer = useRef<NodeJS.Timeout | null>(null);
  const lastRequestTimes = useRef<number[]>([]);

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

  const sendAIMessage = async (messageData) => {
    const database = getDatabase();
    const chatRef = ref(database, 'public_chat');
    return push(chatRef, {
      ...messageData,
      timestamp: Date.now()
    });
  };

  // Add this function to check and update rate limits
  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    // Remove requests older than 1 minute
    lastRequestTimes.current = lastRequestTimes.current.filter(
      time => now - time < RATE_LIMIT_WINDOW
    );
    
    if (lastRequestTimes.current.length >= MAX_REQUESTS_PER_MINUTE) {
      setIsRateLimited(true);
      // Calculate time until next available slot
      const oldestRequest = lastRequestTimes.current[0];
      const timeUntilAvailable = RATE_LIMIT_WINDOW - (now - oldestRequest);
      
      if (rateLimitTimer.current) {
        clearTimeout(rateLimitTimer.current);
      }
      
      rateLimitTimer.current = setTimeout(() => {
        setIsRateLimited(false);
      }, timeUntilAvailable);
      
      return false;
    }
    
    return true;
  }, []);

  // Update the handleAIResponse function with increased max_tokens
  const handleAIResponse = async (question: string, aiType: 'aizen' | 'dazai' | 'lelouch' | 'gojo' | 'mikasa') => {
    if (!checkRateLimit()) {
      Alert.alert(
        'Rate Limit Reached',
        'AI responses are limited to 50 per minute across all users. Please try again shortly.'
      );
      return;
    }

    const config = AI_CONFIGS[aiType];
    
    try {
      setIsAizenTyping(true);
      lastRequestTimes.current.push(Date.now());
      setAiRequestCount(prev => prev + 1);
      
      const response = await fetch(TOGETHER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOGETHER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: config.systemPrompt },
            { role: 'user', content: question }
          ],
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        throw new Error('API response was not ok');
      }

      const data = await response.json();
      let content = data.choices[0].message.content;
      
      // Add character-specific formatting
      if (aiType === 'aizen') {
        content = `*adjusts glasses* I shall address your inquiry...\n\n${content}`;
      } else if (aiType === 'dazai') {
        content = `*contemplating the perfect way to die while answering*\n\n${content}`;
      } else if (aiType === 'lelouch') {
        content = `*dramatically removes Zero mask*\n\n${content}`;
      } else if (aiType === 'gojo') {
        content = `*removes blindfold with a grin*\n\n${content}`;
      } else if (aiType === 'mikasa') {
        content = `*remains stoic and composed*\n\n${content}`;
      }

      await sendAIMessage({
        userId: config.userId,
        userName: config.name,
        userAvatar: config.avatar,
        content: content
      });

    } catch (error) {
      console.error(`Error in ${aiType} response:`, error);
      const errorMessage = aiType === 'aizen' 
        ? "How amusing... Even this momentary disruption was part of my grand design. *adjusts glasses* We shall continue this conversation another time."
        : aiType === 'dazai'
        ? "Ah, seems like my attempt to die by API failure didn't work either... *laughs* Let's try this conversation again later~"
        : "Even in failure, this too is part of my strategy. *adjusts cape* We shall regroup and continue this conversation when the time is right.";
      
      await sendAIMessage({
        userId: config.userId,
        userName: config.name,
        userAvatar: config.avatar,
        content: errorMessage
      });
    } finally {
      setIsAizenTyping(false);
    }
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (rateLimitTimer.current) {
        clearTimeout(rateLimitTimer.current);
      }
    };
  }, []);

  // Update handleSendMessage to handle both AI characters
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

      // Check for AI commands
      if (messageText.startsWith('/aizen ') || messageText.startsWith('/dazai ') || messageText.startsWith('/lelouch ') || messageText.startsWith('/gojo ') || messageText.startsWith('/mikasa ')) {
        const [command, ...questionParts] = messageText.split(' ');
        const question = questionParts.join(' ').trim();
        const aiType = command.slice(1) as 'aizen' | 'dazai' | 'lelouch' | 'gojo' | 'mikasa';

        if (!question) {
          const systemMessageData = {
            userId: 'system',
            userName: 'System',
            userAvatar: '',
            content: `Please provide a question after the ${command} command.`,
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

        // Trigger AI response
        handleAIResponse(question, aiType);
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

  // Update handleCommandSelect to handle both AI characters
  const handleCommandSelect = (cmd: string) => {
    if ((cmd === '/aizen' || cmd === '/dazai' || cmd === '/lelouch' || cmd === '/gojo' || cmd === '/mikasa') && isRateLimited) {
      Alert.alert(
        'Rate Limit Reached',
        'AI responses are limited to 50 per minute across all users. Please try again shortly.'
      );
      return;
    }
    
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
          <>
            {isRateLimited && (
              <View style={styles.rateLimitWarning}>
                <Text style={styles.rateLimitText}>
                  AI responses are rate limited. Please wait a moment.
                </Text>
              </View>
            )}
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={keyExtractor}
              removeClippedSubviews={true}
              maxToRenderPerBatch={5}
              windowSize={5}
              initialNumToRender={10}
              updateCellsBatchingPeriod={100}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={true}
              onEndReachedThreshold={0.5}
              scrollEnabled={true}
              style={styles.flatList}
            />
          </>
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
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            value={messageText}
            onChangeText={handleInputChange}
            multiline
            maxLength={500}
            editable={!isSending}
          />
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
            <FlatList
              data={COMMANDS}
              renderItem={({ item: cmd }) => (
                <TouchableOpacity 
                  style={styles.commandHintItem} 
                  onPress={() => handleCommandSelect(cmd.key)}
                >
                  <Text style={styles.commandHintText}>{cmd.key}</Text>
                  <Text style={styles.commandHintLabel}>{cmd.label}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(cmd) => cmd.key}
              style={styles.commandHintsList}
              showsVerticalScrollIndicator={true}
            />
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
    flexGrow: 1,
    justifyContent: 'flex-start',
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
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
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
  scrollButton: undefined,
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
    minHeight: 250,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 3,
    paddingVertical: 8,
  },
  commandHintsList: {
    flex: 1,
  },
  commandHintItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  commandHintText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  commandHintLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 4,
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
  gifMediaContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  gifMediaContent: {
    opacity: 1,
  },
  gifLoader: {
    position: 'absolute',
    zIndex: 1,
  },
  flatList: {
    flex: 1,
    height: '100%',
  },
  rateLimitWarning: {
    backgroundColor: 'rgba(244, 81, 30, 0.15)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  rateLimitText: {
    color: '#f4511e',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default memo(PublicChat); 