import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Modal, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';

interface ControlsOverlayProps {
  showControls: boolean;
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
  lang: string;
};

const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  showControls,
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
}) => {
  const [showSpeedOptions, setShowSpeedOptions] = useState(false);
  const [showQualityOptions, setShowQualityOptions] = useState(false);
  const [showSubtitleOptions, setShowSubtitleOptions] = useState(false);
  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  // Filter out thumbnail subtitles
  const filteredSubtitles = useMemo(() => 
    subtitles.filter(sub => sub.lang !== 'thumbnails'),
    [subtitles]
  );

  // Group subtitles by language region for better organization
  const groupedSubtitles = useMemo(() => {
    const groups: { [key: string]: Array<Subtitle & { id: string }> } = {
      'English': [],
      'Asian': [],
      'European': [],
      'Other': []
    };

    filteredSubtitles.forEach((sub, index) => {
      // Create a unique ID for each subtitle
      const subtitleWithId = {
        ...sub,
        id: `${sub.lang}_${index}`
      };

      if (sub.lang.startsWith('English')) {
        groups['English'].push(subtitleWithId);
      } else if (['Japanese', 'Chinese', 'Korean', 'Thai', 'Vietnamese', 'Indonesian'].includes(sub.lang)) {
        groups['Asian'].push(subtitleWithId);
      } else if (['French', 'German', 'Italian', 'Spanish', 'Portuguese'].includes(sub.lang)) {
        groups['European'].push(subtitleWithId);
      } else {
        groups['Other'].push(subtitleWithId);
      }
    });

    return groups;
  }, [filteredSubtitles]);

  // Add selectedSubtitleId state to track the specific selected subtitle
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(() => {
    if (selectedSubtitle && filteredSubtitles.length > 0) {
      const firstMatch = filteredSubtitles.findIndex(sub => sub.lang === selectedSubtitle);
      return firstMatch >= 0 ? `${selectedSubtitle}_${firstMatch}` : null;
    }
    return null;
  });

  const handleSpeedSelect = (speed: number) => {
    onPlaybackSpeedChange(speed);
    setShowSpeedOptions(false);
  };

  const handleQualitySelect = (quality: string) => {
    onQualityChange(quality);
    setShowQualityOptions(false);
  };

  const handleSubtitleSelect = (lang: string | null, id: string | null = null) => {
    setSelectedSubtitleId(id);
    onSubtitleChange(lang);
    setShowSubtitleOptions(false);
  };

  return (
    <View 
      style={styles.controlsOverlay}
      pointerEvents="box-none"
    >
      {/* Top bar with controls */}
      <LinearGradient
        colors={["rgba(0,0,0,0.7)", "transparent"]}
        style={styles.topBar}
      >
        <View style={styles.topBarContent}>
          {/* Left side subtitle control */}
          <View style={styles.topLeftControls}>
            <TouchableOpacity
              style={[
                styles.topControlButton,
                selectedSubtitle && styles.activeTopControlButton
              ]}
              onPress={() => setShowSubtitleOptions(true)}
              activeOpacity={0.5}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <MaterialIcons
                name="subtitles"
                size={20}
                color="white"
              />
              <Text style={styles.topButtonText}>
                {selectedSubtitle || 'CC'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Moved controls to top right */}
          <View style={styles.topRightControls}>
            {/* Speed Button */}
            <TouchableOpacity
              style={styles.topControlButton}
              onPress={() => setShowSpeedOptions(true)}
              activeOpacity={0.5}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Text style={styles.topButtonText}>{playbackSpeed}x</Text>
            </TouchableOpacity>

            {/* Quality Button */}
            {qualities.length > 1 && (
              <TouchableOpacity
                style={[
                  styles.topControlButton,
                  isQualityChanging && styles.qualityChanging
                ]}
                onPress={() => setShowQualityOptions(true)}
                activeOpacity={0.5}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                disabled={isQualityChanging}
              >
                <Text style={styles.topButtonText}>
                  {selectedQuality}
                  {isQualityChanging && '...'}
                </Text>
              </TouchableOpacity>
            )}
            
            {/* Fullscreen button */}
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
        {/* Play/pause button moved above the progress bar */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={onPlayPress}
            activeOpacity={0.5}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <MaterialIcons
              name={isPlaying ? "pause" : "play-arrow"}
              size={20}
              color="white"
            />
          </TouchableOpacity>
        </View>
        
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
                  style={[
                    styles.subtitleOptionButton,
                    !selectedSubtitle && styles.selectedSubtitleButton
                  ]}
                  onPress={() => {
                    onSubtitleChange(null);
                    setShowSubtitleOptions(false);
                  }}
                >
                  <Text style={[
                    styles.subtitleOptionText,
                    !selectedSubtitle && styles.selectedSubtitleText
                  ]}>
                    Off
                  </Text>
                </TouchableOpacity>

                {/* English subtitles first */}
                {groupedSubtitles['English'].length > 0 && (
                  <>
                    <Text style={styles.subtitleGroupHeader}>English</Text>
                    {groupedSubtitles['English'].map(sub => (
                      <TouchableOpacity
                        key={sub.id}
                        style={[
                          styles.subtitleOptionButton,
                          selectedSubtitle === sub.lang && selectedSubtitleId === sub.id && styles.selectedSubtitleButton
                        ]}
                        onPress={() => {
                          handleSubtitleSelect(sub.lang, sub.id);
                        }}
                      >
                        <Text style={[
                          styles.subtitleOptionText,
                          selectedSubtitle === sub.lang && selectedSubtitleId === sub.id && styles.selectedSubtitleText
                        ]}>
                          {sub.lang} {groupedSubtitles['English'].length > 1 ? `(${sub.id.split('_')[1]})` : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {/* Asian languages */}
                {groupedSubtitles['Asian'].length > 0 && (
                  <>
                    <Text style={styles.subtitleGroupHeader}>Asian Languages</Text>
                    {groupedSubtitles['Asian'].map(sub => (
                      <TouchableOpacity
                        key={sub.id}
                        style={[
                          styles.subtitleOptionButton,
                          selectedSubtitle === sub.lang && selectedSubtitleId === sub.id && styles.selectedSubtitleButton
                        ]}
                        onPress={() => {
                          handleSubtitleSelect(sub.lang, sub.id);
                        }}
                      >
                        <Text style={[
                          styles.subtitleOptionText,
                          selectedSubtitle === sub.lang && selectedSubtitleId === sub.id && styles.selectedSubtitleText
                        ]}>
                          {sub.lang} {groupedSubtitles['Asian'].filter(s => s.lang === sub.lang).length > 1 ? `(${sub.id.split('_')[1]})` : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {/* European languages */}
                {groupedSubtitles['European'].length > 0 && (
                  <>
                    <Text style={styles.subtitleGroupHeader}>European Languages</Text>
                    {groupedSubtitles['European'].map(sub => (
                      <TouchableOpacity
                        key={sub.id}
                        style={[
                          styles.subtitleOptionButton,
                          selectedSubtitle === sub.lang && selectedSubtitleId === sub.id && styles.selectedSubtitleButton
                        ]}
                        onPress={() => {
                          handleSubtitleSelect(sub.lang, sub.id);
                        }}
                      >
                        <Text style={[
                          styles.subtitleOptionText,
                          selectedSubtitle === sub.lang && selectedSubtitleId === sub.id && styles.selectedSubtitleText
                        ]}>
                          {sub.lang} {groupedSubtitles['European'].filter(s => s.lang === sub.lang).length > 1 ? `(${sub.id.split('_')[1]})` : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {/* Other languages */}
                {groupedSubtitles['Other'].length > 0 && (
                  <>
                    <Text style={styles.subtitleGroupHeader}>Other Languages</Text>
                    {groupedSubtitles['Other'].map(sub => (
                      <TouchableOpacity
                        key={sub.id}
                        style={[
                          styles.subtitleOptionButton,
                          selectedSubtitle === sub.lang && selectedSubtitleId === sub.id && styles.selectedSubtitleButton
                        ]}
                        onPress={() => {
                          handleSubtitleSelect(sub.lang, sub.id);
                        }}
                      >
                        <Text style={[
                          styles.subtitleOptionText,
                          selectedSubtitle === sub.lang && selectedSubtitleId === sub.id && styles.selectedSubtitleText
                        ]}>
                          {sub.lang} {groupedSubtitles['Other'].filter(s => s.lang === sub.lang).length > 1 ? `(${sub.id.split('_')[1]})` : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  spacer: {
    flex: 1,
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
    paddingBottom: 16, // Reduced padding as progress bar is now at bottom
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8, // Added margin top instead of bottom
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
    height: 40, // Increased touch area
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8, // Changed from marginTop to marginBottom
  },
  rightControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 3,
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
    maxHeight: '80%',
  },
  subtitleScrollView: {
    flexGrow: 0,
    maxHeight: 400,
  },
  subtitleGroupHeader: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  subtitleOptionsContainer: {
    flexDirection: "column",
    width: "100%",
    paddingHorizontal: 16,
  },
  subtitleOptionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 1,
    backgroundColor: "#333",
    width: "100%",
  },
  selectedSubtitleButton: {
    backgroundColor: "#f4511e",
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
});

export default React.memo(ControlsOverlay); 