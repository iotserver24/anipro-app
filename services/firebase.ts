import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, setPersistence, inMemoryPersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDwnApvEV4stf1L5etAaGZG9cOkAAo__7M",
  authDomain: "anisurge-11808.firebaseapp.com",
  projectId: "anisurge-11808",
  storageBucket: "anisurge-11808.firebasestorage.app",
  messagingSenderId: "151470089122",
  appId: "1:151470089122:web:41f2c84a70e28a8cc3c8fb",
  measurementId: "G-V9SPTVJS18"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Note: Firebase Auth persistence for React Native
// Since Firebase v9.9.0, we should implement our own persistence mechanism
// Using AsyncStorage in userService.ts directly since the built-in
// ReactNativeAsyncStorage is not directly accessible in current versions

export { db, auth }; 