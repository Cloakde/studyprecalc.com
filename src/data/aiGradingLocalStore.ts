import type { AiFrqGradingResult, AiUsageRecord } from '../domain/ai';

export const localAiGradingStorageKey = 'precalcapp.aiGrading.v1';
export const aiGradingStorageVersion = 'precalcapp.aiGrading.v1';

export type AiGradingStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

export type AiGradingLocalState = {
  version: typeof aiGradingStorageVersion;
  feedback: AiFrqGradingResult[];
  usage: AiUsageRecord[];
};

function getBrowserStorage(): AiGradingStorage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

function timestampMs(timestamp: string): number {
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function emptyAiGradingState(): AiGradingLocalState {
  return {
    version: aiGradingStorageVersion,
    feedback: [],
    usage: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAiFeedbackResult(value: unknown): value is AiFrqGradingResult {
  if (!isRecord(value) || !isRecord(value.safety)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.requestId === 'string' &&
    typeof value.accountId === 'string' &&
    typeof value.questionId === 'string' &&
    value.provider === 'gemini' &&
    typeof value.model === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.score === 'number' &&
    typeof value.maxScore === 'number' &&
    Array.isArray(value.criterionFeedback) &&
    Array.isArray(value.partFeedback) &&
    typeof value.overallFeedback === 'string' &&
    value.safety.externalApiCalled === false &&
    typeof value.safety.humanReviewRecommended === 'boolean'
  );
}

function isAiUsageRecord(value: unknown): value is AiUsageRecord {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.accountId === 'string' &&
    value.provider === 'gemini' &&
    typeof value.requestId === 'string' &&
    typeof value.dateKey === 'string' &&
    typeof value.createdAt === 'string' &&
    (value.status === 'accepted' || value.status === 'rejected' || value.status === 'failed')
  );
}

function sortFeedback(feedback: AiFrqGradingResult[]): AiFrqGradingResult[] {
  return [...feedback].sort((first, second) => {
    const createdAtComparison = timestampMs(second.createdAt) - timestampMs(first.createdAt);

    if (createdAtComparison !== 0) {
      return createdAtComparison;
    }

    return second.id.localeCompare(first.id);
  });
}

function sortUsage(usage: AiUsageRecord[]): AiUsageRecord[] {
  return [...usage].sort((first, second) => {
    const createdAtComparison = timestampMs(second.createdAt) - timestampMs(first.createdAt);

    if (createdAtComparison !== 0) {
      return createdAtComparison;
    }

    return second.id.localeCompare(first.id);
  });
}

export function parseAiGradingState(payload: unknown): AiGradingLocalState {
  if (!isRecord(payload)) {
    return emptyAiGradingState();
  }

  const feedback = Array.isArray(payload.feedback)
    ? payload.feedback.filter(isAiFeedbackResult)
    : [];
  const usage = Array.isArray(payload.usage) ? payload.usage.filter(isAiUsageRecord) : [];

  return {
    version: aiGradingStorageVersion,
    feedback: sortFeedback(feedback),
    usage: sortUsage(usage),
  };
}

export function loadAiGradingStateFromStorage(
  storage: AiGradingStorage | null = getBrowserStorage(),
  storageKey = localAiGradingStorageKey,
): AiGradingLocalState {
  if (!storage) {
    return emptyAiGradingState();
  }

  const raw = storage.getItem(storageKey);

  if (!raw) {
    return emptyAiGradingState();
  }

  try {
    return parseAiGradingState(JSON.parse(raw) as unknown);
  } catch {
    return emptyAiGradingState();
  }
}

export function saveAiGradingStateToStorage(
  state: Pick<AiGradingLocalState, 'feedback' | 'usage'>,
  storage: AiGradingStorage | null = getBrowserStorage(),
  storageKey = localAiGradingStorageKey,
): AiGradingLocalState {
  const nextState = parseAiGradingState({
    version: aiGradingStorageVersion,
    feedback: state.feedback,
    usage: state.usage,
  });

  storage?.setItem(storageKey, JSON.stringify(nextState, null, 2));

  return nextState;
}

export function appendAiGradingFeedback(
  result: AiFrqGradingResult,
  storage: AiGradingStorage | null = getBrowserStorage(),
  storageKey = localAiGradingStorageKey,
): AiGradingLocalState {
  const current = loadAiGradingStateFromStorage(storage, storageKey);
  const feedbackById = new Map(current.feedback.map((entry) => [entry.id, entry]));

  feedbackById.set(result.id, result);

  return saveAiGradingStateToStorage(
    {
      feedback: [...feedbackById.values()],
      usage: current.usage,
    },
    storage,
    storageKey,
  );
}

export function appendAiUsageRecord(
  record: AiUsageRecord,
  storage: AiGradingStorage | null = getBrowserStorage(),
  storageKey = localAiGradingStorageKey,
): AiGradingLocalState {
  const current = loadAiGradingStateFromStorage(storage, storageKey);
  const usageById = new Map(current.usage.map((entry) => [entry.id, entry]));

  usageById.set(record.id, record);

  return saveAiGradingStateToStorage(
    {
      feedback: current.feedback,
      usage: [...usageById.values()],
    },
    storage,
    storageKey,
  );
}

export function clearAiGradingStateFromStorage(
  storage: AiGradingStorage | null = getBrowserStorage(),
  storageKey = localAiGradingStorageKey,
) {
  storage?.removeItem(storageKey);
}
