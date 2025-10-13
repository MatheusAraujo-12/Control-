import { initializeApp } from 'firebase/app';
import {
    initializeFirestore,
    Timestamp,
    addDoc,
    collection,
    deleteDoc,
    setDoc,
    doc,
    getDocs,
    onSnapshot,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from 'firebase/firestore';
import {
    getAuth,
    onAuthStateChanged,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
} from 'firebase/auth';

const fallbackConfig = Object.freeze({
    apiKey: 'AIzaSyBclFrN5gmwVdpVqpR4oF8uVZqPPgEQqLc',
    authDomain: 'controlplus-b35a1.firebaseapp.com',
    projectId: 'controlplus-b35a1',
    storageBucket: 'controlplus-b35a1.firebasestorage.app',
    messagingSenderId: '754221853615',
    appId: '1:754221853615:web:94ad9686b2748e366b1d5a',
    measurementId: 'G-Y12LFE78EB',
});

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || fallbackConfig.apiKey,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || fallbackConfig.authDomain,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || fallbackConfig.projectId,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || fallbackConfig.storageBucket,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || fallbackConfig.messagingSenderId,
    appId: process.env.REACT_APP_FIREBASE_APP_ID || fallbackConfig.appId,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || fallbackConfig.measurementId,
};

const missingConfigKeys = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

if (missingConfigKeys.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(`[firebase] Missing configuration values for: ${missingConfigKeys.join(', ')}`);
}

if (process.env.NODE_ENV === 'production' && process.env.REACT_APP_FIREBASE_API_KEY === undefined) {
    // eslint-disable-next-line no-console
    console.warn('[firebase] Using fallback Firebase configuration. Define REACT_APP_FIREBASE_* variables before deploying to production.');
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
});

export {
    db,
    auth,
    collection,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    serverTimestamp,
    query,
    where,
    Timestamp,
    getDocs,
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    setDoc,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
};
