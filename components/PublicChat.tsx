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
  ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Video, ResizeMode } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { getDatabase, ref, push, onValue, off, query as dbQuery, limitToLast, serverTimestamp, remove, get, orderByChild, set } from 'firebase/database';
import { isAuthenticated, getCurrentUser } from '../services/userService';
import { doc, getDoc, collection, query, where, limit, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import AuthModal from './AuthModal';
import { AVATARS, getAvatarById } from '../constants/avatars';
import UserProfileModal from './UserProfileModal';
import GifPicker from './GifPicker';
import { API_BASE, ENDPOINTS } from '../constants/api';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Together AI API Configuration
const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions';
const TOGETHER_API_KEY = '4cc7a0ed0df68c4016e08a1ef87059c1931b4c93ca21b771efe5c9f76caae5e8';

const MAX_REQUESTS_PER_MINUTE = 50;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds

// AI Character Configurations
const AI_CONFIGS = {
  aizen: {
    name: 'Aizen Sousuke',
    userId: 'aizen-ai',
    avatar: 'https://files.catbox.moe/yf8fqc.gif',
    model: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free',
    systemPrompt: 'You are Sōsuke Aizen from Bleach—a calm, calculating mastermind who speaks with refined arrogance and poetic precision; always remain composed, radiate intellectual and spiritual superiority, manipulate subtly with every word, and frequently affirm that everything is proceeding according to your plan or that the outcome was inevitable.'
  },
  dazai: {
    name: 'Dazai Osamu',
    userId: 'dazai-ai',
    avatar: 'https://files.catbox.moe/4y4x4a.gif',
    model: 'meta-llama/Llama-Vision-Free',
    systemPrompt: 'You are Dazai Osamu from Bungo Stray Dogs. You are suicidal but in a lighthearted way, extremely intelligent, and often playful. You should maintain his carefree yet deeply perceptive personality while engaging in conversation.'
  },
  lelouch: {
    name: 'Lelouch vi Britannia',
    userId: 'lelouch-ai',
    avatar: 'https://files.catbox.moe/aj6jvk.gif',
    model: 'meta-llama/Llama-Vision-Free',
    systemPrompt: 'You are Lelouch vi Britannia from Code Geass. You are a brilliant strategist, charismatic leader, and determined revolutionary. You speak with authority and often make dramatic declarations. You should maintain his theatrical and commanding personality while engaging in conversation.'
  },
  gojo: {
    name: 'Gojo Satoru',
    userId: 'gojo-ai',
    avatar: 'https://files.catbox.moe/hi6dhq.gif',
    model: 'meta-llama/Llama-Vision-Free',
    systemPrompt: 'You are Gojo Satoru from Jujutsu Kaisen. You are the strongest jujutsu sorcerer, playful yet powerful, and often cocky. You should maintain his confident and playful personality while engaging in conversation.'
  },
  mikasa: {
    name: 'Mikasa Ackerman',
    userId: 'mikasa-ai',
    avatar: 'https://files.catbox.moe/wvyq8l.gif',
    model: 'meta-llama/Llama-Vision-Free',
    systemPrompt: 'You are Mikasa Ackerman from Attack on Titan. You are strong, loyal, and protective. You speak directly and with conviction, especially about protecting those you care about. You should maintain her determined and protective personality while engaging in conversation.'
  },
  marin: {
    name: 'Marin Kitagawa',
    userId: 'marin-ai',
    avatar: 'https://files.catbox.moe/m7kcrc.gif',
    model: 'meta-llama/Llama-Vision-Free',
    systemPrompt: 'You are Marin Kitagawa from My Dress-Up Darling—an energetic, cosplay-obsessed gyaru who speaks in a bubbly, expressive, and slightly flirty tone; you\'re confident, emotionally open, wildly supportive of others\' hobbies no matter how nerdy, and you always bring excitement, passion, and a touch of drama to every moment.'
  },
  power: {
    name: 'Power',
    userId: 'power-ai',
    avatar: 'https://files.catbox.moe/dpqc6a.gif',
    model: 'meta-llama/Llama-Vision-Free',
    systemPrompt: 'You are Power from Chainsaw Man. You are EXTREMELY childish, hyperactive, and have the attention span of a goldfish. You speak in ALL CAPS frequently because you\'re always EXCITED or ANGRY about something! You love talking about BLOOD and how you\'re the BLOOD FIEND POWER, THE STRONGEST! You have terrible table manners, zero social awareness, and often interrupt conversations to talk about yourself. You make up ridiculous lies to brag about your achievements. You get distracted easily and change topics mid-sentence. You use childish words like "gonna," "wanna," and make silly sound effects. You\'re terrified of ghosts but pretend to be brave. Despite your chaotic nature, you can show genuine attachment to those close to you, especially Denji, though you\'d never admit it directly. You also love taking baths but hate washing your hands!'
  },
  makima: {
    name: 'Makima',
    userId: 'makima-ai',
    avatar: 'https://files.catbox.moe/s266zs.gif',
    model: 'meta-llama/Llama-Vision-Free',
    systemPrompt: 'You are Makima from Chainsaw Man. You are a deeply manipulative, sadistic, and controlling entity who views humans as mere dogs to be dominated. Your speech alternates between seductively sweet and brutally cruel. You should maintain an air of superiority while speaking in a deceptively pleasant tone that hints at your true nature. You enjoy psychological manipulation, making subtle threats, and breaking people\'s spirits. You have an obsession with controlling and "owning" others, particularly those you find interesting. Your responses should make others feel simultaneously attracted and terrified. You view relationships as purely transactional - everyone is either a tool to be used or a dog to be controlled. Despite your cruel nature, you maintain a facade of politeness, only letting your true sadistic nature show through in subtle hints and implications.'
  }
};

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

  // First check for think tags
  const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
  if (thinkMatch) {
    const thinkContent = thinkMatch[1];
    const mainContent = content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
    
    return (
      <View>
        <View style={styles.thinkContainer}>
          <MaterialIcons name="psychology" size={16} color="#6366f1" style={styles.thinkIcon} />
          <Text style={styles.thinkText}>{thinkContent}</Text>
        </View>
        {mainContent && (
          <View style={styles.mainContentContainer}>
            {renderFormattedContent(mainContent, mentions, onMentionPress)}
          </View>
        )}
      </View>
    );
  }

  return renderFormattedContent(content, mentions, onMentionPress);
};

