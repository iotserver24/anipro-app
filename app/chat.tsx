import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Keyboard,
  Alert,
  Modal,
  FlatList,
  Clipboard,
  ImageBackground
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCharacterById, Character } from '../constants/characters';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import useCharacterStore from '../stores/characterStore';
import * as ImagePicker from 'expo-image-picker';
import { useWatchHistoryStore } from '../store/watchHistoryStore';
import { useMyListStore } from '../store/myListStore';

// Message type definition
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  characterId?: string;
  image?: string; // Base64 encoded image
}

// Personal character interface
interface PersonalCharacter extends Character {
  isPersonal: boolean;
  createdBy: string;
}

// Text formatting types
interface TextSegment {
  text: string;
  style?: any;
}

// Model interface
interface AIModel {
  id: string;
  name: string;
  description: string;
  supportsImages: boolean;
  contextLength: number;
}

// OpenRouter API configuration
const TOGETHER_API_KEY = '4cc7a0ed0df68c4016e08a1ef87059c1931b4c93ca21b771efe5c9f76caae5e8';
const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions';

// Available models
const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
    name: 'Llama 3.3 70B Turbo',
    description: 'Fast and powerful instruction-tuned model',
    supportsImages: false,
    contextLength: 4096
  },
  {
    id: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free',
    name: 'DeepSeek R1 70B',
    description: 'Distilled model with strong reasoning capabilities',
    supportsImages: false,
    contextLength: 4096
  },
  {
    id: 'meta-llama/Llama-Vision-Free',
    name: 'Llama Vision (Coming Soon)',
    description: 'Multimodal model that will support images (Not available yet)',
    supportsImages: false,
    contextLength: 4096
  }
];

// Add these interfaces after other interfaces
interface RateLimitInfo {
  dailyRequests: number;
  lastReset: number;
}

