import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { MaterialIcons } from '@expo/vector-icons';

const DonationStats = () => {
  const [donationAmount, setDonationAmount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Subscribe to user document changes
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        // Check for both donationAmount and premiumAmount for backward compatibility
        const totalDonated = userData.donationAmount || userData.premiumAmount || 0;
        setDonationAmount(totalDonated);
        setIsPremium(userData.isPremium || false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Don't render anything if no donations
  if (donationAmount === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="volunteer-activism" size={20} color="#f4511e" />
        <Text style={styles.headerText}>Your Support</Text>
      </View>
      
      <Text style={styles.donationTotal}>₹{donationAmount.toFixed(2)}</Text>
      <Text style={styles.totalLabel}>Total Donated</Text>
      
      <View style={styles.premiumStatusContainer}>
        <MaterialIcons 
          name={isPremium ? "verified" : "favorite"} 
          size={18} 
          color={isPremium ? "#FFD700" : "#f4511e"} 
        />
        <Text style={[
          styles.premiumStatusText, 
          {color: isPremium ? "#FFD700" : "#f4511e"}
        ]}>
          {isPremium ? 'Premium Member' : 'Supporter'}
        </Text>
      </View>
      
      <Text style={styles.thankYouText}>
        Thank you for supporting AniSurge!
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e1e1e',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(244, 81, 30, 0.3)',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    color: '#f4511e',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  donationTotal: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#f4511e',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 16,
  },
  premiumStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  premiumStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  thankYouText: {
    color: '#ccc',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default DonationStats; 