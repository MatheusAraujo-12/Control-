import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    collection,
    addDoc,
} from 'firebase/firestore';

const firebaseConfig = {
    apiKey: 'AIzaSyBclFrN5gmwVdpVqpR4oF8uVZqPPgEQqLc',
    authDomain: 'controlplus-b35a1.firebaseapp.com',
    projectId: 'controlplus-b35a1',
    storageBucket: 'controlplus-b35a1.firebasestorage.app',
    messagingSenderId: '754221853615',
    appId: '1:754221853615:web:94ad9686b2748e366b1d5a',
    measurementId: 'G-Y12LFE78EB',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'controlplus');

try {
    const docRef = await addDoc(collection(db, 'diagnostics_test'), {
        createdAt: new Date().toISOString(),
    });
    console.log('Wrote document with id:', docRef.id);
} catch (error) {
    console.error('Failed to add doc:', error);
    process.exitCode = 1;
}
