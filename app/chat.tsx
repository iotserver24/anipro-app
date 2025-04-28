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
import PublicChatScreen from '../screens/PublicChatScreen';

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

export default PublicChatScreen;

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