import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface BackgroundMediaSelectorProps {
  onMediaSelected: (media: { type: 'image' | 'video'; uri: string; size: number; opacity?: number }) => void;
  onOpacityChange: (opacity: number) => void;
  currentMedia?: { type: 'image' | 'video'; uri: string };
  currentOpacity?: number;
}

export default function BackgroundMediaSelector({ onMediaSelected, onOpacityChange, currentMedia, currentOpacity = 0.3 }: BackgroundMediaSelectorProps) {
  const { theme } = useTheme();
  const [isSelecting, setIsSelecting] = useState(false);
  const [opacity, setOpacity] = useState(currentOpacity);

  const validateFileSize = (size: number, type: 'image' | 'video'): boolean => {
    const maxSize = type === 'image' ? 4 * 1024 * 1024 : 12 * 1024 * 1024; // 4MB for images, 12MB for videos
    return size <= maxSize;
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
        const fileSize = asset.fileSize || asset.size || 0;
        
        if (fileSize > 0 && !validateFileSize(fileSize, 'image')) {
          Alert.alert('File Too Large', 'Image must be under 4MB. Please choose a smaller image.');
          return;
        }
        onMediaSelected({
          type: 'image',
          uri: asset.uri,
          size: fileSize,
          opacity: opacity,
        });
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
          onPress: () => onMediaSelected({ type: 'image', uri: '', size: 0 }),
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
        Custom Background
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
          Choose a custom background image for your immersive experience
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

      {/* Opacity Control */}
      {currentMedia?.uri && (
        <View style={styles.opacityContainer}>
          <Text style={[styles.opacityLabel, { color: theme.colors.text }]}>
            Background Opacity: {Math.round(opacity * 100)}%
          </Text>
          <View style={styles.sliderContainer}>
            <Text style={[styles.sliderLabel, { color: theme.colors.textSecondary }]}>dark</Text>
            <Slider
              style={styles.slider}
              minimumValue={0.1}
              maximumValue={0.9}
              value={opacity}
              onValueChange={(value) => {
                setOpacity(value);
                onOpacityChange(value);
              }}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor={theme.colors.border}
              thumbStyle={{ backgroundColor: theme.colors.primary }}
            />
            <Text style={[styles.sliderLabel, { color: theme.colors.textSecondary }]}>light</Text>
          </View>
        </View>
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
  opacityContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
  },
  opacityLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderLabel: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 30,
    textAlign: 'center',
  },
});
