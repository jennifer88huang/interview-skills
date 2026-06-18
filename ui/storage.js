const DB_NAME = "interview-skills";
const DB_VERSION = 1;
const STORE_NAME = "sessions";
const SESSIONS_INDEX_KEY = "interviewSkills:sessions";
const ACTIVE_SESSION_KEY = "interviewSkills:activeSessionId";

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

window.InterviewStorage = {
  SESSIONS_INDEX_KEY,
  ACTIVE_SESSION_KEY,
  openDB,
  readSessionIndex,
  writeSessionIndex,
  getActiveSessionId,
  setActiveSessionId,
  saveSessionToDB,
  loadSessionFromDB,
  deleteSessionFromDB,
  listAllSessionsFromDB,
};
