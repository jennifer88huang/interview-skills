const DB_NAME = "interview-skills";
const DB_VERSION = 2;
const STORE_NAME = "sessions";
const PREFERENCES_STORE = "preferences";
const CREDENTIALS_STORE = "credentials";
const SESSIONS_INDEX_KEY = "interviewSkills:sessions";
const ACTIVE_SESSION_KEY = "interviewSkills:activeSessionId";
const DEVICE_SECRET_KEY = "interviewSkills:deviceSecret";
const ENGINE_PREF_ID = "engine";
const API_KEY_CRED_ID = "apiKey";

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB not supported"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(PREFERENCES_STORE)) {
        db.createObjectStore(PREFERENCES_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(CREDENTIALS_STORE)) {
        db.createObjectStore(CREDENTIALS_STORE, { keyPath: "id" });
      }
    };
  });
}

function readSessionIndex() {
  try {
    const raw = localStorage.getItem(SESSIONS_INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeSessionIndex(sessions) {
  localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify(sessions));
}

function getActiveSessionId() {
  return localStorage.getItem(ACTIVE_SESSION_KEY);
}

function setActiveSessionId(id) {
  if (id) {
    localStorage.setItem(ACTIVE_SESSION_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  }
}

async function saveSessionToDB(payload) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE_NAME).put(payload);
  });
}

async function loadSessionFromDB(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function deleteSessionFromDB(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE_NAME).delete(id);
  });
}

async function listAllSessionsFromDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function isCryptoAvailable() {
  return !!(window.crypto && window.crypto.subtle);
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getOrCreateDeviceSecret() {
  let secret = localStorage.getItem(DEVICE_SECRET_KEY);
  if (!secret) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    secret = bytesToBase64(bytes);
    localStorage.setItem(DEVICE_SECRET_KEY, secret);
  }
  return secret;
}

async function importDeviceAesKey() {
  const raw = base64ToBytes(getOrCreateDeviceSecret());
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptSecret(plainText) {
  if (!isCryptoAvailable()) {
    throw new Error("Web Crypto API is not available in this browser.");
  }
  const key = await importDeviceAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return {
    version: 1,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

async function decryptSecret(payload) {
  if (!payload?.iv || !payload?.ciphertext) return "";
  if (!isCryptoAvailable()) return "";
  const key = await importDeviceAesKey();
  const iv = base64ToBytes(payload.iv);
  const ciphertext = base64ToBytes(payload.ciphertext);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

async function getStoreRecord(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function putStoreRecord(storeName, record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(storeName).put(record);
  });
}

async function deleteStoreRecord(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(storeName).delete(id);
  });
}

async function loadEnginePreferences() {
  return getStoreRecord(PREFERENCES_STORE, ENGINE_PREF_ID);
}

async function saveEnginePreferences(prefs) {
  await putStoreRecord(PREFERENCES_STORE, {
    id: ENGINE_PREF_ID,
    ...prefs,
    updatedAt: new Date().toISOString(),
  });
}

async function loadEncryptedApiKey() {
  const record = await getStoreRecord(CREDENTIALS_STORE, API_KEY_CRED_ID);
  if (!record) return "";
  try {
    return await decryptSecret(record);
  } catch {
    return "";
  }
}

async function saveEncryptedApiKey(plainKey) {
  const encrypted = await encryptSecret(plainKey);
  await putStoreRecord(CREDENTIALS_STORE, {
    id: API_KEY_CRED_ID,
    ...encrypted,
    updatedAt: new Date().toISOString(),
  });
}

async function clearEncryptedApiKey() {
  await deleteStoreRecord(CREDENTIALS_STORE, API_KEY_CRED_ID);
}

window.InterviewStorage = {
  SESSIONS_INDEX_KEY,
  ACTIVE_SESSION_KEY,
  DEVICE_SECRET_KEY,
  ENGINE_PREF_ID,
  openDB,
  readSessionIndex,
  writeSessionIndex,
  getActiveSessionId,
  setActiveSessionId,
  saveSessionToDB,
  loadSessionFromDB,
  deleteSessionFromDB,
  listAllSessionsFromDB,
  isCryptoAvailable,
  loadEnginePreferences,
  saveEnginePreferences,
  loadEncryptedApiKey,
  saveEncryptedApiKey,
  clearEncryptedApiKey,
};
