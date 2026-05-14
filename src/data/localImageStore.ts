import { useEffect, useState } from 'react';

export const localImageUrlPrefix = 'local-image:';

const databaseName = 'precalcapp-local-images';
const databaseVersion = 1;
const imageStoreName = 'images';

export type LocalImageRecord = {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
  blob: Blob;
};

type LocalImageObjectUrlState = {
  objectUrl: string | null;
  record: Omit<LocalImageRecord, 'blob'> | null;
  status: 'idle' | 'loading' | 'ready' | 'missing' | 'error';
  error: string | null;
};

let dbPromise: Promise<IDBDatabase> | null = null;

export function isLocalImageReference(url: string | undefined): boolean {
  return Boolean(url?.startsWith(localImageUrlPrefix));
}

export function getLocalImageId(url: string | undefined): string | null {
  if (!isLocalImageReference(url)) {
    return null;
  }

  const id = url?.slice(localImageUrlPrefix.length).trim() ?? '';
  return /^[a-zA-Z0-9_-]+$/.test(id) ? id : null;
}

export function createLocalImageReference(id: string): string {
  return `${localImageUrlPrefix}${id}`;
}

function createLocalImageId(): string {
  const randomId = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 12);

  return `image-${Date.now()}-${randomId}`.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function getIndexedDb(): IDBFactory {
  if (!globalThis.indexedDB) {
    throw new Error('This browser does not support local image storage.');
  }

  return globalThis.indexedDB;
}

function openImageDatabase(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = getIndexedDb().open(databaseName, databaseVersion);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(imageStoreName)) {
        database.createObjectStore(imageStoreName, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error('Local image storage could not be opened.'));
    };

    request.onblocked = () => {
      reject(new Error('Local image storage is blocked by another open tab.'));
    };
  });

  dbPromise = promise.catch((error: unknown) => {
    dbPromise = null;
    throw error;
  });

  return dbPromise;
}

function requestToPromise<Result>(request: IDBRequest<Result>): Promise<Result> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Local image request failed.'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Local image transaction was aborted.'));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('Local image transaction failed.'));
  });
}

export async function saveLocalImageFile(file: File): Promise<LocalImageRecord> {
  const database = await openImageDatabase();
  const transaction = database.transaction(imageStoreName, 'readwrite');
  const store = transaction.objectStore(imageStoreName);
  const record: LocalImageRecord = {
    id: createLocalImageId(),
    name: file.name,
    type: file.type,
    size: file.size,
    createdAt: new Date().toISOString(),
    blob: file,
  };

  store.put(record);
  await transactionDone(transaction);

  return record;
}

export async function getLocalImageRecord(id: string): Promise<LocalImageRecord | null> {
  const database = await openImageDatabase();
  const transaction = database.transaction(imageStoreName, 'readonly');
  const store = transaction.objectStore(imageStoreName);
  const record = await requestToPromise<LocalImageRecord | undefined>(store.get(id));

  return record ?? null;
}

export function useLocalImageObjectUrl(source: string | undefined): LocalImageObjectUrlState {
  const [state, setState] = useState<LocalImageObjectUrlState>({
    objectUrl: null,
    record: null,
    status: 'idle',
    error: null,
  });

  useEffect(() => {
    const id = getLocalImageId(source);
    let isActive = true;
    let objectUrl: string | null = null;

    if (!id) {
      setState({
        objectUrl: null,
        record: null,
        status: 'idle',
        error: null,
      });
      return undefined;
    }

    setState({
      objectUrl: null,
      record: null,
      status: 'loading',
      error: null,
    });

    getLocalImageRecord(id)
      .then((record) => {
        if (!isActive) {
          return;
        }

        if (!record) {
          setState({
            objectUrl: null,
            record: null,
            status: 'missing',
            error: null,
          });
          return;
        }

        objectUrl = URL.createObjectURL(record.blob);
        setState({
          objectUrl,
          record: {
            id: record.id,
            name: record.name,
            type: record.type,
            size: record.size,
            createdAt: record.createdAt,
          },
          status: 'ready',
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        setState({
          objectUrl: null,
          record: null,
          status: 'error',
          error: error instanceof Error ? error.message : 'Local image could not be loaded.',
        });
      });

    return () => {
      isActive = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [source]);

  return state;
}
