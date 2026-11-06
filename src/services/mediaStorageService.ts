/**
 * mediaStorageService.ts - Persistent IndexedDB Storage for Uploaded Media
 * 
 * Ensures uploaded videos (.mp4, .webm, .mov, etc.) are permanently stored
 * on the client without expiring when page is refreshed or tabs switch.
 */

const DB_NAME = 'ApexDigitalTV_MediaDB';
const DB_VERSION = 1;
const STORE_NAME = 'uploaded_videos';

export interface StoredMediaItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  blob?: Blob;
  serverStreamUrl?: string;
  durationMinutes: number;
  thumbnailUrl?: string;
  aspectRatio?: string;
  createdAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event: Event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event: Event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

// In-memory active blob URL cache to avoid re-creating duplicate URLs
const activeUrlCache = new Map<string, string>();

/**
 * Save an uploaded video file to IndexedDB
 */
export async function saveMediaToStorage(
  id: string,
  fileOrBlob: Blob | File | null,
  metadata: {
    name: string;
    mimeType?: string;
    serverStreamUrl?: string;
    durationMinutes?: number;
    thumbnailUrl?: string;
    aspectRatio?: string;
  }
): Promise<string> {
  const db = await getDB();
  // If file is large (> 35MB) and serverStreamUrl is available, omit heavy blob to avoid browser quota limits
  const shouldOmitBlob = Boolean(metadata.serverStreamUrl && fileOrBlob && fileOrBlob.size > 35 * 1024 * 1024);

  const item: StoredMediaItem = {
    id,
    name: metadata.name,
    mimeType: metadata.mimeType || (fileOrBlob ? fileOrBlob.type : 'video/mp4'),
    size: fileOrBlob ? fileOrBlob.size : 0,
    blob: shouldOmitBlob ? undefined : (fileOrBlob || undefined),
    serverStreamUrl: metadata.serverStreamUrl,
    durationMinutes: metadata.durationMinutes || 30,
    thumbnailUrl: metadata.thumbnailUrl,
    aspectRatio: metadata.aspectRatio || '16:9',
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(item);

      req.onsuccess = () => {
        // If serverStreamUrl is available, prefer it as the active playable URL
        if (metadata.serverStreamUrl) {
          activeUrlCache.set(id, metadata.serverStreamUrl);
          resolve(metadata.serverStreamUrl);
          return;
        }
        if (fileOrBlob) {
          const objectUrl = URL.createObjectURL(fileOrBlob);
          activeUrlCache.set(id, objectUrl);
          resolve(objectUrl);
        } else {
          resolve('');
        }
      };

      req.onerror = () => {
        // Quota fallback: retry saving without blob if quota exceeded
        console.warn('IndexedDB write error, retrying with metadata only:', req.error);
        if (item.blob) {
          try {
            const fallbackTx = db.transaction(STORE_NAME, 'readwrite');
            const fallbackStore = fallbackTx.objectStore(STORE_NAME);
            const fallbackItem = { ...item, blob: undefined };
            const fallbackReq = fallbackStore.put(fallbackItem);
            fallbackReq.onsuccess = () => {
              if (metadata.serverStreamUrl) {
                activeUrlCache.set(id, metadata.serverStreamUrl);
                resolve(metadata.serverStreamUrl);
              } else if (fileOrBlob) {
                resolve(URL.createObjectURL(fileOrBlob));
              } else {
                resolve('');
              }
            };
            fallbackReq.onerror = () => resolve(metadata.serverStreamUrl || (fileOrBlob ? URL.createObjectURL(fileOrBlob) : ''));
            return;
          } catch {
            resolve(metadata.serverStreamUrl || (fileOrBlob ? URL.createObjectURL(fileOrBlob) : ''));
            return;
          }
        }
        resolve(metadata.serverStreamUrl || (fileOrBlob ? URL.createObjectURL(fileOrBlob) : ''));
      };
    } catch (txErr) {
      console.warn('Transaction error, proceeding with direct URL:', txErr);
      resolve(metadata.serverStreamUrl || (fileOrBlob ? URL.createObjectURL(fileOrBlob) : ''));
    }
  });
}

/**
 * Get active playable URL for a stored media item
 */
export async function getStoredMediaUrl(id: string): Promise<string | null> {
  // Check in-memory cache first
  if (activeUrlCache.has(id)) {
    return activeUrlCache.get(id)!;
  }

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        const item = req.result as StoredMediaItem | undefined;
        if (!item) {
          resolve(null);
          return;
        }

        // 1. If serverStreamUrl is present, that is 100% durable and web-compatible!
        if (item.serverStreamUrl) {
          activeUrlCache.set(id, item.serverStreamUrl);
          resolve(item.serverStreamUrl);
          return;
        }

        // 2. Otherwise generate a fresh ObjectURL from the raw blob if valid
        if (item.blob && item.blob.size > 0) {
          try {
            const url = URL.createObjectURL(item.blob);
            activeUrlCache.set(id, url);
            resolve(url);
            return;
          } catch (e) {
            console.warn('Failed to create object URL from stored blob:', e);
          }
        }

        resolve(null);
      };

      req.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('Failed to retrieve stored media URL:', err);
    return null;
  }
}


/**
 * Retrieve metadata of all stored media items
 */
export async function getAllStoredMedia(): Promise<StoredMediaItem[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        resolve(req.result || []);
      };

      req.onerror = () => {
        reject(req.error);
      };
    });
  } catch {
    return [];
  }
}

/**
 * Delete a media item from storage
 */
export async function deleteStoredMedia(id: string): Promise<void> {
  if (activeUrlCache.has(id)) {
    URL.revokeObjectURL(activeUrlCache.get(id)!);
    activeUrlCache.delete(id);
  }

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignore error if DB not ready
  }
}
