// ===== Firebase Configuration =====
// ไฟล์นี้ใช้สำหรับการเชื่อมต่อกับ Firebase SDK v9+

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getStorage } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAwU1TprM3YZ5vbf9tg19zSJqRxbUyNL24",
  authDomain: "save-money-app-3cc2a.firebaseapp.com",
  projectId: "save-money-app-3cc2a",
  storageBucket: "save-money-app-3cc2a.firebasestorage.app",
  messagingSenderId: "288105338186",
  appId: "1:288105338186:web:62826d370ba3c9a1dc5db3",
  measurementId: "G-LY562KHEW6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Initialize Analytics (if supported)
let analytics = null;
isSupported().then(yes => yes ? analytics = getAnalytics(app) : null);

// Development mode check
const isDevelopment = process.env.NODE_ENV === 'development' || 
                     window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';

// Connect to Firestore emulator in development
if (isDevelopment) {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('🔧 Connected to Firestore emulator');
  } catch (error) {
    console.log('⚠️ Firestore emulator not available, using production');
  }
}

// Export Firebase services
export { app, auth, db, storage, analytics, firebaseConfig };

// Export for global use (if needed)
if (typeof window !== 'undefined') {
  window.firebaseApp = app;
  window.firebaseAuth = auth;
  window.firebaseDb = db;
  window.firebaseStorage = storage;
  window.firebaseAnalytics = analytics;
}
