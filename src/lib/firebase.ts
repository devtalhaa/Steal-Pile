import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB_OWR54I-RfiBjTidfbGfUqJgy_dkxPJU",
  authDomain: "steal-game.firebaseapp.com",
  projectId: "steal-game",
  storageBucket: "steal-game.firebasestorage.app",
  messagingSenderId: "663931266061",
  appId: "1:663931266061:web:feb58a441e137b3948a144",
  measurementId: "G-M4LP7Z0PLQ"
};

// Initialize Firebase only if it hasn't been initialized already (important for Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
