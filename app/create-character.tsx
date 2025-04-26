import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { getCurrentUser } from '../services/userService';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';

interface PersonalCharacter {
  id: string;
  name: string;
  description: string;
  personality: string;
  avatar: string;
  primaryColor: string;
  secondaryColor: string;
  personalityTags: string[];
  features: string[];
  createdBy: string;
  isPersonal: boolean;
  model: string;
  systemPrompt: string;
  greeting: string;
}

const uploadToCatbox = async (uri: string, userHash: string): Promise<string> => {
  try {
    const formData = new FormData();
    
    // Get the file name from the URI
    const fileName = uri.split('/').pop() || 'avatar.jpg';
    
    // Create the file object exactly as specified in Catbox API
    formData.append('reqtype', 'fileupload');
    formData.append('userhash', userHash);
    formData.append('fileToUpload', {
      uri: uri,
      name: fileName,
      type: 'image/jpeg'
    } as any);

    console.log('Uploading to Catbox with formData:', {
      reqtype: 'fileupload',
      userhash: userHash,
      fileName: fileName
    });

    // Upload using the exact format from Catbox documentation
    const uploadResponse = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': '*/*',
      },
    });

    const responseText = await uploadResponse.text();
    console.log('Catbox response:', responseText);

    if (!uploadResponse.ok || !responseText.startsWith('https://')) {
      throw new Error(`Upload failed: ${responseText}`);
    }

    return responseText.trim();
  } catch (error) {
    console.error('Error uploading to Catbox:', error);
    if (error instanceof Error) {
      Alert.alert('Upload Error', `Failed to upload image: ${error.message}`);
    }
    throw error;
  }
};

// Alternative URL upload function if file upload doesn't work
const uploadToCatboxViaUrl = async (uri: string, userHash: string): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('reqtype', 'urlupload');
    formData.append('userhash', userHash);
    formData.append('url', uri);

    const uploadResponse = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData,
    });

    const responseText = await uploadResponse.text();
    console.log('Catbox URL upload response:', responseText);

    if (!uploadResponse.ok || !responseText.startsWith('https://')) {
      throw new Error(`URL upload failed: ${responseText}`);
    }

    return responseText.trim();
  } catch (error) {
    console.error('Error with URL upload to Catbox:', error);
    throw error;
  }
};

export default function CreateCharacterScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [character, setCharacter] = useState<Partial<PersonalCharacter>>({
    name: '',
    description: '',
    personality: '',
    personalityTags: [],
    features: [],
    primaryColor: '#2c3e50',
    secondaryColor: '#34495e',
  });
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [featureInput, setFeatureInput] = useState('');

  useEffect(() => {
    checkPremiumStatus();
  }, []);

  const checkPremiumStatus = async () => {
    try {
      const user = getCurrentUser();
      if (!user) {
        router.back();
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists() || !userDoc.data().isPremium) {
        Alert.alert('Premium Required', 'This feature is only available for premium users.');
        router.back();
        return;
      }

      setIsPremium(true);
    } catch (error) {
      console.error('Error checking premium status:', error);
      router.back();
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && character.personalityTags) {
      setCharacter({
        ...character,
        personalityTags: [...character.personalityTags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (index: number) => {
    if (character.personalityTags) {
      setCharacter({
        ...character,
        personalityTags: character.personalityTags.filter((_, i) => i !== index),
      });
    }
  };

  const handleAddFeature = () => {
    if (featureInput.trim() && character.features) {
      setCharacter({
        ...character,
        features: [...character.features, featureInput.trim()],
      });
      setFeatureInput('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    if (character.features) {
      setCharacter({
        ...character,
        features: character.features.filter((_, i) => i !== index),
      });
    }
  };

  const handleCreate = async () => {
    try {
      setIsLoading(true);

      // Validate required fields
      if (!character.name || !character.description || !character.personality || !avatarUri) {
        Alert.alert('Error', 'Please fill in all required fields and add an avatar.');
        return;
      }

      const user = getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to create a character.');
        return;
      }

      // Upload to Catbox
      console.log('Starting Catbox upload...');
      const avatarUrl = await uploadToCatbox(avatarUri, 'bf14d49a9cddb19e4441ff372');
      console.log('Upload successful, URL:', avatarUrl);

      // Create character document with required chat fields
      const characterData: PersonalCharacter = {
        ...character as PersonalCharacter,
        id: `personal-${Date.now()}`,
        avatar: avatarUrl,
        createdBy: user.uid,
        isPersonal: true,
        model: 'mistralai/mistral-7b-instruct', // Default model
        systemPrompt: `You are ${character.name}, ${character.description}. Your personality: ${character.personality}. 
                      Respond in character, incorporating your personality traits and features naturally into the conversation.`,
        greeting: `Hello! I'm ${character.name}. ${character.description} Let's chat!`
      };

      // Save to Firestore
      await setDoc(doc(collection(db, 'personal-characters'), characterData.id), characterData);

      Alert.alert(
        'Success',
        'Character created successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error creating character:', error);
      Alert.alert(
        'Error',
        'Failed to create character. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isPremium) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f4511e" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Create Character',
          headerStyle: {
            backgroundColor: '#1a1a1a',
          },
          headerTintColor: '#fff',
          headerShadowVisible: false,
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          {/* Avatar Selection */}
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialIcons name="add-photo-alternate" size={40} color="#666" />
                <Text style={styles.avatarPlaceholderText}>Add Avatar</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Character Info */}
          <View style={styles.formSection}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={character.name}
              onChangeText={(text) => setCharacter({ ...character, name: text })}
              placeholder="Character name"
              placeholderTextColor="#666"
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={character.description}
              onChangeText={(text) => setCharacter({ ...character, description: text })}
              placeholder="Brief description of your character"
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Personality</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={character.personality}
              onChangeText={(text) => setCharacter({ ...character, personality: text })}
              placeholder="Describe your character's personality"
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
            />

            {/* Personality Tags */}
            <Text style={styles.label}>Personality Tags</Text>
            <View style={styles.tagInput}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="Add personality tag"
                placeholderTextColor="#666"
                onSubmitEditing={handleAddTag}
              />
              <TouchableOpacity style={styles.addButton} onPress={handleAddTag}>
                <MaterialIcons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.tagContainer}>
              {character.personalityTags?.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                  <TouchableOpacity onPress={() => handleRemoveTag(index)}>
                    <MaterialIcons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Features */}
            <Text style={styles.label}>Features</Text>
            <View style={styles.tagInput}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={featureInput}
                onChangeText={setFeatureInput}
                placeholder="Add character feature"
                placeholderTextColor="#666"
                onSubmitEditing={handleAddFeature}
              />
              <TouchableOpacity style={styles.addButton} onPress={handleAddFeature}>
                <MaterialIcons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.tagContainer}>
              {character.features?.map((feature, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{feature}</Text>
                  <TouchableOpacity onPress={() => handleRemoveFeature(index)}>
                    <MaterialIcons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Create Button */}
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreate}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#2c3e50', '#34495e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="add-circle-outline" size={24} color="#fff" />
                    <Text style={styles.createButtonText}>Create Character</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  content: {
    padding: 16,
  },
  avatarContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#2C2C2C',
    alignSelf: 'center',
    marginVertical: 24,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: '#666',
    marginTop: 8,
  },
  formSection: {
    marginBottom: 24,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  tagInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: '#2c3e50',
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c3e50',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
  },
  tagText: {
    color: '#fff',
    marginRight: 4,
  },
  createButton: {
    marginTop: 24,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
}); 