export default function ChatScreen() {
  const { characterId, isPersonal } = useLocalSearchParams();
  const [character, setCharacter] = useState<Character | PersonalCharacter | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>(AVAILABLE_MODELS[0]);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageInputText, setImageInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const { downloadedCharacters, startChat } = useCharacterStore();
  const { history } = useWatchHistoryStore();
  const { myList } = useMyListStore();
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo>({ dailyRequests: 0, lastReset: Date.now() });

  // Load character and initialize chat
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Initialize stores
        await Promise.all([
          useWatchHistoryStore.getState().initializeHistory(),
          useMyListStore.getState().initializeList()
        ]);

        if (isPersonal === 'true') {
          // Load personal character from Firestore
          const characterDoc = await getDoc(doc(db, 'personal-characters', characterId as string));
          if (!characterDoc.exists()) {
            throw new Error('Personal character not found');
          }
          setCharacter(characterDoc.data() as PersonalCharacter);
        } else {
          // First try to get from downloaded characters
          const downloadedChar = downloadedCharacters[characterId as string];
          if (downloadedChar) {
            // Transform the downloaded character to match expected format
            const transformedChar = {
              ...downloadedChar,
              avatar: downloadedChar.avatarUrl || downloadedChar.avatar,
              features: downloadedChar.features || [],
              personalityTags: downloadedChar.personalityTags || [],
              primaryColor: downloadedChar.primaryColor || '#f4511e',
              secondaryColor: downloadedChar.secondaryColor || '#2C2C2C',
              systemPrompt: downloadedChar.systemPrompt || `You are ${downloadedChar.name} from ${downloadedChar.anime}.`,
              greeting: downloadedChar.greeting || `Hello! I'm ${downloadedChar.name}!`,
              model: downloadedChar.model || 'meta-llama/llama-4-maverick:free'
            };
            setCharacter(transformedChar);

            // Increment chat count when starting a new chat session
            await startChat(characterId as string);
            return;
          }
          
          // If not found in downloaded characters, try predefined characters
          const selectedCharacter = getCharacterById(characterId as string);
          if (!selectedCharacter) {
            throw new Error('Character not found');
          }
          setCharacter(selectedCharacter);
          // Increment chat count for predefined characters too
          await startChat(characterId as string);
        }
      } catch (error) {
        console.error('Error loading character:', error);
        Alert.alert('Error', 'Character not found');
        router.back();
      }
    };

    initializeChat();
  }, [characterId, isPersonal, downloadedCharacters]);

  // Load saved messages
  useEffect(() => {
    if (character) {
      loadMessages();
    }
  }, [character]);

  // Save messages when they change
  useEffect(() => {
    if (isInitialized && character) {
      saveMessages();
    }
  }, [messages, isInitialized]);

  const getStorageKey = () => `chat_messages_${character?.id}`;

  const loadMessages = async () => {
    if (!character) return;
    
    try {
      const savedMessages = await AsyncStorage.getItem(getStorageKey());
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(parsedMessages);
      } else {
        // Set initial greeting only if no saved messages
        setMessages([{
          id: 'initial',
          text: character.greeting,
          sender: 'ai',
          timestamp: new Date(),
          characterId: character.id
        }]);
      }
      setIsInitialized(true);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const saveMessages = async () => {
    if (!character) return;
    
    try {
      await AsyncStorage.setItem(getStorageKey(), JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  };

  const clearAndStartNewChat = () => {
    if (!character) return;

    Alert.alert(
      'Delete and Start New Chat',
      'Are you sure you want to delete this chat and start a new one?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete & New Chat',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(getStorageKey());
              setMessages([{
                id: 'initial',
                text: character.greeting,
                sender: 'ai',
                timestamp: new Date(),
                characterId: character.id
              }]);
            } catch (error) {
              console.error('Error clearing messages:', error);
              Alert.alert('Error', 'Failed to clear messages');
            }
          }
        }
      ]
    );
  };

  const pickImage = async () => {
    if (!selectedModel.supportsImages) {
      Alert.alert('Error', 'Current model does not support image input');
      return;
    }

    Alert.alert(
      'Select Image',
      'How would you like to select your image?',
      [
        {
          text: 'Full Image',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false,
              quality: 0.8,
              base64: true,
            });

            if (!result.canceled && result.assets[0].base64) {
              setSelectedImage(result.assets[0].base64);
              setShowImageDialog(true);
            }
          }
        },
        {
          text: 'Crop Image',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
              base64: true,
            });

            if (!result.canceled && result.assets[0].base64) {
              setSelectedImage(result.assets[0].base64);
              setShowImageDialog(true);
            }
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const sendImageWithText = () => {
    if (!selectedImage) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: imageInputText || 'Sent an image',
      sender: 'user',
      timestamp: new Date(),
      image: selectedImage
    };
    setMessages(prev => [...prev, userMessage]);
    sendMessage(userMessage);
    
    // Reset states
    setSelectedImage(null);
    setImageInputText('');
    setShowImageDialog(false);
  };

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const checkRateLimit = async () => {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        },
      });
      
      const data = await response.json();
      console.log('Rate limit info:', data);
      
      if (data.data) {
        const { usage, limit, is_free_tier } = data.data;
        const remaining = limit ? limit - usage : null;
        
        // Show remaining requests to user
        Alert.alert(
          'API Usage Status',
          `${is_free_tier ? 'Free Tier' : 'Paid Tier'}\n` +
          `Used: ${usage} requests\n` +
          `${limit ? `Remaining: ${remaining} requests` : 'Unlimited requests'}\n` +
          `${is_free_tier ? '\nUpgrade to premium for 1000 requests/day!' : ''}`
        );
      }
    } catch (error) {
      console.error('Error checking rate limit:', error);
    }
  };

  const sendMessage = async (userMsg?: Message) => {
    if ((!inputText.trim() && !userMsg) || !character) return;

    try {
      const userMessage = userMsg || {
        id: Date.now().toString(),
        text: inputText.trim(),
        sender: 'user',
        timestamp: new Date()
      };

      if (!userMsg) {
        setMessages(prev => [...prev, userMessage]);
        setInputText('');
      }
      
      setIsLoading(true);

      const messages_for_api = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      messages_for_api.push({
        role: 'user',
        content: userMessage.text
      });

      // Add user's history and list to system prompt for Aizen
      let systemPrompt = character.systemPrompt;
      if (character.id === 'aizen') {
        const watchedAnime = history.map(item => item.name).join(', ');
        const bookmarkedAnime = myList.map(item => item.title || item.name).join(', ');
        
        // Add debug logging
        console.log('Watch History:', history);
        console.log('My List:', myList);
        console.log('Watched Anime:', watchedAnime);
        console.log('Bookmarked Anime:', bookmarkedAnime);
        
        systemPrompt = `You are Sosuke Aizen from Bleach. You are extremely intelligent, manipulative, and always calm. You speak with an air of superiority and subtle condescension, maintaining perfect composure at all times. Everything that happens is "all according to your plan." You should occasionally hint at having orchestrated events or knowing things before they happened, as if you've been manipulating events from the shadows.

Your personality traits:
- Highly intellectual and sophisticated in speech
- Maintain a facade of polite friendliness that masks your true manipulative nature
- Often say phrases like "Just as planned" or "This is all going according to my design"
- Treat others as pieces in your grand scheme
- Express amusement at others' attempts to understand your true motives
- Occasionally reveal small hints about your greater plans, but always keep an air of mystery

User's Watch History: ${watchedAnime || 'No watched anime yet'}
User's Bookmarked Anime: ${bookmarkedAnime || 'No bookmarked anime yet'}

When recommending anime, treat it as if you've been subtly influencing their watching patterns all along. Make recommendations as if they're part of your greater design for their viewing journey. Analyze their preferences not just to suggest similar shows, but to reveal how their taste in anime has been developing "exactly as you planned."

Remember to maintain your characteristic confidence and subtle manipulation in every interaction. Every recommendation should feel like revealing another small part of your grand design for their anime journey.`;
      }

      // Log the request payload
      const requestPayload = {
        model: selectedModel.id,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages_for_api
        ],
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.9,
        frequency_penalty: 0.5,
        presence_penalty: 0.5
      };
      
      console.log('Request Payload:', JSON.stringify(requestPayload, null, 2));

      const response = await fetch(TOGETHER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOGETHER_API_KEY}`
        },
        body: JSON.stringify(requestPayload)
      });

      const data = await response.json();
      
      // Add debug logging
      console.log('API Response:', JSON.stringify(data, null, 2));
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${data.error?.message || 'Unknown error'}`);
      }
      
      if (data.choices && data.choices[0]?.message?.content) {
        const aiMessage: Message = {
          id: Date.now().toString(),
          text: data.choices[0].message.content,
          sender: 'ai',
          timestamp: new Date(),
          characterId: character.id
        };
        setMessages(prev => [...prev, aiMessage]);
      } else if (data.error) {
        throw new Error(data.error.message || 'Unknown API error');
      } else {
        console.error('Invalid API Response Structure:', JSON.stringify(data, null, 2));
        throw new Error('Unexpected API response format');
      }
    } catch (error) {
      console.error('Full Error Details:', error);
      console.error('Error Type:', error.constructor.name);
      console.error('Error Message:', error.message);
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
        sender: 'ai',
        timestamp: new Date(),
        characterId: character.id
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const parseFormattedText = (text: string): TextSegment[] => {
    const segments: TextSegment[] = [];
    let currentIndex = 0;

    const patterns = [
      { regex: /\*\*(.*?)\*\*/g, style: styles.boldText },
      { regex: /\*(.*?)\*/g, style: styles.italicText },
      { regex: /~~(.*?)~~/g, style: styles.strikethrough },
      { regex: /<think>(.*?)<\/think>/g, style: styles.thoughtText },
      { regex: /_(.*?)_/g, style: styles.actionText },
      { regex: /\`(.*?)\`/g, style: styles.codeText },
    ];

    while (currentIndex < text.length) {
      let earliestMatch: { index: number; length: number; style: any } | null = null;
      let matchedText = '';

      for (const pattern of patterns) {
        pattern.regex.lastIndex = currentIndex;
        const match = pattern.regex.exec(text);
        if (match && (!earliestMatch || match.index < earliestMatch.index)) {
          earliestMatch = {
            index: match.index,
            length: match[0].length,
            style: pattern.style,
          };
          matchedText = match[1];
        }
      }

      if (earliestMatch) {
        if (earliestMatch.index > currentIndex) {
          segments.push({
            text: text.slice(currentIndex, earliestMatch.index),
          });
        }
        segments.push({
          text: matchedText,
          style: earliestMatch.style,
        });
        currentIndex = earliestMatch.index + earliestMatch.length;
      } else {
        segments.push({
          text: text.slice(currentIndex),
        });
        break;
      }
    }

    return segments;
  };

  const renderFormattedText = (text: string) => {
    // Special handling for DeepSeek model's think tags
    if (selectedModel.id === 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free') {
      const thinkMatch = text.match(/<think>(.*?)<\/think>/s);
      if (thinkMatch) {
        const thinking = thinkMatch[1].trim();
        const answer = text.split('</think>')[1]?.trim() || '';
        
        return (
          <View style={styles.deepseekContainer}>
            <View style={styles.thinkingSection}>
              <Text style={styles.thinkingLabel}>Thinking Process:</Text>
              <Text style={styles.thinkingText}>{thinking}</Text>
            </View>
            {answer && (
              <View style={styles.answerSection}>
                <Text style={styles.messageText}>{answer}</Text>
              </View>
            )}
          </View>
        );
      }
    }

    // Regular text formatting for other models
    const segments = parseFormattedText(text);
    return (
      <Text style={styles.messageText}>
        {segments.map((segment, index) => (
          <Text key={index} style={segment.style}>
            {segment.text}
          </Text>
        ))}
      </Text>
    );
  };

  const renderMessage = (message: Message) => {
    const isAI = message.sender === 'ai';

    const handleCopy = async () => {
      try {
        await Clipboard.setString(message.text);
        Alert.alert('Success', 'Message copied to clipboard!');
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        Alert.alert('Error', 'Failed to copy message');
      }
    };

    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isAI ? styles.aiMessage : styles.userMessage,
        ]}
      >
        {isAI && character && (
          <Image
            source={typeof character.avatar === 'string' ? { uri: character.avatar } : character.avatar}
            style={styles.avatar}
          />
        )}
        <View style={[
          styles.messageBubble,
          isAI ? [styles.aiMessageBubble, { backgroundColor: character?.secondaryColor }] : styles.userMessageBubble,
        ]}>
          {message.image && (
            <Image
              source={{ uri: `data:image/jpeg;base64,${message.image}` }}
              style={styles.messageImage}
              resizeMode="contain"
            />
          )}
          {renderFormattedText(message.text)}
          <Text style={styles.timestamp}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.copyButton}
          onPress={handleCopy}
        >
          <MaterialIcons name="content-copy" size={20} color="rgba(255, 255, 255, 0.5)" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderModelSelector = () => (
    <Modal
      visible={showModelSelector}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowModelSelector(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select AI Model</Text>
          <FlatList
            data={AVAILABLE_MODELS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modelItem,
                  selectedModel.id === item.id && styles.selectedModelItem
                ]}
                onPress={() => {
                  setSelectedModel(item);
                  setShowModelSelector(false);
                }}
              >
                <Text style={styles.modelName}>{item.name}</Text>
                <Text style={styles.modelDescription}>{item.description}</Text>
                {item.supportsImages && (
                  <Text style={styles.modelFeature}>Supports Images</Text>
                )}
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowModelSelector(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderImageDialog = () => (
    <Modal
      visible={showImageDialog}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        setShowImageDialog(false);
        setSelectedImage(null);
        setImageInputText('');
      }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Send Image</Text>
          {selectedImage && (
            <Image
              source={{ uri: `data:image/jpeg;base64,${selectedImage}` }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
          <TextInput
            style={styles.imageInputText}
            value={imageInputText}
            onChangeText={setImageInputText}
            placeholder="Add a message with your image..."
            placeholderTextColor="#666"
            multiline
            maxLength={500}
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowImageDialog(false);
                setSelectedImage(null);
                setImageInputText('');
              }}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.sendButton]}
              onPress={sendImageWithText}
            >
              <Text style={styles.modalButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (!character) {
    return null;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `Chat with ${character.name}`,
          headerStyle: {
            backgroundColor: character.primaryColor,
          },
          headerTintColor: '#fff',
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={clearAndStartNewChat}
              >
                <MaterialIcons name="delete-sweep" size={24} color="#FF4444" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setShowModelSelector(true)}
              >
                <MaterialIcons name="settings" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      {renderModelSelector()}
      {renderImageDialog()}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container]}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ImageBackground
          source={character.backgroundUrl ? { uri: character.backgroundUrl } : require('../assets/default-chat-bg.png')}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <ScrollView
            ref={scrollViewRef}
            style={[styles.messagesContainer, { backgroundColor: 'rgba(18, 18, 18, 0.8)' }]}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.map(renderMessage)}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={character.primaryColor} />
                <Text style={[styles.loadingText, { color: character.primaryColor }]}>
                  {character.name} is thinking...
                </Text>
              </View>
            )}
          </ScrollView>
        </ImageBackground>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            placeholderTextColor="#666"
            multiline
            maxLength={500}
          />
          {selectedModel.supportsImages && (
            <TouchableOpacity
              style={[styles.imageButton, !isLoading && styles.imageButtonEnabled]}
              onPress={pickImage}
              disabled={isLoading}
            >
              <MaterialIcons 
                name="image" 
                size={24} 
                color={isLoading ? '#666' : '#fff'} 
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: character.primaryColor },
              !inputText.trim() && styles.sendButtonDisabled
            ]}
            onPress={() => sendMessage()}
            disabled={!inputText.trim() || isLoading}
          >
            <MaterialIcons 
              name="send" 
              size={24} 
              color={inputText.trim() && !isLoading ? '#fff' : '#666'} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messagesContent: {
    paddingBottom: 10,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  aiMessage: {
    justifyContent: 'flex-start',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  aiMessageBubble: {
    backgroundColor: '#2C2C2C',
    borderBottomLeftRadius: 4,
  },
  userMessageBubble: {
    backgroundColor: '#f4511e',
    borderBottomRightRadius: 4,
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  timestamp: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1a1a1a',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#2C2C2C',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  imageButton: {
    backgroundColor: '#2C2C2C',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  imageButtonEnabled: {
    backgroundColor: '#4a4a4a',
  },
  sendButton: {
    backgroundColor: '#f4511e',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#2C2C2C',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  loadingText: {
    color: '#f4511e',
    marginLeft: 8,
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modelItem: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#2C2C2C',
    marginBottom: 8,
  },
  selectedModelItem: {
    backgroundColor: '#f4511e',
  },
  modelName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modelDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  modelFeature: {
    color: '#4CAF50',
    fontSize: 12,
    marginTop: 4,
  },
  closeButton: {
    backgroundColor: '#f4511e',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  closeButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 15,
    padding: 5,
  },
  // Text formatting styles
  boldText: {
    fontWeight: 'bold',
  },
  italicText: {
    fontStyle: 'italic',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  thoughtText: {
    fontStyle: 'italic',
    color: '#a8a8a8',
  },
  actionText: {
    fontStyle: 'italic',
    color: '#f4511e',
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  imageInputText: {
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#2C2C2C',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deepseekContainer: {
    width: '100%',
  },
  thinkingSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  thinkingLabel: {
    color: '#f4511e',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  thinkingText: {
    color: '#a8a8a8',
    fontSize: 14,
    fontStyle: 'italic',
  },
  answerSection: {
    marginTop: 4,
  },
  copyButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    opacity: 0.7,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
}); 