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
  Alert
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCharacterById, Character } from '../constants/characters';

// Message type definition
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  characterId?: string;
}

// Text formatting types
interface TextSegment {
  text: string;
  style?: any;
}

// OpenRouter API configuration
const OPENROUTER_API_KEY = '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export default function ChatScreen() {
  const { characterId } = useLocalSearchParams();
  const [character, setCharacter] = useState<Character | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Load character
  useEffect(() => {
    const selectedCharacter = getCharacterById(characterId as string);
    if (!selectedCharacter) {
      Alert.alert('Error', 'Character not found');
      router.back();
      return;
    }
    setCharacter(selectedCharacter);
  }, [characterId]);

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

  const sendMessage = async () => {
    if (!inputText.trim() || !character) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://github.com/R3AP3R-GRIM/anipro-app',
          'X-Title': 'AniPro Chat'
        },
        body: JSON.stringify({
          model: character.model,
          messages: [
            { role: 'system', content: character.systemPrompt },
            ...messages.map(msg => ({
              role: msg.sender === 'user' ? 'user' : 'assistant',
              content: msg.text
            })),
            { role: 'user', content: userMessage.text }
          ],
          temperature: 0.7,
          max_tokens: 150
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
            source={character.avatar}
            style={styles.avatar}
          />
        )}
        <View style={[
          styles.messageBubble,
          isAI ? [styles.aiMessageBubble, { backgroundColor: character?.secondaryColor }] : styles.userMessageBubble,
        ]}>
          {renderFormattedText(message.text)}
          <Text style={styles.timestamp}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

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
            <TouchableOpacity
              onPress={clearChat}
              style={styles.clearButton}
            >
              <MaterialIcons name="delete-outline" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />
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
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: character.primaryColor },
              !inputText.trim() && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <MaterialIcons 
              name="send" 
              size={24} 
              color={inputText.trim() ? '#fff' : '#666'} 
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
  // New text formatting styles
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
  clearButton: {
    marginRight: 8,
    padding: 8,
  },
}); 