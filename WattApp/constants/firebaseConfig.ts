import { initializeApp } from 'firebase/app';

import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyB0k9QFmsOsgsGXQ4YDugSqsegOdQE080E",
  authDomain: "wattapp-12e91.firebaseapp.com",
  projectId: "wattapp-12e91",
  storageBucket: "wattapp-12e91.appspot.com",
  messagingSenderId: "375000137421",
  appId: "1:375000137421:web:efe15696fabccde146f384",
  measurementId: "G-DFFSZT3M2Z"
};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
