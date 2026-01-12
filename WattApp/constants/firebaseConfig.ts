import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

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

// Connecter aux émulateurs en développement
const USE_EMULATORS = false; // Mettre à true pour utiliser les émulateurs

if (USE_EMULATORS && typeof window !== 'undefined') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    console.log('🔧 Émulateurs Firebase connectés');
  } catch (e) {
    console.log('Émulateurs déjà connectés ou non disponibles');
  }
}

export default app;
