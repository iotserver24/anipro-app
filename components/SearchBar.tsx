import { View, TextInput, TouchableOpacity, StyleSheet, Animated, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef, useEffect } from 'react';
import { router } from 'expo-router';

export default function SearchBar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const [isAnimating, setIsAnimating] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearAutoCloseTimer = () => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  };

  const startAutoCloseTimer = () => {
    clearAutoCloseTimer();
    if (isExpanded && !searchQuery.trim()) {
      autoCloseTimerRef.current = setTimeout(() => {
        if (isExpanded && !searchQuery.trim() && !isFocused) {
          toggleSearch();
        }
      }, 3000);
    }
  };

  useEffect(() => {
    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', () => {
      if (isExpanded) {
        inputRef.current?.blur();
      }
    });

    return () => {
      keyboardDidHide.remove();
      clearAutoCloseTimer();
    };
  }, [isExpanded]);

  useEffect(() => {
    if (!isFocused && isExpanded) {
      startAutoCloseTimer();
    }
  }, [isFocused, isExpanded, searchQuery]);

  const toggleSearch = () => {
    if (isAnimating) return;
    
    clearAutoCloseTimer();
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
        setIsFocused(false);
      } else {
        setTimeout(() => {
          inputRef.current?.focus();
          setIsFocused(true);
        }, 100);
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

  const opacity = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });

  const handleSearchPress = () => {
    if (isExpanded && searchQuery.trim().length > 0) {
      handleSearch();
    } else {
      toggleSearch();
    }
  };

  const handleTextChange = (text: string) => {
    clearAutoCloseTimer();
    setSearchQuery(text);
  };

  const handleFocus = () => {
    clearAutoCloseTimer();
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    startAutoCloseTimer();
  };

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.searchContainer, 
          { 
            width,
            opacity,
            backgroundColor: isExpanded ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.08)'
          }
        ]}
      >
        {isExpanded && (
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search anime..."
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={searchQuery}
            onChangeText={handleTextChange}
            onSubmitEditing={handleSubmitEditing}
            onFocus={handleFocus}
            onBlur={handleBlur}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            selectionColor="#f4511e"
            selectTextOnFocus
            enablesReturnKeyAutomatically
            keyboardAppearance="dark"
            blurOnSubmit
          />
        )}
        <TouchableOpacity 
          style={[
            styles.searchButton,
            !isExpanded && styles.searchButtonCollapsed
          ]}
          onPress={handleSearchPress}
          activeOpacity={0.7}
          disabled={isAnimating}
        >
          <Ionicons 
            name={isExpanded && searchQuery.length > 0 ? "search" : "search-outline"} 
            size={22}
            color="rgba(255, 255, 255, 0.9)"
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    alignItems: 'center',
    height: 38,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: {
    flex: 1,
    color: '#fff',
    marginLeft: 8,
    fontSize: 15,
    height: '100%',
    padding: 0,
    textAlignVertical: 'center',
  },
  searchButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  searchButtonCollapsed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    margin: -4,
  },
}); 