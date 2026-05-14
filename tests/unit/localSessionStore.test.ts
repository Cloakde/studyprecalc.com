import type { SessionResult } from '../../src/domain/sessions';
import {
  clearSessionsFromStorage,
  createSessionExportPayload,
  loadSessionsFromStorage,
  mergeSessionsById,
  parseSessionImportPayload,
  saveSessionsToStorage,
  serializeSessions,
  type SessionStorage,
} from '../../src/data/localSessionStore';

function createMemoryStorage(): SessionStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

function createSession(overrides: Partial<SessionResult> = {}): SessionResult {
  return {
    id: 'session-1',
    questionSetVersion: '0.1.0',
    startedAt: '2026-05-13T10:00:00.000Z',
    submittedAt: '2026-05-13T10:05:00.000Z',
    updatedAt: '2026-05-13T10:05:00.000Z',
    durationSeconds: 300,
    filters: {
      type: 'mixed',
      unit: 'all',
      difficulty: 'all',
      calculator: 'all',
    },
    plannedQuestionCount: 1,
    answeredQuestionCount: 1,
    score: 1,
    maxScore: 1,
    percent: 100,
    pendingManualScoreCount: 0,
    missedQuestionIds: [],
    markedQuestionIds: [],
    questionResults: [
      {
        questionId: 'pc-mcq-rat-001',
        questionType: 'mcq',
        unit: 'Rational and Polynomial Functions',
        topic: 'Rational function behavior',
        skill: 'Identify removable discontinuities and intercepts',
        difficulty: 'intro',
        calculator: 'none',
        score: 1,
        maxScore: 1,
        answered: true,
        markedForReview: false,
        isCorrect: true,
        timeSpentSeconds: 60,
      },
    ],
    ...overrides,
  };
}

describe('local session store helpers', () => {
  it('creates and parses an export payload', () => {
    const olderSession = createSession({ id: 'session-old' });
    const newerSession = createSession({
      id: 'session-new',
      submittedAt: '2026-05-13T10:10:00.000Z',
      updatedAt: '2026-05-13T10:10:00.000Z',
    });

    const payload = createSessionExportPayload(
      [olderSession, newerSession],
      '2026-05-13T12:00:00.000Z',
    );
    const parsed = parseSessionImportPayload(payload);

    expect(payload).toMatchObject({
      version: 'precalcapp.sessions.v1',
      exportedAt: '2026-05-13T12:00:00.000Z',
    });
    expect(parsed.sessions.map((session) => session.id)).toEqual(['session-new', 'session-old']);
    expect(parsed.rejectedCount).toBe(0);
  });

  it('loads, saves, and clears sessions through a storage adapter', () => {
    const storage = createMemoryStorage();
    const storageKey = 'test.sessions';
    const session = createSession();

    expect(loadSessionsFromStorage(storage, storageKey)).toEqual([]);

    saveSessionsToStorage([session], storage, storageKey);
    expect(loadSessionsFromStorage(storage, storageKey)).toEqual([session]);

    clearSessionsFromStorage(storage, storageKey);
    expect(loadSessionsFromStorage(storage, storageKey)).toEqual([]);
  });

  it('merges sessions by newest updatedAt', () => {
    const newerSession = createSession({
      id: 'session-existing',
      score: 1,
      percent: 100,
      updatedAt: '2026-05-13T10:06:00.000Z',
    });
    const olderSession = createSession({
      id: 'session-existing',
      score: 0,
      percent: 0,
      updatedAt: '2026-05-13T10:05:00.000Z',
    });
    const addedSession = createSession({
      id: 'session-added',
      submittedAt: '2026-05-13T10:07:00.000Z',
      updatedAt: '2026-05-13T10:07:00.000Z',
    });

    const result = mergeSessionsById([newerSession], [olderSession, addedSession]);

    expect(result).toMatchObject({
      added: 1,
      updated: 0,
      unchanged: 1,
    });
    expect(result.sessions.map((session) => session.id)).toEqual([
      'session-added',
      'session-existing',
    ]);
    expect(result.sessions[1]).toEqual(newerSession);
  });

  it('reports invalid imported session results', () => {
    const payload = JSON.parse(serializeSessions([createSession()])) as { sessions: unknown[] };

    payload.sessions.push({
      ...createSession({
        id: 'impossible-session',
        score: 2,
        maxScore: 1,
        percent: 200,
      }),
    });

    const result = parseSessionImportPayload(JSON.stringify(payload));

    expect(result.sessions).toHaveLength(1);
    expect(result.rejectedCount).toBe(1);
    expect(result.errors[0]).toContain('Session 2');
  });
});
