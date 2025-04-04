import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';

type UserDonationBadgeProps = {
  userId: string;
  compact?: boolean; // For a more compact display in comments
};

const UserDonationBadge = ({ userId, compact = false }: UserDonationBadgeProps) => {
  const [donationAmount, setDonationAmount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const db = getFirestore();

  useEffect(() => {
    const fetchUserDonationStatus = async () => {
      if (!userId) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Check for both fields for backward compatibility
          const totalDonated = userData.donationAmount || userData.premiumAmount || 0;
          setDonationAmount(totalDonated);
          setIsPremium(userData.isPremium || false);
        }
      } catch (error) {
        console.error('Error fetching user donation status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDonationStatus();
  }, [userId]);

  if (loading || donationAmount === 0) {
    return null; // Don't show anything if loading or user hasn't donated
  }

  // For comment display (compact mode)
  if (compact) {
    return (
      <View style={[
        styles.compactBadge, 
        isPremium ? styles.premiumBadge : styles.supporterBadge
      ]}>
        <MaterialIcons 
          name={isPremium ? "verified" : "favorite"} 
          size={12} 
          color={isPremium ? "#FFD700" : "#f4511e"} 
        />
        <Text style={isPremium ? styles.premiumBadgeText : styles.supporterBadgeText}>
          {isPremium ? 'Premium' : 'Supporter'}
        </Text>
      </View>
    );
  }

  // For profile display (full mode)
  return (
    <View style={styles.badge}>
      <MaterialIcons 
        name={isPremium ? "verified" : "favorite"} 
        size={16} 
        color={isPremium ? "#FFD700" : "#f4511e"} 
      />
      <Text style={[
        styles.badgeText, 
        { color: isPremium ? "#FFD700" : "#f4511e" }
      ]}>
        {isPremium ? 'Premium Member' : 'Supporter'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginVertical: 4,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  premiumBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)', // Gold tinted background
  },
  supporterBadge: {
    backgroundColor: 'rgba(244, 81, 30, 0.15)', // Orange tinted background
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
    color: '#FFD700', // Gold color for premium text
  },
  supporterBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
    color: '#f4511e', // Orange color for supporter text
  },
});

export default UserDonationBadge; 