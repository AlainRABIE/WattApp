import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB0k9QFmsOsgsGXQ4YDugSqsegOdQE080E",
  authDomain: "wattapp-12e91.firebaseapp.com",
  projectId: "wattapp-12e91",
  storageBucket: "wattapp-12e91.firebasestorage.app",
  messagingSenderId: "375000137421",
  appId: "1:375000137421:web:efe15696fabccde146f384",
  measurementId: "G-DFFSZT3M2Z"
};

const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

export default app;
