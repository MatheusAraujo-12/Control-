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

const firebaseConfig = Object.freeze({
    apiKey: 'AIzaSyBclFrN5gmwVdpVqpR4oF8uVZqPPgEQqLc',
    authDomain: 'controlplus-b35a1.firebaseapp.com',
    projectId: 'controlplus-b35a1',
    storageBucket: 'controlplus-b35a1.firebasestorage.app',
    messagingSenderId: '754221853615',
    appId: '1:754221853615:web:94ad9686b2748e366b1d5a',
    measurementId: 'G-Y12LFE78EB',
});

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const db = initializeFirestore(
    app,
    {
        ignoreUndefinedProperties: true,
        experimentalForceLongPolling: true,
        useFetchStreams: false,
    },
    'controlplus'
);

const userCollectionRef = (uid, ...pathSegments) => {
    if (!uid) {
        throw new Error('userCollectionRef requires a valid uid');
    }
    return collection(db, 'users', uid, ...pathSegments);
};

const userDocRef = (uid, ...pathSegments) => {
    if (!uid) {
        throw new Error('userDocRef requires a valid uid');
    }
    return doc(db, 'users', uid, ...pathSegments);
};

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
    userCollectionRef,
    userDocRef,
};
