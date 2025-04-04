import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface VideoSettingsProps {
  visible: boolean;
  onClose: () => void;
  onQualityChange: (quality: string) => void;
  onSpeedChange: (speed: number) => void;
  currentQuality: string;
  currentSpeed: number;
  availableQualities: string[];
}

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

const VideoSettings: React.FC<VideoSettingsProps> = ({
  visible,
  onClose,
  onQualityChange,
  onSpeedChange,
  currentQuality,
  currentSpeed,
  availableQualities,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quality</Text>
            <View style={styles.optionsContainer}>
              {availableQualities.map((quality) => (
                <TouchableOpacity
                  key={quality}
                  style={[
                    styles.option,
                    quality === currentQuality && styles.selectedOption,
                  ]}
                  onPress={() => onQualityChange(quality)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      quality === currentQuality && styles.selectedOptionText,
                    ]}
                  >
                    {quality}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Playback Speed</Text>
            <View style={styles.optionsContainer}>
              {PLAYBACK_SPEEDS.map((speed) => (
                <TouchableOpacity
                  key={speed}
                  style={[
                    styles.option,
                    speed === currentSpeed && styles.selectedOption,
                  ]}
                  onPress={() => onSpeedChange(speed)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      speed === currentSpeed && styles.selectedOptionText,
                    ]}
                  >
                    {speed}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#999',
    fontSize: 16,
    marginBottom: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedOption: {
    backgroundColor: '#f4511e',
  },
  optionText: {
    color: '#fff',
    fontSize: 14,
  },
  selectedOptionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default VideoSettings;