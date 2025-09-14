import React, { useEffect, useState } from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { encode as btoa } from 'base-64';
import { MaterialIcons } from '@expo/vector-icons';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

const DonationOption = ({ amount, onPress, selected }: { amount: number, onPress: () => void, selected: boolean }) => (
  <TouchableOpacity 
    style={[styles.donationOption, selected && styles.selectedOption]} 
    onPress={onPress}
  >
    <Text style={[styles.donationAmount, selected && styles.selectedText]}>₹{amount}</Text>
  </TouchableOpacity>
);

const DonateScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const auth = getAuth();
  const db = getFirestore();
  
  const [showWebView, setShowWebView] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState('');
  const [totalDonated, setTotalDonated] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set navigation options
    navigation.setOptions({
      title: 'Support AniSurge',
      headerShown: true,
    });
    
    // Fetch user's donation history
    const fetchDonationHistory = async () => {
      const user = auth.currentUser;
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setTotalDonated(userData.donationAmount || 0);
        }
      } catch (error) {
        console.error('Error fetching donation history:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDonationHistory();
  }, [navigation]);

  // Get the current user
  const user = auth.currentUser;
  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please log in to make a donation</Text>
      </View>
    );
  }

  // Create the donation URL with user data
  const donationUrl = `https://mg.anishkumar.tech/donate.html?userId=${user.uid}&email=${encodeURIComponent(user.email || '')}&callback=${encodeURIComponent('anisurge://donation-success')}`;

  // Handle navigation state changes
  const handleNavigationStateChange = (navState: any) => {
    // Check if the URL starts with your deep link scheme
    if (navState.url.startsWith('anisurge://')) {
      const url = new URL(navState.url);
      const status = url.searchParams.get('status');
      const userId = url.searchParams.get('userId');

      if (status === 'success') {
        // Navigate back to the previous screen or home
        navigation.goBack();
        // You can also show a success message or update the UI
      }
    }
  };

  const proceedToDonate = () => {
    setShowWebView(true);
  };

  if (showWebView) {
    return (
      <View style={styles.container}>
        <WebView
          source={{ uri: donationUrl }}
          style={styles.webview}
          onNavigationStateChange={handleNavigationStateChange}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#f4511e', '#e91e63']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <MaterialIcons name="favorite" size={36} color="#fff" />
          <Text style={styles.headerTitle}>Support AniSurge</Text>
          <Text style={styles.headerSubtitle}>Help us keep the app free for everyone</Text>
        </LinearGradient>

        {loading ? (
          <ActivityIndicator size="large" color="#f4511e" style={styles.loader} />
        ) : (
          <>
            {totalDonated > 0 && (
              <View style={styles.donationHistoryContainer}>
                <Text style={styles.donationHistoryTitle}>Your Donations</Text>
                <Text style={styles.donationHistoryAmount}>₹{totalDonated.toFixed(2)}</Text>
                <Text style={styles.donationHistoryText}>
                  Thank you for your support! Your donations help us improve AniSurge.
                </Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>Select Donation Amount</Text>
            
            <View style={styles.donationGrid}>
              <DonationOption 
                amount={100} 
                onPress={() => setSelectedAmount(100)} 
                selected={selectedAmount === 100}
              />
              <DonationOption 
                amount={200} 
                onPress={() => setSelectedAmount(200)} 
                selected={selectedAmount === 200}
              />
              <DonationOption 
                amount={500} 
                onPress={() => setSelectedAmount(500)} 
                selected={selectedAmount === 500}
              />
            </View>
            
            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsTitle}>Benefits of Supporting</Text>
              
              <View style={styles.benefitItem}>
                <MaterialIcons name="verified" size={20} color="#FFD700" />
                <Text style={styles.benefitText}>Get premium status with exclusive features</Text>
              </View>
              
              <View style={styles.benefitItem}>
                <MaterialIcons name="style" size={20} color="#FFD700" />
                <Text style={styles.benefitText}>Access to premium avatars</Text>
              </View>
              
              <View style={styles.benefitItem}>
                <MaterialIcons name="block" size={20} color="#FFD700" />
                <Text style={styles.benefitText}>Ad-free experience</Text>
              </View>
              
              <View style={styles.benefitItem}>
                <MaterialIcons name="favorite" size={20} color="#FFD700" />
                <Text style={styles.benefitText}>Support the development team</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.donateButton}
              onPress={proceedToDonate}
            >
              <Text style={styles.donateButtonText}>
                Donate ₹{selectedAmount}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 0,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  donationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  donationOption: {
    width: '30%',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedOption: {
    backgroundColor: 'rgba(244, 81, 30, 0.2)',
    borderColor: '#f4511e',
  },
  donationAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  selectedText: {
    color: '#f4511e',
  },
  benefitsContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#ccc',
    marginLeft: 12,
  },
  donateButton: {
    backgroundColor: '#f4511e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    margin: 16,
  },
  donateButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  webview: {
    flex: 1,
  },
  errorText: {
    color: '#f4511e',
    fontSize: 16,
    textAlign: 'center',
    padding: 24,
  },
  loader: {
    marginTop: 40,
  },
  donationHistoryContainer: {
    backgroundColor: 'rgba(244, 81, 30, 0.1)',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: 'rgba(244, 81, 30, 0.2)',
    alignItems: 'center',
  },
  donationHistoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  donationHistoryAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f4511e',
    marginBottom: 8,
  },
  donationHistoryText: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
});

export default DonateScreen; 