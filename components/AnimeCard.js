import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { LinearGradient } from 'expo-linear-gradient';

const AnimeCard = ({ anime, onPress, style, showTitle = false, showScore = false }) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image 
        source={{ uri: anime.cover || anime.banner }} 
        style={styles.image}
        resizeMode="cover"
      />
      
      {showTitle && (
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        >
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
            {anime.english || anime.romaji || anime.native}
          </Text>
          
          {showScore && anime.averageScore && (
            <View style={[styles.scoreContainer, { backgroundColor: theme.colors.primary }]}>
              <Text style={[styles.score, { color: theme.colors.text }]}>
                {anime.averageScore / 10}
              </Text>
            </View>
          )}
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#333',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    paddingHorizontal: 12,
    paddingBottom: 12,
    justifyContent: 'flex-end',
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  scoreContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  score: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

export default AnimeCard; 