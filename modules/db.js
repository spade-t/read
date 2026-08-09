// ===== IndexedDB 操作 =====

const DB_NAME = 'ChatViewerDB';
const STORE_NAME = 'messages';
const SETTINGS_STORE = 'settings';
const DB_VERSION = 2;

let db = null;

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const d = e.target.result;
            if (!d.objectStoreNames.contains(STORE_NAME)) {
                d.createObjectStore(STORE_NAME, { keyPath: 'message_id' });
            }
            if (!d.objectStoreNames.contains(SETTINGS_STORE)) {
                d.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
            }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e.target.error);
    });
}

async function getDB() {
    if (!db) db = await openDB();
    return db;
}

async function saveMessagesToDB(messages) {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const msg of messages) store.put(msg);
    await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });
}

async function loadAllMessagesFromDB() {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function deleteMessageFromDB(messageId) {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(messageId);
    await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });
}

async function clearAllMessagesDB() {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });
}

async function saveSettingsToDB(settings) {
    const db = await getDB();
    const tx = db.transaction(SETTINGS_STORE, 'readwrite');
    const store = tx.objectStore(SETTINGS_STORE);
    for (const [key, value] of Object.entries(settings)) {
        store.put({ key, value });
    }
    await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });
}

async function loadSettingsFromDB() {
    const db = await getDB();
    const tx = db.transaction(SETTINGS_STORE, 'readonly');
    const store = tx.objectStore(SETTINGS_STORE);
    const all = await new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    const result = {};
    for (const item of all) result[item.key] = item.value;
    return result;
}
