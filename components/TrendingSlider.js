import React, { useRef, useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Dimensions, Animated } from 'react-native';
import { useTheme } from '@react-navigation/native';
import AnimeCard from './AnimeCard';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.85;
const ITEM_SPACING = width * 0.05;

const TrendingSlider = ({ data, onAnimePress }) => {
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const { colors } = useTheme();

  // Auto-scroll functionality
  useEffect(() => {
    let interval;
    
    if (data && data.length > 1) {
      interval = setInterval(() => {
        if (flatListRef.current) {
          try {
            const nextIndex = (currentIndex + 1) % data.length;
            flatListRef.current.scrollToIndex({
              index: nextIndex,
              animated: true,
            });
            setCurrentIndex(nextIndex);
          } catch (error) {
            console.error("Error scrolling to index:", error);
          }
        }
      }, 5000); // Change slide every 5 seconds
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentIndex, data]);

  // Handle scroll end to update current index
  const handleMomentumScrollEnd = (event) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / (ITEM_WIDTH + ITEM_SPACING));
    setCurrentIndex(newIndex);
  };

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={flatListRef}
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH + ITEM_SPACING}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        getItemLayout={(data, index) => ({
          length: ITEM_WIDTH + ITEM_SPACING,
          offset: (ITEM_WIDTH + ITEM_SPACING) * index,
          index,
        })}
        renderItem={({ item, index }) => {
          const inputRange = [
            (index - 1) * (ITEM_WIDTH + ITEM_SPACING),
            index * (ITEM_WIDTH + ITEM_SPACING),
            (index + 1) * (ITEM_WIDTH + ITEM_SPACING),
          ];
          
          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.9, 1, 0.9],
            extrapolate: 'clamp',
          });
          
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.7, 1, 0.7],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              style={[
                styles.itemContainer,
                {
                  transform: [{ scale }],
                  opacity,
                },
              ]}
            >
              <AnimeCard
                anime={item}
                onPress={() => onAnimePress(item)}
                style={styles.card}
                showTitle={true}
                showScore={true}
              />
            </Animated.View>
          );
        }}
        keyExtractor={(item) => item.id}
      />
      
      {/* Pagination dots */}
      <View style={styles.paginationContainer}>
        {data.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              {
                backgroundColor: index === currentIndex ? colors.primary : colors.border,
                width: index === currentIndex ? 20 : 8,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  listContent: {
    paddingHorizontal: ITEM_SPACING,
  },
  itemContainer: {
    width: ITEM_WIDTH,
    marginHorizontal: ITEM_SPACING / 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  card: {
    height: 220,
    borderRadius: 12,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});

export default TrendingSlider; 