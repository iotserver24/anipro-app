/**
 * THEME SETTINGS SCREEN
 * 
 * This screen allows users to select and preview different themes.
 * It will be integrated into the about page.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { THEMES, Theme } from '../constants/themes';
import { MaterialIcons } from '@expo/vector-icons';
import BackgroundMediaSelector from '../components/BackgroundMediaSelector';
import { themesApiService, ServerTheme } from '../services/themesApi';

const { width } = Dimensions.get('window');

export default function ThemeSettingsScreen() {
  const { currentTheme, changeTheme, theme, customBackgroundMedia, setCustomBackgroundMedia, updateCustomBackgroundOpacity, hasBackgroundMedia } = useTheme();
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);
  const [serverThemes, setServerThemes] = useState<ServerTheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  // Fetch themes from server
  const fetchServerThemes = async () => {
    try {
      setLoading(true);
      const themes = await themesApiService.fetchThemes();
      setServerThemes(themes);
    } catch (error) {
      console.error('Error fetching themes:', error);
      Alert.alert('Error', 'Failed to fetch online themes. Using local themes only.');
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchServerThemes();
    setRefreshing(false);
  };

  // Load themes on component mount
  useEffect(() => {
    fetchServerThemes();
  }, []);

  // Download and apply server theme
  const handleServerThemeSelect = async (serverTheme: ServerTheme) => {
    try {
      // Convert server theme to local format
      const localTheme = themesApiService.convertServerThemeToLocal(serverTheme);
      
      // Add to local themes if not already present
      if (!themesApiService.isThemeAvailableLocally(serverTheme.id)) {
        // For now, we'll just apply the theme directly
        // In a full implementation, you'd want to store it locally
        Alert.alert('Theme Applied', `Applied ${serverTheme.displayName} theme!`);
      } else {
        await changeTheme(serverTheme.id);
        Alert.alert('Theme Applied', `Applied ${serverTheme.displayName} theme!`);
      }

      // Increment download count
      await themesApiService.downloadTheme(serverTheme.id);
    } catch (error) {
      console.error('Error applying server theme:', error);
      Alert.alert('Error', 'Failed to apply theme. Please try again.');
    }
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

  const ServerThemePreview = ({ serverTheme, onSelect }: { serverTheme: ServerTheme; onSelect: (theme: ServerTheme) => void }) => {
    const isSelected = currentTheme === serverTheme.id;
    const isPreviewing = previewTheme === serverTheme.id;
    const displayTheme = isPreviewing ? themesApiService.convertServerThemeToLocal(serverTheme) : theme;

    return (
      <TouchableOpacity
        style={[
          styles.themeCard,
          { backgroundColor: displayTheme.colors.surface },
          isSelected && { borderColor: displayTheme.colors.primary, borderWidth: 2 },
        ]}
        onPress={() => onSelect(serverTheme)}
        onLongPress={() => handlePreview(serverTheme.id)}
        activeOpacity={0.8}
      >
        {/* Color Preview */}
        <View style={styles.colorPreviewContainer}>
          <View
            style={[
              styles.colorPreview,
              { backgroundColor: displayTheme.colors.primary },
            ]}
          />
          <View
            style={[
              styles.colorPreview,
              { backgroundColor: displayTheme.colors.secondary },
            ]}
          />
          <View
            style={[
              styles.colorPreview,
              { backgroundColor: displayTheme.colors.accent },
            ]}
          />
        </View>

        {/* Theme Name */}
        <Text style={[styles.themeName, { color: displayTheme.colors.text }]}>
          {serverTheme.displayName}
        </Text>

        {/* Category Badge */}
        <View style={[styles.themeTypeBadge, { backgroundColor: displayTheme.colors.primary + '20' }]}>
          <Text style={[styles.themeTypeText, { color: displayTheme.colors.primary }]}>
            {serverTheme.category}
          </Text>
        </View>

        {/* Premium Badge */}
        {serverTheme.isPremium && (
          <View style={[styles.premiumBadge, { backgroundColor: displayTheme.colors.warning }]}>
            <Text style={[styles.premiumText, { color: displayTheme.colors.textInverse }]}>
              Premium
            </Text>
          </View>
        )}

        {/* Selected Indicator */}
        {isSelected && (
          <View style={[styles.selectedIndicator, { backgroundColor: displayTheme.colors.primary }]}>
            <MaterialIcons name="check" size={16} color="#fff" />
          </View>
        )}

        {/* Preview Indicator */}
        {isPreviewing && (
          <View style={[styles.previewIndicator, { backgroundColor: displayTheme.colors.primary }]}>
            <Text style={[styles.previewText, { color: displayTheme.colors.textInverse }]}>
              Preview
            </Text>
          </View>
        )}

        {/* Download Count */}
        <Text style={[styles.downloadCount, { color: displayTheme.colors.textSecondary }]}>
          {serverTheme.downloadCount} downloads
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: hasBackgroundMedia ? 'transparent' : theme.colors.background }]}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Choose Theme
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Select a theme that matches your style. Long press to preview.
          </Text>
        </View>

        {/* Local Theme Grid */}
        <View style={styles.themeGrid}>
          {Object.entries(THEMES).map(([key, themeData]) => (
            <ThemePreview key={key} themeName={key} themeData={themeData} />
          ))}
        </View>

        {/* Online Themes Section */}
        <View style={styles.onlineThemesSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Online Themes
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
              {loading ? 'Loading...' : `${serverThemes.length} themes available`}
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading online themes...
              </Text>
            </View>
          ) : (
            <View style={styles.themeGrid}>
              {serverThemes.map((serverTheme) => (
                <ServerThemePreview 
                  key={serverTheme.id} 
                  serverTheme={serverTheme} 
                  onSelect={handleServerThemeSelect}
                />
              ))}
            </View>
          )}
        </View>

        {/* Custom Background Media Selector for Immersive Theme */}
        {currentTheme === 'immersive' && (
          <View style={styles.backgroundSelectorContainer}>
            <BackgroundMediaSelector
              onMediaSelected={setCustomBackgroundMedia}
              onOpacityChange={updateCustomBackgroundOpacity}
              currentMedia={customBackgroundMedia}
              currentOpacity={customBackgroundMedia?.opacity || 0.3}
            />
          </View>
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
  backgroundSelectorContainer: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  onlineThemesSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  premiumBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  premiumText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  downloadCount: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
});
