import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomNav from '../components/BottomNav';
import { useMyListStore } from '../store/myListStore';

type MyListAnime = {
  id: string;
  name: string;
  img: string;
  addedAt: number;
};

export default function MyList() {
  const { myList, removeAnime, initializeStore } = useMyListStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await initializeStore();
      setLoading(false);
    };
    init();
  }, []);

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
        <Text style={styles.animeName} numberOfLines={2}>{item.name}</Text>
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={() => removeFromList(item.id)}
        >
          <MaterialIcons name="remove-circle-outline" size={24} color="#f4511e" />
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My List</Text>
      {loading ? (
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
          numColumns={2}
          contentContainerStyle={styles.listContainer}
        />
      )}
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
  },
  browseButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f4511e',
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 8,
    paddingBottom: 80,
  },
  animeCard: {
    flex: 1,
    margin: 8,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
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
    padding: 12,
    justifyContent: 'space-between',
  },
  animeName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  removeButton: {
    alignSelf: 'flex-end',
  },
}); 