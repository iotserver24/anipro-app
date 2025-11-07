/**
 * Claude API Demo Component
 * 
 * This component demonstrates how to integrate the Claude API wrapper
 * into a React Native screen/component.
 * 
 * Usage: Import this component in your app to test Claude API functionality
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { claudeAPI, ClaudeMessage } from '../services/claudeApi';

export default function ClaudeAPIDemoScreen() {
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('claude-3-5-sonnet-20241022');
  
  const handleSendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMessage = message.trim();
    setMessage('');
    
    // Add user message to conversation
    const newConversation = [
      ...conversation,
      { role: 'user' as const, content: userMessage }
    ];
    setConversation(newConversation);
    setLoading(true);

    try {
      // Convert conversation to Claude format
      const claudeMessages: ClaudeMessage[] = newConversation.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Send request to Claude API
      const response = await claudeAPI.sendMessage({
        model,
        messages: claudeMessages,
        max_tokens: 1024,
        temperature: 0.7
      });

      // Add assistant response to conversation
      setConversation([
        ...newConversation,
        {
          role: 'assistant',
          content: response.content[0].text
        }
      ]);

      console.log('Usage:', response.usage);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to get response from Claude API');
      
      // Remove the user message since it failed
      setConversation(conversation);
    } finally {
      setLoading(false);
    }
  };

  const clearConversation = () => {
    setConversation([]);
  };

  const switchModel = (newModel: string) => {
    setModel(newModel);
    Alert.alert('Model Changed', `Now using ${newModel}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Claude API Demo</Text>
        <Text style={styles.subtitle}>Current Model: {model.split('-').slice(0, 3).join('-')}</Text>
      </View>

      <View style={styles.modelSelector}>
        <TouchableOpacity
          style={[
            styles.modelButton,
            model === 'claude-3-5-sonnet-20241022' && styles.modelButtonActive
          ]}
          onPress={() => switchModel('claude-3-5-sonnet-20241022')}
        >
          <Text style={styles.modelButtonText}>Sonnet 3.5</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.modelButton,
            model === 'claude-3-haiku-20240307' && styles.modelButtonActive
          ]}
          onPress={() => switchModel('claude-3-haiku-20240307')}
        >
          <Text style={styles.modelButtonText}>Haiku</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.conversationContainer}>
        {conversation.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Start a conversation with Claude!
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Type a message below and press Send
            </Text>
          </View>
        ) : (
          conversation.map((msg, index) => (
            <View
              key={index}
              style={[
                styles.messageContainer,
                msg.role === 'user' ? styles.userMessage : styles.assistantMessage
              ]}
            >
              <Text style={styles.roleLabel}>
                {msg.role === 'user' ? '👤 You' : '🤖 Claude'}
              </Text>
              <Text style={styles.messageText}>{msg.content}</Text>
            </View>
          ))
        )}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#6366f1" />
            <Text style={styles.loadingText}>Claude is thinking...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Type your message..."
          placeholderTextColor="#999"
          multiline
          maxLength={1000}
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.sendButton, loading && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={loading || !message.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>

      {conversation.length > 0 && (
        <TouchableOpacity style={styles.clearButton} onPress={clearConversation}>
          <Text style={styles.clearButtonText}>Clear Conversation</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
  },
  modelSelector: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#1a1a1a',
    gap: 10,
  },
  modelButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    alignItems: 'center',
  },
  modelButtonActive: {
    backgroundColor: '#6366f1',
  },
  modelButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  conversationContainer: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
  },
  messageContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
  },
  userMessage: {
    backgroundColor: '#2a2a2a',
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  assistantMessage: {
    backgroundColor: '#1e3a8a',
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  loadingText: {
    color: '#999',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  clearButton: {
    margin: 16,
    padding: 12,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
