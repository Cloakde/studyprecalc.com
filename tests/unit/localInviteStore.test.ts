import {
  clearInvitesFromStorage,
  consumeLocalInviteCode,
  createLocalInvite,
  loadInvitePayload,
  saveInvitePayload,
  validateLocalInviteCode,
  type InviteStorage,
} from '../../src/data/localInviteStore';

function createMemoryStorage(): InviteStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe('local invite store helpers', () => {
  it('creates, validates, consumes, and persists an invite', () => {
    const storage = createMemoryStorage();
    const storageKey = 'test.invites';

    const created = createLocalInvite(
      {
        code: 'local-2026',
        email: 'Student@Example.com',
        expiresAt: '2026-05-14T10:00:00.000Z',
        createdByAccountId: 'admin-1',
      },
      {
        storage,
        storageKey,
        now: () => new Date('2026-05-13T10:00:00.000Z'),
        createId: () => 'invite-1',
      },
    );

    expect(created.invite).toMatchObject({
      id: 'invite-1',
      code: 'LOCAL-2026',
      email: 'student@example.com',
      role: 'student',
    });
    expect(loadInvitePayload(storage, storageKey).invites).toHaveLength(1);

    expect(
      validateLocalInviteCode(
        {
          code: 'local-2026',
          email: 'student@example.com',
        },
        {
          storage,
          storageKey,
          now: () => new Date('2026-05-13T12:00:00.000Z'),
        },
      ),
    ).toMatchObject({
      status: 'valid',
    });

    const consumed = consumeLocalInviteCode(
      {
        code: 'LOCAL-2026',
        email: 'student@example.com',
        accountId: 'account-1',
      },
      {
        storage,
        storageKey,
        now: () => new Date('2026-05-13T12:30:00.000Z'),
      },
    );

    expect(consumed.status).toBe('consumed');
    expect(loadInvitePayload(storage, storageKey).invites[0]).toMatchObject({
      consumedAt: '2026-05-13T12:30:00.000Z',
      consumedByAccountId: 'account-1',
    });
    expect(
      validateLocalInviteCode('LOCAL-2026', {
        storage,
        storageKey,
        now: () => new Date('2026-05-13T12:31:00.000Z'),
      }),
    ).toMatchObject({
      status: 'used',
      reason: 'used',
    });
  });

  it('rejects invalid and expired local invites', () => {
    const storage = createMemoryStorage();
    const storageKey = 'test.invites';

    createLocalInvite(
      {
        code: 'expired-2026',
        createdAt: '2026-05-13T08:00:00.000Z',
        expiresAt: '2026-05-13T09:00:00.000Z',
      },
      {
        storage,
        storageKey,
        createId: () => 'invite-expired',
      },
    );

    expect(
      validateLocalInviteCode('missing-2026', {
        storage,
        storageKey,
        now: () => new Date('2026-05-13T10:00:00.000Z'),
      }),
    ).toMatchObject({
      status: 'invalid',
      reason: 'not-found',
    });

    expect(
      validateLocalInviteCode('expired-2026', {
        storage,
        storageKey,
        now: () => new Date('2026-05-13T10:00:00.000Z'),
      }),
    ).toMatchObject({
      status: 'expired',
      reason: 'expired',
    });
  });

  it('loads only valid invite records from storage', () => {
    const storage = createMemoryStorage();
    const storageKey = 'test.invites';

    saveInvitePayload(
      {
        version: 'precalcapp.invites.v1',
        invites: [
          {
            id: 'invite-1',
            code: 'VALID-2026',
            role: 'admin',
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
        invites: [
          ...loadInvitePayload(storage, storageKey).invites,
          {
            id: '',
            code: 'bad',
            role: 'student',
            createdAt: 'not-a-date',
          },
        ],
      }),
    );

    const payload = loadInvitePayload(storage, storageKey);

    expect(payload.invites).toHaveLength(1);
    expect(payload.invites[0]).toMatchObject({
      code: 'VALID-2026',
      role: 'admin',
    });

    clearInvitesFromStorage(storage, storageKey);
    expect(loadInvitePayload(storage, storageKey).invites).toEqual([]);
  });
});
