import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AttemptSchema } from './schemas/attemptSchema';
import type { Attempt } from '../domain/attempts/types';
import {
  createFrqAttempt,
  createMcqAttempt,
  type CreateFrqAttemptInput,
  type CreateMcqAttemptInput,
} from '../domain/attempts/createAttempt';
import type { AttemptTimestamp, CreateAttemptMetadata } from '../domain/attempts/types';

export const localAttemptStorageKey = 'precalcapp.attempts.v1';
export const attemptExportVersion = 'precalcapp.attempts.v1';

export type AttemptStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

export type AttemptExportPayload = {
  version: typeof attemptExportVersion;
  exportedAt: string;
  attempts: Attempt[];
};

export type AttemptImportParseResult = {
  attempts: Attempt[];
  rejectedCount: number;
  errors: string[];
};

export type AttemptMergeResult = {
  attempts: Attempt[];
  added: number;
  updated: number;
  unchanged: number;
};

export type ImportAttemptsResult = AttemptMergeResult & {
  imported: number;
  rejectedCount: number;
  errors: string[];
};

type LocalAttemptMetadataInput = Partial<CreateAttemptMetadata>;

export type SaveMcqAttemptInput = Omit<CreateMcqAttemptInput, keyof CreateAttemptMetadata> &
  LocalAttemptMetadataInput;

export type SaveFrqAttemptInput = Omit<CreateFrqAttemptInput, keyof CreateAttemptMetadata> &
  LocalAttemptMetadataInput;

export type UseLocalAttemptStoreOptions = {
  storage?: AttemptStorage | null;
  storageKey?: string;
  now?: () => Date;
  createId?: () => string;
};

function getBrowserStorage(): AttemptStorage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

function toIsoTimestamp(timestamp: AttemptTimestamp): string {
  return timestamp instanceof Date ? timestamp.toISOString() : timestamp;
}

function formatAttemptIssues(candidateIndex: number, issues: string[]): string {
  return `Attempt ${candidateIndex + 1}: ${issues.join('; ')}`;
}

function describeAttemptSchemaError(
  candidateIndex: number,
  error: { issues: { path: PropertyKey[]; message: string }[] },
) {
  return formatAttemptIssues(
    candidateIndex,
    error.issues.map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return `${path}${issue.message}`;
    }),
  );
}

function getAttemptCandidates(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (typeof payload !== 'object' || payload === null || !('attempts' in payload)) {
    return null;
  }

  const attempts = (payload as { attempts?: unknown }).attempts;

  return Array.isArray(attempts) ? attempts : null;
}

