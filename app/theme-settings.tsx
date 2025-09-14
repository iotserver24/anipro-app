import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { THEMES } from '../constants/themes';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function ThemeSettingsScreen() {
  const { currentTheme, changeTheme, theme, availableThemes } = useTheme();
  const [isChanging, setIsChanging] = useState(false);

  const handleThemeChange = async (themeName: string) => {
    if (themeName === currentTheme) return;
    
    setIsChanging(true);
    try {
      await changeTheme(themeName);
    } catch (error) {
      Alert.alert('Error', 'Failed to change theme. Please try again.');
    } finally {
      setIsChanging(false);
    }
  };

  const ThemePreview = ({ themeName, themeData }: { themeName: string; themeData: any }) => {
    const isSelected = currentTheme === themeName;
    
    return (
      <TouchableOpacity
        style={[
          styles.themeCard,
          { 
            backgroundColor: themeData.colors.surface,
            borderColor: isSelected ? themeData.colors.primary : themeData.colors.border,
            borderWidth: isSelected ? 2 : 1,
          }
        ]}
        onPress={() => handleThemeChange(themeName)}
        disabled={isChanging}
      >
        <View style={styles.themePreview}>
          <View style={[styles.colorPreview, { backgroundColor: themeData.colors.primary }]} />
          <View style={[styles.colorPreview, { backgroundColor: themeData.colors.secondary }]} />
          <View style={[styles.colorPreview, { backgroundColor: themeData.colors.accent }]} />
          <View style={[styles.colorPreview, { backgroundColor: themeData.colors.card }]} />
        </View>
        
        <View style={styles.themeInfo}>
          <Text style={[styles.themeName, { color: themeData.colors.text }]}>
            {themeData.name}
          </Text>
          {isSelected && (
            <View style={styles.selectedIndicator}>
              <MaterialIcons 
                name="check-circle" 
                size={20} 
                color={themeData.colors.primary} 
              />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isChanging) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Changing theme...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Choose Theme
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Select your preferred color scheme
          </Text>
        </View>

        <View style={styles.themesGrid}>
          {availableThemes.map((themeName) => (
            <ThemePreview
              key={themeName}
              themeName={themeName}
              themeData={THEMES[themeName]}
            />
          ))}
        </View>

        <View style={[styles.infoSection, { backgroundColor: theme.colors.surface }]}>
          <MaterialIcons 
            name="info" 
            size={24} 
            color={theme.colors.primary} 
            style={styles.infoIcon}
          />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
              Theme Information
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              Your theme preference will be saved and applied across the entire app. 
              You can change it anytime from this screen.
            </Text>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
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
  themesGrid: {
    padding: 20,
    paddingTop: 10,
  },
  themeCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  themePreview: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  themeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  themeName: {
    fontSize: 18,
    fontWeight: '600',
  },
  selectedIndicator: {
    marginLeft: 8,
  },
  infoSection: {
    flexDirection: 'row',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
