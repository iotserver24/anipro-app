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
  FlatList
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCharacterById, Character } from '../constants/characters';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import useCharacterStore from '../stores/characterStore';
import * as ImagePicker from 'expo-image-picker';

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

// Available models
const AVAILABLE_MODELS: AIModel[] = [
  // Massive Context Models (1M+ tokens)
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash',
    description: 'Fastest multimodal model with massive context',
    supportsImages: true,
    contextLength: 1048576
  },
  {
    id: 'google/gemini-2.5-pro-exp-03-25:free',
    name: 'Gemini 2.5 Pro',
    description: 'Advanced multimodal model with extensive reasoning',
    supportsImages: true,
    contextLength: 1000000
  },
  {
    id: 'google/gemini-flash-1.5-8b-exp:free',
    name: 'Gemini Flash 1.5',
    description: 'Fast and efficient multimodal model',
    supportsImages: true,
    contextLength: 1000000
  },

  // Very Large Context (200K-1M tokens)
  {
    id: 'meta-llama/llama-4-scout:free',
    name: 'Llama 4 Scout',
    description: 'Advanced multimodal model with massive context',
    supportsImages: true,
    contextLength: 512000
  },
  {
    id: 'meta-llama/llama-4-maverick:free',
    name: 'Llama 4 Maverick',
    description: 'High-capacity multimodal model with large context',
    supportsImages: true,
    contextLength: 256000
  },

  // Large Context (128K-200K tokens)
  {
    id: 'deepseek/deepseek-v3-base:free',
    name: 'DeepSeek V3 Base',
    description: 'Advanced base model with large context',
    supportsImages: false,
    contextLength: 163840
  },
  {
    id: 'microsoft/mai-ds-r1:free',
    name: 'Microsoft MAI DS R1',
    description: 'Specialized for data science tasks',
    supportsImages: false,
    contextLength: 163840
  },
  {
    id: 'deepseek/deepseek-chat-v3-0324:free',
    name: 'DeepSeek Chat V3',
    description: 'Latest chat-optimized model',
    supportsImages: false,
    contextLength: 163840
  },
  {
    id: 'deepseek/deepseek-r1:free',
    name: 'DeepSeek R1',
    description: 'Advanced reasoning model',
    supportsImages: false,
    contextLength: 163840
  },
  {
    id: 'deepseek/deepseek-chat:free',
    name: 'DeepSeek V3',
    description: 'General-purpose chat model',
    supportsImages: false,
    contextLength: 163840
  },

  // Medium-Large Context (96K-128K tokens)
  {
    id: 'mistralai/mistral-nemo:free',
    name: 'Mistral Nemo',
    description: 'Advanced Mistral model',
    supportsImages: false,
    contextLength: 128000
  },
  {
    id: 'meta-llama/llama-3.2-1b-instruct:free',
    name: 'Llama 3.2 1B',
    description: 'Efficient small model with large context',
    supportsImages: false,
    contextLength: 131000
  },
  {
    id: 'meta-llama/llama-3.2-11b-vision-instruct:free',
    name: 'Llama 3.2 Vision',
    description: 'Vision-language model with strong capabilities',
    supportsImages: true,
    contextLength: 131072
  },
  {
    id: 'nvidia/llama-3.1-nemotron-ultra-253b-v1:free',
    name: 'Nemotron Ultra 253B',
    description: 'NVIDIA\'s largest model',
    supportsImages: false,
    contextLength: 131072
  },
  {
    id: 'nvidia/llama-3.3-nemotron-super-49b-v1:free',
    name: 'Nemotron Super 49B',
    description: 'Balanced large model',
    supportsImages: false,
    contextLength: 131072
  },
  {
    id: 'google/gemma-3-12b-it:free',
    name: 'Gemma 3 12B',
    description: 'Efficient medium-sized Gemma with vision',
    supportsImages: true,
    contextLength: 131072
  },
  {
    id: 'google/gemma-3-4b-it:free',
    name: 'Gemma 3 4B',
    description: 'Compact Gemma model with vision',
    supportsImages: true,
    contextLength: 131072
  },
  {
    id: 'moonshotai/kimi-vl-a3b-thinking:free',
    name: 'Kimi VL A3B',
    description: 'Specialized vision-language model',
    supportsImages: true,
    contextLength: 131072
  },
  {
    id: 'qwen/qwen2.5-vl-72b-instruct:free',
    name: 'Qwen 2.5 VL 72B',
    description: 'Large multimodal Qwen model',
    supportsImages: true,
    contextLength: 131072
  },

  // Medium Context (64K-96K tokens)
  {
    id: 'mistralai/mistral-small-3.1-24b-instruct:free',
    name: 'Mistral Small 3.1',
    description: 'Efficient multimodal model with 24B parameters',
    supportsImages: true,
    contextLength: 96000
  },
  {
    id: 'google/gemma-3-27b-it:free',
    name: 'Gemma 3 27B',
    description: 'Largest Gemma model with vision support',
    supportsImages: true,
    contextLength: 96000
  },
  {
    id: 'agentica-org/deepcoder-14b-preview:free',
    name: 'Deepcoder 14B',
    description: 'Specialized for coding tasks',
    supportsImages: false,
    contextLength: 96000
  },
  {
    id: 'qwen/qwen-2.5-vl-7b-instruct:free',
    name: 'Qwen 2.5 VL 7B',
    description: 'Efficient vision-language model',
    supportsImages: true,
    contextLength: 64000
  },
  {
    id: 'qwen/qwen2.5-vl-3b-instruct:free',
    name: 'Qwen 2.5 VL 3B',
    description: 'Compact vision-language model',
    supportsImages: true,
    contextLength: 64000
  },

  // Standard Context (32K-64K tokens)
  {
    id: 'google/learnlm-1.5-pro-experimental:free',
    name: 'LearnLM 1.5 Pro',
    description: 'Experimental model with vision capabilities',
    supportsImages: true,
    contextLength: 40960
  },
  {
    id: 'google/gemma-3-1b-it:free',
    name: 'Gemma 3 1B',
    description: 'Smallest Gemma model with vision support',
    supportsImages: true,
    contextLength: 32768
  },
  {
    id: 'bytedance-research/ui-tars-72b:free',
    name: 'UI-TARS 72B',
    description: 'Advanced vision-language model for UI understanding',
    supportsImages: true,
    contextLength: 32768
  },

  // Small Context Models
  {
    id: 'qwen/qwen2.5-vl-32b-instruct:free',
    name: 'Qwen 2.5 VL 32B',
    description: 'Vision-language model',
    supportsImages: true,
    contextLength: 8192
  },
  {
    id: 'allenai/molmo-7b-d:free',
    name: 'Molmo 7B D',
    description: 'Vision-capable research model',
    supportsImages: true,
    contextLength: 4096
  }
];

