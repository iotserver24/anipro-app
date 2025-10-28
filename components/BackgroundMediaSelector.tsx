import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BackgroundMediaSelectorProps {
  onMediaSelected: (media: { type: 'image' | 'video'; uri: string; size: number; opacity?: number }) => void;
  onOpacityChange: (opacity: number) => void;
  currentMedia?: { type: 'image' | 'video'; uri: string };
  currentOpacity?: number;
  title?: string;
  subtitle?: string;
}

export default function BackgroundMediaSelector({ 
  onMediaSelected, 
  onOpacityChange, 
  currentMedia, 
  currentOpacity = 0.3,
  title = "Custom Background",
  subtitle = "Choose a custom background image for your immersive experience"
}: BackgroundMediaSelectorProps) {
  const { theme } = useTheme();
  const [isSelecting, setIsSelecting] = useState(false);
  const [opacity, setOpacity] = useState(currentOpacity);

  const validateFileSize = (size: number, type: 'image' | 'video'): boolean => {
    const maxSize = type === 'image' ? 4 * 1024 * 1024 : 12 * 1024 * 1024; // 4MB for images, 12MB for videos
    return size <= maxSize;
  };

  // Get extension from uri
  const getImageExtension = (originalUri: string): string => {
    const ext = originalUri.split('.').pop()?.toLowerCase();
    if (!ext) return 'jpg';
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return ext;
    return 'jpg';
  };

  // Save image into user-selected storage folder as anisurge-bg.[ext] via SAF
  const saveImageToUserFolder = async (originalUri: string): Promise<string> => {
    const APP_STORAGE_FOLDER_KEY = 'APP_STORAGE_FOLDER_URI';
    // Ensure we have a storage folder (request if missing)
    let folderUri = await AsyncStorage.getItem(APP_STORAGE_FOLDER_KEY);
    if (!folderUri) {
      const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!perm.granted) {
        throw new Error('Storage folder permission not granted');
      }
      folderUri = perm.directoryUri;
      await AsyncStorage.setItem(APP_STORAGE_FOLDER_KEY, folderUri);
    }

    // Determine extension and fixed filename
    const ext = getImageExtension(originalUri);
    const fixedName = `anisurge-bg.${ext}`;

    // If an older anisurge-bg with any extension exists, delete it first to avoid duplicates
    try {
      const existing = await FileSystem.StorageAccessFramework.readDirectoryAsync(folderUri);
      const candidates = existing.filter(u => /anisurge-bg\.(jpg|jpeg|png|webp)$/i.test(u));
      for (const uri of candidates) {
        try { await FileSystem.StorageAccessFramework.deleteAsync(uri); } catch {}
      }
    } catch {}

    // Create destination file
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
      folderUri,
      fixedName,
      mime
    );

    // Read source as base64 and write to destination
    const base64 = await FileSystem.readAsStringAsync(originalUri, { encoding: FileSystem.EncodingType.Base64 });
    await FileSystem.writeAsStringAsync(destUri, base64, { encoding: FileSystem.EncodingType.Base64 });
    return destUri;
  };

  // Validate image URI is accessible
  const validateImageUri = async (uri: string): Promise<boolean> => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return fileInfo.exists;
    } catch (error) {
      console.error('Error validating image URI:', error);
      return false;
    }
  };

  const handleImagePicker = async () => {
    try {
      setIsSelecting(true);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileSize = asset.fileSize || 0;
        
        if (fileSize > 0 && !validateFileSize(fileSize, 'image')) {
          Alert.alert('File Too Large', 'Image must be under 4MB. Please choose a smaller image.');
          return;
        }

        try {
          // Persist image to user storage folder with fixed filename
          const copiedUri = await saveImageToUserFolder(asset.uri);
          console.log('Image saved successfully to:', copiedUri);
          
          // Validate the copied URI is accessible
          const isValid = await validateImageUri(copiedUri);
          if (!isValid) {
            throw new Error('Copied image is not accessible');
          }
          
          onMediaSelected({
            type: 'image',
            uri: copiedUri, // Use the copied URI instead of original
            size: fileSize,
            opacity: opacity,
          });
        } catch (copyError) {
          console.error('Failed to copy image:', copyError);
          Alert.alert('Error', 'Failed to save image. Please try again.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image. Please try again.');
    } finally {
      setIsSelecting(false);
    }
  };


  const handleRemoveMedia = () => {
    Alert.alert(
      'Remove Background',
      'Are you sure you want to remove the custom background?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clean up the copied image file if it exists
              if (currentMedia?.uri && currentMedia.uri.startsWith('file://')) {
                await FileSystem.deleteAsync(currentMedia.uri, { idempotent: true });
              }
              onMediaSelected({ type: 'image', uri: '', size: 0 });
            } catch (error) {
              console.error('Error removing image file:', error);
              // Still remove from settings even if file deletion fails
              onMediaSelected({ type: 'image', uri: '', size: 0 });
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {title}
      </Text>
      
      {currentMedia?.uri ? (
        <View style={[styles.currentMediaContainer, { backgroundColor: theme.colors.card }]}>
          <View style={styles.mediaInfo}>
            <MaterialIcons 
              name="image" 
              size={20} 
              color={theme.colors.primary} 
            />
            <Text style={[styles.mediaText, { color: theme.colors.text }]}>
              Custom Image Background
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.removeButton, { backgroundColor: theme.colors.error }]}
            onPress={handleRemoveMedia}
          >
            <MaterialIcons name="close" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {subtitle}
        </Text>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.selectButton,
            { 
              backgroundColor: theme.colors.primary,
              opacity: isSelecting ? 0.7 : 1,
            }
          ]}
          onPress={handleImagePicker}
          disabled={isSelecting}
        >
          <MaterialIcons name="image" size={20} color="#fff" />
          <Text style={styles.buttonText}>Choose Image</Text>
          <Text style={styles.buttonSubtext}>(Max 4MB)</Text>
        </TouchableOpacity>

        {/* Video option removed for now */}
      </View>

      {isSelecting && (
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Selecting media...
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  currentMediaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mediaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mediaText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
    minWidth: 200,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 12,
  },
});