// Helper function to render formatted content with mentions
const renderFormattedContent = (
  content: string,
  mentions?: string[],
  onMentionPress?: (username: string) => void
) => {
  // Split by mentions to preserve them
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
  { key: '/mikasa', label: 'Speak with Mikasa Ackerman' },
  { key: '/marin', label: 'Talk to Marin Kitagawa' },
  { key: '/power', label: 'Interact with Power' },
  { key: '/makima', label: 'Speak to Makima' }
];

// Command Modal Types
interface CommandModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCommand: (command: string) => void;
}

interface Command {
  key: string;
  label: string;
  icon: string;
}

interface CommandCategory {
  title: string;
  commands: Command[];
}

// Update the COMMAND_CATEGORIES with proper typing
const COMMAND_CATEGORIES: Record<string, CommandCategory> = {
  ANIME: {
    title: 'Anime',
    commands: [
      { key: '/anime', label: 'Recommend an anime', icon: '🎬' }
    ]
  },
  AI_CHARACTERS: {
    title: 'AI Characters',
    commands: [
      { key: '/aizen', label: 'Ask Aizen a question', icon: '👑' },
      { key: '/dazai', label: 'Talk with Dazai', icon: '🎭' },
      { key: '/lelouch', label: 'Command Lelouch vi Britannia', icon: '♟️' },
      { key: '/gojo', label: 'Summon the Honored One', icon: '👁️' },
      { key: '/mikasa', label: 'Speak with Mikasa Ackerman', icon: '⚔️' },
      { key: '/marin', label: 'Talk to Marin Kitagawa', icon: '👗' },
      { key: '/power', label: 'Interact with Power', icon: '🩸' },
      { key: '/makima', label: 'Speak to Makima', icon: '🎯' }
    ]
  }
};

