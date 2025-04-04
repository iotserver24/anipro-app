import { View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function SearchBar() {
  const handleSearchPress = () => {
    router.push({
      pathname: "/search",
      params: { query: '' }  // Navigate with empty query to show search page
    });
  };

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={handleSearchPress}>
        <View style={styles.searchButton}>
          <Ionicons 
            name="search-outline"
            size={22}
            color="rgba(255, 255, 255, 0.9)"
          />
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
    minWidth: 48,
    minHeight: 48,
  },
  searchButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
}); 