// OpenRouter API configuration
const OPENROUTER_API_KEY = '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

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
  const { downloadedCharacters } = useCharacterStore();

  // Load character
  useEffect(() => {
    const loadCharacter = async () => {
      try {
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
              avatar: downloadedChar.avatarUrl || downloadedChar.avatar, // Handle both formats
              features: downloadedChar.features || [],
              personalityTags: downloadedChar.personalityTags || [],
              primaryColor: downloadedChar.primaryColor || '#f4511e',
              secondaryColor: downloadedChar.secondaryColor || '#2C2C2C',
              systemPrompt: downloadedChar.systemPrompt || `You are ${downloadedChar.name} from ${downloadedChar.anime}.`,
              greeting: downloadedChar.greeting || `Hello! I'm ${downloadedChar.name}!`,
              model: downloadedChar.model || 'meta-llama/llama-4-maverick:free'
            };
            setCharacter(transformedChar);
            return;
          }
          
          // If not found in downloaded characters, try predefined characters
          const selectedCharacter = getCharacterById(characterId as string);
          if (!selectedCharacter) {
            throw new Error('Character not found');
          }
          setCharacter(selectedCharacter);
        }
      } catch (error) {
        console.error('Error loading character:', error);
        Alert.alert('Error', 'Character not found');
        router.back();
      }
    };

    loadCharacter();
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

  const clearChat = () => {
    if (!character) return;

    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages? This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Clear',
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

  const sendMessage = async (userMsg?: Message) => {
    if ((!inputText.trim() && !userMsg) || !character) return;

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

    try {
      const messages_for_api = messages.map(msg => {
        if (msg.image) {
          return {
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: [
              { type: 'text', text: msg.text },
              { 
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${msg.image}` }
              }
            ]
          };
        }
        return {
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        };
      });

      if (userMessage.image) {
        messages_for_api.push({
          role: 'user',
          content: [
            { type: 'text', text: 'Please describe this image in detail:' },
            { 
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${userMessage.image}` }
            }
          ]
        });
      } else {
        messages_for_api.push({
          role: 'user',
          content: userMessage.text
        });
      }

      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://github.com/R3AP3R-GRIM/anipro-app',
          'X-Title': 'AniPro Chat'
        },
        body: JSON.stringify({
          model: selectedModel.id,
          messages: [
            { role: 'system', content: character.systemPrompt },
            ...messages_for_api
          ],
          temperature: 0.8,
          max_tokens: 4096,
          top_p: 0.9,
          frequency_penalty: 0.5,
          presence_penalty: 0.5,
          stop: null
        })
      });

      const data = await response.json();
      
      if (data.choices && data.choices[0]?.message?.content) {
        const aiMessage: Message = {
          id: Date.now().toString(),
          text: data.choices[0].message.content,
          sender: 'ai',
          timestamp: new Date(),
          characterId: character.id
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error('Invalid response from API');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: "Ah, it seems I've encountered a rather troublesome situation. Perhaps we should try again?",
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
        style={[styles.container, { backgroundColor: '#121212' }]}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
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
    backgroundColor: '#121212',
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
}); 