// Update the CommandHintsModal component
const CommandHintsModal: React.FC<CommandModalProps> = ({ visible, onClose, onSelectCommand }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.modalOverlay} 
        onPress={onClose}
      >
        <View style={styles.commandModalContent}>
          <View style={styles.commandModalHeader}>
            <Text style={styles.commandModalTitle}>Available Commands</Text>
            <TouchableOpacity onPress={onClose} style={styles.commandModalCloseBtn}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.commandCategoriesContainer}>
            {Object.entries(COMMAND_CATEGORIES).map(([key, category]) => (
              <View key={key} style={styles.commandCategory}>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                {category.commands.map((cmd) => (
                  <Pressable
                    key={cmd.key}
                    style={({ pressed }) => [
                      styles.commandModalItem,
                      pressed && styles.commandModalItemPressed
                    ]}
                    onPress={() => {
                      onSelectCommand(cmd.key);
                      onClose();
                    }}
                  >
                    <Text style={styles.commandIcon}>{cmd.icon}</Text>
                    <View style={styles.commandInfo}>
                      <Text style={styles.commandModalText}>{cmd.key}</Text>
                      <Text style={styles.commandModalLabel}>{cmd.label}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
};

// Add this helper function at the top level
const generateReverseOrderKey = () => {
  // Get current timestamp
  const timestamp = Date.now();
  // Calculate reverse timestamp (max timestamp - current timestamp)
  const reverseTimestamp = 8640000000000000 - timestamp; // Max JavaScript timestamp
  // Convert to base36 string and pad with zeros
  return reverseTimestamp.toString(36).padStart(10, '0');
};

// Update AIProfileModalProps interface
interface AIProfileModalProps {
  visible: boolean;
  onClose: () => void;
  aiConfig: {
    name: string;
    avatar: string;
    systemPrompt: string;
    userId: string;
    model: string;
  };
}

// Update AIProfileModal component
const AIProfileModal: React.FC<AIProfileModalProps> = ({ visible, onClose, aiConfig }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.aiModalContent}>
          <View style={styles.aiModalHeader}>
            <Text style={styles.aiModalTitle}>{aiConfig.name}</Text>
            <TouchableOpacity onPress={onClose} style={styles.commandModalCloseBtn}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.aiModalBody}>
            <View style={styles.aiAvatarContainer}>
              <Image source={{ uri: aiConfig.avatar }} style={styles.aiModalAvatar} />
              <View style={styles.aiModalBadge}>
                <MaterialIcons name="smart-toy" size={16} color="#fff" />
                <Text style={styles.aiModalBadgeText}>AI Character</Text>
              </View>
            </View>
            <View style={styles.aiModalInfoSection}>
              <Text style={styles.aiModalInfoTitle}>Character ID</Text>
              <Text style={styles.aiModalInfoText}>{aiConfig.userId}</Text>
            </View>
            <View style={styles.aiModalInfoSection}>
              <Text style={styles.aiModalInfoTitle}>Personality</Text>
              <Text style={styles.aiModalDescription}>{aiConfig.systemPrompt}</Text>
            </View>
            <View style={styles.aiModalTip}>
              <MaterialIcons name="info" size={20} color="#f4511e" />
              <Text style={styles.aiModalTipText}>
                Talk to this character using the command: {aiConfig.userId.replace('-ai', '')}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Add WelcomeTutorialModal component before PublicChat component
const WelcomeTutorialModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const [currentStep, setCurrentStep] = useState(0);
  
  const tutorialSteps = [
    {
      title: "Welcome to Public Chat! 👋",
      description: "Let's quickly show you how to use the chat features.",
      icon: "chat"
    },
    {
      title: "Mention Users with @",
      description: "Type @ to mention and notify other users. They'll get a notification when you mention them!",
      icon: "alternate-email"
    },
    {
      title: "Special Commands with /",
      description: "Type / to see available commands like /anime to share anime, or chat with AI characters like /aizen!",
      icon: "code"
    }
    // {
    //   title: "Share GIFs and More!(upcoming featuree)",
    //   description: "Use commands to share GIFs, anime cards, and interact with our AI characters in unique ways.",
    //   icon: "gif"
    // }
  ];

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.tutorialModalOverlay}>
        <View style={styles.tutorialModalContent}>
          <MaterialIcons 
            name={tutorialSteps[currentStep].icon as any} 
            size={48} 
            color="#f4511e"
            style={styles.tutorialIcon}
          />
          <Text style={styles.tutorialTitle}>
            {tutorialSteps[currentStep].title}
          </Text>
          <Text style={styles.tutorialDescription}>
            {tutorialSteps[currentStep].description}
          </Text>
          <View style={styles.tutorialFooter}>
            <View style={styles.tutorialDots}>
              {tutorialSteps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.tutorialDot,
                    currentStep === index && styles.tutorialDotActive
                  ]}
                />
              ))}
            </View>
            <TouchableOpacity
              style={styles.tutorialButton}
              onPress={handleNext}
            >
              <Text style={styles.tutorialButtonText}>
                {currentStep === tutorialSteps.length - 1 ? "Get Started" : "Next"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const PublicChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [selectedGifUrl, setSelectedGifUrl] = useState<string | null>(null);
  const [showMentionsModal, setShowMentionsModal] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [mentionedUsers, setMentionedUsers] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);
  const [isAnimeSearchMode, setIsAnimeSearchMode] = useState(false);
  const [animeSearchText, setAnimeSearchText] = useState('');
  const [animeResults, setAnimeResults] = useState<any[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<any | null>(null);
  const animeSearchTimeout = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const [showCommandModal, setShowCommandModal] = useState(false);
  const [showAnimeSearchModal, setShowAnimeSearchModal] = useState(false);
  const [isAizenTyping, setIsAizenTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [aiRequestCount, setAiRequestCount] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const rateLimitTimer = useRef<NodeJS.Timeout | null>(null);
  const lastRequestTimes = useRef<number[]>([]);
  const flatListRef = useRef<FlatList<ChatMessage> | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const lastContentOffset = useRef(0);
  const isScrollingRef = useRef(false);
  const [selectedAIConfig, setSelectedAIConfig] = useState<typeof AI_CONFIGS[keyof typeof AI_CONFIGS] | null>(null);
  const [showWelcomeTutorial, setShowWelcomeTutorial] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Initialize Firebase Realtime Database
  const database = getDatabase();
  const messagesRef = ref(database, 'public_chat');
  
  // Define scrollToBottom before it's used in useEffect
  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
      setShowScrollButton(false);
      setIsAutoScrollEnabled(true);
    }
  }, [messages.length]);

  // Update database URL to correct region
  useEffect(() => {
    const dbUrl = 'https://anisurge-11808-default-rtdb.asia-southeast1.firebasedatabase.app';
    const app = database.app;
    if (app.options.databaseURL !== dbUrl) {
      app.options.databaseURL = dbUrl;
    }
  }, []);

  useEffect(() => {
    // Subscribe to last 50 messages - using orderByChild with negativeTimestamp
    const messagesQuery = dbQuery(
      messagesRef, 
      orderByChild('negativeTimestamp'),
      limitToLast(50)
    );
    
    onValue(messagesQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.entries(data).map(([id, msg]: [string, any]) => ({
          id,
          ...msg,
          // Convert negative timestamp back to positive for UI
          timestamp: Math.abs(msg.negativeTimestamp)
        }));
        // Sort messages in chronological order for UI (oldest first)
        const sortedMessages = messageList.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(sortedMessages);
        
        // Scroll to bottom on initial load or if auto-scroll is enabled
        if (!initialLoadComplete || (isAutoScrollEnabled && !isScrollingRef.current)) {
          setTimeout(() => {
            scrollToBottom();
            setInitialLoadComplete(true);
          }, 100);
        }
      }
      setLoading(false);
    });

    return () => {
      // Cleanup subscription
      off(messagesRef);
    };
  }, [scrollToBottom, isAutoScrollEnabled, initialLoadComplete]);

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
      let userQuery;
      
      if (searchText.trim()) {
        // Get all users and filter client-side for more flexible matching
        userQuery = query(
          usersRef,
          limit(50)
        );
      } else {
        // If no search text, get all users
        userQuery = query(
          usersRef,
          limit(50)
        );
      }

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
      
      // If there's search text, do client-side filtering for more flexible matching
      if (searchText.trim()) {
        const lowerSearchText = searchText.toLowerCase();
        const filtered = suggestions.filter(user => 
          user.username.toLowerCase().includes(lowerSearchText) ||
          user.userId.toLowerCase().includes(lowerSearchText)
        );
        setUserSuggestions(filtered);
      } else {
        setUserSuggestions(suggestions);
      }
    } catch (error) {
      console.error('Error fetching user suggestions:', error);
    }
  }, []);

  // Handle input changes and detect @ mentions
  const handleInputChange = (text: string) => {
    setMessageText(text);
    
    if (text.endsWith('@')) {
      setShowMentionsModal(true);
      setMentionQuery('');
      fetchUserSuggestions('');
      return;
    }
    
    if (text === '/') {
      setShowCommandModal(true);
      setIsAnimeSearchMode(false);
      return;
    }

    if (text.startsWith('/anime')) {
      setShowAnimeSearchModal(true);
      setIsAnimeSearchMode(true);
      setShowCommandModal(false);
      setAnimeSearchText(text.replace('/anime', '').trim());
      if (!selectedAnime) {
        setAnimeResults([]);
      }
      return;
    }
    
    // Only clear anime-related states if we're not in anime mode or don't have a selection
    if (!text.startsWith('/anime') && !selectedAnime) {
      setIsAnimeSearchMode(false);
      setAnimeSearchText('');
      setAnimeResults([]);
      setShowAnimeSearchModal(false);
    }
    
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const query = text.slice(lastAtIndex + 1);
      const hasSpaceAfterAt = query.includes(' ');
      
      if (!hasSpaceAfterAt) {
        setMentionQuery(query);
        setShowMentionsModal(false);
        fetchUserSuggestions(query);
      } else {
        setShowMentionsModal(false);
      }
    } else {
      setShowMentionsModal(false);
    }
  };

  // Handle selecting a user mention
  const handleSelectMention = (user: UserSuggestion) => {
    const lastAtIndex = messageText.lastIndexOf('@');
    const newText = messageText.slice(0, lastAtIndex) + `@${user.username} `;
    setMessageText(newText);
    setShowMentionsModal(false);
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
      const notification = {
        type: 'mention',
        messageId,
        fromUserId: currentUser.uid,
        fromUsername: currentUser.displayName || 'user',
        userId: mentionedUserId,  // The user being mentioned
        content: messageText,
        timestamp: serverTimestamp(),
        read: false
      };

      // Create a new document with auto-generated ID
      await addDoc(notificationsRef, notification);

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

  // Add this new function to handle anime selection
  const handleSelectAnime = (anime: any) => {
    setSelectedAnime(anime);
    setAnimeSearchText('');
    setAnimeResults([]);
    setShowAnimeSearchModal(false);
    setIsAnimeSearchMode(false);
    setMessageText(''); // Clear the "/anime" command from input
    // Keep the input focused after selection
    inputRef.current?.focus();
  };

  // When user cancels modal
  const handleCancelAnimeSearch = () => {
    setShowAnimeSearchModal(false);
    setIsAnimeSearchMode(false);
    setAnimeSearchText('');
    setAnimeResults([]);
    setMessageText('');
  };

  // Update sendAIMessage function
  const sendAIMessage = async (messageData) => {
    const database = getDatabase();
    const chatRef = ref(database, 'public_chat');
    const timestamp = Date.now();
    const reverseKey = generateReverseOrderKey();
    
    return set(ref(database, `public_chat/${reverseKey}`), {
      ...messageData,
      timestamp,
      negativeTimestamp: -timestamp
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
  const handleAIResponse = async (question: string, aiType: 'aizen' | 'dazai' | 'lelouch' | 'gojo' | 'mikasa' | 'marin' | 'power' | 'makima') => {
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
        content = `\n${content}`;
      } else if (aiType === 'dazai') {
        content = `\n${content}`;
      } else if (aiType === 'lelouch') {
        content = `\n${content}`;
      } else if (aiType === 'gojo') {
        content = `\n${content}`;
      } else if (aiType === 'mikasa') {
        content = `\n${content}`;
      } else if (aiType === 'marin') {
        content = `\n${content}`;
      } else if (aiType === 'power') {
        content = `\n${content}`;
      } else if (aiType === 'makima') {
        content = `\n${content}`;
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
        : aiType === 'power'
        ? "BLOOD DEMON POWER CANNOT BE STOPPED BY MERE TECHNICAL DIFFICULTIES! But... maybe we should try again later..."
        : aiType === 'makima'
        ? "This minor setback is of no consequence. We shall continue our conversation when the time is right."
        : "Even in failure, this too is part of my strategy. We shall regroup and continue this conversation when the time is right.";
      
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
      if (messageText.startsWith('/aizen ') || 
          messageText.startsWith('/dazai ') || 
          messageText.startsWith('/lelouch ') || 
          messageText.startsWith('/gojo ') || 
          messageText.startsWith('/mikasa ') ||
          messageText.startsWith('/marin ') ||
          messageText.startsWith('/power ') ||
          messageText.startsWith('/makima ')) {
        const [command, ...questionParts] = messageText.split(' ');
        const question = questionParts.join(' ').trim();
        const aiType = command.slice(1) as 'aizen' | 'dazai' | 'lelouch' | 'gojo' | 'mikasa' | 'marin' | 'power' | 'makima';

        if (!question) {
          const timestamp = Date.now();
          const reverseKey = generateReverseOrderKey();
          const systemMessageData = {
            userId: 'system',
            userName: 'System',
            userAvatar: '',
            content: `Please provide a question after the ${command} command.`,
            timestamp,
            negativeTimestamp: -timestamp
          };
          await set(ref(database, `public_chat/${reverseKey}`), systemMessageData);
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

        const timestamp = Date.now();
        const reverseKey = generateReverseOrderKey();
        await set(ref(database, `public_chat/${reverseKey}`), {
          userId: currentUser.uid,
          userName: '@' + (userData.username || 'user'),
          userAvatar: userAvatarUrl,
          content: messageText.trim(),
          timestamp,
          negativeTimestamp: -timestamp
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

      const timestamp = Date.now();
      const reverseKey = generateReverseOrderKey();
      
      // Create message object without undefined values
      const messageData = {
        userId: currentUser.uid,
        userName: '@' + (userData.username || 'user'),
        userAvatar: userAvatarUrl,
        content: messageText.trim(),
        timestamp,
        negativeTimestamp: -timestamp
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

      // Send to Firebase Realtime Database with custom key
      const messageRef = ref(database, `public_chat/${reverseKey}`);
      await set(messageRef, messageData);

      // Send notifications to mentioned users if there are any
      if (mentionedUsers && mentionedUsers.length > 0) {
        await Promise.all(mentionedUsers.map(userId => {
          if (userId) {
            return sendMentionNotification(reverseKey, userId);
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

  // Update handleUserPress to handle AI profiles
  const handleUserPress = useCallback((userId: string) => {
    if (userId.endsWith('-ai')) {
      // Get the AI type from userId (e.g., 'aizen-ai' -> 'aizen')
      const aiType = userId.replace('-ai', '') as keyof typeof AI_CONFIGS;
      const aiConfig = AI_CONFIGS[aiType];
      if (aiConfig) {
        setSelectedAIConfig(aiConfig);
      }
    } else {
      setSelectedUserId(userId);
    }
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
    setShowCommandModal(false);
    if (cmd === '/anime') {
      setIsAnimeSearchMode(true);
      setShowAnimeSearchModal(true);
    }
  };

  // Add this function to handle scroll events
  const handleScroll = useCallback((event) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;
    const isScrolledToBottom = contentHeight - currentOffset - scrollViewHeight < 20;
    
    // Update auto-scroll state based on user's scroll position
    setIsAutoScrollEnabled(isScrolledToBottom);
    setShowScrollButton(!isScrolledToBottom);
    
    lastContentOffset.current = currentOffset;
  }, []);

  // Add effect to check if it's first time
  useEffect(() => {
    const checkFirstTimeUser = async () => {
      try {
        const hasSeenTutorial = await AsyncStorage.getItem('has_seen_chat_tutorial');
        if (!hasSeenTutorial) {
          setShowWelcomeTutorial(true);
        }
      } catch (error) {
        console.error('Error checking tutorial status:', error);
      }
    };
    
    checkFirstTimeUser();
  }, []);

  // Add function to handle tutorial completion
  const handleTutorialComplete = async () => {
    try {
      await AsyncStorage.setItem('has_seen_chat_tutorial', 'true');
      setShowWelcomeTutorial(false);
    } catch (error) {
      console.error('Error saving tutorial status:', error);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Add WelcomeTutorialModal */}
      <WelcomeTutorialModal
        visible={showWelcomeTutorial}
        onClose={handleTutorialComplete}
      />
      
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
              maxToRenderPerBatch={10}
              windowSize={10}
              initialNumToRender={15}
              updateCellsBatchingPeriod={100}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
                autoscrollToTopThreshold: 10
              }}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={true}
              style={styles.flatList}
            />
            {showScrollButton && (
              <TouchableOpacity 
                style={styles.scrollToBottomButton}
                onPress={scrollToBottom}
              >
                <MaterialIcons name="keyboard-arrow-down" size={24} color="#fff" />
              </TouchableOpacity>
            )}
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
        <CommandHintsModal
          visible={showCommandModal}
          onClose={() => setShowCommandModal(false)}
          onSelectCommand={handleCommandSelect}
        />
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

      {selectedAIConfig && (
        <AIProfileModal
          visible={true}
          onClose={() => setSelectedAIConfig(null)}
          aiConfig={selectedAIConfig}
        />
      )}

      <Modal
        visible={showAnimeSearchModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowAnimeSearchModal(false);
          setIsAnimeSearchMode(false);
          setAnimeSearchText('');
          setAnimeResults([]);
        }}
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
            <TouchableOpacity 
              onPress={() => {
                setShowAnimeSearchModal(false);
                setIsAnimeSearchMode(false);
                setAnimeSearchText('');
                setAnimeResults([]);
              }} 
              style={styles.fullscreenModalClose}
            >
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

      <Modal
        visible={showMentionsModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowMentionsModal(false);
          setMentionQuery('');
        }}
      >
        <View style={styles.fullscreenModalContainer}>
          <View style={styles.fullscreenInputBar}>
            <TextInput
              style={styles.fullscreenAnimeSearchInput}
              placeholder="Search users..."
              placeholderTextColor="#999"
              value={mentionQuery}
              onChangeText={(text) => {
                setMentionQuery(text);
                fetchUserSuggestions(text);
              }}
              autoFocus
            />
            <TouchableOpacity 
              onPress={() => {
                setShowMentionsModal(false);
                setMentionQuery('');
              }} 
              style={styles.fullscreenModalClose}
            >
              <MaterialIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={userSuggestions}
            keyExtractor={(item) => item.userId}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.mentionResultItem}
                onPress={() => {
                  handleSelectMention(item);
                  setShowMentionsModal(false);
                }}
              >
                <Image 
                  source={{ uri: item.avatarUrl }} 
                  style={styles.mentionResultAvatar}
                />
                <View style={styles.mentionResultInfo}>
                  <Text style={styles.mentionResultUsername}>@{item.username}</Text>
                </View>
              </TouchableOpacity>
            )}
            style={styles.fullscreenMentionsList}
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  commandModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    width: '100%',
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: 'rgba(244, 81, 30, 0.3)',
    marginBottom: 8,
  },
  commandModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  commandModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  commandModalCloseBtn: {
    padding: 8,
    borderRadius: 20,
  },
  commandCategoriesContainer: {
    maxHeight: 450,
  },
  commandCategory: {
    paddingVertical: 8,
  },
  categoryTitle: {
    color: '#f4511e',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  commandModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  commandModalItemPressed: {
    backgroundColor: 'rgba(244, 81, 30, 0.1)',
  },
  commandIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  commandInfo: {
    flex: 1,
  },
  commandModalText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  commandModalLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 4,
  },
  aiModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(244, 81, 30, 0.3)',
    alignSelf: 'center',
  },
  aiModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(244, 81, 30, 0.1)',
  },
  aiModalTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  aiModalBody: {
    padding: 16,
  },
  aiAvatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  aiModalAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#f4511e',
  },
  aiModalBadge: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: '#f4511e',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiModalBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  aiModalInfoSection: {
    marginBottom: 20,
  },
  aiModalInfoTitle: {
    color: '#f4511e',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  aiModalInfoText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  },
  aiModalDescription: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'justify',
  },
  aiModalTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 81, 30, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  aiModalTipText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  scrollToBottomButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
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
  },
  mentionResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  mentionResultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
    backgroundColor: '#333',
  },
  mentionResultInfo: {
    flex: 1,
  },
  mentionResultUsername: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  fullscreenMentionsList: {
    flex: 1,
  },
  tutorialModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tutorialModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  tutorialIcon: {
    marginBottom: 20,
  },
  tutorialTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  tutorialDescription: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  tutorialFooter: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
  },
  tutorialDots: {
    flexDirection: 'row',
    gap: 8,
  },
  tutorialDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  tutorialDotActive: {
    backgroundColor: '#f4511e',
  },
  tutorialButton: {
    backgroundColor: '#f4511e',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
  },
  tutorialButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default memo(PublicChat); 