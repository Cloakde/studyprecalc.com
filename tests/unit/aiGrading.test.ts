import type { FrqQuestion } from '../../src/domain/questions/types';
import {
  canRequestAiGrading,
  createAiFrqGradingRequest,
  getAiUsageDateKey,
  isAiGradingAvailable,
  resolveAiGradingConfig,
  summarizeDailyAiUsage,
  type AiUsageRecord,
} from '../../src/domain/ai';

function createFrqQuestion(): FrqQuestion {
  return {
    id: 'frq-ai-001',
    type: 'frq',
    unit: 'Polynomial and Rational Functions',
    topic: 'Rates of change',
    skill: 'Explain behavior from a graph',
    difficulty: 'medium',
    calculator: 'graphing',
    section: 'frq-a',
    tags: ['frq'],
    prompt: 'A function f is shown in a table. Answer each part.',
    explanation: {
      summary: 'Use interval behavior and slope estimates.',
      steps: ['Estimate rates on each interval.'],
    },
    parts: [
      {
        id: 'a',
        prompt: 'Estimate the average rate of change.',
        sampleResponse: 'The average rate is 3.',
        expectedWork: ['Compute change in output divided by change in input.'],
        rubric: [
          {
            id: 'a-rate',
            description: 'Computes the correct average rate.',
            points: 1,
          },
        ],
      },
    ],
  };
}

function usageRecord(overrides: Partial<AiUsageRecord> = {}): AiUsageRecord {
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

describe('AI FRQ grading domain helpers', () => {
  it('keeps grading unavailable by default', () => {
    const config = resolveAiGradingConfig();

    expect(config.enabled).toBe(false);
    expect(config.provider).toBeUndefined();
    expect(isAiGradingAvailable(config)).toBe(false);
  });

  it('resolves Gemini-ready config only when explicitly enabled and provider is configured', () => {
    const config = resolveAiGradingConfig({
      VITE_AI_FRQ_GRADING_ENABLED: 'true',
      VITE_AI_FRQ_PROVIDER: 'gemini',
      VITE_AI_FRQ_GEMINI_MODEL: 'gemini-2.0-flash',
      VITE_AI_FRQ_DAILY_LIMIT: '3',
    });

    expect(config).toMatchObject({
      enabled: true,
      dailyRequestLimit: 3,
      provider: {
        provider: 'gemini',
        model: 'gemini-2.0-flash',
      },
    });
    expect(isAiGradingAvailable(config)).toBe(true);
  });

  it('requires an explicit Gemini model before enabling the prototype', () => {
    const config = resolveAiGradingConfig({
      VITE_AI_FRQ_GRADING_ENABLED: 'true',
      VITE_AI_FRQ_PROVIDER: 'gemini',
    });

    expect(config.enabled).toBe(false);
    expect(config.provider).toBeUndefined();
  });

  it('creates a provider-neutral FRQ grading request without calling an external API', () => {
    const request = createAiFrqGradingRequest({
      id: 'request-1',
      accountId: 'student-1',
      question: createFrqQuestion(),
      partResponses: {
        a: 'I divided the output change by the input change and got 3.',
      },
      requestedAt: '2026-05-15T10:00:00.000Z',
    });

    expect(request).toMatchObject({
      id: 'request-1',
      accountId: 'student-1',
      questionId: 'frq-ai-001',
      questionMeta: {
        difficulty: 'medium',
        calculator: 'graphing',
      },
    });
    expect(request.parts[0]).toMatchObject({
      id: 'a',
      studentResponse: 'I divided the output change by the input change and got 3.',
      rubric: [
        {
          id: 'a-rate',
          partId: 'a',
          points: 1,
        },
      ],
    });
  });

  it('counts only accepted requests for the same student and UTC day', () => {
    const records = [
      usageRecord(),
      usageRecord({ id: 'usage-2', requestId: 'request-2', status: 'rejected' }),
      usageRecord({ id: 'usage-3', accountId: 'student-2', requestId: 'request-3' }),
      usageRecord({ id: 'usage-4', requestId: 'request-4', dateKey: '2026-05-14' }),
    ];

    const snapshot = summarizeDailyAiUsage({
      accountId: 'student-1',
      dateKey: '2026-05-15',
      dailyRequestLimit: 2,
      records,
    });

    expect(snapshot).toEqual({
      accountId: 'student-1',
      dateKey: '2026-05-15',
      used: 1,
      limit: 2,
      remaining: 1,
      allowed: true,
    });
  });

  it('blocks requests when the daily limit is reached', () => {
    const snapshot = canRequestAiGrading({
      accountId: 'student-1',
      dailyRequestLimit: 1,
      records: [usageRecord()],
      at: '2026-05-15T23:30:00.000Z',
    });

    expect(snapshot).toMatchObject({
      used: 1,
      remaining: 0,
      allowed: false,
    });
    expect(getAiUsageDateKey('2026-05-15T23:30:00.000Z')).toBe('2026-05-15');
  });
});
