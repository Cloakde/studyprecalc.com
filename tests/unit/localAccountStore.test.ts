import {
  createAccountScopedStorageKey,
  hashPasswordForLocalAuth,
  loadAccountPayload,
  loginLocalAccount,
  logoutLocalAccount,
  saveAccountPayload,
  signupLocalAccount,
  type AccountStorage,
} from '../../src/data/localAccountStore';

function createMemoryStorage(): AccountStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe('local account store helpers', () => {
  it('signs up, persists, logs in, and logs out a local account', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'test.accounts';

    const signup = await signupLocalAccount(
      {
        displayName: 'Student One',
        email: 'Student@Example.com',
        password: 'secret1',
      },
      {
        storage,
        storageKey,
        now: () => new Date('2026-05-13T10:00:00.000Z'),
        createId: () => 'account-1',
        createSalt: () => 'salt-1',
      },
    );

    expect(signup.account).toMatchObject({
      id: 'account-1',
      email: 'student@example.com',
      displayName: 'Student One',
      role: 'student',
    });
    expect(loadAccountPayload(storage, storageKey).activeAccountId).toBe('account-1');

    logoutLocalAccount({ storage, storageKey });
    expect(loadAccountPayload(storage, storageKey).activeAccountId).toBeUndefined();

    const login = await loginLocalAccount(
      {
        email: 'student@example.com',
        password: 'secret1',
      },
      {
        storage,
        storageKey,
        now: () => new Date('2026-05-13T11:00:00.000Z'),
      },
    );

    expect(login.account.lastLoginAt).toBe('2026-05-13T11:00:00.000Z');
    expect(loadAccountPayload(storage, storageKey).activeAccountId).toBe('account-1');
  });

  it('rejects duplicate account emails and incorrect passwords', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'test.accounts';

    await signupLocalAccount(
      {
        displayName: 'Student One',
        email: 'student@example.com',
        password: 'secret1',
      },
      {
        storage,
        storageKey,
        createId: () => 'account-1',
        createSalt: () => 'salt-1',
      },
    );

    await expect(
      signupLocalAccount(
        {
          displayName: 'Student Two',
          email: 'STUDENT@example.com',
          password: 'secret2',
        },
        {
          storage,
          storageKey,
        },
      ),
    ).rejects.toThrow('already exists');

    await expect(
      loginLocalAccount(
        {
          email: 'student@example.com',
          password: 'wrong-password',
        },
        {
          storage,
          storageKey,
        },
      ),
    ).rejects.toThrow('incorrect');
  });

  it('loads only valid account records from storage', () => {
    const storage = createMemoryStorage();
    const storageKey = 'test.accounts';

    saveAccountPayload(
      {
        version: 'precalcapp.accounts.v1',
        activeAccountId: 'account-1',
        accounts: [
          {
            id: 'account-1',
            email: 'student@example.com',
            displayName: 'Student',
            role: 'admin',
            passwordSalt: 'salt',
            passwordHash: 'hash',
            createdAt: '2026-05-13T10:00:00.000Z',
          },
        ],
      },
      storage,
      storageKey,
    );
    storage.setItem(
      storageKey,
      JSON.stringify({
        activeAccountId: 'missing-account',
        accounts: [
          ...loadAccountPayload(storage, storageKey).accounts,
          {
            id: '',
            email: '',
          },
        ],
      }),
    );

    const payload = loadAccountPayload(storage, storageKey);

    expect(payload.accounts).toHaveLength(1);
    expect(payload.accounts[0].role).toBe('admin');
    expect(payload.activeAccountId).toBeUndefined();
  });

  it('treats legacy accounts without a role as student accounts', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'test.accounts';

    saveAccountPayload(
      {
        version: 'precalcapp.accounts.v1',
        activeAccountId: 'account-1',
        accounts: [
          {
            id: 'account-1',
            email: 'student@example.com',
            displayName: 'Student',
            passwordSalt: 'salt',
            passwordHash: await hashPasswordForLocalAuth('secret1', 'salt'),
            createdAt: '2026-05-13T10:00:00.000Z',
          },
        ],
      },
      storage,
      storageKey,
    );

    const login = await loginLocalAccount(
      {
        email: 'student@example.com',
        password: 'secret1',
      },
      {
        storage,
        storageKey,
      },
    );

    expect(login.account.role).toBe('student');
  });

  it('creates account-scoped storage keys', () => {
    expect(createAccountScopedStorageKey('account-1', 'attempts')).toBe(
      'precalcapp.account.account-1.attempts.v1',
    );
    expect(createAccountScopedStorageKey(undefined, 'sessions')).toBe(
      'precalcapp.account.signed-out.sessions.v1',
    );
  });
});
