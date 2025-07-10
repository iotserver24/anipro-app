import React, { memo } from 'react';
import { View, Image, StyleSheet, ImageStyle, ViewStyle } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { getMediaTypeFromUrl, isVideoUrl, isGifUrl } from '../constants/avatars';

interface AvatarDisplayProps {
  url: string;
  style?: ImageStyle | ViewStyle;
  fallbackUrl?: string;
  onError?: () => void;
  isPremium?: boolean;
}

const AvatarDisplay = memo(({ 
  url, 
  style, 
  fallbackUrl, 
  onError,
  isPremium = false 
}: AvatarDisplayProps) => {
  const mediaType = getMediaTypeFromUrl(url);
  
  const handleError = () => {
    if (onError) {
      onError();
    } else {
      console.warn('Avatar failed to load:', url);
    }
  };

  // Video Avatar Component
  if (mediaType === 'video') {
    return (
      <View style={[styles.container, style]}>
        <Video
          source={{ uri: url }}
          style={[styles.videoAvatar, style]}
          resizeMode={ResizeMode.COVER}
          shouldPlay={true}
          isLooping={true}
          isMuted={true}
          useNativeControls={false}
          onError={handleError}
        />
        {isPremium && (
          <View style={styles.premiumIndicator}>
            <View style={styles.premiumDot} />
          </View>
        )}
      </View>
    );
  }

  // GIF or Image Avatar Component
  return (
    <View style={[styles.container, style]}>
      <Image
        source={{ uri: url }}
        style={[
          styles.imageAvatar, 
          style,
          mediaType === 'gif' && styles.gifAvatar
        ]}
        defaultSource={fallbackUrl ? { uri: fallbackUrl } : undefined}
        onError={handleError}
        resizeMode="cover"
      />
      {isPremium && (
        <View style={styles.premiumIndicator}>
          <View style={styles.premiumDot} />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  imageAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 50, // Default circular avatar
    backgroundColor: '#333',
  },
  videoAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 50, // Default circular avatar
    backgroundColor: '#333',
  },
  gifAvatar: {
    // Special styling for GIFs if needed
  },
  premiumIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
});

AvatarDisplay.displayName = 'AvatarDisplay';

export default AvatarDisplay; 