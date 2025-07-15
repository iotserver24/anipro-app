import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Modal, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';

interface ControlsOverlayProps {
  showControls: boolean;
  controlsLocked?: boolean;
  onToggleLock?: () => void;
  isPlaying: boolean;
  isFullscreen: boolean;
  currentTime: number;
  duration: number;
  title: string;
  onPlayPress: () => void;
  onFullscreenPress: () => void;
  onSeek: (value: number) => void;
  playbackSpeed: number;
  onPlaybackSpeedChange: (speed: number) => void;
  qualities?: Quality[];
  selectedQuality?: string;
  onQualityChange: (quality: string) => void;
  isQualityChanging?: boolean;
  subtitles?: Subtitle[];
  selectedSubtitle?: string;
  onSubtitleChange: (subtitle: string | null) => void;
  onSubtitleSettingsPress?: () => void;
}

// Format time helper function
const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds === Infinity) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

// Add Quality type if not already defined
type Quality = {
  url: string;
  quality: string;
};

// Add Subtitle type
type Subtitle = {
  url: string;
  lang?: string;
  language?: string;
  title?: string;
};

const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  showControls,
  controlsLocked = false,
  onToggleLock,
  isPlaying,
  isFullscreen,
  currentTime,
  duration,
  title,
  onPlayPress,
  onFullscreenPress,
  onSeek,
  playbackSpeed,
  onPlaybackSpeedChange,
  qualities = [],
  selectedQuality = 'auto',
  onQualityChange,
  isQualityChanging = false,
  subtitles = [],
  selectedSubtitle,
  onSubtitleChange,
  onSubtitleSettingsPress,
}) => {
  const [showSpeedOptions, setShowSpeedOptions] = useState(false);
  const [showQualityOptions, setShowQualityOptions] = useState(false);
  const [showSubtitleOptions, setShowSubtitleOptions] = useState(false);
  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  // Filter out thumbnail subtitles - Memoized for performance
  const filteredSubtitles = useMemo(() => 
    subtitles.filter(sub => {
      const langToCheck = sub.lang || sub.language || sub.title || '';
      return !langToCheck.toLowerCase().includes('thumbnails');
    }),
    [subtitles]
  );

  // Auto-select English subtitle as default
  useEffect(() => {
    if (filteredSubtitles.length > 0 && !selectedSubtitle) {
      const englishSub = filteredSubtitles.find(sub => 
        (sub.lang || sub.language || '').toLowerCase().includes('english')
      );
      if (englishSub && onSubtitleChange) {
        onSubtitleChange(englishSub.lang || englishSub.language || 'English');
      }
    }
  }, [filteredSubtitles, selectedSubtitle, onSubtitleChange]);

  // Optimized handlers with minimal state updates
  const handleSpeedSelect = (speed: number) => {
    onPlaybackSpeedChange(speed);
    setShowSpeedOptions(false);
  };

  const handleQualitySelect = (quality: string) => {
    onQualityChange(quality);
    setShowQualityOptions(false);
  };

  const handleSubtitleSelect = (lang: string | null, id: string | null = null) => {
    onSubtitleChange(lang);
    setShowSubtitleOptions(false);
  };

  return (
    <View 
      style={styles.controlsOverlay}
      pointerEvents="box-none"
    >
      {/* Lock/Unlock Button - Always Visible */}
      {onToggleLock && (
        <TouchableOpacity
          style={styles.lockButton}
          onPress={onToggleLock}
          activeOpacity={0.7}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <MaterialIcons
            name={controlsLocked ? "lock" : "lock-open"}
            size={24}
            color="white"
          />
        </TouchableOpacity>
      )}

      {/* All other controls - Hidden when locked */}
      {showControls && (
      <>
      {/* Top bar with controls */}
      <LinearGradient
        colors={["rgba(0,0,0,0.7)", "transparent"]}
        style={styles.topBar}
      >
        <View style={styles.topBarContent}>
          <View style={styles.topLeftControls}>
            {/* Empty space to avoid lock button overlap */}
          </View>

          <View style={styles.topRightControls}>
            {/* Quality Button */}
            <TouchableOpacity
              style={[styles.topControlButton, isQualityChanging && styles.qualityChanging]}
              onPress={() => setShowQualityOptions(true)}
              activeOpacity={0.7}
              disabled={isQualityChanging}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons 
                name="high-quality" 
                size={16} 
                color="white" 
              />
              <Text style={styles.topButtonText}>
                {selectedQuality}
              </Text>
            </TouchableOpacity>

            {/* Speed Button */}
            <TouchableOpacity
              style={styles.topControlButton}
              onPress={() => setShowSpeedOptions(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons 
                name="speed" 
                size={16} 
                color="white" 
              />
              <Text style={styles.topButtonText}>
                {playbackSpeed}x
              </Text>
            </TouchableOpacity>

            {/* CC Button */}
            {subtitles && subtitles.length > 0 && (
              <TouchableOpacity
                style={[styles.topControlButton, selectedSubtitle && styles.activeTopControlButton]}
                onPress={() => setShowSubtitleOptions(true)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons 
                  name="closed-caption" 
                  size={16} 
                  color="white" 
                />
                <Text style={styles.topButtonText}>
                  {selectedSubtitle || 'CC'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Settings Button */}
            <TouchableOpacity
              style={styles.topControlButton}
              onPress={onSubtitleSettingsPress}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons 
                name="tune" 
                size={16} 
                color="white" 
              />
            </TouchableOpacity>

            {/* Fullscreen Button */}
            <TouchableOpacity
              style={styles.topFullscreenButton}
              onPress={onFullscreenPress}
              activeOpacity={0.5}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <MaterialIcons
                name={isFullscreen ? "fullscreen-exit" : "fullscreen"}
                size={24}
                color="white"
              />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Center controls with skip and play/pause */}
      <View style={styles.centerControls}>
        <TouchableOpacity
          style={styles.skipBackwardButton}
          onPress={() => onSeek(Math.max(0, currentTime - 10))}
          activeOpacity={0.5}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <MaterialIcons name="replay-10" size={28} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playPauseButton}
          onPress={onPlayPress}
          activeOpacity={0.3}
          delayPressIn={0}
          hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
        >
          <MaterialIcons
            name={isPlaying ? "pause" : "play-arrow"}
            size={36}
            color="white"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipForwardButton}
          onPress={() => onSeek(Math.min(duration, currentTime + 10))}
          activeOpacity={0.5}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <MaterialIcons name="forward-10" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Bottom controls with progress bar */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.7)"]}
        style={styles.bottomControls}
      >
        {/* Progress bar moved to bottom */}
        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={duration > 0 ? duration : 1}
            value={currentTime}
            onSlidingComplete={onSeek}
            minimumTrackTintColor="#f4511e"
            maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
            thumbTintColor="#f4511e"
          />
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </LinearGradient>

      {/* Speed Selection Modal */}
      <Modal
        visible={showSpeedOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSpeedOptions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSpeedOptions(false)}
        >
          <View style={styles.speedModalContainer}>
            <View style={styles.speedModalContent}>
              <Text style={styles.speedModalTitle}>Playback Speed</Text>
              <View style={styles.speedOptionsContainer}>
                {speedOptions.map(speed => (
                  <TouchableOpacity
                    key={speed}
                    style={[
                      styles.speedOptionButton,
                      playbackSpeed === speed && styles.selectedSpeedButton
                    ]}
                    onPress={() => handleSpeedSelect(speed)}
                  >
                    <Text style={[
                      styles.speedOptionText,
                      playbackSpeed === speed && styles.selectedSpeedText
                    ]}>
                      {speed}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Quality Selection Modal */}
      <Modal
        visible={showQualityOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQualityOptions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowQualityOptions(false)}
        >
          <View style={styles.speedModalContainer}>
            <View style={styles.speedModalContent}>
              <Text style={styles.speedModalTitle}>Video Quality</Text>
              <View style={styles.speedOptionsContainer}>
                {qualities.map(quality => (
                  <TouchableOpacity
                    key={quality.quality}
                    style={[
                      styles.speedOptionButton,
                      selectedQuality === quality.quality && styles.selectedSpeedButton
                    ]}
                    onPress={() => handleQualitySelect(quality.quality)}
                  >
                    <Text style={[
                      styles.speedOptionText,
                      selectedQuality === quality.quality && styles.selectedSpeedText
                    ]}>
                      {quality.quality}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Updated Subtitle Selection Modal */}
      <Modal
        visible={showSubtitleOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSubtitleOptions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSubtitleOptions(false)}
        >
          <View style={[styles.speedModalContainer, styles.subtitleModalContainer]}>
            <View style={styles.speedModalContent}>
              <Text style={styles.speedModalTitle}>Subtitles</Text>
              
              <ScrollView style={styles.subtitleScrollView}>
                {/* Off option */}
                <TouchableOpacity
                  key="subtitle-off"
                  style={[
                    styles.subtitleOptionButton,
                    !selectedSubtitle && styles.selectedSubtitleButton
                  ]}
                  onPress={() => handleSubtitleSelect(null)}
                >
                  <Text style={[
                    styles.subtitleOptionText,
                    !selectedSubtitle && styles.selectedSubtitleText
                  ]}>
                    Off
                  </Text>
                </TouchableOpacity>

                {/* All filtered subtitles */}
                {filteredSubtitles.map((sub, index) => {
                  const subLang = sub.lang || sub.language || sub.title || 'Unknown';
                  return (
                    <TouchableOpacity
                      key={sub.url || subLang || index} // Use url as key for uniqueness, fallback to lang or index
                      style={[
                        styles.subtitleOptionButton,
                        selectedSubtitle === subLang && styles.selectedSubtitleButton
                      ]}
                      onPress={() => handleSubtitleSelect(subLang, sub.url)} // Pass url as id
                    >
                      <Text style={[
                        styles.subtitleOptionText,
                        selectedSubtitle === subLang && styles.selectedSubtitleText
                      ]}>
                        {subLang}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    zIndex: 1,
  },
  topBar: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 16,
  },
  topBarContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topLeftControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topRightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topControlButton: {
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  topButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  topFullscreenButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 10,
  },
  centerControls: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 50,
  },
  playPauseButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  skipBackwardButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  skipForwardButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomControls: {
    padding: 12,
    paddingTop: 16,
    paddingBottom: 16,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
    width: 40,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  slider: {
    flex: 1,
    marginHorizontal: 6,
    height: 40,
  },
  qualityChanging: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  speedModalContainer: {
    width: "80%",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    overflow: "hidden",
    paddingVertical: 16,
  },
  speedModalContent: {
    width: "100%",
  },
  speedModalTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  speedOptionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  speedOptionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#333",
    marginHorizontal: 6,
    marginBottom: 10,
  },
  selectedSpeedButton: {
    backgroundColor: "#f4511e",
  },
  speedOptionText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  selectedSpeedText: {
    color: "white",
  },
  activeTopControlButton: {
    backgroundColor: "#f4511e",
  },
  subtitleModalContainer: {
    maxHeight: '90%',
    height: 'auto',
  },
  subtitleScrollView: {
    flexGrow: 0,
    maxHeight: 500,
    minHeight: 200,
  },
  subtitleOptionsContainer: {
    flexDirection: "column",
    width: "100%",
    paddingHorizontal: 16,
  },
  subtitleOptionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 2,
    backgroundColor: "#2a2a2a",
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 4,
    width: "100%",
  },
  selectedSubtitleButton: {
    backgroundColor: "#f4511e",
    borderColor: "#f4511e",
  },
  subtitleOptionText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "left",
  },
  selectedSubtitleText: {
    color: "white",
    fontWeight: "600",
  },
  lockButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default React.memo(ControlsOverlay); 