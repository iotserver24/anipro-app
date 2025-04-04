import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Linking, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import MediaLoader from './MediaLoader';

interface ChangelogItem {
  type: 'text' | 'image' | 'video' | 'url';
  content: string;
  title?: string;
  description?: string;
  format?: 'bold' | 'italic' | 'normal';
}

interface RichChangelogProps {
  items: ChangelogItem[];
}

const { width } = Dimensions.get('window');
const CONTENT_WIDTH = width * 0.85;

export const RichChangelog: React.FC<RichChangelogProps> = ({ items }) => {
  const [expandedMedia, setExpandedMedia] = useState<number | null>(null);

  // Handle null or undefined items
  if (!items) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="info-outline" size={40} color="#666" />
        <Text style={styles.emptyText}>No changelog information available</Text>
      </View>
    );
  }

  const renderItem = (item: ChangelogItem, index: number) => {
    const isExpanded = expandedMedia === index;
    
    switch (item.type) {
      case 'text':
        return (
          <View key={index} style={styles.textItem}>
            <Text style={[
              styles.bulletPoint,
              item.format === 'bold' && styles.boldText,
              item.format === 'italic' && styles.italicText
            ]}>•</Text>
            <Text style={[
              styles.textContent,
              item.format === 'bold' && styles.boldText,
              item.format === 'italic' && styles.italicText
            ]}>
              {item.content}
            </Text>
          </View>
        );
      
      case 'image':
        return (
          <View key={index} style={[styles.mediaContainer, styles.mediaCard]}>
            {item.title && <Text style={styles.mediaTitle}>{item.title}</Text>}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setExpandedMedia(expandedMedia === index ? null : index)}
              style={styles.mediaWrapper}
            >
              <MediaLoader
                type="image"
                source={{ uri: item.content }}
                style={[
                  styles.image,
                  isExpanded && styles.expandedMedia
                ]}
                loadingType="dots"
                loadingSize={12}
              />
              <View style={styles.mediaOverlay}>
                <MaterialIcons 
                  name={isExpanded ? "fullscreen-exit" : "fullscreen"} 
                  size={24} 
                  color="#fff" 
                />
              </View>
            </TouchableOpacity>
            {item.description && (
              <Text style={styles.mediaDescription}>{item.description}</Text>
            )}
          </View>
        );
      
      case 'video':
        return (
          <View key={index} style={[styles.mediaContainer, styles.mediaCard]}>
            {item.title && <Text style={styles.mediaTitle}>{item.title}</Text>}
            <View style={styles.mediaWrapper}>
              <MediaLoader
                type="video"
                source={{ uri: item.content }}
                style={[
                  styles.video,
                  isExpanded && styles.expandedMedia
                ]}
                loadingType="rotate"
                loadingSize={15}
                showControls={true}
                autoPlay={false}
              />
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setExpandedMedia(expandedMedia === index ? null : index)}
              >
                <MaterialIcons 
                  name={isExpanded ? "fullscreen-exit" : "fullscreen"} 
                  size={24} 
                  color="#fff" 
                />
              </TouchableOpacity>
            </View>
            {item.description && (
              <Text style={styles.mediaDescription}>{item.description}</Text>
            )}
          </View>
        );
      
      case 'url':
        return (
          <View key={index} style={[styles.urlContainer, styles.mediaCard]}>
            <TouchableOpacity 
              onPress={() => Linking.openURL(item.content)}
              style={styles.urlButton}
            >
              <View style={styles.urlContent}>
                <MaterialIcons name="link" size={20} color="#fff" style={styles.urlIcon} />
                <Text style={styles.urlTitle}>{item.title || 'Learn More'}</Text>
              </View>
              {item.description && (
                <Text style={styles.urlDescription}>{item.description}</Text>
              )}
              <View style={styles.urlArrow}>
                <MaterialIcons name="arrow-forward" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        );
      
      default:
        return null;
    }
  };

  // Handle empty changelog
  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="info-outline" size={40} color="#666" />
        <Text style={styles.emptyText}>No changelog information available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {items.map((item, index) => renderItem(item, index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  textItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  bulletPoint: {
    fontSize: 16,
    color: '#f4511e',
    marginRight: 8,
    lineHeight: 20,
  },
  textContent: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: 'bold',
  },
  italicText: {
    fontStyle: 'italic',
  },
  mediaContainer: {
    marginVertical: 12,
    width: '100%',
    alignSelf: 'center',
  },
  mediaCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mediaWrapper: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  mediaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  video: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  expandedMedia: {
    height: 240,
  },
  mediaOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 4,
  },
  expandButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 4,
  },
  mediaDescription: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 8,
    fontStyle: 'italic',
  },
  urlContainer: {
    marginVertical: 12,
    width: '100%',
    alignSelf: 'center',
  },
  urlButton: {
    backgroundColor: 'rgba(244, 81, 30, 0.2)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244, 81, 30, 0.3)',
  },
  urlContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urlIcon: {
    marginRight: 8,
  },
  urlTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  urlDescription: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 4,
    marginLeft: 28,
  },
  urlArrow: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -10,
  },
});

export default RichChangelog; 