import { useCallback, useEffect, useRef, useState } from 'react';

import type { AttemptTimestamp } from '../domain/attempts/types';
import type { SessionResult } from '../domain/sessions/types';
import { SessionResultSchema } from './schemas/sessionSchema';

export const localSessionStorageKey = 'precalcapp.sessions.v1';
export const sessionExportVersion = 'precalcapp.sessions.v1';

export type SessionStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

export type SessionExportPayload = {
  version: typeof sessionExportVersion;
  exportedAt: string;
  sessions: SessionResult[];
};

export type SessionImportParseResult = {
  sessions: SessionResult[];
  rejectedCount: number;
  errors: string[];
};

export type SessionMergeResult = {
  sessions: SessionResult[];
  added: number;
  updated: number;
  unchanged: number;
};

export type ImportSessionsResult = SessionMergeResult & {
  imported: number;
  rejectedCount: number;
  errors: string[];
};

export type UseLocalSessionStoreOptions = {
  storage?: SessionStorage | null;
  storageKey?: string;
};

function getBrowserStorage(): SessionStorage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

function toIsoTimestamp(timestamp: AttemptTimestamp): string {
  return timestamp instanceof Date ? timestamp.toISOString() : timestamp;
}

function timestampMs(timestamp: string): number {
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatSessionIssues(candidateIndex: number, issues: string[]): string {
  return `Session ${candidateIndex + 1}: ${issues.join('; ')}`;
}

function describeSessionSchemaError(
  candidateIndex: number,
  error: { issues: { path: PropertyKey[]; message: string }[] },
) {
  return formatSessionIssues(
    candidateIndex,
    error.issues.map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return `${path}${issue.message}`;
    }),
  );
}

function getSessionCandidates(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (typeof payload !== 'object' || payload === null || !('sessions' in payload)) {
    return null;
  }

  const sessions = (payload as { sessions?: unknown }).sessions;

  return Array.isArray(sessions) ? sessions : null;
}

export function sortSessionsBySubmittedAt(sessions: SessionResult[]): SessionResult[] {
  return [...sessions].sort((first, second) => {
    const submittedAtComparison = timestampMs(second.submittedAt) - timestampMs(first.submittedAt);

    if (submittedAtComparison !== 0) {
      return submittedAtComparison;
    }

    return second.id.localeCompare(first.id);
  });
}

export function validateSessionResult(candidate: unknown): SessionResult {
  const result = SessionResultSchema.safeParse(candidate);

  if (!result.success) {
    throw new Error(describeSessionSchemaError(0, result.error));
  }

  return result.data as SessionResult;
}

export function createSessionExportPayload(
  sessions: SessionResult[],
  exportedAt: AttemptTimestamp = new Date(),
): SessionExportPayload {
  return {
    version: sessionExportVersion,
    exportedAt: toIsoTimestamp(exportedAt),
    sessions: sortSessionsBySubmittedAt(sessions),
  };
}

export function serializeSessions(
  sessions: SessionResult[],
  exportedAt?: AttemptTimestamp,
): string {
  return JSON.stringify(createSessionExportPayload(sessions, exportedAt), null, 2);
}

export function parseSessionImportPayload(payload: unknown): SessionImportParseResult {
  let parsedPayload = payload;

  if (typeof payload === 'string') {
    try {
      parsedPayload = JSON.parse(payload) as unknown;
    } catch {
      return {
        sessions: [],
        rejectedCount: 1,
        errors: ['Session import payload must be valid JSON.'],
      };
    }
  }

  const candidates = getSessionCandidates(parsedPayload);

  if (!candidates) {
    return {
      sessions: [],
      rejectedCount: 1,
      errors: ['Session import payload must be an array or an object with a sessions array.'],
    };
  }

  const sessions: SessionResult[] = [];
  const errors: string[] = [];

  candidates.forEach((candidate, index) => {
    const result = SessionResultSchema.safeParse(candidate);

    if (result.success) {
      sessions.push(result.data as SessionResult);
      return;
    }

    errors.push(describeSessionSchemaError(index, result.error));
  });

  return {
    sessions: sortSessionsBySubmittedAt(sessions),
    rejectedCount: errors.length,
    errors,
  };
}

export function mergeSessionsById(
  existingSessions: SessionResult[],
  incomingSessions: SessionResult[],
): SessionMergeResult {
  const byId = new Map<string, SessionResult>();
  let added = 0;
  let updated = 0;
  let unchanged = 0;

  existingSessions.forEach((session) => byId.set(session.id, session));

  incomingSessions.forEach((session) => {
    const current = byId.get(session.id);

    if (!current) {
      added += 1;
      byId.set(session.id, session);
    } else if (JSON.stringify(current) === JSON.stringify(session)) {
      unchanged += 1;
    } else if (timestampMs(session.updatedAt) >= timestampMs(current.updatedAt)) {
      updated += 1;
      byId.set(session.id, session);
    } else {
      unchanged += 1;
    }
  });

  return {
    sessions: sortSessionsBySubmittedAt([...byId.values()]),
    added,
    updated,
    unchanged,
  };
}

