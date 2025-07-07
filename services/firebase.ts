import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

// WARNING: SECURITY ISSUE - Firebase credentials should not be hardcoded in client code
// TODO: Move these to environment variables in app.config.js/ts and use Constants.expoConfig.extra
// For production apps, consider using Firebase App Check or other security measures
const firebaseConfig = {
  apiKey: "AIzaSyDwnApvEV4stf1L5etAaGZG9cOkAAo__7M",
  authDomain: "anisurge-11808.firebaseapp.com",
  projectId: "anisurge-11808",
  storageBucket: "anisurge-11808.firebasestorage.app",
  messagingSenderId: "151470089122",
  appId: "1:151470089122:web:41f2c84a70e28a8cc3c8fb",
  measurementId: "G-V9SPTVJS18",
  databaseURL: "https://anisurge-11808-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Validate that all required configuration is present
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'messagingSenderId', 'appId'] as const;
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

if (missingKeys.length > 0) {
  console.error(`Missing Firebase configuration: ${missingKeys.join(', ')}.`);
  throw new Error(`Missing Firebase configuration: ${missingKeys.join(', ')}. Please check your configuration.`);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const database = getDatabase(app);

// Initialize Firebase Auth with React Native AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export { db, auth, database }; 