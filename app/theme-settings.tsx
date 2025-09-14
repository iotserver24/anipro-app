/**
 * THEME SETTINGS SCREEN
 * 
 * This screen allows users to select and preview different themes.
 * It will be integrated into the about page.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { THEMES, Theme } from '../constants/themes';
import { MaterialIcons } from '@expo/vector-icons';
import BackgroundMediaSelector from '../components/BackgroundMediaSelector';

const { width } = Dimensions.get('window');

export default function ThemeSettingsScreen() {
  const { currentTheme, changeTheme, theme, customBackgroundMedia, setCustomBackgroundMedia, updateCustomBackgroundOpacity, hasBackgroundMedia } = useTheme();
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);

  const handleThemeSelect = async (themeName: string) => {
    try {
      await changeTheme(themeName);
      setPreviewTheme(null);
      Alert.alert('Theme Changed', `Switched to ${THEMES[themeName].displayName} theme!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to change theme. Please try again.');
    }
  };

  const handlePreview = (themeName: string) => {
    setPreviewTheme(themeName);
  };

  const handleCancelPreview = () => {
    setPreviewTheme(null);
  };

  const ThemePreview = ({ themeName, themeData }: { themeName: string; themeData: Theme }) => {
    const isSelected = currentTheme === themeName;
    const isPreviewing = previewTheme === themeName;
    const displayTheme = isPreviewing ? themeData : theme;

    return (
      <TouchableOpacity
        style={[
          styles.themeCard,
          { 
            backgroundColor: displayTheme.colors.surface,
            borderColor: isSelected ? displayTheme.colors.primary : displayTheme.colors.border,
            borderWidth: isSelected ? 2 : 1,
          }
        ]}
        onPress={() => handleThemeSelect(themeName)}
        onLongPress={() => handlePreview(themeName)}
        activeOpacity={0.7}
      >
        {/* Theme Preview Colors */}
        <View style={styles.colorPreviewContainer}>
          <View style={[styles.colorPreview, { backgroundColor: displayTheme.colors.primary }]} />
          <View style={[styles.colorPreview, { backgroundColor: displayTheme.colors.secondary }]} />
          <View style={[styles.colorPreview, { backgroundColor: displayTheme.colors.accent }]} />
          <View style={[styles.colorPreview, { backgroundColor: displayTheme.colors.success }]} />
        </View>

        {/* Theme Name */}
        <Text style={[styles.themeName, { color: displayTheme.colors.text }]}>
          {themeData.displayName}
        </Text>

        {/* Theme Type Badge */}
        <View style={[
          styles.themeTypeBadge,
          { backgroundColor: displayTheme.colors.primary + '20' }
        ]}>
          <Text style={[styles.themeTypeText, { color: displayTheme.colors.primary }]}>
            {themeData.isDark ? 'Dark' : 'Light'}
          </Text>
        </View>

        {/* Background Media Indicator */}
        {themeData.colors.backgroundImage || themeData.colors.backgroundVideo ? (
          <View style={styles.mediaIndicator}>
            <MaterialIcons 
              name={themeData.colors.backgroundVideo ? 'videocam' : 'image'} 
              size={16} 
              color={displayTheme.colors.accent} 
            />
          </View>
        ) : null}

        {/* Selection Indicator */}
        {isSelected && (
          <View style={[styles.selectedIndicator, { backgroundColor: displayTheme.colors.primary }]}>
            <MaterialIcons name="check" size={20} color={displayTheme.colors.text} />
          </View>
        )}

        {/* Preview Indicator */}
        {isPreviewing && (
          <View style={[styles.previewIndicator, { backgroundColor: displayTheme.colors.accent }]}>
            <Text style={[styles.previewText, { color: displayTheme.colors.text }]}>
              Preview
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: hasBackgroundMedia ? 'transparent' : theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Choose Theme
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Select a theme that matches your style. Long press to preview.
          </Text>
        </View>

        {/* Theme Grid */}
        <View style={styles.themeGrid}>
          {Object.entries(THEMES).map(([key, themeData]) => (
            <ThemePreview key={key} themeName={key} themeData={themeData} />
          ))}
        </View>

        {/* Custom Background Media Selector for Immersive Theme */}
        {currentTheme === 'immersive' && (
          <BackgroundMediaSelector
            onMediaSelected={setCustomBackgroundMedia}
            onOpacityChange={updateCustomBackgroundOpacity}
            currentMedia={customBackgroundMedia}
            currentOpacity={customBackgroundMedia?.opacity || 0.3}
          />
        )}

        {/* Preview Controls */}
        {previewTheme && (
          <View style={[styles.previewControls, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.previewTitle, { color: theme.colors.text }]}>
              Previewing: {THEMES[previewTheme].displayName}
            </Text>
            <View style={styles.previewButtons}>
              <TouchableOpacity
                style={[styles.previewButton, { backgroundColor: theme.colors.buttonSecondary }]}
                onPress={handleCancelPreview}
              >
                <Text style={[styles.previewButtonText, { color: theme.colors.buttonSecondaryText }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.previewButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => handleThemeSelect(previewTheme)}
              >
                <Text style={[styles.previewButtonText, { color: theme.colors.buttonText }]}>
                  Apply
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Theme Info */}
        <View style={[styles.infoSection, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
            Theme Features
          </Text>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <MaterialIcons name="palette" size={20} color={theme.colors.primary} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                Custom color schemes for every mood
              </Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialIcons name="image" size={20} color={theme.colors.primary} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                Background images and videos support
              </Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialIcons name="auto-mode" size={20} color={theme.colors.primary} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                Automatic light/dark mode detection
              </Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialIcons name="save" size={20} color={theme.colors.primary} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                Settings saved automatically
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingBottom: 40,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  themeCard: {
    width: (width - 60) / 2,
    aspectRatio: 1.2,
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  colorPreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  themeName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  themeTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  themeTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mediaIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 4,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  previewText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  previewControls: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  previewButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  previewButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  previewButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoSection: {
    margin: 20,
    marginTop: 40,
    padding: 16,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
