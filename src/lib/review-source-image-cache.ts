const DB_NAME = "iroguide-review-source-images";
const DB_VERSION = 1;
const STORE_NAME = "sourceImages";

type SourceImageRecord = {
  id: string;
  userId: string;
  documentId: string;
  file: File;
  savedAt: string;
};

function getRecordId(userId: string, documentId: string) {
  return `${userId}/${documentId}`;
}

function openSourceImageDb() {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve<IDBDatabase | null>(null);
  }

  return new Promise<IDBDatabase | null>((resolve) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.objectStoreNames.contains(STORE_NAME)
        ? request.transaction?.objectStore(STORE_NAME)
        : db.createObjectStore(STORE_NAME, { keyPath: "id" });

      if (store && !store.indexNames.contains("userId")) {
        store.createIndex("userId", "userId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function runSourceImageTransaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T> | void,
) {
  return openSourceImageDb().then((db) => new Promise<T | null>((resolve) => {
    if (!db) {
      resolve(null);
      return;
    }

    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = action(store);

    transaction.oncomplete = () => {
      db.close();
      resolve(request ? request.result : null);
    };
    transaction.onerror = () => {
      db.close();
      resolve(null);
    };
    transaction.onabort = () => {
      db.close();
      resolve(null);
    };
  }));
}

export async function cacheLocalReviewSourceImage(userId: string, documentId: string, file: File) {
  const result = await runSourceImageTransaction("readwrite", (store) => store.put({
    id: getRecordId(userId, documentId),
    userId,
    documentId,
    file,
    savedAt: new Date().toISOString(),
  } satisfies SourceImageRecord));

  return Boolean(result);
}

export async function getCachedLocalReviewSourceImage(userId: string, documentId: string) {
  const record = await runSourceImageTransaction<SourceImageRecord>("readonly", (store) => (
    store.get(getRecordId(userId, documentId))
  ));

  return record?.file ?? null;
}

export async function clearCachedLocalReviewSourceImages(userId: string) {
  await openSourceImageDb().then((db) => new Promise<void>((resolve) => {
    if (!db) {
      resolve();
      return;
    }

    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("userId");
    const request = index.openKeyCursor(IDBKeyRange.only(userId));

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      store.delete(cursor.primaryKey);
      cursor.continue();
    };

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      resolve();
    };
    transaction.onabort = () => {
      db.close();
      resolve();
    };
  }));
}
