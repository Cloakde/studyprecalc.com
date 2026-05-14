import { useCallback, useEffect, useMemo, useState } from 'react';

export const localAccountStorageKey = 'precalcapp.accounts.v1';
export const accountStoreVersion = 'precalcapp.accounts.v1';

export type AccountStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

export type AccountRole = 'student' | 'admin';

export type LocalAccountRecord = {
  id: string;
  email: string;
  displayName: string;
  role?: AccountRole;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
  lastLoginAt?: string;
};

export type PublicAccount = {
  id: string;
  email: string;
  displayName: string;
  role: AccountRole;
  createdAt: string;
  lastLoginAt?: string;
};

export type AccountPayload = {
  version: typeof accountStoreVersion;
  activeAccountId?: string;
  accounts: LocalAccountRecord[];
};

export type SignupInput = {
  displayName: string;
  email: string;
  password: string;
  inviteCode?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type UseLocalAccountStoreOptions = {
  storage?: AccountStorage | null;
  storageKey?: string;
  now?: () => Date;
  createId?: () => string;
  createSalt?: () => string;
};

function getBrowserStorage(): AccountStorage | null {
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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isAccountRole(value: unknown): value is AccountRole {
  return value === 'student' || value === 'admin';
}

function toPublicAccount(account: LocalAccountRecord): PublicAccount {
  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    role: account.role ?? 'student',
    createdAt: account.createdAt,
    ...(account.lastLoginAt ? { lastLoginAt: account.lastLoginAt } : {}),
  };
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  if (typeof btoa === 'function') {
    return btoa(binary);
  }

  return Buffer.from(binary, 'binary').toString('base64');
}

function fallbackHash(source: string): string {
  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fallback-${(hash >>> 0).toString(16)}`;
}

export async function hashPasswordForLocalAuth(password: string, salt: string): Promise<string> {
  const source = `${salt}:${password}`;

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(source);
    const digest = await crypto.subtle.digest('SHA-256', encoded);

    return `sha256-${encodeBase64(new Uint8Array(digest))}`;
  }

  return fallbackHash(source);
}

function createEmptyPayload(): AccountPayload {
  return {
    version: accountStoreVersion,
    accounts: [],
  };
}

function isLocalAccountRecord(candidate: unknown): candidate is LocalAccountRecord {
  if (typeof candidate !== 'object' || candidate === null) {
    return false;
  }

  const account = candidate as Partial<LocalAccountRecord>;

  return (
    typeof account.id === 'string' &&
    account.id.length > 0 &&
    typeof account.email === 'string' &&
    account.email.length > 0 &&
    typeof account.displayName === 'string' &&
    account.displayName.length > 0 &&
    (account.role === undefined || isAccountRole(account.role)) &&
    typeof account.passwordSalt === 'string' &&
    account.passwordSalt.length > 0 &&
    typeof account.passwordHash === 'string' &&
    account.passwordHash.length > 0 &&
    typeof account.createdAt === 'string' &&
    (account.lastLoginAt === undefined || typeof account.lastLoginAt === 'string')
  );
}

export function loadAccountPayload(
  storage: AccountStorage | null = getBrowserStorage(),
  storageKey = localAccountStorageKey,
): AccountPayload {
  if (!storage) {
    return createEmptyPayload();
  }

  const raw = storage.getItem(storageKey);

  if (!raw) {
    return createEmptyPayload();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AccountPayload>;
    const accounts = Array.isArray(parsed.accounts)
      ? parsed.accounts.filter(isLocalAccountRecord)
      : [];
    const activeAccountId =
      typeof parsed.activeAccountId === 'string' &&
      accounts.some((account) => account.id === parsed.activeAccountId)
        ? parsed.activeAccountId
        : undefined;

    return {
      version: accountStoreVersion,
      accounts,
      ...(activeAccountId ? { activeAccountId } : {}),
    };
  } catch {
    return createEmptyPayload();
  }
}

export function saveAccountPayload(
  payload: AccountPayload,
  storage: AccountStorage | null = getBrowserStorage(),
  storageKey = localAccountStorageKey,
): AccountPayload {
  const normalizedPayload: AccountPayload = {
    version: accountStoreVersion,
    accounts: payload.accounts,
    ...(payload.activeAccountId ? { activeAccountId: payload.activeAccountId } : {}),
  };

  if (storage) {
    storage.setItem(storageKey, JSON.stringify(normalizedPayload, null, 2));
  }

  return normalizedPayload;
}

function validateSignupInput(input: SignupInput): SignupInput {
  const email = normalizeEmail(input.email);
  const displayName = input.displayName.trim();

  if (!displayName) {
    throw new Error('Enter a name for this account.');
  }

  if (!email.includes('@') || email.length < 5) {
    throw new Error('Enter a valid email address.');
  }

  if (input.password.length < 6) {
    throw new Error('Use at least 6 characters for the password.');
  }

  return {
    displayName,
    email,
    password: input.password,
    ...(input.inviteCode?.trim() ? { inviteCode: input.inviteCode.trim() } : {}),
  };
}

function validateLoginInput(input: LoginInput): LoginInput {
  const email = normalizeEmail(input.email);

  if (!email || !input.password) {
    throw new Error('Enter an email and password.');
  }

  return {
    email,
    password: input.password,
  };
}

export async function signupLocalAccount(
  input: SignupInput,
  options: UseLocalAccountStoreOptions = {},
): Promise<{ account: PublicAccount; payload: AccountPayload }> {
  const storage = options.storage === undefined ? getBrowserStorage() : options.storage;
  const storageKey = options.storageKey ?? localAccountStorageKey;
  const now = options.now ?? (() => new Date());
  const createId = options.createId ?? (() => createBrowserId('account'));
  const createSalt = options.createSalt ?? (() => createBrowserId('salt'));
  const signupInput = validateSignupInput(input);
  const payload = loadAccountPayload(storage, storageKey);

  if (payload.accounts.some((account) => account.email === signupInput.email)) {
    throw new Error('An account with this email already exists.');
  }

  const account: LocalAccountRecord = {
    id: createId(),
    email: signupInput.email,
    displayName: signupInput.displayName,
    role: 'student',
    passwordSalt: createSalt(),
    passwordHash: '',
    createdAt: now().toISOString(),
  };

  account.passwordHash = await hashPasswordForLocalAuth(signupInput.password, account.passwordSalt);

  const nextPayload = saveAccountPayload(
    {
      version: accountStoreVersion,
      activeAccountId: account.id,
      accounts: [...payload.accounts, account],
    },
    storage,
    storageKey,
  );

  return {
    account: toPublicAccount(account),
    payload: nextPayload,
  };
}

export async function loginLocalAccount(
  input: LoginInput,
  options: UseLocalAccountStoreOptions = {},
): Promise<{ account: PublicAccount; payload: AccountPayload }> {
  const storage = options.storage === undefined ? getBrowserStorage() : options.storage;
  const storageKey = options.storageKey ?? localAccountStorageKey;
  const now = options.now ?? (() => new Date());
  const loginInput = validateLoginInput(input);
  const payload = loadAccountPayload(storage, storageKey);
  const account = payload.accounts.find((candidate) => candidate.email === loginInput.email);

  if (!account) {
    throw new Error('No account exists for that email.');
  }

  const passwordHash = await hashPasswordForLocalAuth(loginInput.password, account.passwordSalt);

  if (passwordHash !== account.passwordHash) {
    throw new Error('Password is incorrect.');
  }

  const updatedAccount = {
    ...account,
    lastLoginAt: now().toISOString(),
  };
  const nextPayload = saveAccountPayload(
    {
      version: accountStoreVersion,
      activeAccountId: updatedAccount.id,
      accounts: payload.accounts.map((candidate) =>
        candidate.id === updatedAccount.id ? updatedAccount : candidate,
      ),
    },
    storage,
    storageKey,
  );

  return {
    account: toPublicAccount(updatedAccount),
    payload: nextPayload,
  };
}

export function logoutLocalAccount(options: UseLocalAccountStoreOptions = {}): AccountPayload {
  const storage = options.storage === undefined ? getBrowserStorage() : options.storage;
  const storageKey = options.storageKey ?? localAccountStorageKey;
  const payload = loadAccountPayload(storage, storageKey);

  return saveAccountPayload(
    {
      version: accountStoreVersion,
      accounts: payload.accounts,
    },
    storage,
    storageKey,
  );
}

export function getActivePublicAccount(payload: AccountPayload): PublicAccount | null {
  const account = payload.accounts.find((candidate) => candidate.id === payload.activeAccountId);

  return account ? toPublicAccount(account) : null;
}

export function createAccountScopedStorageKey(
  accountId: string | undefined,
  resource: 'attempts' | 'sessions',
): string {
  return `precalcapp.account.${accountId ?? 'signed-out'}.${resource}.v1`;
}

export function useLocalAccountStore(options: UseLocalAccountStoreOptions = {}) {
  const storage = options.storage === undefined ? getBrowserStorage() : options.storage;
  const storageKey = options.storageKey ?? localAccountStorageKey;
  const [payload, setPayload] = useState<AccountPayload>(() =>
    loadAccountPayload(storage, storageKey),
  );

  const currentAccount = useMemo(() => getActivePublicAccount(payload), [payload]);

  const signup = useCallback(
    async (input: SignupInput) => {
      const result = await signupLocalAccount(input, {
        ...options,
        storage,
        storageKey,
      });
      setPayload(result.payload);
      return result.account;
    },
    [options, storage, storageKey],
  );

  const login = useCallback(
    async (input: LoginInput) => {
      const result = await loginLocalAccount(input, {
        ...options,
        storage,
        storageKey,
      });
      setPayload(result.payload);
      return result.account;
    },
    [options, storage, storageKey],
  );

  const logout = useCallback(() => {
    const nextPayload = logoutLocalAccount({
      ...options,
      storage,
      storageKey,
    });
    setPayload(nextPayload);
  }, [options, storage, storageKey]);

  useEffect(() => {
    setPayload(loadAccountPayload(storage, storageKey));
  }, [storage, storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || storage !== window.localStorage) {
      return;
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== storageKey) {
        return;
      }

      setPayload(loadAccountPayload(storage, storageKey));
    }

    window.addEventListener('storage', handleStorage);

    return () => window.removeEventListener('storage', handleStorage);
  }, [storage, storageKey]);

  return {
    accounts: payload.accounts.map(toPublicAccount),
    currentAccount,
    signup,
    login,
    logout,
  };
}
