// client/src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCbuju5k6KuOM9DTvZLpsRgkyyA4z_iVOk",
  authDomain: "cartsmash-pooda.firebaseapp.com",
  databaseURL: "https://cartsmash-pooda-default-rtdb.firebaseio.com",
  projectId: "cartsmash-pooda",
  storageBucket: "cartsmash-pooda.firebasestorage.app",
  messagingSenderId: "230149206692",
  appId: "1:230149206692:web:bd8255ffc399f24e13ac31",
  measurementId: "G-VG9TG33V5J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const database = getDatabase(app);

export default app;