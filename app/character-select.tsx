import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  Animated,
  TextInput,
  StatusBar,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AVAILABLE_CHARACTERS, Character } from '../constants/characters';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = 180;
const FEATURED_CARD_HEIGHT = 220;

export default function CharacterSelectScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const scrollY = useRef(new Animated.Value(0)).current;
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

  // Featured characters
  const featuredCharacters = AVAILABLE_CHARACTERS.filter(char => 
    ['zero-two', 'gojo', 'marin'].includes(char.id)
  );

  const renderFeaturedCard = (character: Character) => {
    return (
      <TouchableOpacity
        key={character.id}
        style={styles.featuredCard}
        onPress={() => {
          setSelectedCharacter(character);
          setTimeout(() => {
            router.push({
              pathname: '/chat',
              params: { characterId: character.id }
            });
          }, 200);
        }}
      >
        <LinearGradient
          colors={[character.primaryColor, character.secondaryColor]}
          style={styles.featuredGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Image
            source={character.avatar}
            style={styles.featuredImage}
            resizeMode="cover"
          />
          <View style={styles.featuredOverlay}>
            <Text style={styles.featuredName}>{character.name}</Text>
            <Text style={styles.featuredAnime}>{character.anime}</Text>
            <View style={styles.featuredTags}>
              {character.personalityTags.slice(0, 2).map((tag, index) => (
                <View key={index} style={styles.featuredTag}>
                  <Text style={styles.featuredTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderCharacterCard = (character: Character) => {
    return (
      <TouchableOpacity
        key={character.id}
        style={styles.characterCard}
        onPress={() => {
          setSelectedCharacter(character);
          setTimeout(() => {
            router.push({
              pathname: '/chat',
              params: { characterId: character.id }
            });
          }, 200);
        }}
      >
        <LinearGradient
          colors={[character.primaryColor, character.secondaryColor]}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardContent}>
            <Image
              source={character.avatar}
              style={styles.characterImage}
              resizeMode="cover"
            />
            <View style={styles.characterInfo}>
              <Text style={styles.characterName}>{character.name}</Text>
              <Text style={styles.animeTitle}>{character.anime}</Text>
              <View style={styles.tagContainer}>
                {character.personalityTags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.featureList}>
                {character.features.slice(0, 2).map((feature, index) => (
                  <Text key={index} style={styles.featureText}>
                    • {feature}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const filteredCharacters = AVAILABLE_CHARACTERS.filter(char => {
    if (searchQuery.length === 0) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      char.name.toLowerCase().includes(searchLower) ||
      char.anime.toLowerCase().includes(searchLower) ||
      char.personalityTags.some(tag => tag.toLowerCase().includes(searchLower)) ||
      char.features.some(feature => feature.toLowerCase().includes(searchLower))
    );
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <>
      <StatusBar barStyle="light-content" />
      <Stack.Screen
        options={{
          title: 'Select Character',
          headerStyle: {
            backgroundColor: '#1a1a1a',
          },
          headerTintColor: '#fff',
          headerShadowVisible: false,
        }}
      />
      <View style={styles.container}>
        <Animated.View style={[
          styles.searchHeader,
          { opacity: headerOpacity }
        ]}>
          <BlurView intensity={100} style={styles.searchHeaderBlur}>
            <View style={styles.searchContainer}>
              <MaterialIcons name="search" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search characters..."
                placeholderTextColor="#666"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialIcons name="close" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>
          </BlurView>
        </Animated.View>

        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {/* Featured Section */}
          {searchQuery.length === 0 && (
            <View style={styles.featuredSection}>
              <Text style={styles.sectionTitle}>Featured Characters</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredContainer}
              >
                {featuredCharacters.map(renderFeaturedCard)}
              </ScrollView>
            </View>
          )}

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search characters..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          {/* Character List */}
          <View style={styles.characterList}>
            {filteredCharacters.length === 0 ? (
              <View style={styles.noResults}>
                <MaterialIcons name="search-off" size={48} color="#666" />
                <Text style={styles.noResultsText}>No characters found</Text>
                <Text style={styles.noResultsSubtext}>
                  Try adjusting your search terms
                </Text>
              </View>
            ) : (
              filteredCharacters.map(renderCharacterCard)
            )}
          </View>
        </Animated.ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  searchHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  searchHeaderBlur: {
    padding: 16,
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
  },
  featuredSection: {
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  featuredContainer: {
    paddingHorizontal: 16,
  },
  featuredCard: {
    width: width * 0.8,
    height: FEATURED_CARD_HEIGHT,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  featuredGradient: {
    flex: 1,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  featuredOverlay: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  featuredName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  featuredAnime: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  featuredTags: {
    flexDirection: 'row',
  },
  featuredTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  featuredTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2C',
    margin: 16,
    marginTop: 24,
    padding: 12,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
    marginRight: 8,
    padding: 0,
  },
  characterList: {
    padding: 16,
    paddingTop: 8,
  },
  characterCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    alignSelf: 'center',
  },
  cardGradient: {
    flex: 1,
    padding: 16,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
  },
  characterImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginRight: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  characterInfo: {
    flex: 1,
  },
  characterName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  animeTitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tag: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 4,
    marginBottom: 4,
  },
  tagText: {
    color: '#fff',
    fontSize: 12,
  },
  featureList: {
    marginTop: 4,
  },
  featureText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginBottom: 2,
  },
  noResults: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  noResultsText: {
    color: '#666',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  noResultsSubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
}); 