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

  // Generate unique filename to prevent conflicts
  const generateUniqueFilename = (originalUri: string): string => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const extension = originalUri.split('.').pop()?.toLowerCase() || 'jpg';
    return `custom_theme_${timestamp}_${randomSuffix}.${extension}`;
  };

  // Copy image to app document directory for permanent storage
  const copyImageToAppStorage = async (originalUri: string): Promise<string> => {
    try {
      // Ensure document directory exists
      const documentDir = FileSystem.documentDirectory;
      if (!documentDir) {
        throw new Error('Document directory not available');
      }

      // Create themes subdirectory if it doesn't exist
      const themesDir = documentDir + 'themes/';
      const dirInfo = await FileSystem.getInfoAsync(themesDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(themesDir, { intermediates: true });
      }

      // Generate unique filename
      const filename = generateUniqueFilename(originalUri);
      const destinationUri = themesDir + filename;

      // Copy the image file
      await FileSystem.copyAsync({
        from: originalUri,
        to: destinationUri,
      });

      return destinationUri;
    } catch (error) {
      console.error('Error copying image to app storage:', error);
      throw error;
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
          // Copy image to app storage for permanent access
          const copiedUri = await copyImageToAppStorage(asset.uri);
          console.log('Image copied successfully to:', copiedUri);
          
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
