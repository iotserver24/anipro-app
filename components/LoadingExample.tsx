import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import LoadingAnimation from './LoadingAnimation';
import LoadingOverlay from './LoadingOverlay';
import MediaLoader from './MediaLoader';

/**
 * This is an example component to demonstrate how to use the loading animations
 * in different parts of your app. You can use this as a reference for implementing
 * loading states in your own components.
 */
const LoadingExample: React.FC = () => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayType, setOverlayType] = useState<'dots' | 'pulse' | 'rotate' | 'bounce' | 'default'>('default');
  const [overlayText, setOverlayText] = useState('Loading...');

  // Simulate showing the overlay for a few seconds
  const demonstrateOverlay = (type: 'dots' | 'pulse' | 'rotate' | 'bounce' | 'default', text: string) => {
    setOverlayType(type);
    setOverlayText(text);
    setShowOverlay(true);
    
    setTimeout(() => {
      setShowOverlay(false);
    }, 3000);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Loading Animation Examples</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Loading Animations</Text>
        <View style={styles.animationsContainer}>
          <View style={styles.animationItem}>
            <Text style={styles.animationLabel}>Dots</Text>
            <LoadingAnimation type="dots" size={10} color="#f4511e" />
          </View>
          
          <View style={styles.animationItem}>
            <Text style={styles.animationLabel}>Pulse</Text>
            <LoadingAnimation type="pulse" size={15} color="#4caf50" />
          </View>
          
          <View style={styles.animationItem}>
            <Text style={styles.animationLabel}>Rotate</Text>
            <LoadingAnimation type="rotate" size={15} color="#2196f3" />
          </View>
          
          <View style={styles.animationItem}>
            <Text style={styles.animationLabel}>Bounce</Text>
            <LoadingAnimation type="bounce" size={15} color="#9c27b0" />
          </View>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Media Loading Examples</Text>
        <View style={styles.mediaContainer}>
          <Text style={styles.mediaLabel}>Image Loading</Text>
          <MediaLoader
            type="image"
            source={{ uri: 'https://via.placeholder.com/300x200' }}
            style={styles.media}
            loadingType="dots"
            loadingSize={12}
          />
        </View>
        
        <View style={styles.mediaContainer}>
          <Text style={styles.mediaLabel}>Video Loading</Text>
          <MediaLoader
            type="video"
            source={{ uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' }}
            style={styles.media}
            loadingType="rotate"
            loadingSize={15}
            showControls={true}
          />
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Loading Overlay Examples</Text>
        <View style={styles.overlayButtonsContainer}>
          <TouchableOpacity 
            style={[styles.overlayButton, { backgroundColor: '#f4511e' }]}
            onPress={() => demonstrateOverlay('dots', 'Loading content...')}
          >
            <Text style={styles.overlayButtonText}>Dots Overlay</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.overlayButton, { backgroundColor: '#4caf50' }]}
            onPress={() => demonstrateOverlay('pulse', 'Refreshing data...')}
          >
            <Text style={styles.overlayButtonText}>Pulse Overlay</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.overlayButton, { backgroundColor: '#2196f3' }]}
            onPress={() => demonstrateOverlay('rotate', 'Processing...')}
          >
            <Text style={styles.overlayButtonText}>Rotate Overlay</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.overlayButton, { backgroundColor: '#9c27b0' }]}
            onPress={() => demonstrateOverlay('bounce', 'Please wait...')}
          >
            <Text style={styles.overlayButtonText}>Bounce Overlay</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.overlayButton, { backgroundColor: '#607d8b' }]}
            onPress={() => demonstrateOverlay('default', 'Using default ActivityIndicator...')}
          >
            <Text style={styles.overlayButtonText}>Default Overlay</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Loading overlay that appears when buttons are pressed */}
      <LoadingOverlay 
        visible={showOverlay} 
        type={overlayType} 
        text={overlayText} 
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  animationsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  animationItem: {
    alignItems: 'center',
    marginBottom: 16,
    width: '45%',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 8,
  },
  animationLabel: {
    color: '#ccc',
    marginBottom: 8,
    fontSize: 14,
  },
  mediaContainer: {
    marginBottom: 16,
  },
  mediaLabel: {
    color: '#ccc',
    marginBottom: 8,
    fontSize: 14,
  },
  media: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  overlayButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  overlayButton: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  overlayButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default LoadingExample; 