import React from 'react';
import {
    Modal,
    View,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ActivityIndicator,
    Text,
    StatusBar,
    Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RewindWebViewModalProps {
    visible: boolean;
    onClose: () => void;
    userId: string | undefined;
}

const RewindWebViewModal: React.FC<RewindWebViewModalProps> = ({
    visible,
    onClose,
    userId,
}) => {
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(false);

    const rewindUrl = userId
        ? `https://rewind.anisurge.me/rewind/${userId}`
        : 'https://rewind.anisurge.me';

    const handleLoadEnd = () => {
        setLoading(false);
    };

    const handleError = () => {
        setLoading(false);
        setError(true);
    };

    const handleClose = () => {
        setLoading(true);
        setError(false);
        onClose();
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={handleClose}
        >
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>🎬 Your 2025 Rewind</Text>
                    <TouchableOpacity
                        onPress={handleClose}
                        style={styles.closeButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <MaterialIcons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* WebView */}
                <View style={styles.webViewContainer}>
                    {error ? (
                        <View style={styles.errorContainer}>
                            <MaterialIcons name="error-outline" size={64} color="#f4511e" />
                            <Text style={styles.errorText}>Failed to load Rewind</Text>
                            <TouchableOpacity
                                style={styles.retryButton}
                                onPress={() => {
                                    setError(false);
                                    setLoading(true);
                                }}
                            >
                                <Text style={styles.retryButtonText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <WebView
                            source={{ uri: rewindUrl }}
                            style={styles.webView}
                            onLoadEnd={handleLoadEnd}
                            onError={handleError}
                            startInLoadingState
                            javaScriptEnabled
                            domStorageEnabled
                            allowsInlineMediaPlayback
                            mediaPlaybackRequiresUserAction={false}
                            renderLoading={() => (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color="#f4511e" />
                                    <Text style={styles.loadingText}>Loading your Rewind...</Text>
                                </View>
                            )}
                        />
                    )}
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#121212',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    closeButton: {
        padding: 4,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    webViewContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    webView: {
        flex: 1,
        backgroundColor: '#000',
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#fff',
        opacity: 0.8,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    errorText: {
        marginTop: 16,
        fontSize: 18,
        color: '#fff',
        opacity: 0.8,
    },
    retryButton: {
        marginTop: 24,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#f4511e',
        borderRadius: 8,
    },
    retryButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
});

export default RewindWebViewModal;
