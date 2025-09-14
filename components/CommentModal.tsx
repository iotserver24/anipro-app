import React from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Text,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { MaterialIcons } from '@expo/vector-icons';
import CommentSection from './CommentSection';

interface CommentModalProps {
  visible: boolean;
  onClose: () => void;
  animeId: string;
  animeTitle?: string;
}

const CommentModal: React.FC<CommentModalProps> = ({
  visible,
  onClose,
  animeId,
  animeTitle
}) => {
  const { theme } = useTheme();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
            {animeTitle ? `Comments on ${animeTitle}` : 'Comments'}
          </Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.content}>
          <CommentSection animeId={animeId} fullscreen />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 44, // Same width as close button
  },
  content: {
    flex: 1,
  },
});

export default CommentModal; 