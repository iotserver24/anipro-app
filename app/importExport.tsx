import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { DOMParser } from 'xmldom';
import { API_BASE, ENDPOINTS } from '../constants/api';
import { useMyListStore } from '../store/myListStore';
import { useWatchHistoryStore } from '../store/watchHistoryStore';
import LoadingModal from '../components/LoadingModal';
import * as Linking from 'expo-linking';

export default function ImportExportScreen() {
  const [loadingModal, setLoadingModal] = useState({
    visible: false,
    title: '',
    message: '',
    progress: {
      current: 0,
      total: 0,
      success: 0,
      failed: 0
    }
  });
  const [lastExportPath, setLastExportPath] = useState<string | null>(null);

  // Open MyAnimeList import page
  const openMALImport = () => {
    Linking.openURL('https://myanimelist.net/import.php');
  };
  // Open MyAnimeList export page
  const openMALExport = () => {
    Linking.openURL('https://myanimelist.net/panel.php?go=export');
  };
  // Open the folder containing the last export (if possible)
  const openExportFolder = () => {
    if (lastExportPath) {
      Linking.openURL(lastExportPath);
    }
  };

  // Function to handle importing watchlist from XML
  const handleImportWatchlist = async () => {
    try {
      // Pick document
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/xml',
        copyToCacheDirectory: true
      });
      
      if (result.canceled === false && result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        setLoadingModal({
          visible: true,
          title: 'Reading File',
          message: 'Processing your anime list...',
          progress: { current: 0, total: 0, success: 0, failed: 0 }
        });
        const fileContent = await FileSystem.readAsStringAsync(fileUri);
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(fileContent, 'text/xml');
        const animeNodes = xmlDoc.getElementsByTagName('anime');
        if (animeNodes.length === 0) {
          setLoadingModal(prev => ({ ...prev, visible: false }));
          Alert.alert('Error', 'No anime entries found in the imported file.');
          return;
        }
        setLoadingModal(prev => ({
          ...prev,
          title: 'Importing Anime',
          message: 'Searching and adding anime to your list...',
          progress: { ...prev.progress, total: animeNodes.length }
        }));
        const { addAnime } = useMyListStore.getState();
        const { addToHistory } = useWatchHistoryStore.getState();
        const BATCH_SIZE = 10;
        const apiCache = new Map();
        let successCount = 0;
        let failedCount = 0;
        let processedCount = 0;
        let watchHistoryCount = 0;
        const searchAndAddAnime = async (malId, title, watchedEpisodes) => {
          try {
            const cacheKey = `${malId}:${title}`;
            if (apiCache.has(cacheKey)) {
              const cachedData = apiCache.get(cacheKey);
              await addAnime(cachedData);
              if (watchedEpisodes && watchedEpisodes > 0) {
                await addAnimeToWatchHistory(cachedData.id, cachedData.name, cachedData.img, watchedEpisodes);
              }
              return true;
            }
            const apiUrl = `${API_BASE}${ENDPOINTS.ANIME_INFO}?malId=${malId}`;
            let response = await fetch(apiUrl);
            if (!response.ok) {
              const searchQuery = title.toLowerCase().trim().replace(/\s+/g, '-');
              const searchUrl = `${API_BASE}${ENDPOINTS.SEARCH.replace(':query', searchQuery)}`;
              response = await fetch(searchUrl);
              if (!response.ok) return false;
              const data = await response.json();
              if (data && data.results && data.results.length > 0) {
                let matchedAnime = null;
                for (const result of data.results) {
                  if (
                    (result.malId && result.malId === malId) ||
                    (result.idMal && result.idMal === malId) ||
                    (result.mappings && result.mappings.mal === malId)
                  ) {
                    matchedAnime = result;
                    break;
                  }
                }
                if (!matchedAnime) matchedAnime = data.results[0];
                const animeToAdd = {
                  id: matchedAnime.id,
                  name: matchedAnime.title || title,
                  img: matchedAnime.image || '',
                  addedAt: Date.now(),
                  malId: malId
                };
                apiCache.set(cacheKey, animeToAdd);
                await addAnime(animeToAdd);
                if (watchedEpisodes && watchedEpisodes > 0) {
                  await addAnimeToWatchHistory(animeToAdd.id, animeToAdd.name, animeToAdd.img, watchedEpisodes);
                }
                return true;
              }
              return false;
            } else {
              const animeData = await response.json();
              if (animeData) {
                const animeToAdd = {
                  id: animeData.id,
                  name: animeData.title || title,
                  img: animeData.image || '',
                  addedAt: Date.now(),
                  malId: malId
                };
                apiCache.set(cacheKey, animeToAdd);
                await addAnime(animeToAdd);
                if (watchedEpisodes && watchedEpisodes > 0) {
                  await addAnimeToWatchHistory(animeData.id, animeData.title || title, animeData.image || '', watchedEpisodes);
                }
                return true;
              }
              return false;
            }
          } catch {
            return false;
          }
        };
        const addAnimeToWatchHistory = async (animeId, animeName, animeImg, episodeNumber) => {
          try {
            const episodesUrl = `${API_BASE}${ENDPOINTS.INFO}?id=${animeId}`;
            const response = await fetch(episodesUrl);
            if (!response.ok) return false;
            const animeData = await response.json();
            if (!animeData || !animeData.episodes || !animeData.episodes.length) return false;
            let targetEpisode = animeData.episodes.find(ep => ep.number === episodeNumber);
            if (!targetEpisode) {
              const sortedEpisodes = [...animeData.episodes].sort((a, b) => b.number - a.number);
              targetEpisode = sortedEpisodes.find(ep => ep.number <= episodeNumber);
            }
            if (!targetEpisode && animeData.episodes.length > 0) {
              const sortedByNumber = [...animeData.episodes].sort((a, b) => b.number - a.number);
              targetEpisode = sortedByNumber[0];
            }
            if (targetEpisode) {
              const watchHistoryItem = {
                id: animeId,
                name: animeName,
                img: animeImg,
                episodeId: targetEpisode.id,
                episodeNumber: targetEpisode.number,
                timestamp: Date.now(),
                progress: 0,
                duration: 1440,
                lastWatched: Date.now(),
                subOrDub: 'sub'
              };
              await addToHistory(watchHistoryItem);
              watchHistoryCount++;
              return true;
            }
            return false;
          } catch {
            return false;
          }
        };
        const animeEntries = [];
        for (let i = 0; i < animeNodes.length; i++) {
          const animeNode = animeNodes[i];
          const idNode = animeNode.getElementsByTagName('series_animedb_id')[0];
          const titleNode = animeNode.getElementsByTagName('series_title')[0];
          const watchedEpisodesNode = animeNode.getElementsByTagName('my_watched_episodes')[0];
          if (idNode && titleNode) {
            const malId = idNode.textContent || '';
            const title = titleNode.textContent || '';
            const watchedEpisodes = watchedEpisodesNode ? parseInt(watchedEpisodesNode.textContent || '0', 10) : undefined;
            if (malId && title) {
              animeEntries.push({ malId, title, watchedEpisodes });
            }
          }
        }
        const processBatch = async (startIndex) => {
          const endIndex = Math.min(startIndex + BATCH_SIZE, animeEntries.length);
          const currentBatch = animeEntries.slice(startIndex, endIndex);
          await Promise.all(
            currentBatch.map(({ malId, title, watchedEpisodes }) => 
              searchAndAddAnime(malId, title, watchedEpisodes)
                .then(success => {
                  processedCount++;
                  if (success) successCount++; else failedCount++;
                  setLoadingModal(prev => ({
                    ...prev,
                    progress: {
                      ...prev.progress,
                      current: processedCount,
                      success: successCount,
                      failed: failedCount
                    }
                  }));
                  return success;
                })
                .catch(() => {
                  processedCount++;
                  failedCount++;
                  setLoadingModal(prev => ({
                    ...prev,
                    progress: {
                      ...prev.progress,
                      current: processedCount,
                      failed: failedCount
                    }
                  }));
                  return false;
                })
            )
          );
          if (endIndex < animeEntries.length) {
            setTimeout(() => processBatch(endIndex), 100);
          } else {
            setTimeout(() => {
              setLoadingModal(prev => ({ ...prev, visible: false }));
              Alert.alert(
                'Import Complete',
                `Successfully imported ${successCount} anime.\n` +
                `Added ${watchHistoryCount} anime to continue watching.\n` +
                `Failed to import ${failedCount} anime.`
              );
            }, 500);
          }
        };
        processBatch(0);
      }
    } catch (error) {
      setLoadingModal(prev => ({ ...prev, visible: false }));
      Alert.alert('Error', 'Failed to import list. Please try again.');
    }
  };

  // Function to handle exporting watchlist to XML
  const handleExportWatchlist = async () => {
    try {
      setLoadingModal({
        visible: true,
        title: 'Exporting List',
        message: 'Preparing your anime list for export...',
        progress: { current: 0, total: 1, success: 0, failed: 0 }
      });
      const { myList } = useMyListStore.getState();
      if (myList.length === 0) {
        setLoadingModal(prev => ({ ...prev, visible: false }));
        Alert.alert('Empty List', 'Your watchlist is empty. Nothing to export.');
        return;
      }
      const { history } = useWatchHistoryStore.getState();
      const animeWatchedEpisodes = new Map();
      history.forEach(item => {
        const currentEpisode = animeWatchedEpisodes.get(item.id) || 0;
        if (item.episodeNumber > currentEpisode) {
          animeWatchedEpisodes.set(item.id, item.episodeNumber);
        }
      });
      let xmlContent = '<?xml version="1.0"?>\n<myanimelist>\n';
      xmlContent += '  <myinfo>\n    <user_export_type>1</user_export_type>\n  </myinfo>\n';
      for (const anime of myList) {
        xmlContent += '  <anime>\n';
        xmlContent += `    <series_animedb_id>${anime.malId || anime.id}</series_animedb_id>\n`;
        xmlContent += `    <series_title>${anime.name}</series_title>\n`;
        xmlContent += '    <my_status>Watching</my_status>\n';
        const watchedEpisodes = animeWatchedEpisodes.get(anime.id);
        if (watchedEpisodes) {
          xmlContent += `    <my_watched_episodes>${watchedEpisodes}</my_watched_episodes>\n`;
        }
        xmlContent += '    <update_on_import>1</update_on_import>\n';
        xmlContent += '  </anime>\n';
      }
      xmlContent += '</myanimelist>';
      setLoadingModal(prev => ({
        ...prev,
        message: 'Creating export file...',
        progress: { ...prev.progress, current: 1 }
      }));
      // Save file in permanent local storage
      const fileName = `anipro_export_${Date.now()}.xml`;
      let fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, xmlContent);
      setLastExportPath(fileUri);
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        setLoadingModal(prev => ({ ...prev, visible: false }));
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/xml',
          dialogTitle: 'Export Watchlist',
          UTI: 'public.xml'
        });
      } else {
        setLoadingModal(prev => ({ ...prev, visible: false }));
        Alert.alert('Exported', `File saved to: ${fileUri}`);
      }
    } catch (error) {
      setLoadingModal(prev => ({ ...prev, visible: false }));
      Alert.alert('Error', 'Failed to export list. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Watchlist Import/Export</Text>
      </View>
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>How does this work?</Text>
        <View style={styles.infoList}>
          <Text style={styles.infoBullet}>• You can import or export your anime watchlist in MyAnimeList-compatible XML format.</Text>
          <Text style={styles.infoBullet}>• Use the export button to save your current watchlist as an XML file. This file can be imported into MyAnimeList or other apps that support the format.</Text>
          <Text style={styles.infoBullet}>• Use the import button to load a MyAnimeList XML file and add those anime to your watchlist.</Text>
          <Text style={styles.infoBullet}>• For best results, use the official MyAnimeList export/import tools:</Text>
        </View>
        <View style={styles.malButtonRow}>
          <TouchableOpacity style={styles.malButton} onPress={openMALImport}>
            <MaterialIcons name="file-upload" size={20} color="#fff" />
            <Text style={styles.malButtonText}>MAL Import Page</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.malButton} onPress={openMALExport}>
            <MaterialIcons name="file-download" size={20} color="#fff" />
            <Text style={styles.malButtonText}>MAL Export Page</Text>
          </TouchableOpacity>
        </View>
        {lastExportPath && (
          <View style={styles.exportInfoBox}>
            <Text style={styles.exportInfoText}>Last export saved to:</Text>
            <Text style={styles.exportInfoPath}>{lastExportPath}</Text>
            <TouchableOpacity style={styles.openFolderButton} onPress={openExportFolder}>
              <MaterialIcons name="folder-open" size={18} color="#2196F3" />
              <Text style={styles.openFolderText}>Open Export Location</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Watchlist Management</Text>
        <Text style={styles.infoText}>Import your anime list from MyAnimeList or export your current watchlist.</Text>
        <View style={styles.watchlistActionsContainer}>
          <TouchableOpacity 
            style={[styles.watchlistActionButton, {backgroundColor: '#4CAF50'}]}
            onPress={handleImportWatchlist}
          >
            <MaterialIcons name="file-upload" size={24} color="#fff" />
            <Text style={styles.buttonText}>Import List</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.watchlistActionButton, {backgroundColor: '#2196F3'}]}
            onPress={handleExportWatchlist}
          >
            <MaterialIcons name="file-download" size={24} color="#fff" />
            <Text style={styles.buttonText}>Export List</Text>
          </TouchableOpacity>
        </View>
      </View>
      <LoadingModal
        visible={loadingModal.visible}
        title={loadingModal.title}
        message={loadingModal.message}
        progress={loadingModal.progress}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  infoSection: {
    padding: 16,
    backgroundColor: '#181818',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    marginBottom: 18,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
  },
  infoList: {
    marginBottom: 10,
  },
  infoBullet: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  malButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  malButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 140,
    justifyContent: 'center',
    flexGrow: 1,
    flexBasis: '45%',
  },
  malButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  exportInfoBox: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    marginBottom: 4,
  },
  exportInfoText: {
    color: '#fff',
    fontSize: 13,
    marginBottom: 2,
  },
  exportInfoPath: {
    color: '#FFD700',
    fontSize: 13,
    marginBottom: 6,
  },
  openFolderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  openFolderText: {
    color: '#2196F3',
    fontSize: 13,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 16,
  },
  watchlistActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    width: '100%',
  },
  watchlistActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    flex: 0.48,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
}); 