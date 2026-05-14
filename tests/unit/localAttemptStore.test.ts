import type { Attempt } from '../../src/domain/attempts';
import {
  clearAttemptsFromStorage,
  createAttemptExportPayload,
  loadAttemptsFromStorage,
  mergeAttemptsById,
  parseAttemptImportPayload,
  saveAttemptsToStorage,
  serializeAttempts,
  type AttemptStorage,
} from '../../src/data/localAttemptStore';

function createMemoryStorage(): AttemptStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

function createAttempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    id: 'attempt-1',
    questionId: 'test-mcq-001',
    questionType: 'mcq',
    startedAt: '2026-05-13T10:00:00.000Z',
    submittedAt: '2026-05-13T10:01:00.000Z',
    response: {
      type: 'mcq',
      selectedChoiceId: 'A',
    },
    score: 1,
    maxScore: 1,
    isCorrect: true,
    timeSpentSeconds: 60,
    ...overrides,
  };
}

describe('local attempt store helpers', () => {
  it('creates and parses an export payload', () => {
    const olderAttempt = createAttempt({ id: 'attempt-old' });
    const newerAttempt = createAttempt({
      id: 'attempt-new',
      submittedAt: '2026-05-13T10:05:00.000Z',
    });

    const payload = createAttemptExportPayload(
      [olderAttempt, newerAttempt],
      '2026-05-13T12:00:00.000Z',
    );
    const parsed = parseAttemptImportPayload(payload);

    expect(payload).toMatchObject({
      version: 'precalcapp.attempts.v1',
      exportedAt: '2026-05-13T12:00:00.000Z',
    });
    expect(parsed).toMatchObject({
      rejectedCount: 0,
      errors: [],
    });
    expect(parsed.attempts.map((attempt) => attempt.id)).toEqual(['attempt-new', 'attempt-old']);
  });

  it('loads, saves, and clears attempts through a storage adapter', () => {
    const storage = createMemoryStorage();
    const storageKey = 'test.attempts';
    const attempt = createAttempt();

    expect(loadAttemptsFromStorage(storage, storageKey)).toEqual([]);

    saveAttemptsToStorage([attempt], storage, storageKey);
    expect(loadAttemptsFromStorage(storage, storageKey)).toEqual([attempt]);

    clearAttemptsFromStorage(storage, storageKey);
    expect(loadAttemptsFromStorage(storage, storageKey)).toEqual([]);
  });

  it('merges imported attempts by id', () => {
    const existingAttempt = createAttempt({ id: 'attempt-existing', score: 0, isCorrect: false });
    const unchangedAttempt = createAttempt({
      id: 'attempt-unchanged',
      submittedAt: '2026-05-13T10:02:00.000Z',
    });
    const updatedAttempt = createAttempt({
      id: 'attempt-existing',
      score: 1,
      isCorrect: true,
      submittedAt: '2026-05-13T10:03:00.000Z',
    });
    const addedAttempt = createAttempt({
      id: 'attempt-added',
      submittedAt: '2026-05-13T10:04:00.000Z',
    });

    const result = mergeAttemptsById(
      [existingAttempt, unchangedAttempt],
      [unchangedAttempt, updatedAttempt, addedAttempt],
    );

    expect(result).toMatchObject({
      added: 1,
      updated: 1,
      unchanged: 1,
    });
    expect(result.attempts.map((attempt) => attempt.id)).toEqual([
      'attempt-added',
      'attempt-existing',
      'attempt-unchanged',
    ]);
  });

  it('does not let older same-id imports replace newer local attempts', () => {
    const newerAttempt = createAttempt({
      id: 'attempt-existing',
      score: 1,
      isCorrect: true,
      submittedAt: '2026-05-13T10:03:00.000Z',
      updatedAt: '2026-05-13T10:05:00.000Z',
    });
    const olderAttempt = createAttempt({
      id: 'attempt-existing',
      score: 0,
      isCorrect: false,
      submittedAt: '2026-05-13T10:03:00.000Z',
      updatedAt: '2026-05-13T10:04:00.000Z',
    });

    const result = mergeAttemptsById([newerAttempt], [olderAttempt]);

    expect(result).toMatchObject({
      added: 0,
      updated: 0,
      unchanged: 1,
    });
    expect(result.attempts[0]).toEqual(newerAttempt);
  });

  it('keeps valid attempts and reports invalid imported attempts', () => {
    const serialized = serializeAttempts([createAttempt()], '2026-05-13T12:00:00.000Z');
    const payload = JSON.parse(serialized) as { attempts: unknown[] };

    payload.attempts.push({
      id: '',
      questionId: 'test-mcq-001',
      questionType: 'mcq',
      startedAt: 'not-a-date',
      submittedAt: 'not-a-date',
      response: {
        type: 'mcq',
        selectedChoiceId: 'A',
      },
      score: 1,
      maxScore: 1,
    });
    payload.attempts.push({
      id: 'impossible-attempt',
      questionId: 'test-mcq-001',
      questionType: 'mcq',
      startedAt: '2026-05-13T10:00:00.000Z',
      submittedAt: '2026-05-13T10:01:00.000Z',
      response: {
        type: 'frq',
        partResponses: {
          a: 'Mismatched response type.',
        },
      },
      score: 2,
      maxScore: 1,
    });

    const result = parseAttemptImportPayload(JSON.stringify(payload));

    expect(result.attempts).toHaveLength(1);
    expect(result.rejectedCount).toBe(2);
    expect(result.errors[0]).toContain('Attempt 2');
    expect(result.errors[1]).toContain('Attempt 3');
  });
});
