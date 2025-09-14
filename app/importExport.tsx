import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, ToastAndroid, Platform, Modal, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { DOMParser } from 'xmldom';
import { API_BASE, ENDPOINTS } from '../constants/api';
import { useMyListStore } from '../store/myListStore';
import { useWatchHistoryStore } from '../store/watchHistoryStore';
import LoadingModal from '../components/LoadingModal';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EXPORT_FOLDER_KEY = 'export_folder_uri';
const APP_STORAGE_FOLDER_KEY = 'APP_STORAGE_FOLDER_URI';
const ANILIST_USERNAME_KEY = 'anilist_username';

export default function ImportExportScreen() {
  const { theme, hasBackgroundMedia } = useTheme();
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
  const [exportFolder, setExportFolder] = useState<string | null>(null);
  const [storageFolder, setStorageFolder] = useState<string | null>(null);
  const [showExportFormatModal, setShowExportFormatModal] = useState(false);
  const [pendingExportFormat, setPendingExportFormat] = useState<'xml' | 'json' | 'txt' | null>(null);
  const [showImportFormatModal, setShowImportFormatModal] = useState(false);
  const [showAniListModal, setShowAniListModal] = useState(false);
  const [aniListUsername, setAniListUsername] = useState('');
  const aniListInputRef = useRef(null);

  // Load export folder from storage on mount
  useEffect(() => {
    (async () => {
      const uri = await AsyncStorage.getItem(EXPORT_FOLDER_KEY);
      if (uri) setExportFolder(uri);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const uri = await AsyncStorage.getItem(APP_STORAGE_FOLDER_KEY);
      if (uri) setStorageFolder(uri);
    })();
  }, []);

  // Prefill AniList username if saved
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(ANILIST_USERNAME_KEY);
      if (saved) setAniListUsername(saved);
    })();
  }, [showAniListModal]);

  // Open MyAnimeList import page
  const openMALImport = () => {
    Linking.openURL('https://myanimelist.net/import.php');
  };
  // Open MyAnimeList export page
  const openMALExport = () => {
    Linking.openURL('https://myanimelist.net/panel.php?go=export');
  };
  // Open AniList import page
  const openAniListImport = () => {
    Linking.openURL('https://anilist.co/settings/import');
  };
  // Open the file directly (Android only)
  const openExportFile = async () => {
    if (lastExportPath) {
      try {
        await Linking.openURL(lastExportPath);
      } catch (e) {
        Clipboard.setStringAsync(lastExportPath);
        if (Platform.OS === 'android') {
          ToastAndroid.show('Path copied! Use a file manager to access the file.', ToastAndroid.LONG);
        } else {
          Alert.alert('Notice', 'Path copied! Use a file manager to access the file.');
        }
      }
    }
  };
  // Copy path to clipboard
  const copyExportPath = () => {
    if (lastExportPath) {
      Clipboard.setStringAsync(lastExportPath);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Path copied to clipboard!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Copied', 'Path copied to clipboard!');
      }
    }
  };

  // Function to handle importing watchlist from XML
  const handleImportWatchlist = () => {
    setShowImportFormatModal(true);
  };

  const onSelectImportFormat = (format: 'xml' | 'json' | 'txt') => {
    setShowImportFormatModal(false);
    setTimeout(() => importWithFormat(format), 200);
  };

  // --- TXT/JSON format helpers ---
  function exportToTxtFormat(myList: { name: string; link?: string; mal_id?: number; watchedEpisodes?: number }[]): string {
    let txt = '# Watching\n';
    for (const anime of myList) {
      let line = anime.name + ' | ' + (anime.link || `https://myanimelist.net/anime/${anime.mal_id}`);
      if (anime.watchedEpisodes) line += ' | ' + anime.watchedEpisodes;
      txt += line + '\n';
    }
    return txt;
  }

  function exportToJsonFormat(myList: { name: string; link?: string; mal_id?: number; watchedEpisodes?: number }[]): string {
    const watching = myList.map(anime => ({
      name: anime.name,
      link: anime.link || `https://myanimelist.net/anime/${anime.mal_id}`,
      mal_id: anime.mal_id,
      watchListType: 1,
      ...(anime.watchedEpisodes ? { watchedEpisodes: anime.watchedEpisodes } : {})
    }));
    return JSON.stringify({ Watching: watching }, null, 2);
  }

  function parseTxtFormat(txt: string): { name: string; link: string; watchedEpisodes?: number }[] {
    const lines = txt.split(/\r?\n/);
    let inSection = false;
    const result: { name: string; link: string; watchedEpisodes?: number }[] = [];
    for (const line of lines) {
      if (line.trim().startsWith('#')) {
        inSection = true;
        continue;
      }
      if (!inSection || !line.trim()) continue;
      const parts = line.split('|').map(s => s.trim());
      if (parts.length >= 2) {
        const entry: { name: string; link: string; watchedEpisodes?: number } = { name: parts[0], link: parts[1] };
        if (parts[2]) entry.watchedEpisodes = parseInt(parts[2], 10);
        result.push(entry);
      }
    }
    return result;
  }

  function parseJsonFormat(jsonStr: string): { name: string; link: string; mal_id: number; watchedEpisodes?: number }[] {
    try {
      const obj = JSON.parse(jsonStr);
      let all: { name: string; link: string; mal_id: number; watchedEpisodes?: number }[] = [];
      for (const key of Object.keys(obj)) {
        if (Array.isArray(obj[key])) {
          all = all.concat(
            obj[key].map((item: any) => ({
              name: item.name,
              link: item.link,
              mal_id: item.mal_id,
              watchedEpisodes: item.watchedEpisodes
            }))
          );
        }
      }
      return all;
    } catch {}
    return [];
  }

  const importWithFormat = async (format: 'xml' | 'json' | 'txt') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: format === 'xml' ? 'text/xml' : format === 'json' ? 'application/json' : 'text/plain',
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
        let animeEntries: { name: string; link: string; mal_id?: number; watchedEpisodes?: number }[] = [];
        if (format === 'xml') {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(fileContent, 'text/xml');
          const animeNodes = xmlDoc.getElementsByTagName('anime');
          for (let i = 0; i < animeNodes.length; i++) {
            const animeNode = animeNodes[i];
            const idNode = animeNode.getElementsByTagName('series_animedb_id')[0];
            const titleNode = animeNode.getElementsByTagName('series_title')[0];
            const watchedEpisodesNode = animeNode.getElementsByTagName('my_watched_episodes')[0];
            if (idNode && titleNode) {
              const malId: string = idNode.textContent || '';
              const title: string = titleNode.textContent || '';
              const watchedEpisodes: number | undefined = watchedEpisodesNode ? parseInt(watchedEpisodesNode.textContent || '0', 10) : undefined;
              if (malId && title) {
                animeEntries.push({ name: title, link: `https://myanimelist.net/anime/${malId}`, mal_id: parseInt(malId, 10), watchedEpisodes });
              }
            }
          }
        } else if (format === 'json') {
          animeEntries = parseJsonFormat(fileContent);
        } else if (format === 'txt') {
          animeEntries = parseTxtFormat(fileContent);
        }
        if (animeEntries.length === 0) {
          setLoadingModal(prev => ({ ...prev, visible: false }));
          Alert.alert('Error', 'No anime entries found in the imported file.');
          return;
        }
        setLoadingModal(prev => ({
          ...prev,
          title: 'Importing Anime',
          message: 'Searching and adding anime to your list...',
          progress: { ...prev.progress, total: animeEntries.length }
        }));
        const { addAnime } = useMyListStore.getState();
        const { addToHistory } = useWatchHistoryStore.getState();
        const BATCH_SIZE = 10;
        const apiCache = new Map();
        let successCount = 0;
        let failedCount = 0;
        let processedCount = 0;
        let watchHistoryCount = 0;
        const searchAndAddAnime = async (
          malId: number | string,
          title: string,
          watchedEpisodes?: number
        ): Promise<boolean> => {
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
                  mal_id: malId
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
                  mal_id: malId
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
        const addAnimeToWatchHistory = async (
          animeId: string | number,
          animeName: string,
          animeImg: string,
          episodeNumber: number
        ): Promise<boolean> => {
          try {
            const episodesUrl = `${API_BASE}${ENDPOINTS.INFO}?id=${animeId}`;
            const response = await fetch(episodesUrl);
            if (!response.ok) return false;
            const animeData = await response.json();
            if (!animeData || !animeData.episodes || !animeData.episodes.length) return false;
            let targetEpisode = animeData.episodes.find((ep: any) => ep.number === episodeNumber);
            if (!targetEpisode) {
              const sortedEpisodes = [...animeData.episodes].sort((a: any, b: any) => b.number - a.number);
              targetEpisode = sortedEpisodes.find((ep: any) => ep.number <= episodeNumber);
            }
            if (!targetEpisode && animeData.episodes.length > 0) {
              const sortedByNumber = [...animeData.episodes].sort((a: any, b: any) => b.number - a.number);
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
                subOrDub: 'sub' as 'sub'
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
        const processBatch = async (startIndex) => {
          const endIndex = Math.min(startIndex + BATCH_SIZE, animeEntries.length);
          const currentBatch = animeEntries.slice(startIndex, endIndex);
          await Promise.all(
            currentBatch.map(({ mal_id, name, watchedEpisodes }) => 
              searchAndAddAnime(mal_id, name, watchedEpisodes)
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
          ));
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
    if (Platform.OS !== 'android') {
      Alert.alert('Not supported', 'Local file save is only supported on Android.');
      return;
    }
    if (!storageFolder) {
      Alert.alert('No Storage Folder', 'Please set a storage folder from your Profile page first.');
      return;
    }
    setShowExportFormatModal(true);
  };

  // When user selects a format in the modal
  const onSelectExportFormat = (format: 'xml' | 'json' | 'txt') => {
    setShowExportFormatModal(false);
    setTimeout(() => exportWithFormat(format), 200); // slight delay for modal close
  };

  // Helper to get date string in YYYY-MM-DD
  function getExportDateString() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const exportWithFormat = async (format: 'xml' | 'json' | 'txt') => {
    Alert.alert(
      'Export List',
      'How do you want to export your watchlist?',
      [
        {
          text: 'Save Locally',
          onPress: async () => {
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
              let content = '';
              let fileExt = format;
              if (format === 'xml') {
                const animeWatchedEpisodes = new Map();
                const { history } = useWatchHistoryStore.getState();
                history.forEach(item => {
                  const currentEpisode = animeWatchedEpisodes.get(item.id) || 0;
                  if (item.episodeNumber > currentEpisode) {
                    animeWatchedEpisodes.set(item.id, item.episodeNumber);
                  }
                });
                content = '<?xml version="1.0"?>\n<myanimelist>\n';
                content += '  <myinfo>\n    <user_export_type>1</user_export_type>\n  </myinfo>\n';
                for (const anime of myList) {
                  content += '  <anime>\n';
                  content += `    <series_animedb_id>${anime.mal_id}</series_animedb_id>\n`;
                  content += `    <series_title>${anime.name}</series_title>\n`;
                  content += '    <my_status>Watching</my_status>\n';
                  const watchedEpisodes = animeWatchedEpisodes.get(anime.id);
                  if (watchedEpisodes) {
                    content += `    <my_watched_episodes>${watchedEpisodes}</my_watched_episodes>\n`;
                  }
                  content += '    <update_on_import>1</update_on_import>\n';
                  content += '  </anime>\n';
                }
                content += '</myanimelist>';
                fileExt = 'xml';
              } else if (format === 'json') {
                content = exportToJsonFormat(myList);
                fileExt = 'json';
              } else if (format === 'txt') {
                content = exportToTxtFormat(myList);
                fileExt = 'txt';
              }
              setLoadingModal(prev => ({
                ...prev,
                message: 'Saving to export folder...',
                progress: { ...prev.progress, current: 1 }
              }));
              const fileName = `anisurge-export-${getExportDateString()}.${fileExt}`;
              let folderUri = storageFolder;
              // If no folder or permission lost, prompt user to pick a folder
              if (!folderUri) {
                const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                if (!perm.granted) {
                  setLoadingModal(prev => ({ ...prev, visible: false }));
                  Alert.alert('Permission Required', 'Please select a folder to save your export.');
                  return;
                }
                folderUri = perm.directoryUri;
                setStorageFolder(folderUri);
                await AsyncStorage.setItem(APP_STORAGE_FOLDER_KEY, folderUri);
              }
              try {
                const uri = await FileSystem.StorageAccessFramework.createFileAsync(
                  folderUri,
                  fileName,
                  format === 'xml' ? 'text/xml' : format === 'json' ? 'application/json' : 'text/plain'
                );
                await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
                setLoadingModal(prev => ({ ...prev, visible: false }));
                ToastAndroid.show('Exported successfully!', ToastAndroid.LONG);
                setLastExportPath(uri);
              } catch (error) {
                // If file creation fails, prompt to re-pick folder and retry
                const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                if (!perm.granted) {
                  setLoadingModal(prev => ({ ...prev, visible: false }));
                  Alert.alert('Permission Required', 'Please select a folder to save your export.');
                  return;
                }
                folderUri = perm.directoryUri;
                setStorageFolder(folderUri);
                await AsyncStorage.setItem(APP_STORAGE_FOLDER_KEY, folderUri);
                try {
                  const uri = await FileSystem.StorageAccessFramework.createFileAsync(
                    folderUri,
                    fileName,
                    format === 'xml' ? 'text/xml' : format === 'json' ? 'application/json' : 'text/plain'
                  );
                  await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
                  setLoadingModal(prev => ({ ...prev, visible: false }));
                  ToastAndroid.show('Exported successfully!', ToastAndroid.LONG);
                  setLastExportPath(uri);
                } catch (error2) {
                  await AsyncStorage.removeItem(APP_STORAGE_FOLDER_KEY);
                  setLoadingModal(prev => ({ ...prev, visible: false }));
                  Alert.alert('Error', 'Failed to export list. Please check your folder permission and try again.');
                }
              }
            } catch (error) {
              setLoadingModal(prev => ({ ...prev, visible: false }));
              Alert.alert('Error', 'Failed to export list. Please try again.');
            }
          }
        },
        {
          text: 'Share',
          onPress: async () => {
            try {
              setLoadingModal({
                visible: true,
                title: 'Exporting List',
                message: 'Preparing your anime list for sharing...',
                progress: { current: 0, total: 1, success: 0, failed: 0 }
              });
              const { myList } = useMyListStore.getState();
              if (myList.length === 0) {
                setLoadingModal(prev => ({ ...prev, visible: false }));
                Alert.alert('Empty List', 'Your watchlist is empty. Nothing to export.');
                return;
              }
              let content = '';
              let fileExt = format;
              if (format === 'xml') {
                const animeWatchedEpisodes = new Map();
                const { history } = useWatchHistoryStore.getState();
                history.forEach(item => {
                  const currentEpisode = animeWatchedEpisodes.get(item.id) || 0;
                  if (item.episodeNumber > currentEpisode) {
                    animeWatchedEpisodes.set(item.id, item.episodeNumber);
                  }
                });
                content = '<?xml version="1.0"?>\n<myanimelist>\n';
                content += '  <myinfo>\n    <user_export_type>1</user_export_type>\n  </myinfo>\n';
                for (const anime of myList) {
                  content += '  <anime>\n';
                  content += `    <series_animedb_id>${anime.mal_id}</series_animedb_id>\n`;
                  content += `    <series_title>${anime.name}</series_title>\n`;
                  content += '    <my_status>Watching</my_status>\n';
                  const watchedEpisodes = animeWatchedEpisodes.get(anime.id);
                  if (watchedEpisodes) {
                    content += `    <my_watched_episodes>${watchedEpisodes}</my_watched_episodes>\n`;
                  }
                  content += '    <update_on_import>1</update_on_import>\n';
                  content += '  </anime>\n';
                }
                content += '</myanimelist>';
                fileExt = 'xml';
              } else if (format === 'json') {
                content = exportToJsonFormat(myList);
                fileExt = 'json';
              } else if (format === 'txt') {
                content = exportToTxtFormat(myList);
                fileExt = 'txt';
              }
              const fileName = `anisurge-export-${getExportDateString()}.${fileExt}`;
              let fileUri = FileSystem.documentDirectory + fileName;
              await FileSystem.writeAsStringAsync(fileUri, content);
              setLastExportPath(fileUri);
              const isAvailable = await Sharing.isAvailableAsync();
              setLoadingModal(prev => ({ ...prev, visible: false }));
              if (isAvailable) {
                await Sharing.shareAsync(fileUri, {
                  mimeType: format === 'xml' ? 'text/xml' : format === 'json' ? 'application/json' : 'text/plain',
                  dialogTitle: 'Export Watchlist',
                  UTI: format === 'xml' ? 'public.xml' : format === 'json' ? 'public.json' : 'public.plain-text'
                });
              } else {
                Alert.alert('Exported', `File saved to: ${fileUri}`);
              }
            } catch (error) {
              setLoadingModal(prev => ({ ...prev, visible: false }));
              Alert.alert('Error', 'Failed to export list. Please try again.');
            }
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // Add AniList import logic
  const handleAniListImport = () => {
    setAniListUsername('');
    setShowAniListModal(true);
  };

  const importFromAniList = async () => {
    if (!aniListUsername.trim()) {
      Alert.alert('Enter Username', 'Please enter your AniList username.');
      return;
    }
    setShowAniListModal(false);
    setLoadingModal({
      visible: true,
      title: 'Importing from AniList',
      message: 'Fetching your AniList data...',
      progress: { current: 0, total: 0, success: 0, failed: 0 }
    });
    try {
      const query = `query ($username: String) {\n  MediaListCollection(userName: $username, type: ANIME) {\n    lists {\n      name\n      entries {\n        media {\n          id\n          idMal\n          title { romaji english native }\n          episodes\n          format\n          status\n          coverImage { large }\n        }\n        status\n        score\n        progress\n        repeat\n        notes\n        updatedAt\n      }\n    }\n  }\n}`;
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: { username: aniListUsername.trim() }
        })
      });
      const data = await response.json();
      if (!data || !data.data || !data.data.MediaListCollection) {
        setLoadingModal(prev => ({ ...prev, visible: false }));
        Alert.alert('Error', 'No data found for this AniList user.');
        return;
      }
      const lists = data.data.MediaListCollection.lists || [];
      let animeEntries = [];
      lists.forEach((list: any) => {
        if (Array.isArray(list.entries)) {
          animeEntries = animeEntries.concat(list.entries.map((entry: any) => ({
            alId: entry.media.id,
            malId: entry.media.idMal,
            name: entry.media.title.romaji || entry.media.title.english || entry.media.title.native,
            img: entry.media.coverImage?.large || '',
            episodes: entry.media.episodes,
            progress: entry.progress,
            status: entry.status,
            format: entry.media.format,
            notes: entry.notes,
            updatedAt: entry.updatedAt
          })));
        }
      });
      if (animeEntries.length === 0) {
        setLoadingModal(prev => ({ ...prev, visible: false }));
        Alert.alert('Error', 'No anime entries found in your AniList.');
        return;
      }
      // Save username if import is successful
      await AsyncStorage.setItem(ANILIST_USERNAME_KEY, aniListUsername.trim());
      setLoadingModal(prev => ({
        ...prev,
        title: 'Importing from AniList',
        message: 'Adding anime to your list...',
        progress: { ...prev.progress, total: animeEntries.length }
      }));
      const { addAnime } = useMyListStore.getState();
      const { addToHistory } = useWatchHistoryStore.getState();
      let successCount = 0;
      let failedCount = 0;
      let processedCount = 0;
      let watchHistoryCount = 0;
      const apiCache = new Map();
      const searchAndAddAnime = async (
        alId: number,
        malId: number | null,
        title: string,
        img: string,
        watchedEpisodes?: number
      ): Promise<boolean> => {
        try {
          const cacheKey = `${alId}:${title}`;
          if (apiCache.has(cacheKey)) {
            const cachedData = apiCache.get(cacheKey);
            await addAnime(cachedData);
            if (watchedEpisodes && watchedEpisodes > 0) {
              await addAnimeToWatchHistory(cachedData.id, cachedData.name, cachedData.img, watchedEpisodes);
            }
            return true;
          }
          // Prefer MAL search if malId exists, else use AniList ID
          let animeToAdd = null;
          if (malId) {
            // Try to fetch by MAL ID
            const apiUrl = `${API_BASE}${ENDPOINTS.ANIME_INFO}?malId=${malId}`;
            let response = await fetch(apiUrl);
            if (response.ok) {
              const animeData = await response.json();
              animeToAdd = {
                id: animeData.id,
                name: animeData.title || title,
                img: animeData.image || img,
                addedAt: Date.now(),
                malId: malId,
                alId: alId
              };
            }
          }
          if (!animeToAdd) {
            // Fallback: search by AniList ID
            const apiUrl = `${API_BASE}${ENDPOINTS.ANIME_INFO}?alId=${alId}`;
            let response = await fetch(apiUrl);
            if (response.ok) {
              const animeData = await response.json();
              animeToAdd = {
                id: animeData.id,
                name: animeData.title || title,
                img: animeData.image || img,
                addedAt: Date.now(),
                malId: malId,
                alId: alId
              };
            } else {
              // Fallback: add with minimal info
              animeToAdd = {
                id: `anilist-${alId}`,
                name: title,
                img: img,
                addedAt: Date.now(),
                malId: malId,
                alId: alId
              };
            }
          }
          apiCache.set(cacheKey, animeToAdd);
          await addAnime(animeToAdd);
          if (watchedEpisodes && watchedEpisodes > 0) {
            await addAnimeToWatchHistory(animeToAdd.id, animeToAdd.name, animeToAdd.img, watchedEpisodes);
          }
          return true;
        } catch {
          return false;
        }
      };
      const addAnimeToWatchHistory = async (
        animeId: string,
        animeName: string,
        animeImg: string,
        episodeNumber: number
      ): Promise<boolean> => {
        try {
          const episodesUrl = `${API_BASE}${ENDPOINTS.INFO}?id=${animeId}`;
          const response = await fetch(episodesUrl);
          if (!response.ok) return false;
          const animeData = await response.json();
          if (!animeData || !animeData.episodes || !animeData.episodes.length) return false;
          let targetEpisode = animeData.episodes.find((ep: any) => ep.number === episodeNumber);
          if (!targetEpisode) {
            const sortedEpisodes = [...animeData.episodes].sort((a: any, b: any) => b.number - a.number);
            targetEpisode = sortedEpisodes.find((ep: any) => ep.number <= episodeNumber);
          }
          if (!targetEpisode && animeData.episodes.length > 0) {
            const sortedByNumber = [...animeData.episodes].sort((a: any, b: any) => b.number - a.number);
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
              subOrDub: 'sub' as 'sub'
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
      // Parallel import (no batching)
      await Promise.all(
        animeEntries.map(async ({ alId, malId, name, img, progress }) => {
          const success = await searchAndAddAnime(alId, malId, name, img, progress);
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
        })
      );
      setTimeout(() => {
        setLoadingModal(prev => ({ ...prev, visible: false }));
        Alert.alert(
          'AniList Import Complete',
          `Successfully imported ${successCount} anime.\n` +
          `Added ${watchHistoryCount} anime to continue watching.\n` +
          `Failed to import ${failedCount} anime.`
        );
      }, 500);
    } catch (error) {
      setLoadingModal(prev => ({ ...prev, visible: false }));
      Alert.alert('Error', 'Failed to import from AniList. Please try again.');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: hasBackgroundMedia ? 'transparent' : theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Watchlist Import/Export</Text>
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
          <TouchableOpacity style={styles.malButton} onPress={openAniListImport}>
            <MaterialIcons name="file-upload" size={20} color="#fff" />
            <Text style={styles.malButtonText}>AniList Import Page</Text>
          </TouchableOpacity>
        </View>
        {/* Import from AniList button below AniList Import Page */}
        <View style={{alignItems: 'center', marginTop: 8, marginBottom: 8}}>
          <TouchableOpacity
            style={[styles.watchlistActionButton, {backgroundColor: '#8e44ad', width: 220, flexDirection: 'row', justifyContent: 'center'}]}
            onPress={handleAniListImport}
          >
            <MaterialIcons name="cloud-download" size={24} color="#fff" />
            <Text style={styles.buttonText}>Import from AniList</Text>
          </TouchableOpacity>
        </View>
        {lastExportPath && (
          <View style={styles.exportInfoBox}>
            <Text style={styles.exportInfoText}>Last export saved to:</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap'}}>
              <Text style={styles.exportInfoPath}>{lastExportPath.replace(/^file:\/\//, '')}</Text>
              <TouchableOpacity style={styles.copyPathButton} onPress={() => {
                const pathToCopy = lastExportPath.replace(/^file:\/\//, '');
                Clipboard.setStringAsync(pathToCopy);
                if (Platform.OS === 'android') {
                  ToastAndroid.show('Path copied to clipboard!', ToastAndroid.SHORT);
                } else {
                  Alert.alert('Copied', 'Path copied to clipboard!');
                }
              }}>
                <MaterialIcons name="content-copy" size={16} color="#FFD700" />
                <Text style={styles.copyPathText}>Copy Path</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.exportInfoHint}>Use a file manager app to access this file if needed.</Text>
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
      {/* Import Format Modal */}
      <Modal
        visible={showImportFormatModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImportFormatModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Import Format</Text>
            <Text style={styles.modalDesc}>Choose the format to import your watchlist:</Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => onSelectImportFormat('xml')}>
              <Text style={styles.modalButtonText}>XML (MyAnimeList)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={() => onSelectImportFormat('json')}>
              <Text style={styles.modalButtonText}>JSON (App Format)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={() => onSelectImportFormat('txt')}>
              <Text style={styles.modalButtonText}>TXT (Simple List)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, {backgroundColor: '#333', marginTop: 12}]} onPress={() => setShowImportFormatModal(false)}>
              <Text style={[styles.modalButtonText, {color: '#FFD700'}]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Export Format Modal */}
      <Modal
        visible={showExportFormatModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportFormatModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Export Format</Text>
            <Text style={styles.modalDesc}>Choose the format to export your watchlist:</Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => onSelectExportFormat('xml')}>
              <Text style={styles.modalButtonText}>XML (MyAnimeList)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={() => onSelectExportFormat('json')}>
              <Text style={styles.modalButtonText}>JSON (App Format)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={() => onSelectExportFormat('txt')}>
              <Text style={styles.modalButtonText}>TXT (Simple List)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, {backgroundColor: '#333', marginTop: 12}]} onPress={() => setShowExportFormatModal(false)}>
              <Text style={[styles.modalButtonText, {color: '#FFD700'}]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* AniList username modal */}
      <Modal
        visible={showAniListModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAniListModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>AniList Import</Text>
            <Text style={styles.modalDesc}>Enter your AniList username to import your anime list.</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', width: '100%'}}>
              <TextInput
                ref={aniListInputRef}
                style={[styles.searchInput, {marginBottom: 16, backgroundColor: '#222', color: '#fff', flex: 1}]}
                placeholder="AniList Username"
                placeholderTextColor="#aaa"
                value={aniListUsername}
                onChangeText={setAniListUsername}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={importFromAniList}
              />
              {aniListUsername.length > 0 && (
                <TouchableOpacity
                  style={{marginLeft: 8, marginBottom: 16, backgroundColor: '#333', borderRadius: 6, padding: 6}}
                  onPress={async () => {
                    setAniListUsername('');
                    await AsyncStorage.removeItem(ANILIST_USERNAME_KEY);
                  }}
                >
                  <MaterialIcons name="edit" size={18} color="#FFD700" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={styles.modalButton} onPress={importFromAniList}>
              <Text style={styles.modalButtonText}>Import</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, {backgroundColor: '#4CAF50', marginTop: 8}]}
              onPress={async () => {
                if (!aniListUsername.trim()) {
                  Alert.alert('Enter Username', 'Please enter your AniList username.');
                  return;
                }
                await AsyncStorage.setItem(ANILIST_USERNAME_KEY, aniListUsername.trim());
                setShowAniListModal(false);
                if (Platform.OS === 'android') {
                  ToastAndroid.show('AniList username saved!', ToastAndroid.SHORT);
                } else {
                  Alert.alert('Saved', 'AniList username saved!');
                }
              }}
            >
              <Text style={styles.modalButtonText}>Save Username</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, {backgroundColor: '#333', marginTop: 12}]} onPress={() => setShowAniListModal(false)}>
              <Text style={[styles.modalButtonText, {color: '#FFD700'}]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    flexShrink: 1,
  },
  copyPathButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderRadius: 6,
  },
  copyPathText: {
    color: '#FFD700',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  exportInfoHint: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 6,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 24,
    width: 300,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
  },
  modalDesc: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 18,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginVertical: 4,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  searchInput: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 8,
  },
}); 