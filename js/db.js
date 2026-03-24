/**
 * db.js — IndexedDB Wrapper for Assets Inventory
 * Database: assetsDB
 * Object Store: assets
 */

const AssetsDB = (() => {
    const DB_NAME = 'assetsDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'assets';

    /** Open (or create) the database */
    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, {
                        keyPath: 'id',
                        autoIncrement: true,
                    });
                    store.createIndex('kode_barang', 'kode_barang', { unique: false });
                    store.createIndex('nama_barang', 'nama_barang', { unique: false });
                    store.createIndex('kategori', 'kategori', { unique: false });
                    store.createIndex('lokasi', 'lokasi', { unique: false });
                    store.createIndex('kondisi', 'kondisi', { unique: false });
                    store.createIndex('tanggal', 'tanggal', { unique: false });
                }
            };

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    /** Get a transaction + object store */
    async function getStore(mode = 'readonly') {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, mode);
        return tx.objectStore(STORE_NAME);
    }

    /** Wrap an IDBRequest in a Promise */
    function promisify(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    return {
        /** Add a new asset */
        async add(asset) {
            asset.tanggal = asset.tanggal || new Date().toISOString();
            const store = await getStore('readwrite');
            return promisify(store.add(asset));
        },

        /** Get all assets */
        async getAll() {
            const store = await getStore('readonly');
            return promisify(store.getAll());
        },

        /** Get a single asset by id */
        async getById(id) {
            const store = await getStore('readonly');
            return promisify(store.get(id));
        },

        /** Update an existing asset */
        async update(asset) {
            asset.tanggal_update = new Date().toISOString();
            const store = await getStore('readwrite');
            return promisify(store.put(asset));
        },

        /** Delete an asset by id */
        async delete(id) {
            const store = await getStore('readwrite');
            return promisify(store.delete(id));
        },

        /** Count all assets */
        async count() {
            const store = await getStore('readonly');
            return promisify(store.count());
        },

        /** Clear all assets */
        async clear() {
            const store = await getStore('readwrite');
            return promisify(store.clear());
        },
    };
})();
