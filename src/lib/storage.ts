/**
 * Storage abstraction for Catalift v2.
 *
 * - IndexedDB for bulky caches (workout history, exercise library, templates)
 * - localStorage for auth tokens + small UI state only
 *
 * Auth tokens (`sb-*-auth-token`) are quota-protected — never silently dropped.
 */

// ---------------------------------------------------------------------------
// localStorage (auth tokens + small UI state)
// ---------------------------------------------------------------------------

export function getLocalItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    // QuotaExceededError or SecurityError — must not silently drop auth tokens
    if (isAuthTokenKey(key)) {
      throw new Error(
        `Failed to read auth token from localStorage: ${key}. ${String(err)}`,
      );
    }
    return null;
  }
}

export function setLocalItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    if (isAuthTokenKey(key)) {
      throw new Error(
        `Failed to write auth token to localStorage: ${key}. Quota may be exceeded. ${String(err)}`,
      );
    }
    // Non-auth keys: best-effort, no throw
  }
}

export function removeLocalItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // best-effort
  }
}

function isAuthTokenKey(key: string): boolean {
  return key.includes("auth-token") || key.startsWith("sb-");
}

// ---------------------------------------------------------------------------
// IndexedDB (bulky caches)
// ---------------------------------------------------------------------------

const DB_NAME = "catalift-cache";
const STORE_NAME = "keyval";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getIdbItem<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function setIdbItem<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // best-effort for cache writes
  }
}

export async function removeIdbItem(key: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // best-effort
  }
}

// ---------------------------------------------------------------------------
// User-scoped persist key helper
// ---------------------------------------------------------------------------

/**
 * Generates a user-scoped persist key: `catalift-<resource>-<userId>`
 * All Zustand persist keys must use this to avoid unscoped global caches.
 */
export function userScopedKey(resource: string, userId: string): string {
  return `catalift-${resource}-${userId}`;
}
