import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  consumeInviteCode,
  createInvite,
  isInviteRecord,
  normalizeInviteRecord,
  validateInviteCode,
  type InviteCodeRecord,
  type InviteConsumeResult,
  type InviteRole,
  type InviteTimestamp,
  type InviteValidationResult,
} from '../domain/invites';

export const localInviteStorageKey = 'precalcapp.invites.v1';
export const inviteStoreVersion = 'precalcapp.invites.v1';

export type InviteStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

export type InvitePayload = {
  version: typeof inviteStoreVersion;
  invites: InviteCodeRecord[];
};

export type CreateLocalInviteInput = {
  id?: string;
  code?: string;
  role?: InviteRole;
  createdAt?: InviteTimestamp;
  expiresAt?: InviteTimestamp;
  email?: string;
  classId?: string;
  createdByAccountId?: string;
};

export type CreateInviteInput = CreateLocalInviteInput;

export type InviteCodeLookup = string | { code: string; email?: string };

export type ConsumeLocalInviteInput = {
  code: string;
  accountId: string;
  email?: string;
};

export type LocalInviteConsumeResult = InviteConsumeResult & {
  payload: InvitePayload;
};

export type UseLocalInviteStoreOptions = {
  storage?: InviteStorage | null;
  storageKey?: string;
  now?: () => Date;
  createId?: () => string;
  createCode?: () => string;
};

function getBrowserStorage(): InviteStorage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

function createBrowserId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createBrowserInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const values = new Uint8Array(8);

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(values);
  } else {
    for (let index = 0; index < values.length; index += 1) {
      values[index] = Math.floor(Math.random() * alphabet.length);
    }
  }

  const characters = Array.from(values, (value) => alphabet[value % alphabet.length]);

  return `${characters.slice(0, 4).join('')}-${characters.slice(4).join('')}`;
}