export function loadSessionsFromStorage(
  storage: SessionStorage | null = getBrowserStorage(),
  storageKey = localSessionStorageKey,
): SessionResult[] {
  if (!storage) {
    return [];
  }

  const raw = storage.getItem(storageKey);

  if (!raw) {
    return [];
  }

  return parseSessionImportPayload(raw).sessions;
}

export function saveSessionsToStorage(
  sessions: SessionResult[],
  storage: SessionStorage | null = getBrowserStorage(),
  storageKey = localSessionStorageKey,
): SessionResult[] {
  const sortedSessions = sortSessionsBySubmittedAt(sessions.map(validateSessionResult));

  if (storage) {
    storage.setItem(storageKey, serializeSessions(sortedSessions));
  }

  return sortedSessions;
}

export function clearSessionsFromStorage(
  storage: SessionStorage | null = getBrowserStorage(),
  storageKey = localSessionStorageKey,
) {
  storage?.removeItem(storageKey);
}

export function useLocalSessionStore(options: UseLocalSessionStoreOptions = {}) {
  const storage = options.storage === undefined ? getBrowserStorage() : options.storage;
  const storageKey = options.storageKey ?? localSessionStorageKey;
  const [sessions, setSessions] = useState<SessionResult[]>(() =>
    loadSessionsFromStorage(storage, storageKey),
  );
  const sessionsRef = useRef(sessions);

  const setAndPersistSessions = useCallback(
    (nextSessions: SessionResult[]) => {
      const persistedSessions = saveSessionsToStorage(nextSessions, storage, storageKey);
      sessionsRef.current = persistedSessions;
      setSessions(persistedSessions);
      return persistedSessions;
    },
    [storage, storageKey],
  );

  const saveSessionResult = useCallback(
    (session: SessionResult) => {
      const validatedSession = validateSessionResult(session);
      const latestSessions = storage
        ? loadSessionsFromStorage(storage, storageKey)
        : sessionsRef.current;
      const merged = mergeSessionsById(latestSessions, [validatedSession]);
      setAndPersistSessions(merged.sessions);
      return validatedSession;
    },
    [setAndPersistSessions, storage, storageKey],
  );

  const importSessions = useCallback(
    (payload: unknown): ImportSessionsResult => {
      const parsed = parseSessionImportPayload(payload);
      const latestSessions = storage
        ? loadSessionsFromStorage(storage, storageKey)
        : sessionsRef.current;
      const merged = mergeSessionsById(latestSessions, parsed.sessions);

      setAndPersistSessions(merged.sessions);

      return {
        ...merged,
        imported: parsed.sessions.length,
        rejectedCount: parsed.rejectedCount,
        errors: parsed.errors,
      };
    },
    [setAndPersistSessions, storage, storageKey],
  );

  const removeSession = useCallback(
    (sessionId: string) => {
      const latestSessions = storage
        ? loadSessionsFromStorage(storage, storageKey)
        : sessionsRef.current;
      const nextSessions = latestSessions.filter((session) => session.id !== sessionId);
      setAndPersistSessions(nextSessions);
      return nextSessions;
    },
    [setAndPersistSessions, storage, storageKey],
  );

  const clearSessions = useCallback(() => {
    sessionsRef.current = [];
    setSessions([]);
    clearSessionsFromStorage(storage, storageKey);
  }, [storage, storageKey]);

  const exportSessions = useCallback(
    (exportedAt?: AttemptTimestamp) => serializeSessions(sessionsRef.current, exportedAt),
    [],
  );

  useEffect(() => {
    const nextSessions = loadSessionsFromStorage(storage, storageKey);
    sessionsRef.current = nextSessions;
    setSessions(nextSessions);
  }, [storage, storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || storage !== window.localStorage) {
      return;
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== storageKey) {
        return;
      }

      const nextSessions = loadSessionsFromStorage(storage, storageKey);
      sessionsRef.current = nextSessions;
      setSessions(nextSessions);
    }

    window.addEventListener('storage', handleStorage);

    return () => window.removeEventListener('storage', handleStorage);
  }, [storage, storageKey]);

  return {
    sessions,
    saveSessionResult,
    importSessions,
    exportSessions,
    removeSession,
    clearSessions,
  };
}
