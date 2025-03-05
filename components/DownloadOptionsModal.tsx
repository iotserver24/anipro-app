import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { checkDownloaderAvailability, downloadWithExternalApp, SUPPORTED_DOWNLOADERS, openWithADM, openWithSplayer } from '../utils/downloadManager';

interface DownloadOptionsModalProps {
  isVisible: boolean;
  onClose: () => void;
  sourceData: any | null;
  episodeInfo: Episode | null;
}

export const DownloadOptionsModal = ({ isVisible, onClose, sourceData, episodeInfo }: DownloadOptionsModalProps) => {
  const [availableDownloaders, setAvailableDownloaders] = useState({});
  const [selectedQuality, setSelectedQuality] = useState('');
  const [selectedSubs, setSelectedSubs] = useState([]);
  const [checkingDownloaders, setCheckingDownloaders] = useState(true);

  useEffect(() => {
    if (isVisible) {
      checkDownloaders();
    }
  }, [isVisible]);

  const checkDownloaders = async () => {
    setCheckingDownloaders(true);
    try {
      const available = await checkDownloaderAvailability();
      setAvailableDownloaders(available);
    } catch (error) {
      console.error('Error checking downloaders:', error);
    } finally {
      setCheckingDownloaders(false);
    }
  };

  if (!sourceData || !episodeInfo) {
    return null;
  }

  // Check if the source is HLS (m3u8)
  const isHlsStream = sourceData?.sources?.[0]?.url?.includes('.m3u8') || 
                      sourceData?.sources?.[0]?.type === 'hls';

  const handleDownload = async (downloader) => {
    try {
      console.log(`Attempting to download with ${downloader}`);
      
      // Get the URL from the source
      const url = sourceData.sources[0].url;
      const filename = `${episodeInfo.name}_EP${episodeInfo.episodeNo}`;
      
      // For HLS streams, only use Splayer
      if (isHlsStream && downloader !== 'SPLAYER') {
        Alert.alert(
          'HLS Stream Detected',
          'This video uses HLS streaming format which is only supported by Splayer for downloading. Other downloaders may not work properly with this format.',
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Use Splayer',
              onPress: () => {
                if (availableDownloaders['SPLAYER']) {
                  handleDownload('SPLAYER');
                } else {
                  Linking.openURL(`market://details?id=${SUPPORTED_DOWNLOADERS.SPLAYER.packageName}`);
                }
              }
            }
          ]
        );
        return;
      }
      
      // Special handling for Splayer with HLS streams
      if (downloader === 'SPLAYER') {
        try {
          const success = await openWithSplayer(
            url, 
            filename,
            selectedSubs
          );
          
          if (success) {
            onClose();
            return;
          } else {
            // If openWithSplayer returns false, it means all URL schemes failed
            Alert.alert(
              'Splayer Not Responding',
              'Could not open Splayer. Please make sure it is installed correctly.',
              [
                {
                  text: 'Install Splayer',
                  onPress: () => Linking.openURL(`market://details?id=${SUPPORTED_DOWNLOADERS.SPLAYER.packageName}`)
                },
                {
                  text: 'Cancel',
                  style: 'cancel'
                }
              ]
            );
          }
        } catch (error) {
          console.error('Failed to open Splayer:', error);
          throw error;
        }
      }
      
      // For non-HLS streams, try the regular downloaders
      if (!isHlsStream) {
        if (downloader === 'ADM') {
          const success = await openWithADM(url, filename);
          if (success) {
            onClose();
            return;
          }
        }
        
        await downloadWithExternalApp({
          url: url,
          filename: filename,
          quality: selectedQuality,
          subtitles: selectedSubs
        }, downloader);
      }
      
      onClose();
    } catch (error) {
      console.error('Download failed:', error);
      Alert.alert(
        'Download Failed',
        `There was an error initiating the download with ${SUPPORTED_DOWNLOADERS[downloader]?.name}. Please try again or use a different downloader.`,
        [{ text: 'OK' }]
      );
    }
  };

  const openInBrowser = async (url: string) => {
    try {
      // Open the URL in the browser, which should trigger the "Open with" dialog
      console.log('Opening URL in browser:', url);
      await Linking.openURL(url);
      onClose();
    } catch (error) {
      console.error('Failed to open URL in browser:', error);
      Alert.alert(
        'Error',
        'Could not open the video URL. Please try another method.',
        [{ text: 'OK' }]
      );
    }
  };

  // Check if any downloaders are available
  const hasAvailableDownloaders = Object.values(availableDownloaders).some(value => value === true);

  return (
    <Modal visible={isVisible} transparent animationType="slide">
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Download Options</Text>
          
          {/* HLS Stream Warning */}
          {isHlsStream && (
            <View style={styles.warningSection}>
              <Text style={styles.warningTitle}>⚠️ HLS Stream Detected</Text>
              <Text style={styles.warningText}>
                This video uses HLS streaming format which is only supported by Splayer for downloading.
                Other downloaders may not work properly with this format.
              </Text>
            </View>
          )}

          {/* Subtitle Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subtitles</Text>
            {sourceData?.tracks?.length > 0 ? (
              sourceData.tracks.map((track, index) => (
                <TouchableOpacity
                  key={`subtitle-${index}-${track.label}`}
                  onPress={() => {
                    const newSubs = selectedSubs.includes(track.file)
                      ? selectedSubs.filter(sub => sub !== track.file)
                      : [...selectedSubs, track.file];
                    setSelectedSubs(newSubs);
                  }}
                  style={[
                    styles.option,
                    selectedSubs.includes(track.file) && styles.selectedOption
                  ]}
                >
                  <Text style={selectedSubs.includes(track.file) ? styles.selectedOptionText : {}}>
                    {track.label}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.infoText}>No subtitle tracks available</Text>
            )}
          </View>

          {/* Download Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Download With</Text>
            
            {checkingDownloaders ? (
              <Text style={styles.infoText}>Checking for available downloaders...</Text>
            ) : hasAvailableDownloaders ? (
              <>
                {/* Always show Splayer first for HLS streams */}
                {isHlsStream && availableDownloaders['SPLAYER'] && (
                  <TouchableOpacity
                    key="SPLAYER"
                    onPress={() => handleDownload('SPLAYER')}
                    style={[styles.downloadButton, styles.recommendedButton]}
                  >
                    <Text style={styles.buttonText}>
                      {SUPPORTED_DOWNLOADERS['SPLAYER'].name} (Recommended for HLS)
                    </Text>
                  </TouchableOpacity>
                )}
                
                {/* Show other downloaders only if not HLS */}
                {!isHlsStream && Object.entries(SUPPORTED_DOWNLOADERS).map(([key, app]) => (
                  availableDownloaders[key] && (
                    <TouchableOpacity
                      key={key}
                      onPress={() => handleDownload(key)}
                      style={styles.downloadButton}
                    >
                      <Text style={styles.buttonText}>{app.name}</Text>
                    </TouchableOpacity>
                  )
                ))}
                
                {/* If HLS but no Splayer, show install Splayer button */}
                {isHlsStream && !availableDownloaders['SPLAYER'] && (
                  <View>
                    <Text style={styles.infoText}>
                      Splayer is required for HLS streams. Please install it:
                    </Text>
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`market://details?id=${SUPPORTED_DOWNLOADERS.SPLAYER.packageName}`)}
                      style={styles.installButton}
                    >
                      <Text style={styles.buttonText}>Install Splayer</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <View>
                <Text style={styles.infoText}>
                  No supported download apps found. Please install one of the following:
                </Text>
                {isHlsStream ? (
                  <TouchableOpacity
                    key="install-splayer"
                    onPress={() => Linking.openURL(`market://details?id=${SUPPORTED_DOWNLOADERS.SPLAYER.packageName}`)}
                    style={styles.installButton}
                  >
                    <Text style={styles.buttonText}>Install Splayer (Recommended for HLS)</Text>
                  </TouchableOpacity>
                ) : (
                  Object.entries(SUPPORTED_DOWNLOADERS).map(([key, app]) => (
                    <TouchableOpacity
                      key={`install-${key}`}
                      onPress={() => Linking.openURL(`market://details?id=${app.packageName}`)}
                      style={styles.installButton}
                    >
                      <Text style={styles.buttonText}>Install {app.name}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {!hasAvailableDownloaders && (
              <TouchableOpacity
                onPress={checkDownloaders}
                style={styles.refreshButton}
              >
                <Text style={styles.buttonText}>Check Again</Text>
              </TouchableOpacity>
            )}
          </View>

          {isHlsStream && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Direct Download</Text>
              <Text style={styles.infoText}>
                Open the stream directly and use your device's "Open with" dialog to choose an app:
              </Text>
              <TouchableOpacity
                onPress={() => openInBrowser(sourceData.sources[0].url)}
                style={[styles.downloadButton, styles.directButton]}
              >
                <Text style={styles.buttonText}>Open Stream URL</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  section: {
    marginBottom: 15,
  },
  warningSection: {
    backgroundColor: '#FFF3CD',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FFEEBA',
  },
  warningTitle: {
    color: '#856404',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  warningText: {
    color: '#856404',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  option: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 5,
    borderRadius: 5,
  },
  selectedOption: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  selectedOptionText: {
    color: 'white',
  },
  downloadButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 5,
    marginBottom: 10,
  },
  recommendedButton: {
    backgroundColor: '#4CAF50',
  },
  installButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 5,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
  },
  closeButton: {
    padding: 10,
    alignItems: 'center',
  },
  infoText: {
    color: '#666',
    marginBottom: 10,
  },
  refreshButton: {
    backgroundColor: '#FF9800',
    padding: 12,
    borderRadius: 5,
    marginTop: 10,
    marginBottom: 10,
  },
  directButton: {
    backgroundColor: '#FF5722',
  },
}); 