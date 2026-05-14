import type { PublicAccount } from '../../src/data/localAccountStore';
import {
  classStoreVersion,
  createLocalClass,
  enrollLocalAccountInClass,
  loadClassPayload,
  type ClassStorage,
} from '../../src/data/localClassStore';

function createMemoryStorage(): ClassStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

function createAccount(overrides: Partial<PublicAccount> = {}): PublicAccount {
  return {
    id: 'account-1',
    email: 'Student@Example.com',
    displayName: 'Student One',
    role: 'student',
    createdAt: '2026-05-13T09:00:00.000Z',
    ...overrides,
  };
}

describe('local class store helpers', () => {
  it('creates and persists a class record', () => {
    const storage = createMemoryStorage();
    const storageKey = 'test.classes';

    const result = createLocalClass(
      {
        name: '  Period 1  ',
        description: '  AP Precalculus morning section  ',
        createdBy: 'admin-1',
      },
      {
        storage,
        storageKey,
        now: () => new Date('2026-05-13T10:00:00.000Z'),
        createId: () => 'class-1',
      },
    );

    expect(result.classRecord).toEqual({
      id: 'class-1',
      name: 'Period 1',
      description: 'AP Precalculus morning section',
      createdBy: 'admin-1',
      createdAt: '2026-05-13T10:00:00.000Z',
      updatedAt: '2026-05-13T10:00:00.000Z',
    });
    expect(loadClassPayload(storage, storageKey)).toEqual({
      version: classStoreVersion,
      classes: [result.classRecord],
      enrollments: [],
    });
    expect(() => createLocalClass({ name: '   ' }, { storage, storageKey })).toThrow(
      'Enter a class name.',
    );
  });

  it('enrolls an account in an existing class', () => {
    const storage = createMemoryStorage();
    const storageKey = 'test.classes';
    const classRecord = createLocalClass(
      { name: 'Period 2' },
      {
        storage,
        storageKey,
        now: () => new Date('2026-05-13T10:00:00.000Z'),
        createId: () => 'class-1',
      },
    ).classRecord;

    const result = enrollLocalAccountInClass(classRecord.id, createAccount(), {
      storage,
      storageKey,
      now: () => new Date('2026-05-13T11:00:00.000Z'),
      createId: () => 'enrollment-1',
    });

    expect(result.enrollment).toEqual({
      id: 'enrollment-1',
      classId: 'class-1',
      accountId: 'account-1',
      email: 'student@example.com',
      displayName: 'Student One',
      role: 'student',
      createdAt: '2026-05-13T11:00:00.000Z',
    });
    expect(loadClassPayload(storage, storageKey).enrollments).toHaveLength(1);
    expect(
      enrollLocalAccountInClass('missing-class', createAccount(), { storage, storageKey }),
    ).toMatchObject({
      enrollment: null,
    });
  });

  it('updates duplicate enrollments without adding another roster row', () => {
    const storage = createMemoryStorage();
    const storageKey = 'test.classes';
    const classRecord = createLocalClass(
      { name: 'Period 3' },
      {
        storage,
        storageKey,
        now: () => new Date('2026-05-13T10:00:00.000Z'),
        createId: () => 'class-1',
      },
    ).classRecord;

    enrollLocalAccountInClass(classRecord.id, createAccount(), {
      storage,
      storageKey,
      now: () => new Date('2026-05-13T11:00:00.000Z'),
      createId: () => 'enrollment-1',
    });

    const result = enrollLocalAccountInClass(
      classRecord.id,
      createAccount({
        email: 'Updated.Student@Example.com',
        displayName: '  Updated Student  ',
        role: 'admin',
      }),
      {
        storage,
        storageKey,
        createId: () => {
          throw new Error('Duplicate enrollment should reuse the existing id.');
        },
      },
    );

    expect(result.payload.enrollments).toHaveLength(1);
    expect(result.enrollment).toEqual({
      id: 'enrollment-1',
      classId: 'class-1',
      accountId: 'account-1',
      email: 'updated.student@example.com',
      displayName: 'Updated Student',
      role: 'admin',
      createdAt: '2026-05-13T11:00:00.000Z',
    });
  });
});
