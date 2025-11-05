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
  progressSeconds?: number;
  durationSeconds?: number;
}

const EpisodeItem = React.memo(({
  episode,
  onPress,
  onLongPress,
  mode,
  animeTitle,
  onShare,
  progressSeconds,
  durationSeconds
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
        {(typeof progressSeconds === 'number' && typeof durationSeconds === 'number' && durationSeconds > 0) && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, Math.max(0, (progressSeconds / durationSeconds) * 100))}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {formatTime(progressSeconds)} / {formatTime(durationSeconds)}
            </Text>
          </View>
        )}
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

const formatTime = (secs?: number) => {
  if (!secs || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

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
  progressContainer: {
    marginTop: 6,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    backgroundColor: '#f4511e',
  },
  progressText: {
    color: '#666',
    fontSize: 11,
    marginTop: 4,
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