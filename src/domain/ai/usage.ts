import type { AiDailyUsageSnapshot, AiUsageRecord } from './types';

export function getAiUsageDateKey(timestamp: string | Date = new Date()): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    throw new Error('AI usage timestamp must be a valid date.');
  }

  return date.toISOString().slice(0, 10);
}

export function summarizeDailyAiUsage(input: {
  accountId: string;
  dateKey: string;
  dailyRequestLimit: number;
  records: AiUsageRecord[];
}): AiDailyUsageSnapshot {
  const used = input.records.filter((record) => {
    return (
      record.accountId === input.accountId &&
      record.dateKey === input.dateKey &&
      record.status === 'accepted'
    );
  }).length;
  const limit = Math.max(0, input.dailyRequestLimit);
  const remaining = Math.max(0, limit - used);

  return {
    accountId: input.accountId,
    dateKey: input.dateKey,
    used,
    limit,
    remaining,
    allowed: remaining > 0,
  };
}

export function canRequestAiGrading(input: {
  accountId: string;
  dailyRequestLimit: number;
  records: AiUsageRecord[];
  at?: string | Date;
}): AiDailyUsageSnapshot {
  return summarizeDailyAiUsage({
    accountId: input.accountId,
    dateKey: getAiUsageDateKey(input.at),
    dailyRequestLimit: input.dailyRequestLimit,
    records: input.records,
  });
}
