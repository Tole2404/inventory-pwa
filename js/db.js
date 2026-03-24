// db.js (Firebase Firestore Edition)
const firebaseConfig = {
  apiKey: "AIzaSyCnm8ovju-mam9ElCnQxYdtOQVijQjHoSE",
  authDomain: "sarassingkat.firebaseapp.com",
  projectId: "sarassingkat",
  storageBucket: "sarassingkat.firebasestorage.app",
  messagingSenderId: "384508505990",
  appId: "1:384508505990:web:d6965ea8df458d971ac607"
};

// Initialize Firebase App
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

// Enable offline persistence caching (The core of Offline-First PWA)
db.enablePersistence().catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code == 'unimplemented') {
        console.warn('The current browser does not support all of the features required to enable persistence');
    }
});

const collectionName = 'assets';

window.AssetsDB = {
    init: async function() {
        return Promise.resolve(); // Connection is ready automatically
    },
    getAll: async function() {
        try {
            const snapshot = await db.collection(collectionName).get();
            const items = [];
            snapshot.forEach(doc => {
                items.push({ id: doc.id, ...doc.data() });
            });
            return items;
        } catch (e) {
            console.error('Error getAll:', e);
            return [];
        }
    },
    getById: async function(id) {
        try {
            const doc = await db.collection(collectionName).doc(id.toString()).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (e) {
            console.error('Error getById:', e);
            return null;
        }
    },
    add: async function(asset) {
        asset.tanggal = asset.tanggal || Date.now();
        try {
            const docRef = await db.collection(collectionName).add(asset);
            return docRef.id;
        } catch (e) {
            console.error('Error add:', e);
            throw e;
        }
    },
    update: async function(asset) {
        asset.tanggal = Date.now();
        const id = asset.id;
        delete asset.id; // Strip the ID before sending to firestore to keep document clean
        try {
            await db.collection(collectionName).doc(id.toString()).update(asset);
            return id;
        } catch (e) {
            console.error('Error update:', e);
            throw e;
        }
    },
    delete: async function(id) {
        try {
            await db.collection(collectionName).doc(id.toString()).delete();
        } catch (e) {
            console.error('Error delete:', e);
            throw e;
        }
    },
    clear: async function() {
        try {
            const snapshot = await db.collection(collectionName).get();
            const docs = snapshot.docs;
            // Delete in chunks of 500 (Firestore bulk limitation safety threshold)
            while (docs.length > 0) {
                const chunk = docs.splice(0, 500);
                const batch = db.batch();
                chunk.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
            }
        } catch (e) {
            console.error('Error clear:', e);
            throw e;
        }
    }
};
