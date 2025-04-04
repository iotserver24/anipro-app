const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Set a user's premium status
 * 
 * This function requires admin authentication
 * 
 * Expected payload:
 * {
 *   userId: string, // User ID to update
 *   isPremium: boolean // Whether the user should have premium access
 * }
 */
exports.setPremiumStatus = functions.https.onCall(async (data, context) => {
  try {
    // Check if the caller is an admin
    if (!context.auth || !context.auth.token.admin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can set premium status'
      );
    }

    // Get required parameters
    const { userId, isPremium } = data;
    
    // Validate parameters
    if (!userId || typeof isPremium !== 'boolean') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid arguments provided'
      );
    }

    // Verify the user exists
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User not found'
      );
    }
    
    // Update the user's premium status
    await userRef.update({
      isPremium: isPremium
    });
    
    // Log the change
    console.log(`Set premium status to ${isPremium} for user ${userId}`);
    
    // Return success
    return {
      success: true,
      userId: userId,
      isPremium: isPremium
    };
  } catch (error) {
    console.error('Error setting premium status:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error setting premium status',
      error
    );
  }
}); 