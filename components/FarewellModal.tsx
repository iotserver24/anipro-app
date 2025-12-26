import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Linking,
    Dimensions,
    Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG } from '../constants/appConfig';
import { useGlobalStore } from '../store/globalStore';

const FAREWELL_SHOWN_KEY = 'farewell_popup_shown_v1';
const { width: screenWidth } = Dimensions.get('window');

interface FarewellModalProps {
    onClose?: () => void;
}

const FarewellModal: React.FC<FarewellModalProps> = ({ onClose }) => {
    const [visible, setVisible] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);

    const showFarewellModal = useGlobalStore(state => state.showFarewellModal);
    const setShowFarewellModal = useGlobalStore(state => state.setShowFarewellModal);

    useEffect(() => {
        checkIfShouldShow();
    }, []);

    // Also listen to manual trigger from global store
    useEffect(() => {
        if (showFarewellModal) {
            setVisible(true);
            setCurrentPage(0); // Optional: reset to first page when opened manually
        }
    }, [showFarewellModal]);

    const checkIfShouldShow = async () => {
        try {
            const hasShown = await AsyncStorage.getItem(FAREWELL_SHOWN_KEY);
            if (!hasShown) {
                setVisible(true);
            }
        } catch (error) {
            console.error('Error checking farewell popup status:', error);
        }
    };

    const handleClose = async () => {
        try {
            await AsyncStorage.setItem(FAREWELL_SHOWN_KEY, 'true');
            setVisible(false);
            setShowFarewellModal(false); // Reset manual trigger state
            onClose?.();
        } catch (error) {
            console.error('Error saving farewell popup status:', error);
        }
    };

    const openLink = (url: string) => {
        Linking.openURL(url).catch(err => console.error('Error opening link:', err));
    };

    const pages = React.useMemo(() => [
        // Page 1: The Origin
        {
            title: "A Year of Memories 📅",
            content: (
                <View style={styles.pageContent}>
                    <MaterialIcons name="history-edu" size={70} color="#f4511e" />
                    <Text style={styles.mainText}>Where it all began...</Text>
                    <Text style={styles.subText}>
                        I wanted to create an app for anime streaming where there will be no ads solely for users completely and on November 14, 2024 I started to build this.
                    </Text>
                    <Text style={styles.subText}>
                        It started as anipro (based on my own anime streaming website) then i came to AniSurge. Can't believe it's been a year huh...
                    </Text>
                    <Text style={styles.subText}>
                        So ngl my app is shitest one in market yet you guys believed in me and went through the app. Love you guys. ❤️
                    </Text>
                </View>
            ),
        },
        // Page 2: The Promise
        {
            title: "The Golden Promise ⚔️",
            content: (
                <View style={styles.pageContent}>
                    <MaterialIcons name="verified" size={70} color="#fbbf24" />
                    <Text style={styles.mainText}>BUT this is not the END.</Text>
                    <Text style={styles.subText}>
                        AniSurge Reimagined is way better and more. I will release that app update through this app itself. It might take at max 3 months...
                    </Text>
                    <Text style={styles.subText}>
                        But I bet I will beat anilab, crunchyroll and any anime streaming app ever made. This is my promise.
                    </Text>
                    <Text style={styles.subText}>
                        I hope you still continue trusting me.
                    </Text>
                </View>
            ),
        },
        // Page 3: Parting Gifts
        {
            title: "Our Parting Gifts 🎁",
            content: (
                <View style={styles.pageContent}>
                    <MaterialIcons name="card-giftcard" size={70} color="#4ade80" />
                    <Text style={styles.mainText}>From my heart to yours...</Text>
                    <Text style={styles.subText}>
                        Even though I couldn't give you what you wanted, I tried my best. So thank you.
                    </Text>
                    <View style={styles.featureList}>
                        <View style={styles.featureItem}>
                            <MaterialIcons name="workspace-premium" size={22} color="#fbbf24" />
                            <Text style={styles.featureText}>AniSurge Pro is now FREE for everyone.</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <MaterialIcons name="auto-awesome" size={22} color="#60a5fa" />
                            <Text style={styles.featureText}>Check out the new AniSurge: Rewind</Text>
                        </View>
                    </View>
                    <Text style={[styles.subText, { marginTop: 15 }]}>
                        Everything is there, but all features are free. Love you.
                    </Text>
                    <Text style={[styles.footerText, { marginTop: 10, fontSize: 18, color: '#f4511e' }]}>- R3AP3R editz</Text>
                </View>
            ),
        },
        // Page 4: Join Community
        {
            title: "Stay Connected! 🔗",
            content: (
                <View style={styles.pageContent}>
                    <Text style={styles.mainText}>The Revolution Continues!</Text>
                    <Text style={styles.subText}>
                        Don't miss a single update. Join our community for sneak peeks and the future of AniSurge:
                    </Text>

                    <TouchableOpacity
                        style={[styles.socialButton, { backgroundColor: '#5865F2' }]}
                        onPress={() => openLink('https://anisurge.me/discord')}
                    >
                        <MaterialIcons name="chat" size={24} color="#fff" />
                        <Text style={styles.socialButtonText}>Join Discord</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.socialButton, { backgroundColor: '#0088cc' }]}
                        onPress={() => openLink('https://anisurge.me/telegram')}
                    >
                        <MaterialIcons name="send" size={24} color="#fff" />
                        <Text style={styles.socialButtonText}>Join Telegram</Text>
                    </TouchableOpacity>

                    <Text style={styles.footerText}>
                        See you in AniSurge Reimagined! 👋
                    </Text>
                </View>
            ),
        },
    ], [APP_CONFIG.APP_NAME]);

    const nextPage = () => {
        if (currentPage < pages.length - 1) {
            setCurrentPage(currentPage + 1);
        } else {
            handleClose();
        }
    };

    const prevPage = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header with Background */}
                    <LinearGradient
                        colors={['#f4511e', '#e91e63']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.header}
                    >
                        <Text style={styles.headerTitle}>{pages[currentPage].title}</Text>
                        <TouchableOpacity style={styles.closeButtonInside} onPress={handleClose}>
                            <MaterialIcons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                    </LinearGradient>

                    {/* Content Scroll Area */}
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={true}
                    >
                        {pages[currentPage].content}
                    </ScrollView>

                    {/* Footer Area */}
                    <View style={styles.footer}>
                        {/* Page indicators */}
                        <View style={styles.pageIndicators}>
                            {pages.map((_, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.pageIndicator,
                                        currentPage === index && styles.pageIndicatorActive,
                                    ]}
                                />
                            ))}
                        </View>

                        {/* Navigation buttons */}
                        <View style={styles.navigationButtons}>
                            <TouchableOpacity
                                style={[styles.navButton, currentPage === 0 && { opacity: 0 }]}
                                onPress={prevPage}
                                disabled={currentPage === 0}
                            >
                                <MaterialIcons name="arrow-back" size={20} color="#fff" />
                                <Text style={styles.navButtonText}>Back</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.navButton,
                                    styles.nextButton,
                                ]}
                                onPress={nextPage}
                            >
                                <Text style={styles.navButtonText}>
                                    {currentPage === pages.length - 1 ? "Got it!" : "Next"}
                                </Text>
                                {currentPage < pages.length - 1 && (
                                    <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        maxWidth: 500,
        backgroundColor: '#121212',
        borderRadius: 24,
        overflow: 'hidden',
        minHeight: 520,
        maxHeight: '90%',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.6,
        shadowRadius: 15,
    },
    noticeBar: {
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(251, 191, 36, 0.2)',
    },
    noticeText: {
        color: '#fbbf24',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    header: {
        paddingVertical: 24,
        paddingHorizontal: 24,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
    },
    closeButtonInside: {
        position: 'absolute',
        right: 16,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 40,
    },
    pageContent: {
        alignItems: 'center',
        flex: 1,
    },
    mainText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 12,
    },
    subText: {
        fontSize: 15,
        color: '#cccccc',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 16,
    },
    featureList: {
        width: '100%',
        marginTop: 8,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#333',
    },
    featureText: {
        fontSize: 15,
        color: '#ffffff',
        marginLeft: 12,
        flex: 1,
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        width: '100%',
        marginTop: 12,
        elevation: 2,
    },
    socialButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffffff',
        marginLeft: 10,
    },
    footerText: {
        fontSize: 15,
        color: '#888888',
        textAlign: 'center',
        marginTop: 30,
        fontStyle: 'italic',
    },
    footer: {
        paddingBottom: 20,
        backgroundColor: '#121212',
    },
    pageIndicators: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 16,
    },
    pageIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#333333',
        marginHorizontal: 4,
    },
    pageIndicatorActive: {
        backgroundColor: '#f4511e',
        width: 20,
    },
    navigationButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    navButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#222222',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        minWidth: 100,
        justifyContent: 'center',
    },
    nextButton: {
        backgroundColor: '#f4511e',
    },
    navButtonText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#ffffff',
        marginHorizontal: 8,
    },
    disabledButton: {
        backgroundColor: '#222222',
        opacity: 0.5,
    },
    scrollDownIndicator: {
        position: 'absolute',
        bottom: 10,
        left: 0,
        right: 0,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        backgroundColor: 'rgba(18, 18, 18, 0.9)',
        paddingVertical: 5,
        gap: 5,
    },
    scrollIndicatorText: {
        color: '#f4511e',
        fontSize: 13,
        fontWeight: '600',
    },
});

export default FarewellModal;
