import type { AiFrqGradingResult, AiUsageRecord } from '../../src/domain/ai';
import {
  appendAiGradingFeedback,
  appendAiUsageRecord,
  clearAiGradingStateFromStorage,
  loadAiGradingStateFromStorage,
  parseAiGradingState,
  saveAiGradingStateToStorage,
  type AiGradingStorage,
} from '../../src/data/aiGradingLocalStore';

function createMemoryStorage(): AiGradingStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

function feedback(overrides: Partial<AiFrqGradingResult> = {}): AiFrqGradingResult {
  return {
    id: 'feedback-1',
    requestId: 'request-1',
    accountId: 'student-1',
    questionId: 'frq-ai-001',
    provider: 'gemini',
    model: 'gemini-1.5-flash',
    status: 'completed',
    createdAt: '2026-05-15T10:00:00.000Z',
    score: 1,
    maxScore: 1,
    criterionFeedback: [
      {
        criterionId: 'a-rate',
        partId: 'a',
        earned: true,
        points: 1,
        confidence: 0.75,
        rationale: 'The response computes the rate from output change over input change.',
      },
    ],
    partFeedback: [
      {
        partId: 'a',
        summary: 'Correct setup and result.',
      },
    ],
    overallFeedback: 'The response earns full credit.',
    safety: {
      externalApiCalled: false,
      humanReviewRecommended: false,
    },
    ...overrides,
  };
}

function usage(overrides: Partial<AiUsageRecord> = {}): AiUsageRecord {
  return {
    id: 'usage-1',
    accountId: 'student-1',
    provider: 'gemini',
    requestId: 'request-1',
    dateKey: '2026-05-15',
    createdAt: '2026-05-15T10:00:00.000Z',
    status: 'accepted',
    ...overrides,
  };
}

describe('AI grading local store helpers', () => {
  it('loads, saves, and clears feedback and usage through a storage adapter', () => {
    const storage = createMemoryStorage();
    const storageKey = 'test.aiGrading';
    const state = saveAiGradingStateToStorage(
      {
        feedback: [feedback()],
        usage: [usage()],
      },
      storage,
      storageKey,
    );

    expect(state.feedback).toHaveLength(1);
    expect(state.usage).toHaveLength(1);
    expect(loadAiGradingStateFromStorage(storage, storageKey)).toEqual(state);

    clearAiGradingStateFromStorage(storage, storageKey);
    expect(loadAiGradingStateFromStorage(storage, storageKey)).toMatchObject({
      feedback: [],
      usage: [],
    });
  });

  it('appends feedback and usage by id', () => {
    const storage = createMemoryStorage();
    const storageKey = 'test.aiGrading';

    appendAiGradingFeedback(feedback({ score: 0 }), storage, storageKey);
    appendAiUsageRecord(usage(), storage, storageKey);
    const updated = appendAiGradingFeedback(feedback({ score: 1 }), storage, storageKey);

    expect(updated.feedback).toHaveLength(1);
    expect(updated.feedback[0].score).toBe(1);
    expect(loadAiGradingStateFromStorage(storage, storageKey).usage).toHaveLength(1);
  });

  it('drops invalid persisted entries instead of throwing', () => {
    const parsed = parseAiGradingState({
      feedback: [
        feedback({
          id: 'feedback-new',
          createdAt: '2026-05-15T11:00:00.000Z',
        }),
        {
          id: 'unsafe-feedback',
          provider: 'gemini',
          safety: {
            externalApiCalled: true,
          },
        },
      ],
      usage: [
        usage(),
        {
          id: 'bad-usage',
          provider: 'gemini',
          status: 'unknown',
        },
      ],
    });

    expect(parsed.feedback.map((entry) => entry.id)).toEqual(['feedback-new']);
    expect(parsed.usage.map((entry) => entry.id)).toEqual(['usage-1']);
  });
});
