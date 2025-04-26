import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import useCharacterStore from '../stores/characterStore';
import { APP_CONFIG } from '../constants/appConfig';
import * as ImagePicker from 'expo-image-picker';

interface StoreCharacter {
  id: string;
  name: string;
  anime: string;
  avatarUrl: string;
  description: string;
  chatCount: number;
  version: string;
  primaryColor?: string;
  secondaryColor?: string;
  systemPrompt: string;
  greeting: string;
  model: string;
  features: string[];
  personalityTags: string[];
  backgroundUrl?: string;
}

interface CharacterRequest {
  name: string;
  anime: string;
  description: string;
  requestedBy: string;
  email: string;
  systemPrompt?: string;
  avatarUrl?: string;
  backgroundUrl?: string;
}

export default function CharacterStore() {
  const [characters, setCharacters] = useState<StoreCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { startChat } = useCharacterStore();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState<CharacterRequest>({
    name: '',
    anime: '',
    description: '',
    requestedBy: '',
    email: '',
    systemPrompt: '',
    avatarUrl: '',
    backgroundUrl: '',
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);

  const fetchCharacters = async () => {
    try {
      const response = await fetch(`${APP_CONFIG.API_BASE_URL}/characters`);
      const data = await response.json();
      setCharacters(data);
    } catch (error) {
      console.error('Error fetching characters:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCharacters();
  };

  useEffect(() => {
    fetchCharacters();
  }, []);

  const handleCharacterSelect = async (character: StoreCharacter) => {
    try {
      // Start a new chat session with the character
      await startChat(character.id);

      // Navigate to chat
      router.push({
        pathname: '/chat',
        params: { characterId: character.id }
      });
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Error', 'Failed to start chat. Please try again.');
    }
  };

  const handleRequestSubmit = async () => {
    // Validate form
    if (!requestForm.name || !requestForm.anime || !requestForm.description || !requestForm.email) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch(`${APP_CONFIG.API_BASE_URL}/character-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestForm),
      });

      if (!response.ok) {
        throw new Error('Failed to submit request');
      }

      Alert.alert(
        'Success',
        'Your character request has been submitted! We will review it soon.',
        [{ text: 'OK', onPress: () => setShowRequestModal(false) }]
      );

      // Reset form
      setRequestForm({
        name: '',
        anime: '',
        description: '',
        requestedBy: '',
        email: '',
        systemPrompt: '',
        avatarUrl: '',
        backgroundUrl: '',
      });
    } catch (error) {
      console.error('Error submitting character request:', error);
      Alert.alert('Error', 'Failed to submit request. Please try again later.');
    }
  };

  const renderAvatar = (character: StoreCharacter) => {
    if (character.avatarUrl) {
      return (
        <Image
          source={{ uri: character.avatarUrl }}
          style={styles.avatar}
          onError={() => console.log(`Failed to load avatar for ${character.name}`)}
        />
      );
    }
    return (
      <View style={[styles.avatar, { backgroundColor: character.primaryColor || '#f4511e', justifyContent: 'center', alignItems: 'center' }]}>
        <FontAwesome name="user" size={30} color="#fff" />
      </View>
    );
  };

  const renderCharacterCard = ({ item }: { item: StoreCharacter }) => (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: item.primaryColor || '#f4511e', borderLeftWidth: 4 }]}
      onPress={() => handleCharacterSelect(item)}
    >
      {renderAvatar(item)}
      <View style={styles.cardContent}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.anime}>{item.anime}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {item.description || `Chat with ${item.name} from ${item.anime}!`}
        </Text>
        <Text style={styles.stats}>
          <MaterialIcons name="chat" size={12} color="#666" /> {item.chatCount || 0} chats • v{item.version}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.chatButton, { backgroundColor: item.primaryColor || '#f4511e' }]}
        onPress={() => handleCharacterSelect(item)}
      >
        <MaterialIcons name="chat" size={24} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const uploadImage = async (imageUri: string): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('reqtype', 'fileupload');
      formData.append('fileToUpload', {
        uri: imageUri,
        name: 'image.jpg',
        type: 'image/jpeg'
      } as any);

      const response = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: formData,
      });

      const url = await response.text();
      if (url.startsWith('http')) {
        return url;
      }
      throw new Error('Invalid response from Catbox');
    } catch (error) {
      console.error('Error uploading to Catbox:', error);
      throw error;
    }
  };

  const pickAndUploadImage = async (type: 'avatar' | 'background') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: type === 'avatar',
        aspect: type === 'avatar' ? [1, 1] : undefined,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        if (type === 'avatar') {
          setUploadingAvatar(true);
        } else {
          setUploadingBackground(true);
        }

        const url = await uploadImage(result.assets[0].uri);
        
        setRequestForm(prev => ({
          ...prev,
          [type === 'avatar' ? 'avatarUrl' : 'backgroundUrl']: url
        }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploadingAvatar(false);
      setUploadingBackground(false);
    }
  };

  const renderRequestModal = () => (
    <Modal
      visible={showRequestModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowRequestModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Request New Character</Text>
          <ScrollView>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Character Name *</Text>
              <TextInput
                style={styles.input}
                value={requestForm.name}
                onChangeText={(text) => setRequestForm({ ...requestForm, name: text })}
                placeholder="Enter character name"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Anime *</Text>
              <TextInput
                style={styles.input}
                value={requestForm.anime}
                onChangeText={(text) => setRequestForm({ ...requestForm, anime: text })}
                placeholder="Enter anime name"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={requestForm.description}
                onChangeText={(text) => setRequestForm({ ...requestForm, description: text })}
                placeholder="Describe the character's personality and why you want them added"
                placeholderTextColor="#666"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>System Prompt (Optional)</Text>
              <Text style={styles.helpText}>Customize how the character should behave and respond</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={requestForm.systemPrompt}
                onChangeText={(text) => setRequestForm({ ...requestForm, systemPrompt: text })}
                placeholder="Enter a custom system prompt for the character..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Character Images (Optional)</Text>
              <View style={styles.imageButtons}>
                <TouchableOpacity
                  style={[styles.imageButton, requestForm.avatarUrl && styles.imageButtonSuccess]}
                  onPress={() => pickAndUploadImage('avatar')}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons 
                        name={requestForm.avatarUrl ? "check" : "person"} 
                        size={24} 
                        color="#fff" 
                      />
                      <Text style={styles.imageButtonText}>
                        {requestForm.avatarUrl ? 'Avatar Added' : 'Add Avatar'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.imageButton, requestForm.backgroundUrl && styles.imageButtonSuccess]}
                  onPress={() => pickAndUploadImage('background')}
                  disabled={uploadingBackground}
                >
                  {uploadingBackground ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons 
                        name={requestForm.backgroundUrl ? "check" : "image"} 
                        size={24} 
                        color="#fff" 
                      />
                      <Text style={styles.imageButtonText}>
                        {requestForm.backgroundUrl ? 'Background Added' : 'Add Background'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                style={styles.input}
                value={requestForm.requestedBy}
                onChangeText={(text) => setRequestForm({ ...requestForm, requestedBy: text })}
                placeholder="Enter your name (optional)"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={requestForm.email}
                onChangeText={(text) => setRequestForm({ ...requestForm, email: text })}
                placeholder="Enter your email"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowRequestModal(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.submitButton]}
              onPress={handleRequestSubmit}
            >
              <Text style={styles.buttonText}>Submit Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f4511e" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Character Store',
          headerStyle: {
            backgroundColor: '#f4511e',
          },
          headerTintColor: '#fff',
          headerLeft: () => (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              style={styles.requestButton}
              onPress={() => setShowRequestModal(true)}
            >
              <MaterialIcons name="person-add" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />
      {renderRequestModal()}
      <FlatList
        data={characters}
        renderItem={renderCharacterCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#f4511e']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome name="inbox" size={48} color="#666" />
            <Text style={styles.emptyText}>No characters available</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#000',
  },
  anime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#444',
    marginBottom: 8,
  },
  stats: {
    fontSize: 12,
    color: '#666',
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f4511e',
  },
  backButton: {
    marginLeft: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
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
  submitButton: {
    backgroundColor: '#f4511e',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  requestButton: {
    marginRight: 16,
  },
  helpText: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2C2C2C',
    padding: 12,
    borderRadius: 8,
  },
  imageButtonSuccess: {
    backgroundColor: '#4CAF50',
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 14,
  },
}); 