function timestampMs(timestamp: string): number {
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function createEmptyPayload(): InvitePayload {
  return {
    version: inviteStoreVersion,
    invites: [],
  };
}

function normalizeLookup(input: InviteCodeLookup): { code: string; email?: string } {
  return typeof input === 'string' ? { code: input } : input;
}

function sortInvitesByCreatedAt(invites: InviteCodeRecord[]): InviteCodeRecord[] {
  return [...invites].sort((first, second) => {
    const createdAtComparison = timestampMs(second.createdAt) - timestampMs(first.createdAt);

    if (createdAtComparison !== 0) {
      return createdAtComparison;
    }

    return second.id.localeCompare(first.id);
  });
}

function validateInviteForStorage(candidate: unknown): InviteCodeRecord {
  if (!isInviteRecord(candidate)) {
    throw new Error('Invite records must include an id, code, role, and createdAt timestamp.');
  }

  return normalizeInviteRecord(candidate);
}

export function loadInvitePayload(
  storage: InviteStorage | null = getBrowserStorage(),
  storageKey = localInviteStorageKey,
): InvitePayload {
  if (!storage) {
    return createEmptyPayload();
  }

  const raw = storage.getItem(storageKey);

  if (!raw) {
    return createEmptyPayload();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<InvitePayload>;
    const invites = Array.isArray(parsed.invites)
      ? parsed.invites.filter(isInviteRecord).map(normalizeInviteRecord)
      : [];

    return {
      version: inviteStoreVersion,
      invites: sortInvitesByCreatedAt(invites),
    };
  } catch {
    return createEmptyPayload();
  }
}

export function saveInvitePayload(
  payload: InvitePayload,
  storage: InviteStorage | null = getBrowserStorage(),
  storageKey = localInviteStorageKey,
): InvitePayload {
  const normalizedPayload: InvitePayload = {
    version: inviteStoreVersion,
    invites: sortInvitesByCreatedAt(payload.invites.map(validateInviteForStorage)),
  };

  if (storage) {
    storage.setItem(storageKey, JSON.stringify(normalizedPayload, null, 2));
  }

  return normalizedPayload;
}

export function clearInvitesFromStorage(
  storage: InviteStorage | null = getBrowserStorage(),
  storageKey = localInviteStorageKey,
) {
  storage?.removeItem(storageKey);
}

export function createLocalInvite(
  input: CreateLocalInviteInput = {},
  options: UseLocalInviteStoreOptions = {},
): { invite: InviteCodeRecord; payload: InvitePayload } {
  const storage = options.storage === undefined ? getBrowserStorage() : options.storage;
  const storageKey = options.storageKey ?? localInviteStorageKey;
  const now = options.now ?? (() => new Date());
  const createId = options.createId ?? (() => createBrowserId('invite'));
  const createCode = options.createCode ?? createBrowserInviteCode;
  const payload = loadInvitePayload(storage, storageKey);
  const invite = createInvite({
    id: input.id ?? createId(),
    code: input.code ?? createCode(),
    role: input.role,
    createdAt: input.createdAt ?? now(),
    ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(input.classId ? { classId: input.classId } : {}),
    ...(input.createdByAccountId ? { createdByAccountId: input.createdByAccountId } : {}),
  });

  if (payload.invites.some((candidate) => candidate.code === invite.code)) {
    throw new Error('An invite with this code already exists.');
  }

  const nextPayload = saveInvitePayload(
    {
      version: inviteStoreVersion,
      invites: [invite, ...payload.invites],
    },
    storage,
    storageKey,
  );

  return {
    invite,
    payload: nextPayload,
  };
}

export function validateLocalInviteCode(
  input: InviteCodeLookup,
  options: UseLocalInviteStoreOptions = {},
): InviteValidationResult {
  const storage = options.storage === undefined ? getBrowserStorage() : options.storage;
  const storageKey = options.storageKey ?? localInviteStorageKey;
  const lookup = normalizeLookup(input);
  const payload = loadInvitePayload(storage, storageKey);

  return validateInviteCode({
    ...lookup,
    invites: payload.invites,
    now: options.now?.(),
  });
}

export function consumeLocalInviteCode(
  input: ConsumeLocalInviteInput,
  options: UseLocalInviteStoreOptions = {},
): LocalInviteConsumeResult {
  const storage = options.storage === undefined ? getBrowserStorage() : options.storage;
  const storageKey = options.storageKey ?? localInviteStorageKey;
  const now = options.now ?? (() => new Date());
  const payload = loadInvitePayload(storage, storageKey);
  const result = consumeInviteCode({
    code: input.code,
    accountId: input.accountId,
    invites: payload.invites,
    now: now(),
    ...(input.email ? { email: input.email } : {}),
  });

  if (result.status !== 'consumed') {
    return {
      ...result,
      payload,
    };
  }

  const nextPayload = saveInvitePayload(
    {
      version: inviteStoreVersion,
      invites: result.invites,
    },
    storage,
    storageKey,
  );

  return {
    ...result,
    payload: nextPayload,
  };
}

export function revokeLocalInvite(
  inviteId: string,
  options: UseLocalInviteStoreOptions = {},
): InvitePayload {
  const storage = options.storage === undefined ? getBrowserStorage() : options.storage;
  const storageKey = options.storageKey ?? localInviteStorageKey;
  const payload = loadInvitePayload(storage, storageKey);

  return saveInvitePayload(
    {
      version: inviteStoreVersion,
      invites: payload.invites.filter((invite) => invite.id !== inviteId),
    },
    storage,
    storageKey,
  );
}

export function useLocalInviteStore(options: UseLocalInviteStoreOptions = {}) {
  const storage = options.storage === undefined ? getBrowserStorage() : options.storage;
  const storageKey = options.storageKey ?? localInviteStorageKey;
  const now = useMemo(() => options.now ?? (() => new Date()), [options.now]);
  const createId = useMemo(
    () => options.createId ?? (() => createBrowserId('invite')),
    [options.createId],
  );
  const createCode = useMemo(
    () => options.createCode ?? createBrowserInviteCode,
    [options.createCode],
  );
  const [payload, setPayload] = useState<InvitePayload>(() =>
    loadInvitePayload(storage, storageKey),
  );

  const createInviteRecord = useCallback(
    (input: CreateLocalInviteInput = {}) => {
      const result = createLocalInvite(input, {
        ...options,
        storage,
        storageKey,
        now,
        createId,
        createCode,
      });
      setPayload(result.payload);
      return result.invite;
    },
    [createCode, createId, now, options, storage, storageKey],
  );

  const validateCode = useCallback(
    (input: InviteCodeLookup) =>
      validateLocalInviteCode(input, {
        ...options,
        storage,
        storageKey,
        now,
      }),
    [now, options, storage, storageKey],
  );

  const consumeCode = useCallback(
    (input: ConsumeLocalInviteInput) => {
      const result = consumeLocalInviteCode(input, {
        ...options,
        storage,
        storageKey,
        now,
      });
      setPayload(result.payload);
      return result;
    },
    [now, options, storage, storageKey],
  );

  const revokeInvite = useCallback(
    (inviteId: string) => {
      const nextPayload = revokeLocalInvite(inviteId, {
        ...options,
        storage,
        storageKey,
      });
      setPayload(nextPayload);
    },
    [options, storage, storageKey],
  );

  const refreshInvites = useCallback(() => {
    setPayload(loadInvitePayload(storage, storageKey));
  }, [storage, storageKey]);

  useEffect(() => {
    setPayload(loadInvitePayload(storage, storageKey));
  }, [storage, storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || storage !== window.localStorage) {
      return;
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== storageKey) {
        return;
      }

      setPayload(loadInvitePayload(storage, storageKey));
    }

    window.addEventListener('storage', handleStorage);

    return () => window.removeEventListener('storage', handleStorage);
  }, [storage, storageKey]);

  return {
    invites: payload.invites,
    createInvite: createInviteRecord,
    validateInviteCode: validateCode,
    consumeInviteCode: consumeCode,
    revokeInvite,
    refreshInvites,
  };
}
