import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '@react-navigation/native';
import TrendingSlider from '../components/TrendingSlider';

const HomeScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [trendingAnime, setTrendingAnime] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch trending anime data
  useEffect(() => {
    // This is sample data - in a real app, you would fetch from an API
    const sampleTrendingAnime = [
      {
        id: '1',
        english: 'Demon Slayer: Kimetsu no Yaiba',
        romaji: 'Kimetsu no Yaiba',
        cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-PEn1CTc93blC.jpg',
        banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/101922-YfZhKBUDDS6L.jpg',
        averageScore: 84,
      },
      {
        id: '2',
        english: 'Attack on Titan',
        romaji: 'Shingeki no Kyojin',
        cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-C6FPmWm59CyP.jpg',
        banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-8jpFCOcDmneX.jpg',
        averageScore: 85,
      },
      {
        id: '3',
        english: 'Jujutsu Kaisen',
        romaji: 'Jujutsu Kaisen',
        cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-979nF72r8JLj.jpg',
        banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/113415-jQBSkxWAAk83.jpg',
        averageScore: 87,
      },
      {
        id: '4',
        english: 'My Hero Academia',
        romaji: 'Boku no Hero Academia',
        cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21856-gutauxhWAwn6.png',
        banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21856-wtSHgeHFmzdG.jpg',
        averageScore: 79,
      },
      {
        id: '5',
        english: 'One Piece',
        romaji: 'One Piece',
        cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/nx21-tXMN3Y20PIL9.jpg',
        banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21-wf37VakJmZqs.jpg',
        averageScore: 83,
      },
    ];

    // Simulate API fetch delay
    setTimeout(() => {
      setTrendingAnime(sampleTrendingAnime);
      setIsLoading(false);
    }, 1000);
  }, []);

  // Handle anime selection
  const handleAnimePress = (anime) => {
    navigation.navigate('AnimeDetails', { anime });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Trending Now</Text>
        {!isLoading && (
          <TrendingSlider 
            data={trendingAnime} 
            onAnimePress={handleAnimePress}
          />
        )}
      </View>
      
      {/* You can add more sections here */}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionContainer: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});

export default HomeScreen; 