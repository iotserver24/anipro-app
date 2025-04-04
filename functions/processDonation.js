const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Tier levels for donations
 */
const DonationTier = {
  NONE: 'none',
  BASIC: 'basic',
  PREMIUM: 'premium',
  VIP: 'vip'
};

/**
 * Webhook to receive Cashfree payment notifications
 * This should be called by Cashfree after a successful payment
 * 
 * Expected payload:
 * {
 *   orderId: string, // Format: "user-{userId}-{timestamp}"
 *   orderAmount: number,
 *   referenceId: string, // Cashfree transaction ID
 *   txStatus: string, // "SUCCESS", "FAILED", etc.
 *   paymentMode: string,
 *   txMsg: string,
 *   txTime: string, // ISO date string
 *   signature: string // For verification (implement proper signature verification)
 * }
 */
exports.cashfreeWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // Only allow POST method
    if (req.method !== 'POST') {
      return res.status(405).send({ error: 'Method not allowed' });
    }

    // Get payment data from request body
    const payload = req.body;
    
    // Basic validation
    if (!payload || !payload.orderId || !payload.orderAmount || payload.txStatus !== 'SUCCESS') {
      return res.status(400).send({ error: 'Invalid payment data' });
    }

    // Extract user ID from order ID (assuming format: user-{userId}-{timestamp})
    const orderIdParts = payload.orderId.split('-');
    if (orderIdParts.length < 3 || orderIdParts[0] !== 'user') {
      return res.status(400).send({ error: 'Invalid order ID format' });
    }
    
    const userId = orderIdParts[1];
    const amount = parseFloat(payload.orderAmount);
    
    // Verify the user exists
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).send({ error: 'User not found' });
    }
    
    // Process the donation
    await processDonation(userId, amount, payload);
    
    // Send success response
    return res.status(200).send({ success: true });
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    return res.status(500).send({ error: 'Internal server error' });
  }
});

/**
 * Process a donation and update the user's donation status
 */
async function processDonation(userId, amount, paymentData) {
  // Determine tier based on amount
  let tier = DonationTier.NONE;
  if (amount >= 50 && amount < 200) {
    tier = DonationTier.BASIC;
  } else if (amount >= 200 && amount < 500) {
    tier = DonationTier.PREMIUM;
  } else if (amount >= 500) {
    tier = DonationTier.VIP;
  }

  // Determine features based on tier
  const features = {
    premiumAvatars: tier !== DonationTier.NONE,
    disableAds: tier !== DonationTier.NONE,
    earlyAccess: tier === DonationTier.PREMIUM || tier === DonationTier.VIP,
    customThemes: tier === DonationTier.VIP,
  };

  // Get the current donation doc if it exists
  const donationDocRef = db.collection('user_donations').doc(userId);
  const donationDoc = await donationDocRef.get();

  const now = admin.firestore.Timestamp.now();
  
  // Create transaction record
  const transactionData = {
    amount,
    date: now,
    transactionId: paymentData.referenceId,
    paymentMode: paymentData.paymentMode,
    orderId: paymentData.orderId,
    status: paymentData.txStatus,
    message: paymentData.txMsg,
    paymentTime: paymentData.txTime
  };
  
  if (donationDoc.exists) {
    // Update existing donation record
    const existingData = donationDoc.data();
    
    // Calculate new total amount
    const newTotalAmount = existingData.amount + amount;
    
    // Determine new tier based on total amount
    let newTier = existingData.tier;
    if (newTotalAmount >= 500) {
      newTier = DonationTier.VIP;
    } else if (newTotalAmount >= 200) {
      newTier = DonationTier.PREMIUM;
    } else if (newTotalAmount >= 50) {
      newTier = DonationTier.BASIC;
    }
    
    // Update donation record
    await donationDocRef.update({
      tier: newTier,
      amount: newTotalAmount,
      lastDonationDate: now,
      donations: admin.firestore.FieldValue.arrayUnion(transactionData),
      features: {
        premiumAvatars: true,
        disableAds: true,
        earlyAccess: newTier === DonationTier.PREMIUM || newTier === DonationTier.VIP,
        customThemes: newTier === DonationTier.VIP,
      }
    });
  } else {
    // Create new donation record
    await donationDocRef.set({
      tier,
      amount,
      lastDonationDate: now,
      donations: [transactionData],
      features
    });
  }
  
  // Also log the donation in a separate collection for admin reporting
  await db.collection('donation_logs').add({
    userId,
    ...transactionData,
    tier: tier,
  });
  
  // Set the isPremium flag in the user document to enable premium features
  await db.collection('users').doc(userId).update({
    isPremium: true
  });
  
  console.log(`Processed donation of ${amount} for user ${userId}, tier: ${tier}`);
} 