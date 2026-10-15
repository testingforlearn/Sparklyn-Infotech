// Sparklyn Infotech - Firebase Cloud Database Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBsjxJeZzgQHGOUL2-08EYLHcG6wUPwbBI",
  authDomain: "sparklyn-49ce6.firebaseapp.com",
  projectId: "sparklyn-49ce6",
  storageBucket: "sparklyn-49ce6.firebasestorage.app",
  messagingSenderId: "762988088794",
  appId: "1:762988088794:web:3129aa2b9fea78e862c4e3",
  measurementId: "G-4BDTLZ43CB"
};

// Initialize Firebase SDK
let firebaseApp = null;
let firestoreDb = null;
let firebaseAnalytics = null;

try {
  if (typeof firebase !== 'undefined') {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    firestoreDb = firebase.firestore();
    if (typeof firebase.analytics === 'function') {
      firebaseAnalytics = firebase.analytics();
    }
    console.log('🔥 Sparklyn Firebase initialized successfully (Project: sparklyn-49ce6)');
  }
} catch (err) {
  console.warn('⚠️ Firebase init warning:', err.message);
}
