import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Share, Image, Alert, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { APP_CONFIG, getAppVersion, getAppVersionCode } from '../constants/appConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWatchHistoryStore } from '../store/watchHistoryStore';
import { useMyListStore } from '../store/myListStore';

interface UpdateInfo {
  latestVersion: string;
  minVersion: string;
  versionCode: number;
  changelog: string[];
  downloadUrls: {
    universal: string;
    arm64: string;
    x86_64: string;
    x86: string;
  };
  releaseDate: string;
  isForced: boolean;
}

export default function AboutScreen() {
  const appVersion = getAppVersion();
  const [checking, setChecking] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [stats, setStats] = useState({
    watchedEpisodes: 0,
    watchedAnime: 0,
    totalWatchTime: 0,
    bookmarkedAnime: 0
  });
  
  const { history } = useWatchHistoryStore();
  const { myList } = useMyListStore();

  useEffect(() => {
    // Calculate statistics from real user data
    const calculateStats = () => {
      // Count unique anime by creating a Set of unique anime IDs from watch history
      const uniqueAnime = new Set(history.map(item => item.id));
      
      // Calculate total watch time in minutes from actual duration data in history
      const totalMinutes = history.reduce((total, item) => {
        // Only count if duration exists, convert seconds to minutes
        return total + (item.duration ? Math.floor(item.duration / 60) : 0);
      }, 0);
      
      // Set real statistics based on user's actual data
      setStats({
        watchedEpisodes: history.length, // Total number of episodes in watch history
        watchedAnime: uniqueAnime.size, // Number of unique anime watched
        totalWatchTime: totalMinutes, // Total watch time in minutes
        bookmarkedAnime: myList.length // Number of bookmarked anime
      });
    };
    
    calculateStats();
  }, [history, myList]);

  // Format watch time into hours and minutes
  const formatWatchTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} hr ${mins} min`;
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) => console.error('Error opening URL:', err));
  };

  const shareApp = async () => {
    try {
      await Share.share({
        message: `Check out ${APP_CONFIG.APP_NAME}, the best anime streaming app! Download now: ${APP_CONFIG.WEBSITE_URL}`,
      });
    } catch (error) {
      console.error('Error sharing app:', error);
    }
  };

  const sendFeedback = () => {
    const subject = encodeURIComponent(`${APP_CONFIG.APP_NAME} Feedback - v${appVersion}`);
    const body = encodeURIComponent(
      `\n\n\n` +
      `------------------\n` +
      `App Version: ${appVersion}\n` +
      `Device: ${Platform.OS} ${Platform.Version}\n` +
      `------------------`
    );
    openLink(`mailto:${APP_CONFIG.SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
  };

  const checkForUpdates = async () => {
    try {
      setChecking(true);
      const response = await fetch(`${APP_CONFIG.API_BASE_URL}/updates`);
      const updateData: UpdateInfo = await response.json();
      
      const currentVersion = getAppVersion();
      const currentVersionCode = getAppVersionCode();
      
      if (updateData.versionCode > currentVersionCode || 
          updateData.latestVersion > currentVersion) {
        
        // Show update dialog
        Alert.alert(
          'Update Available',
          `A new version (${updateData.latestVersion}) is available!\n\nWhat's New:\n${updateData.changelog.map(change => `• ${change}`).join('\n')}`,
          [
            {
              text: 'Update Now',
              onPress: () => {
                const downloadUrl = updateData.downloadUrls.universal;
                Linking.openURL(downloadUrl);
              }
            },
            {
              text: 'Later',
              style: 'cancel'
            }
          ]
        );
      } else {
        // No updates available
        Alert.alert(
          'No Updates Available',
          `You're using the latest version (${currentVersion}).`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      Alert.alert(
        'Error',
        'Failed to check for updates. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setChecking(false);
    }
  };

  const navigateToHistory = () => {
    router.push('/history');
  };

  const clearAppCache = async () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear the app cache? This will remove all temporary data but won\'t affect your watch history or bookmarks.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              setClearingCache(true);
              // Clear all cache keys
              const keys = Object.values(APP_CONFIG.CACHE_KEYS);
              await AsyncStorage.multiRemove(keys);
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              console.error('Error clearing cache:', error);
              Alert.alert('Error', 'Failed to clear cache');
            } finally {
              setClearingCache(false);
            }
          }
        }
      ]
    );
  };

  const navigateToDownloads = () => {
    // This would navigate to a downloads management page
    // router.push('/downloads');
    Alert.alert('Coming Soon', 'Downloads management will be available in a future update.');
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'About',
          headerStyle: {
            backgroundColor: '#1a1a1a',
          },
          headerTintColor: '#fff',
        }}
      />
      <ScrollView style={styles.container}>
        {/* App Header */}
        <LinearGradient
          colors={[APP_CONFIG.PRIMARY_COLOR, APP_CONFIG.SECONDARY_COLOR]}
          style={styles.header}
        >
          <Image
            source={require('../assets/icon.png')}
            style={styles.appIcon}
            resizeMode="contain"
          />
          <Text style={styles.appName}>{APP_CONFIG.APP_NAME}</Text>
          <Text style={styles.appVersion}>Version {appVersion}</Text>
        </LinearGradient>

        {/* App Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.infoCard}>
            <Text style={styles.aboutText}>
              {APP_CONFIG.APP_NAME} is a free anime streaming app that lets you watch your favorite anime shows and movies anytime, anywhere.
            </Text>
            <Text style={styles.aboutText}>
              With a vast library of content, {APP_CONFIG.APP_NAME} provides a seamless viewing experience with high-quality streams and a user-friendly interface.
            </Text>
          </View>
        </View>

        {/* App Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Statistics</Text>
          <View style={styles.infoCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MaterialIcons name="movie" size={24} color="#f4511e" />
                <Text style={styles.statValue}>{stats.watchedEpisodes}</Text>
                <Text style={styles.statLabel}>Episodes</Text>
              </View>
              
              <View style={styles.statItem}>
                <MaterialIcons name="tv" size={24} color="#f4511e" />
                <Text style={styles.statValue}>{stats.watchedAnime}</Text>
                <Text style={styles.statLabel}>Anime</Text>
              </View>
              
              <View style={styles.statItem}>
                <MaterialIcons name="bookmark" size={24} color="#f4511e" />
                <Text style={styles.statValue}>{stats.bookmarkedAnime}</Text>
                <Text style={styles.statLabel}>Bookmarked</Text>
              </View>
            </View>
            
            <View style={styles.watchTimeContainer}>
              <MaterialIcons name="access-time" size={20} color="#f4511e" />
              <Text style={styles.watchTimeText}>
                Total Watch Time: {formatWatchTime(stats.totalWatchTime)}
              </Text>
            </View>
          </View>
        </View>

        {/* User Content */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Content</Text>
          <View style={styles.infoCard}>
            <TouchableOpacity onPress={navigateToHistory}>
              <InfoRow icon="history" label="Watch History" value="View" isLink />
            </TouchableOpacity>
            <SectionDivider />
            <TouchableOpacity onPress={() => router.push('/mylist')}>
              <InfoRow icon="bookmark" label="My List" value="View" isLink />
            </TouchableOpacity>
            <SectionDivider />
            <TouchableOpacity onPress={navigateToDownloads}>
              <InfoRow icon="file-download" label="Downloads" value="Manage" isLink />
            </TouchableOpacity>
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <View style={styles.infoCard}>
            <TouchableOpacity onPress={clearAppCache} disabled={clearingCache}>
              <InfoRow 
                icon="cleaning-services" 
                label="Clear Cache" 
                value={clearingCache ? "Clearing..." : "Clear"} 
                isLink 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <View style={styles.infoCard}>
            <TouchableOpacity onPress={checkForUpdates} disabled={checking}>
              <InfoRow 
                icon="system-update" 
                label="Check for Updates" 
                value={checking ? "Checking..." : "Check"} 
                isLink 
              />
            </TouchableOpacity>
            <SectionDivider />
            <TouchableOpacity>
              <InfoRow 
                icon="brightness-6" 
                label="App Theme" 
                value="Dark" 
                isLink 
              />
            </TouchableOpacity>
            <SectionDivider />
            <TouchableOpacity onPress={shareApp}>
              <InfoRow icon="share" label="Share App" value="Share" isLink />
            </TouchableOpacity>
            <SectionDivider />
            <TouchableOpacity onPress={sendFeedback}>
              <InfoRow icon="feedback" label="Send Feedback" value="Send" isLink />
            </TouchableOpacity>
          </View>
        </View>

        {/* Developer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="code" label="Developed By" value={`${APP_CONFIG.APP_NAME} Team`} />
            <SectionDivider />
            <TouchableOpacity onPress={() => openLink(`mailto:${APP_CONFIG.SUPPORT_EMAIL}`)}>
              <InfoRow icon="email" label="Contact" value={APP_CONFIG.SUPPORT_EMAIL} isLink />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with ❤️ for anime fans</Text>
        </View>
      </ScrollView>
    </>
  );
}

// Helper component for info rows
interface InfoRowProps {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  value: string;
  isLink?: boolean;
}

function InfoRow({ icon, label, value, isLink = false }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <MaterialIcons name={icon} size={20} color="#f4511e" style={styles.infoIcon} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, isLink && styles.linkText]}>{value}</Text>
    </View>
  );
}

// Add this component after the InfoRow component
function SectionDivider() {
  return <View style={styles.sectionDivider} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 10,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  appVersion: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoIcon: {
    marginRight: 10,
  },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    color: '#ccc',
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'right',
    flex: 1,
  },
  linkText: {
    color: '#f4511e',
  },
  aboutText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 10,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#999',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  statItem: {
    alignItems: 'center',
    padding: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  watchTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  watchTimeText: {
    color: '#ccc',
    marginLeft: 8,
    fontSize: 14,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 10,
  },
}); 