function timestampMs(timestamp: string): number {
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function createBrowserAttemptId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createLocalAttemptMetadata(
  input: LocalAttemptMetadataInput,
  now: () => Date,
  createId: () => string,
): CreateAttemptMetadata {
  const currentTime = now();
  const submittedAt = input.submittedAt ?? currentTime;

  return {
    id: input.id ?? createId(),
    startedAt: input.startedAt ?? submittedAt,
    submittedAt,
    updatedAt: input.updatedAt ?? currentTime,
    ...(input.timeSpentSeconds === undefined ? {} : { timeSpentSeconds: input.timeSpentSeconds }),
  };
}

export function sortAttemptsBySubmittedAt(attempts: Attempt[]): Attempt[] {
  return [...attempts].sort((first, second) => {
    const submittedAtComparison = timestampMs(second.submittedAt) - timestampMs(first.submittedAt);

    if (submittedAtComparison !== 0) {
      return submittedAtComparison;
    }

    return second.id.localeCompare(first.id);
  });
}

export function validateAttempt(candidate: unknown): Attempt {
  const result = AttemptSchema.safeParse(candidate);

  if (!result.success) {
    throw new Error(describeAttemptSchemaError(0, result.error));
  }

  return result.data as Attempt;
}

export function createAttemptExportPayload(
  attempts: Attempt[],
  exportedAt: AttemptTimestamp = new Date(),
): AttemptExportPayload {
  return {
    version: attemptExportVersion,
    exportedAt: toIsoTimestamp(exportedAt),
    attempts: sortAttemptsBySubmittedAt(attempts),
  };
}

export function serializeAttempts(attempts: Attempt[], exportedAt?: AttemptTimestamp): string {
  return JSON.stringify(createAttemptExportPayload(attempts, exportedAt), null, 2);
}

export function parseAttemptImportPayload(payload: unknown): AttemptImportParseResult {
  let parsedPayload = payload;

  if (typeof payload === 'string') {
    try {
      parsedPayload = JSON.parse(payload) as unknown;
    } catch {
      return {
        attempts: [],
        rejectedCount: 1,
        errors: ['Attempt import payload must be valid JSON.'],
      };
    }
  }

  const candidates = getAttemptCandidates(parsedPayload);

  if (!candidates) {
    return {
      attempts: [],
      rejectedCount: 1,
      errors: ['Attempt import payload must be an array or an object with an attempts array.'],
    };
  }

  const attempts: Attempt[] = [];
  const errors: string[] = [];

  candidates.forEach((candidate, index) => {
    const result = AttemptSchema.safeParse(candidate);

    if (result.success) {
      attempts.push(result.data as Attempt);
      return;
    }

    errors.push(describeAttemptSchemaError(index, result.error));
  });

  return {
    attempts: sortAttemptsBySubmittedAt(attempts),
    rejectedCount: errors.length,
    errors,
  };
}

export function mergeAttemptsById(
  existingAttempts: Attempt[],
  incomingAttempts: Attempt[],
): AttemptMergeResult {
  const byId = new Map<string, Attempt>();
  let added = 0;
  let updated = 0;
  let unchanged = 0;

  existingAttempts.forEach((attempt) => byId.set(attempt.id, attempt));

  incomingAttempts.forEach((attempt) => {
    const current = byId.get(attempt.id);

    if (!current) {
      added += 1;
      byId.set(attempt.id, attempt);
    } else if (JSON.stringify(current) === JSON.stringify(attempt)) {
      unchanged += 1;
    } else if (
      timestampMs(attempt.updatedAt ?? attempt.submittedAt) >=
      timestampMs(current.updatedAt ?? current.submittedAt)
    ) {
      updated += 1;
      byId.set(attempt.id, attempt);
    } else {
      unchanged += 1;
    }
  });

  return {
    attempts: sortAttemptsBySubmittedAt([...byId.values()]),
    added,
    updated,
    unchanged,
  };
}

export function loadAttemptsFromStorage(
  storage: AttemptStorage | null = getBrowserStorage(),
  storageKey = localAttemptStorageKey,
): Attempt[] {
  if (!storage) {
    return [];
  }

  const raw = storage.getItem(storageKey);

  if (!raw) {
    return [];
  }

  return parseAttemptImportPayload(raw).attempts;
}

export function saveAttemptsToStorage(
  attempts: Attempt[],
  storage: AttemptStorage | null = getBrowserStorage(),
  storageKey = localAttemptStorageKey,
): Attempt[] {
  const sortedAttempts = sortAttemptsBySubmittedAt(attempts.map(validateAttempt));

  if (storage) {
    storage.setItem(storageKey, serializeAttempts(sortedAttempts));
  }

  return sortedAttempts;
}

export function clearAttemptsFromStorage(
  storage: AttemptStorage | null = getBrowserStorage(),
  storageKey = localAttemptStorageKey,
) {
  storage?.removeItem(storageKey);
}

export function useLocalAttemptStore(options: UseLocalAttemptStoreOptions = {}) {
  const storage = options.storage === undefined ? getBrowserStorage() : options.storage;
  const storageKey = options.storageKey ?? localAttemptStorageKey;
  const now = useMemo(() => options.now ?? (() => new Date()), [options.now]);
  const createId = useMemo(() => options.createId ?? createBrowserAttemptId, [options.createId]);
  const [attempts, setAttempts] = useState<Attempt[]>(() =>
    loadAttemptsFromStorage(storage, storageKey),
  );
  const attemptsRef = useRef(attempts);

  const attemptsByQuestionId = useMemo(() => {
    const byQuestionId = new Map<string, Attempt[]>();

    attempts.forEach((attempt) => {
      byQuestionId.set(attempt.questionId, [
        ...(byQuestionId.get(attempt.questionId) ?? []),
        attempt,
      ]);
    });

    return byQuestionId;
  }, [attempts]);

  const latestAttemptByQuestionId = useMemo(() => {
    const latestByQuestionId = new Map<string, Attempt>();

    attempts.forEach((attempt) => {
      if (!latestByQuestionId.has(attempt.questionId)) {
        latestByQuestionId.set(attempt.questionId, attempt);
      }
    });

    return latestByQuestionId;
  }, [attempts]);

  const setAndPersistAttempts = useCallback(
    (nextAttempts: Attempt[]) => {
      const persistedAttempts = saveAttemptsToStorage(nextAttempts, storage, storageKey);
      attemptsRef.current = persistedAttempts;
      setAttempts(persistedAttempts);
      return persistedAttempts;
    },
    [storage, storageKey],
  );

  const saveAttempt = useCallback(
    (attempt: Attempt) => {
      const validatedAttempt = validateAttempt(attempt);
      const latestAttempts = storage
        ? loadAttemptsFromStorage(storage, storageKey)
        : attemptsRef.current;
      const merged = mergeAttemptsById(latestAttempts, [validatedAttempt]);
      setAndPersistAttempts(merged.attempts);
      return validatedAttempt;
    },
    [setAndPersistAttempts, storage, storageKey],
  );

  const saveMcqAttempt = useCallback(
    (input: SaveMcqAttemptInput) => {
      const attempt = createMcqAttempt({
        ...input,
        ...createLocalAttemptMetadata(input, now, createId),
      });

      return saveAttempt(attempt);
    },
    [createId, now, saveAttempt],
  );

  const saveFrqAttempt = useCallback(
    (input: SaveFrqAttemptInput) => {
      const attempt = createFrqAttempt({
        ...input,
        ...createLocalAttemptMetadata(input, now, createId),
      });

      return saveAttempt(attempt);
    },
    [createId, now, saveAttempt],
  );

  const replaceAttempts = useCallback(
    (nextAttempts: Attempt[]) => setAndPersistAttempts(nextAttempts),
    [setAndPersistAttempts],
  );

  const importAttempts = useCallback(
    (payload: unknown): ImportAttemptsResult => {
      const parsed = parseAttemptImportPayload(payload);
      const latestAttempts = storage
        ? loadAttemptsFromStorage(storage, storageKey)
        : attemptsRef.current;
      const merged = mergeAttemptsById(latestAttempts, parsed.attempts);

      setAndPersistAttempts(merged.attempts);

      return {
        ...merged,
        imported: parsed.attempts.length,
        rejectedCount: parsed.rejectedCount,
        errors: parsed.errors,
      };
    },
    [setAndPersistAttempts, storage, storageKey],
  );

  const removeAttempt = useCallback(
    (attemptId: string) => {
      const latestAttempts = storage
        ? loadAttemptsFromStorage(storage, storageKey)
        : attemptsRef.current;
      const nextAttempts = latestAttempts.filter((attempt) => attempt.id !== attemptId);
      setAndPersistAttempts(nextAttempts);
      return nextAttempts;
    },
    [setAndPersistAttempts, storage, storageKey],
  );

  const clearAttempts = useCallback(() => {
    attemptsRef.current = [];
    setAttempts([]);
    clearAttemptsFromStorage(storage, storageKey);
  }, [storage, storageKey]);

  const exportAttempts = useCallback(
    (exportedAt?: AttemptTimestamp) => serializeAttempts(attemptsRef.current, exportedAt),
    [],
  );

  const getAttemptsForQuestion = useCallback((questionId: string) => {
    return attemptsRef.current.filter((attempt) => attempt.questionId === questionId);
  }, []);

  useEffect(() => {
    const nextAttempts = loadAttemptsFromStorage(storage, storageKey);
    attemptsRef.current = nextAttempts;
    setAttempts(nextAttempts);
  }, [storage, storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || storage !== window.localStorage) {
      return;
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== storageKey) {
        return;
      }

      const nextAttempts = loadAttemptsFromStorage(storage, storageKey);
      attemptsRef.current = nextAttempts;
      setAttempts(nextAttempts);
    }

    window.addEventListener('storage', handleStorage);

    return () => window.removeEventListener('storage', handleStorage);
  }, [storage, storageKey]);

  return {
    attempts,
    attemptsByQuestionId,
    latestAttemptByQuestionId,
    saveAttempt,
    saveMcqAttempt,
    saveFrqAttempt,
    replaceAttempts,
    importAttempts,
    exportAttempts,
    removeAttempt,
    clearAttempts,
    getAttemptsForQuestion,
  };
}
