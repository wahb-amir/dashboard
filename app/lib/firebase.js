// src/lib/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCqOVdIXb_5BoG0rP1d5dYxKlWxn_ll1is",
  authDomain: "client-dev-collaboration.firebaseapp.com",
  projectId: "client-dev-collaboration",
  storageBucket: "client-dev-collaboration.firebasestorage.app",
  messagingSenderId: "937234901840",
  appId: "1:937234901840:web:544a45d5b7d1bed3959a55",
  measurementId: "G-LGQWW41KTJ"
};

let rtdb = null;

if (typeof window !== 'undefined') {
    // Prevent double init during HMR
    if (!getApps().length) {
        const app = initializeApp(firebaseConfig);
        rtdb = getDatabase(app);
        // attach to window for debugging if you like:
        // window.__RTDB__ = rtdb;
    } else {
        // If app already exists, just grab DB
        try {
            rtdb = getDatabase();
        } catch (e) {
            console.warn('firebase db init error', e);
        }
    }
}

export { rtdb };
