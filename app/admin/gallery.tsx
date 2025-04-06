import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';

const USERHASH = 'bf14d49a9cddb19e4441ff372';
const CATBOX_API = 'https://catbox.moe/user/api.php';

type ContentType = 'waifu' | 'husbando' | 'anitube';

interface UploadResponse {
  success: boolean;
  url?: string;
  error?: string;
}

export default function AdminGallery() {
  const [selectedType, setSelectedType] = useState<ContentType>('waifu');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const uploadToCatbox = async (fileUri: string): Promise<UploadResponse> => {
    try {
      const formData = new FormData();
      formData.append('reqtype', 'fileupload');
      formData.append('userhash', USERHASH);
      
      // Get the file extension
      const ext = fileUri.split('.').pop()?.toLowerCase();
      const validExts = ['jpg', 'jpeg', 'png', 'gif', 'mp4'];
      
      if (!ext || !validExts.includes(ext)) {
        return {
          success: false,
          error: 'Invalid file type. Only jpg, png, gif, and mp4 are allowed.'
        };
      }

      formData.append('fileToUpload', {
        uri: fileUri,
        name: `upload.${ext}`,
        type: ext === 'mp4' ? 'video/mp4' : `image/${ext}`
      } as any);

      const response = await fetch(CATBOX_API, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.text();
      
      if (data.startsWith('https://')) {
        return {
          success: true,
          url: data.trim()
        };
      } else {
        return {
          success: false,
          error: data || 'Upload failed'
        };
      }
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: 'Upload failed. Please try again.'
      };
    }
  };

  const uploadUrlToCatbox = async (imageUrl: string): Promise<UploadResponse> => {
    try {
      const formData = new FormData();
      formData.append('reqtype', 'urlupload');
      formData.append('userhash', USERHASH);
      formData.append('url', imageUrl);

      const response = await fetch(CATBOX_API, {
        method: 'POST',
        body: formData,
      });

      const data = await response.text();
      
      if (data.startsWith('https://')) {
        return {
          success: true,
          url: data.trim()
        };
      } else {
        return {
          success: false,
          error: data || 'Upload failed'
        };
      }
    } catch (error) {
      console.error('URL upload error:', error);
      return {
        success: false,
        error: 'URL upload failed. Please try again.'
      };
    }
  };

  const handleFilePicker = async () => {
    try {
      if (selectedType === 'anitube') {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'video/mp4',
        });

        if (result.type === 'success') {
          handleUpload(result.uri);
        }
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 1,
        });

        if (!result.canceled) {
          handleUpload(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('File picker error:', error);
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const handleUpload = async (fileUri?: string) => {
    if (!title) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    try {
      setUploading(true);

      let uploadResult: UploadResponse;

      if (fileUri) {
        // Upload local file
        uploadResult = await uploadToCatbox(fileUri);
      } else if (url) {
        // Upload from URL
        if (!url.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|mp4)$/i)) {
          Alert.alert('Error', 'Invalid URL. Must end with jpg, png, gif, or mp4');
          setUploading(false);
          return;
        }
        uploadResult = await uploadUrlToCatbox(url);
      } else {
        Alert.alert('Error', 'Please select a file or enter a URL');
        setUploading(false);
        return;
      }

      if (uploadResult.success && uploadResult.url) {
        // Save to our API
        const apiResponse = await fetch('https://anisurge.me/api/gallery/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: selectedType,
            title,
            url: uploadResult.url,
          }),
        });

        if (apiResponse.ok) {
          Alert.alert('Success', 'Content uploaded successfully');
          setTitle('');
          setUrl('');
        } else {
          Alert.alert('Error', 'Failed to save content details');
        }
      } else {
        Alert.alert('Error', uploadResult.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Upload Content</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content Type</Text>
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[styles.typeButton, selectedType === 'waifu' && styles.typeButtonActive]}
              onPress={() => setSelectedType('waifu')}
            >
              <MaterialIcons 
                name="favorite" 
                size={20} 
                color={selectedType === 'waifu' ? 'white' : '#666'} 
              />
              <Text style={[styles.typeButtonText, selectedType === 'waifu' && styles.typeButtonTextActive]}>
                Waifu
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, selectedType === 'husbando' && styles.typeButtonActive]}
              onPress={() => setSelectedType('husbando')}
            >
              <MaterialIcons 
                name="face" 
                size={20} 
                color={selectedType === 'husbando' ? 'white' : '#666'} 
              />
              <Text style={[styles.typeButtonText, selectedType === 'husbando' && styles.typeButtonTextActive]}>
                Husbando
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, selectedType === 'anitube' && styles.typeButtonActive]}
              onPress={() => setSelectedType('anitube')}
            >
              <MaterialIcons 
                name="play-circle-outline" 
                size={20} 
                color={selectedType === 'anitube' ? 'white' : '#666'} 
              />
              <Text style={[styles.typeButtonText, selectedType === 'anitube' && styles.typeButtonTextActive]}>
                AniTube
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter title..."
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload Method</Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleFilePicker}
            disabled={uploading}
          >
            <MaterialIcons name="file-upload" size={24} color="white" />
            <Text style={styles.uploadButtonText}>
              Choose {selectedType === 'anitube' ? 'Video' : 'Image'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.orText}>OR</Text>

          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="Enter direct URL..."
            placeholderTextColor="#666"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
          onPress={() => handleUpload()}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <MaterialIcons name="cloud-upload" size={24} color="white" />
              <Text style={styles.submitButtonText}>Upload</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  form: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    gap: 8,
  },
  typeButtonActive: {
    backgroundColor: '#f4511e',
  },
  typeButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: 'white',
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: 'white',
    fontSize: 16,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  orText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4511e',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 