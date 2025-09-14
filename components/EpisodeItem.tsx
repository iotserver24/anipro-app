import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export type APIEpisode = {
  id: string;
  number: number;
  title: string;
  isSubbed: boolean;
  isDubbed: boolean;
  url: string;
  isFiller: boolean;
};

interface EpisodeItemProps {
  episode: APIEpisode;
  onPress: () => void;
  onLongPress: () => void;
  mode: 'sub' | 'dub';
  animeTitle: string;
  onShare: () => void;
}

const EpisodeItem = React.memo(({
  episode,
  onPress,
  onLongPress,
  mode,
  animeTitle,
  onShare
}: EpisodeItemProps) => {
  const { theme } = useTheme();
  
  return (
  <TouchableOpacity
    style={[
      styles.episodeCard, 
      { backgroundColor: theme.colors.surface },
      episode.isFiller && [styles.fillerEpisodeCard, { borderLeftColor: theme.colors.primary }]
    ]}
    onPress={onPress}
    onLongPress={onLongPress}
  >
    <View style={styles.episodeContent}>
      <View style={styles.episodeNumberContainer}>
        <Text style={[styles.episodeNumber, { color: theme.colors.text }]}>{episode.number}</Text>
      </View>
      <View style={styles.episodeInfo}>
        <Text style={[styles.episodeTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {episode.title}
        </Text>
        <View style={styles.episodeBadges}>
          {mode === 'dub' && episode.isDubbed && (
            <Text style={[styles.dubBadge, { color: theme.colors.accent }]}>DUB</Text>
          )}
          {episode.isFiller && (
            <Text style={[styles.fillerBadge, { color: theme.colors.primary }]}>FILLER</Text>
          )}
        </View>
      </View>
      <View style={styles.episodeActions}>
        <TouchableOpacity onPress={onShare} style={styles.episodeActionButton}>
          <MaterialIcons name="share" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <MaterialIcons name="play-circle-outline" size={24} color={theme.colors.primary} />
      </View>
    </View>
  </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  episodeCard: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  fillerEpisodeCard: {
    borderLeftWidth: 3,
  },
  episodeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  episodeNumberContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  episodeNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  episodeInfo: {
    flex: 1,
    marginRight: 12,
  },
  episodeTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  episodeBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  fillerBadge: {
    fontSize: 12,
  },
  dubBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  episodeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  episodeActionButton: {
    padding: 4,
  },
});

export default EpisodeItem; 