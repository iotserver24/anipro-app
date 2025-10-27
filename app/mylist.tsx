import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useResponsive } from '../hooks/useResponsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMyListStore } from '../store/myListStore';
import { auth } from '../services/firebase';
import { syncService } from '../services/syncService';

type MyListAnime = {
  id: string;
  name: string;
  img: string;
  addedAt: number;
};

export default function MyList() {
  const { theme, hasBackgroundMedia } = useTheme();
  const responsive = useResponsive();
  const styles = createResponsiveStyles(responsive);
  const { myList, removeAnime, initializeList, refreshIfNeeded, isLoading, clearList } = useMyListStore();
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Start loading data immediately
    const init = async () => {
      try {
        await initializeList();
      } catch (error) {
        console.error('Error initializing my list:', error);
      } finally {
        setInitialLoading(false);
      }
    };
    init();
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Check if we need to refresh data when screen is focused
      refreshIfNeeded().catch(error => {
        console.error('Error refreshing data on focus:', error);
      });
      
      return () => {
        // Clean up if needed when screen loses focus
      };
    }, [refreshIfNeeded])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await initializeList();
    } catch (error) {
      console.error('Error refreshing my list:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const removeFromList = async (animeId: string) => {
    Alert.alert(
      'Remove from My List',
      'Are you sure you want to remove this anime from your list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeAnime(animeId);
            } catch (error) {
              console.error('Error removing from list:', error);
            }
          }
        }
      ]
    );
  };

  const clearAllAnime = () => {
    // First check if user is logged in and email is verified
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      Alert.alert(
        'Email Not Verified',
        'Please verify your email first to sync changes with cloud storage. Your local list will still be cleared.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear Local Only',
            style: 'destructive',
            onPress: async () => {
              try {
                await clearList();
              } catch (error) {
                console.error('Error clearing local list:', error);
                Alert.alert('Error', 'Failed to clear the local list. Please try again.');
              }
            }
          }
        ]
      );
      return;
    }

    Alert.alert(
      'Clear My List',
      auth.currentUser 
        ? 'Are you sure you want to remove all anime from your list? This will clear both local and cloud storage.'
        : 'Are you sure you want to remove all anime from your list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearList();
            } catch (error) {
              console.error('Error clearing list:', error);
              Alert.alert(
                'Error',
                'Failed to clear the list. Please try again.'
              );
            }
          }
        }
      ]
    );
  };

  const renderAnimeCard = ({ item }: { item: MyListAnime }) => (
    <TouchableOpacity 
      style={styles.animeCard}
      onPress={() => router.push({
        pathname: "/anime/[id]",
        params: { id: item.id }
      })}
    >
      <Image source={{ uri: item.img }} style={styles.animeImage} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.gradient}
      >
        <View>
          <Text style={styles.animeName} numberOfLines={2}>{item.name}</Text>
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={() => removeFromList(item.id)}
          >
            <MaterialIcons name="remove-circle-outline" size={24} color="#f4511e" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: hasBackgroundMedia ? 'transparent' : theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>My List</Text>
        {myList.length > 0 && (
          <TouchableOpacity 
            style={styles.clearAllButton}
            onPress={clearAllAnime}
          >
            <MaterialIcons name="delete-sweep" size={24} color="#f4511e" />
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>
      {initialLoading && myList.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#f4511e" />
        </View>
      ) : myList.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialIcons name="list" size={48} color="#666" />
          <Text style={styles.emptyText}>Your list is empty</Text>
          <TouchableOpacity 
            style={styles.browseButton}
            onPress={() => router.push('/')}
          >
            <Text style={styles.browseButtonText}>Browse Anime</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={myList}
          renderItem={renderAnimeCard}
          keyExtractor={(item) => item.id}
          numColumns={responsive.isLandscape ? 3 : 2}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#f4511e']}
              tintColor="#f4511e"
            />
          }
        />
      )}
    </View>
  );
}

const createResponsiveStyles = (responsive: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: responsive.isLandscape ? 20 : 16,
  },
  title: {
    fontSize: responsive.isLandscape ? 28 : 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 81, 30, 0.1)',
    paddingHorizontal: responsive.isLandscape ? 16 : 12,
    paddingVertical: responsive.isLandscape ? 8 : 6,
    borderRadius: responsive.isLandscape ? 10 : 8,
  },
  clearAllText: {
    color: '#f4511e',
    fontSize: responsive.isLandscape ? 16 : 14,
    fontWeight: '600',
    marginLeft: responsive.isLandscape ? 6 : 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: responsive.isLandscape ? 18 : 16,
    marginTop: responsive.isLandscape ? 20 : 16,
  },
  browseButton: {
    marginTop: responsive.isLandscape ? 20 : 16,
    paddingHorizontal: responsive.isLandscape ? 24 : 20,
    paddingVertical: responsive.isLandscape ? 12 : 10,
    backgroundColor: '#f4511e',
    borderRadius: responsive.isLandscape ? 10 : 8,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: responsive.isLandscape ? 18 : 16,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: responsive.isLandscape ? 12 : 8,
    paddingBottom: responsive.isLandscape ? 100 : 80,
  },
  animeCard: {
    flex: 1,
    margin: responsive.isLandscape ? 6 : 8,
    height: responsive.isLandscape ? 180 : 200,
    borderRadius: responsive.isLandscape ? 10 : 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  animeImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    padding: responsive.isLandscape ? 10 : 12,
    justifyContent: 'space-between',
  },
  animeName: {
    color: '#fff',
    fontSize: responsive.isLandscape ? 12 : 14,
    fontWeight: 'bold',
  },
  removeButton: {
    alignSelf: 'flex-end',
  },
}); 