import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Alert,
} from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AVAILABLE_CHARACTERS, Character } from '../constants/characters';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { getCurrentUser } from '../services/userService';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import useCharacterStore from '../stores/characterStore';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = 180;
const FEATURED_CARD_HEIGHT = 220;
const FEATURED_COUNT = 3; // Number of featured characters to show

interface PersonalCharacter extends Character {
  isPersonal: boolean;
  createdBy: string;
}

export default function CharacterSelectScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [featuredCharacters, setFeaturedCharacters] = useState<Character[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [personalCharacters, setPersonalCharacters] = useState<PersonalCharacter[]>([]);
  const { downloadedCharacters } = useCharacterStore();

  // Check premium status
  useEffect(() => {
    checkPremiumStatus();
    fetchPersonalCharacters();
  }, []);

  // Initialize random featured characters
  useEffect(() => {
    shuffleFeaturedCharacters();
    // Shuffle every 30 seconds
    const interval = setInterval(shuffleFeaturedCharacters, 30000);
    return () => clearInterval(interval);
  }, []);

  // Add useFocusEffect to reload characters when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (isPremium) {
        console.log('Screen focused, reloading personal characters...');
        fetchPersonalCharacters();
      }
    }, [isPremium])
  );

  const checkPremiumStatus = async () => {
    try {
      const user = getCurrentUser();
      if (!user) {
        setIsPremium(false);
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setIsPremium(userDoc.data().isPremium === true);
      }
    } catch (error) {
      console.error('Error checking premium status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPersonalCharacters = async () => {
    try {
      const user = getCurrentUser();
      if (!user) return;

      setIsLoading(true);
      const q = query(
        collection(db, 'personal-characters'),
        where('createdBy', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const characters: PersonalCharacter[] = [];
      
      querySnapshot.forEach((doc) => {
        characters.push(doc.data() as PersonalCharacter);
      });
      
      setPersonalCharacters(characters);
      console.log(`Loaded ${characters.length} personal characters`);
    } catch (error) {
      console.error('Error fetching personal characters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCharacter = async (characterId: string) => {
    try {
      const user = getCurrentUser();
      if (!user) return;

      Alert.alert(
        'Delete Character',
        'Are you sure you want to delete this character? This action cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteDoc(doc(db, 'personal-characters', characterId));
                setPersonalCharacters(prev => prev.filter(char => char.id !== characterId));
                Alert.alert('Success', 'Character deleted successfully');
              } catch (error) {
                console.error('Error deleting character:', error);
                Alert.alert('Error', 'Failed to delete character');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in deleteCharacter:', error);
    }
  };

  const getAllCharacters = () => {
    // Get downloaded characters
    const downloadedChars = Object.values(downloadedCharacters).map(char => ({
      ...char,
      avatar: { uri: char.avatarUrl },
      isDownloaded: true
    }));

    // Get predefined characters
    const predefinedChars = AVAILABLE_CHARACTERS.map(char => ({
      ...char,
      isDownloaded: false
    }));

    // Combine and remove duplicates (prefer downloaded version if exists)
    const allChars = [...downloadedChars];
    predefinedChars.forEach(preChar => {
      if (!downloadedChars.some(dChar => dChar.id === preChar.id)) {
        allChars.push(preChar);
      }
    });

    return allChars;
  };

  const shuffleFeaturedCharacters = () => {
    const allCharacters = getAllCharacters();
    const shuffled = [...allCharacters]
      .sort(() => Math.random() - 0.5)
      .slice(0, FEATURED_COUNT);
    setFeaturedCharacters(shuffled);
  };

  const handleCreateCharacter = () => {
    if (!isPremium) {
      Alert.alert(
        'Premium Feature',
        'Creating personal characters is a premium feature. Upgrade to premium to unlock this feature!',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Upgrade to Premium',
            onPress: () => router.push('/profile')
          }
        ]
      );
      return;
    }
    
    // Navigate to create character screen instead of scrolling
    router.push('/create-character');
  };

  const renderFeaturedCard = (character: Character & { isDownloaded?: boolean }) => {
    return (
      <TouchableOpacity
        key={character.id}
        style={styles.featuredCard}
        onPress={() => {
          setSelectedCharacter(character);
          setTimeout(() => {
            router.push({
              pathname: '/aichat',
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
              {character.isDownloaded && (
                <View style={[styles.featuredTag, { backgroundColor: '#4CAF50' }]}>
                  <Text style={styles.featuredTagText}>Downloaded</Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderCharacterCard = (character: Character & { isDownloaded?: boolean }) => {
    return (
      <TouchableOpacity
        key={character.id}
        style={styles.characterCard}
        onPress={() => {
          setSelectedCharacter(character);
          setTimeout(() => {
            router.push({
              pathname: '/aichat',
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
              <View style={styles.characterNameContainer}>
                <Text style={styles.characterName}>{character.name}</Text>
                {character.isDownloaded && (
                  <View style={styles.downloadedBadge}>
                    <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                    <Text style={styles.downloadedText}>Downloaded</Text>
                  </View>
                )}
              </View>
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

  const filteredCharacters = getAllCharacters().filter(char => {
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

  const handleCharacterSelect = (character: Character | PersonalCharacter) => {
    setSelectedCharacter(character);
    setTimeout(() => {
      router.push({
        pathname: '/aichat',
        params: { 
          characterId: character.id,
          isPersonal: 'isPersonal' in character ? 'true' : 'false'
        }
      });
    }, 200);
  };

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
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 16, marginRight: 8 }}>
              <TouchableOpacity
                onPress={() => router.push('/chat-history')}
                style={styles.headerButton}
              >
                <MaterialIcons name="history" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/character-store')}
                style={styles.headerButton}
              >
                <MaterialIcons name="store" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
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
          ref={scrollViewRef}
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
              <View style={styles.featuredHeader}>
                <Text style={styles.sectionTitle}>Featured Characters</Text>
                <TouchableOpacity 
                  style={styles.shuffleButton}
                  onPress={shuffleFeaturedCharacters}
                >
                  <MaterialIcons name="shuffle" size={20} color="#f4511e" />
                </TouchableOpacity>
              </View>
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

          {/* Personal Characters Section with Create Button */}
          {isPremium && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Characters</Text>
              
              <TouchableOpacity
                style={styles.createCharacterCard}
                onPress={() => router.push('/create-character')}
              >
                <LinearGradient
                  colors={['#2c3e50', '#34495e']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.createCardGradient}
                >
                  <View style={styles.createCardContent}>
                    <View style={styles.createIconContainer}>
                      <MaterialIcons name="add-circle-outline" size={32} color="#fff" />
                    </View>
                    <View style={styles.createTextContainer}>
                      <Text style={styles.createCardTitle}>Create New Character</Text>
                      <Text style={styles.createCardSubtitle}>Design your own unique AI companion</Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.personalCharactersGrid}>
                {personalCharacters.map((character) => (
                  <View key={character.id} style={styles.personalCharacterCard}>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteCharacter(character.id)}
                    >
                      <MaterialIcons name="delete" size={20} color="#fff" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.cardContent}
                      onPress={() => handleCharacterSelect(character)}
                    >
                      <Image 
                        source={{ uri: character.avatar }} 
                        style={styles.personalCharacterAvatar}
                      />
                      <LinearGradient
                        colors={[character.primaryColor, character.secondaryColor]}
                        style={styles.personalCharacterInfo}
                      >
                        <Text style={styles.personalCharacterName} numberOfLines={1}>
                          {character.name}
                        </Text>
                        <View style={styles.personalTagContainer}>
                          {character.personalityTags.slice(0, 2).map((tag, index) => (
                            <View key={index} style={styles.personalTag}>
                              <Text style={styles.personalTagText} numberOfLines={1}>
                                {tag}
                              </Text>
                            </View>
                          ))}
                        </View>
                        <Text style={styles.personalCharacterDesc} numberOfLines={2}>
                          {character.description}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ))}
                
                {personalCharacters.length === 0 && (
                  <View style={styles.emptyState}>
                    <MaterialIcons name="person-add" size={48} color="#666" />
                    <Text style={styles.emptyStateText}>No Characters Yet</Text>
                    <Text style={styles.emptyStateSubtext}>
                      Create your first character above to get started
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </Animated.ScrollView>

        {/* Add floating action button for non-premium users */}
        <TouchableOpacity
          style={[
            styles.floatingButton,
            !isPremium && styles.floatingButtonDisabled
          ]}
          onPress={handleCreateCharacter}
        >
          <LinearGradient
            colors={isPremium ? ['#2c3e50', '#34495e'] : ['#444', '#333']}
            style={styles.floatingButtonGradient}
          >
            <MaterialIcons 
              name="add-circle-outline" 
              size={24} 
              color="#fff" 
            />
          </LinearGradient>
        </TouchableOpacity>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
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
    backgroundColor: 'rgba(44, 62, 80, 0.6)',
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
  characterNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  characterName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
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
    backgroundColor: 'rgba(44, 62, 80, 0.6)',
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
  createButton: {
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
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  personalCharactersGrid: {
    padding: 16,
    paddingTop: 8,
  },
  personalCharacterCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    position: 'relative',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.8)',
    borderRadius: 12,
    padding: 6,
    zIndex: 1,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
  },
  personalCharacterAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 12,
  },
  personalCharacterInfo: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
  },
  personalCharacterName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  personalTagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  personalTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 4,
  },
  personalTagText: {
    color: '#fff',
    fontSize: 12,
  },
  personalCharacterDesc: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 18,
  },
  emptyState: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptyStateSubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  featuredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  shuffleButton: {
    padding: 8,
  },
  section: {
    paddingTop: 24,
  },
  createCharacterCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  createCardGradient: {
    width: '100%',
  },
  createCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  createIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  createTextContainer: {
    flex: 1,
  },
  createCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  createCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    overflow: 'hidden',
  },
  floatingButtonDisabled: {
    opacity: 0.8,
  },
  floatingButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  downloadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  downloadedText: {
    color: '#4CAF50',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
}); 