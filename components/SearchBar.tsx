import { View, TextInput, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef } from 'react';
import { router } from 'expo-router';

export default function SearchBar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const expandAnim = useRef(new Animated.Value(0)).current;
  const [isAnimating, setIsAnimating] = useState(false);

  const toggleSearch = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    const toValue = isExpanded ? 0 : 1;
    setIsExpanded(!isExpanded);
    
    Animated.spring(expandAnim, {
      toValue,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start(() => {
      setIsAnimating(false);
      if (toValue === 0) {
        setSearchQuery('');
      }
    });
  };

  const handleSearch = () => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length >= 2) {
      router.push({
        pathname: "/search",
        params: { 
          query: trimmedQuery.toLowerCase().replace(/\s+/g, '-')
        }
      });
      toggleSearch();
    }
  };

  const handleSubmitEditing = () => {
    if (searchQuery.trim().length >= 2) {
      handleSearch();
    }
  };

  const width = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 200],
  });

  const handleSearchPress = () => {
    if (isExpanded) {
      handleSearch();
    } else {
      toggleSearch();
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.searchContainer, { width }]}>
        {isExpanded && (
          <TextInput
            style={styles.input}
            placeholder="Search anime..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSubmitEditing}
            returnKeyType="search"
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
        )}
        <TouchableOpacity 
          style={styles.searchButton} 
          onPress={handleSearchPress}
          activeOpacity={0.7}
          disabled={isAnimating}
        >
          <Ionicons 
            name={isExpanded ? "search" : "search-outline"} 
            size={24} 
            color="#fff" 
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
    height: '100%',
    padding: 0,
  },
  searchButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
    minHeight: 40,
  },
}); 