import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

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
}: EpisodeItemProps) => (
  <TouchableOpacity
    style={[styles.episodeCard, episode.isFiller && styles.fillerEpisodeCard]}
    onPress={onPress}
    onLongPress={onLongPress}
  >
    <View style={styles.episodeContent}>
      <View style={styles.episodeNumberContainer}>
        <Text style={styles.episodeNumber}>{episode.number}</Text>
      </View>
      <View style={styles.episodeInfo}>
        <Text style={styles.episodeTitle} numberOfLines={1}>
          {episode.title}
        </Text>
        <View style={styles.episodeBadges}>
          {mode === 'dub' && episode.isDubbed && (
            <Text style={styles.dubBadge}>DUB</Text>
          )}
          {episode.isFiller && (
            <Text style={styles.fillerBadge}>FILLER</Text>
          )}
        </View>
      </View>
      <View style={styles.episodeActions}>
        <TouchableOpacity onPress={onShare} style={styles.episodeActionButton}>
          <MaterialIcons name="share" size={20} color="#f4511e" />
        </TouchableOpacity>
        <MaterialIcons name="play-circle-outline" size={24} color="#f4511e" />
      </View>
    </View>
  </TouchableOpacity>
));

const styles = StyleSheet.create({
  episodeCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  fillerEpisodeCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#f4511e',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  episodeInfo: {
    flex: 1,
    marginRight: 12,
  },
  episodeTitle: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  episodeBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  fillerBadge: {
    color: '#f4511e',
    fontSize: 12,
  },
  dubBadge: {
    color: '#4CAF50',
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