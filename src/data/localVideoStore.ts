import { useEffect, useState } from 'react';

export const localVideoUrlPrefix = 'local-video:';

const databaseName = 'precalcapp-local-media';
const databaseVersion = 1;
const videoStoreName = 'videos';

export type LocalVideoRecord = {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
  blob: Blob;
};

type LocalVideoObjectUrlState = {
  objectUrl: string | null;
  record: Omit<LocalVideoRecord, 'blob'> | null;
  status: 'idle' | 'loading' | 'ready' | 'missing' | 'error';
  error: string | null;
};

let dbPromise: Promise<IDBDatabase> | null = null;

export function isLocalVideoReference(url: string | undefined): boolean {
  return Boolean(url?.startsWith(localVideoUrlPrefix));
}

export function getLocalVideoId(url: string | undefined): string | null {
  if (!isLocalVideoReference(url)) {
    return null;
  }

  const id = url?.slice(localVideoUrlPrefix.length).trim() ?? '';
  return /^[a-zA-Z0-9_-]+$/.test(id) ? id : null;
}

export function createLocalVideoReference(id: string): string {
  return `${localVideoUrlPrefix}${id}`;
}

function createLocalVideoId(): string {
  const randomId = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 12);

  return `video-${Date.now()}-${randomId}`.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function getIndexedDb(): IDBFactory {
  if (!globalThis.indexedDB) {
    throw new Error('This browser does not support local video storage.');
  }

  return globalThis.indexedDB;
}

function openVideoDatabase(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = getIndexedDb().open(databaseName, databaseVersion);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(videoStoreName)) {
        database.createObjectStore(videoStoreName, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error('Local video storage could not be opened.'));
    };

    request.onblocked = () => {
      reject(new Error('Local video storage is blocked by another open tab.'));
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
    request.onerror = () => reject(request.error ?? new Error('Local video request failed.'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Local video transaction was aborted.'));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('Local video transaction failed.'));
  });
}

export async function saveLocalVideoFile(file: File): Promise<LocalVideoRecord> {
  const database = await openVideoDatabase();
  const transaction = database.transaction(videoStoreName, 'readwrite');
  const store = transaction.objectStore(videoStoreName);
  const record: LocalVideoRecord = {
    id: createLocalVideoId(),
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

export async function getLocalVideoRecord(id: string): Promise<LocalVideoRecord | null> {
  const database = await openVideoDatabase();
  const transaction = database.transaction(videoStoreName, 'readonly');
  const store = transaction.objectStore(videoStoreName);
  const record = await requestToPromise<LocalVideoRecord | undefined>(store.get(id));

  return record ?? null;
}

export function useLocalVideoObjectUrl(source: string | undefined): LocalVideoObjectUrlState {
  const [state, setState] = useState<LocalVideoObjectUrlState>({
    objectUrl: null,
    record: null,
    status: 'idle',
    error: null,
  });

  useEffect(() => {
    const id = getLocalVideoId(source);
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

    getLocalVideoRecord(id)
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
          error: error instanceof Error ? error.message : 'Local video could not be loaded.',
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
