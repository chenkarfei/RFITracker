import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDHpT8lNN0O7c7O2ynMA9oFQgg0JrLJ5rw",
  authDomain: "rfitracker.firebaseapp.com",
  projectId: "rfitracker",
  storageBucket: "rfitracker.firebasestorage.app",
  messagingSenderId: "1364340353",
  appId: "1:1364340353:web:f02b9dac21d7dcd2006780",
  measurementId: "G-VLP7ZWDD4B"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
