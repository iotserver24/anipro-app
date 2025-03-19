// Firestore initialization script
// Run with: node scripts/initFirestore.js

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc 
} = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Replace with your Firebase config - should be loaded from environment vars in production
// This is just a placeholder
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Collection names
const COLLECTIONS = {
  USER_DATA: 'user_data',
  USERS: 'users',
  COMMENTS: 'comments',
  COMMENT_LIKES: 'comment_likes'
};

// Creates a sample document in each collection to ensure they exist
async function initializeCollections() {
  console.log('Initializing Firestore collections...');
  
  try {
    // Create __config__ document in each collection to store metadata
    for (const collName of Object.values(COLLECTIONS)) {
      const configDoc = doc(db, collName, '__config__');
      await setDoc(configDoc, {
        created: new Date(),
        version: '1.0.0',
        description: `${collName} collection for AniSurge app`
      });
      console.log(`Created __config__ document in ${collName} collection`);
    }
    
    console.log('Collections initialized successfully!');
  } catch (error) {
    console.error('Error initializing collections:', error);
  }
}

// Clean up sample documents
async function cleanupSampleDocs() {
  console.log('Cleaning up sample documents...');
  
  try {
    for (const collName of Object.values(COLLECTIONS)) {
      const configDoc = doc(db, collName, '__config__');
      await deleteDoc(configDoc);
      console.log(`Deleted __config__ document from ${collName} collection`);
    }
    
    console.log('Cleanup completed successfully!');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Upload security rules from firestore-rules.txt file
async function uploadSecurityRules() {
  console.log('Note: Security rules cannot be uploaded directly via the Firebase JS SDK.');
  console.log('Please use the Firebase CLI or Firebase Console to upload rules from the firestore-rules.txt file.');
  console.log('Command: firebase deploy --only firestore:rules');
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'init';
  
  switch (command) {
    case 'init':
      await initializeCollections();
      break;
    case 'cleanup':
      await cleanupSampleDocs();
      break;
    case 'rules':
      await uploadSecurityRules();
      break;
    default:
      console.log('Available commands: init, cleanup, rules');
  }
  
  process.exit(0);
}

// Run the main function
main(); 