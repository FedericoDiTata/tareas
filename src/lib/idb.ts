/**
 * Wrapper mínimo sobre IndexedDB.
 *
 * Por qué IndexedDB y no localStorage: acá viven imágenes y archivos completos.
 * localStorage tiene un techo de ~5 MB y sólo guarda texto; IndexedDB guarda
 * Blobs nativos y tiene cientos de MB disponibles.
 */

const DB_NAME = "escritorio";
const DB_VERSION = 1;
export const STORE_KV = "kv";
export const STORE_BLOBS = "blobs";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_KV)) db.createObjectStore(STORE_KV);
      if (!db.objectStoreNames.contains(STORE_BLOBS)) db.createObjectStore(STORE_BLOBS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = run(t.objectStore(store));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
      }),
  );
}

export const idbGet = <T>(store: string, key: string) =>
  tx<T | undefined>(store, "readonly", (s) => s.get(key));

export const idbSet = (store: string, key: string, value: unknown) =>
  tx<void>(store, "readwrite", (s) => s.put(value, key));

export const idbDel = (store: string, key: string) =>
  tx<void>(store, "readwrite", (s) => s.delete(key));

export const idbKeys = (store: string) =>
  tx<IDBValidKey[]>(store, "readonly", (s) => s.getAllKeys());
