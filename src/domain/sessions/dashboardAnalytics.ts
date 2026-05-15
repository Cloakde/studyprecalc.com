import {
  createAttemptPerformanceRecords,
  createQuestionLookup,
  type AttemptPerformanceRecord,
} from '../attempts';
import type { Attempt } from '../attempts/types';
import type { Question } from '../questions/types';
import type { SessionQuestionResult, SessionResult } from './types';

type PerformanceRecord =
  | AttemptPerformanceRecord
  | {
      source: 'session';
      sessionId: string;
      attemptId?: string;
      questionId: string;
      questionType: Question['type'];
      unit: string;
      topic: string;
      skill: string;
      score: number;
      maxScore: number;
      percent: number;
      missed: boolean;
      needsManualScore: boolean;
      submittedAt: string;
      timeSpentSeconds?: number;
    };

export type PerformanceTrend = 'up' | 'down' | 'flat' | 'new';

export type DashboardTrend = {
  label: string;
  unit?: string;
  topic?: string;
  skill?: string;
  questionCount: number;
  score: number;
  maxScore: number;
  percent: number;
  missedCount: number;
  pendingManualScoreCount: number;
  recentPercent?: number;
  previousPercent?: number;
  trend: PerformanceTrend;
  trendDelta: number;
  lastPracticedAt?: string;
};

export type DashboardRecommendation = {
  unit: string;
  topic: string;
  skill: string;
  percent: number;
  missedCount: number;
  availableQuestionIds: string[];
  reason: string;
};

export type DashboardAnalytics = {
  unitTrends: DashboardTrend[];
  skillTrends: DashboardTrend[];
  weakTopics: DashboardTrend[];
  recommendedNext?: DashboardRecommendation;
};

export type CreateDashboardAnalyticsInput = {
  sessions: SessionResult[];
  attempts: Attempt[];
  questions: Question[];
};

function getPercent(score: number, maxScore: number): number {
  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
}

function getTimestampMs(timestamp: string | undefined): number {
  if (!timestamp) {
    return 0;
  }

  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function createSessionPerformanceRecords(sessions: SessionResult[]): PerformanceRecord[] {
  return sessions.flatMap((session) =>
    session.questionResults.map((questionResult) => ({
      source: 'session' as const,
      sessionId: session.id,
      ...(questionResult.attemptId ? { attemptId: questionResult.attemptId } : {}),
      questionId: questionResult.questionId,
      questionType: questionResult.questionType,
      unit: questionResult.unit,
      topic: questionResult.topic,
      skill: questionResult.skill,
      score: questionResult.score,
      maxScore: questionResult.maxScore,
      percent: getPercent(questionResult.score, questionResult.maxScore),
      missed: !questionResult.needsManualScore && questionResult.score < questionResult.maxScore,
      needsManualScore: questionResult.needsManualScore === true,
      submittedAt: session.submittedAt,
      ...(questionResult.timeSpentSeconds === undefined
        ? {}
        : { timeSpentSeconds: questionResult.timeSpentSeconds }),
    })),
  );
}

function compareTrend(
  records: PerformanceRecord[],
): Pick<DashboardTrend, 'previousPercent' | 'recentPercent' | 'trend' | 'trendDelta'> {
  const sorted = [...records].sort(
    (first, second) => getTimestampMs(second.submittedAt) - getTimestampMs(first.submittedAt),
  );

  if (sorted.length < 2) {
    return { trend: 'new', trendDelta: 0 };
  }

  const windowSize = Math.min(3, Math.floor(sorted.length / 2));
  const recent = sorted.slice(0, windowSize);
  const previous = sorted.slice(windowSize, windowSize * 2);

  if (previous.length === 0) {
    return { trend: 'new', trendDelta: 0 };
  }

  const recentPercent = getPercent(
    recent.reduce((total, record) => total + record.score, 0),
    recent.reduce((total, record) => total + record.maxScore, 0),
  );
  const previousPercent = getPercent(
    previous.reduce((total, record) => total + record.score, 0),
    previous.reduce((total, record) => total + record.maxScore, 0),
  );
  const trendDelta = recentPercent - previousPercent;

  return {
    previousPercent,
    recentPercent,
    trend: Math.abs(trendDelta) < 5 ? 'flat' : trendDelta > 0 ? 'up' : 'down',
    trendDelta,
  };
}

function createTrend(
  label: string,
  records: PerformanceRecord[],
  metadata: Pick<DashboardTrend, 'skill' | 'topic' | 'unit'>,
): DashboardTrend {
  const score = records.reduce((total, record) => total + record.score, 0);
  const maxScore = records.reduce((total, record) => total + record.maxScore, 0);
  const lastPracticedAt = records
    .map((record) => record.submittedAt)
    .sort((first, second) => getTimestampMs(second) - getTimestampMs(first))[0];

  return {
    label,
    ...metadata,
    questionCount: records.length,
    score,
    maxScore,
    percent: getPercent(score, maxScore),
    missedCount: records.filter((record) => record.missed).length,
    pendingManualScoreCount: records.filter(
      (record) => 'needsManualScore' in record && record.needsManualScore,
    ).length,
    ...compareTrend(records),
    ...(lastPracticedAt ? { lastPracticedAt } : {}),
  };
}

function groupRecords(
  records: PerformanceRecord[],
  getKey: (record: PerformanceRecord) => string,
): Map<string, PerformanceRecord[]> {
  const grouped = new Map<string, PerformanceRecord[]>();

  records.forEach((record) => {
    grouped.set(getKey(record), [...(grouped.get(getKey(record)) ?? []), record]);
  });

  return grouped;
}

function sortWeakest(first: DashboardTrend, second: DashboardTrend): number {
  if (first.percent !== second.percent) {
    return first.percent - second.percent;
  }

  if (first.missedCount !== second.missedCount) {
    return second.missedCount - first.missedCount;
  }

  return second.questionCount - first.questionCount;
}

function buildRecommendation(
  weakTopics: DashboardTrend[],
  questions: Question[],
): DashboardRecommendation | undefined {
  const questionsByTopicSkill = new Map<string, Question[]>();

  questions.forEach((question) => {
    const key = `${question.unit}\n${question.topic}\n${question.skill}`;
    questionsByTopicSkill.set(key, [...(questionsByTopicSkill.get(key) ?? []), question]);
  });

  for (const topic of weakTopics) {
    if (!topic.unit || !topic.topic || !topic.skill) {
      continue;
    }

    const availableQuestions =
      questionsByTopicSkill.get(`${topic.unit}\n${topic.topic}\n${topic.skill}`) ?? [];

    if (availableQuestions.length === 0) {
      continue;
    }

    return {
      unit: topic.unit,
      topic: topic.topic,
      skill: topic.skill,
      percent: topic.percent,
      missedCount: topic.missedCount,
      availableQuestionIds: availableQuestions.map((question) => question.id),
      reason:
        topic.trend === 'down'
          ? 'Recent work is trending down here.'
          : topic.missedCount > 0
            ? 'This has the most missed recent work.'
            : 'This is the lowest-scoring available topic.',
    };
  }

  return undefined;
}

export function createDashboardAnalytics({
  sessions,
  attempts,
  questions,
}: CreateDashboardAnalyticsInput): DashboardAnalytics {
  const sessionRecords = createSessionPerformanceRecords(sessions);
  const sessionAttemptIds = new Set(
    sessionRecords.flatMap((record) => (record.attemptId ? [record.attemptId] : [])),
  );
  const standaloneAttempts = attempts.filter((attempt) => !sessionAttemptIds.has(attempt.id));
  const attemptRecords = createAttemptPerformanceRecords(standaloneAttempts, questions);
  const records = [...sessionRecords, ...attemptRecords];
  const questionsById = createQuestionLookup(questions);

  const unitTrends = [...groupRecords(records, (record) => record.unit).entries()]
    .map(([unit, unitRecords]) => createTrend(unit, unitRecords, { unit }))
    .sort(sortWeakest);

  const skillTrends = [
    ...groupRecords(records, (record) => `${record.unit}\n${record.skill}`).entries(),
  ]
    .map(([, skillRecords]) => {
      const firstRecord = skillRecords[0];

      return createTrend(firstRecord.skill, skillRecords, {
        skill: firstRecord.skill,
        unit: firstRecord.unit,
      });
    })
    .sort(sortWeakest);

  const weakTopics = [
    ...groupRecords(
      records,
      (record) => `${record.unit}\n${record.topic}\n${record.skill}`,
    ).entries(),
  ]
    .map(([, topicRecords]) => {
      const firstRecord = topicRecords[0];

      return createTrend(firstRecord.topic, topicRecords, {
        skill: firstRecord.skill,
        topic: firstRecord.topic,
        unit: firstRecord.unit,
      });
    })
    .filter((topic) => {
      const matchingQuestion = questionsById.get(
        records.find(
          (record) =>
            record.unit === topic.unit &&
            record.topic === topic.topic &&
            record.skill === topic.skill,
        )?.questionId ?? '',
      );

      return matchingQuestion !== undefined;
    })
    .sort(sortWeakest);

  return {
    unitTrends,
    skillTrends,
    weakTopics,
    recommendedNext: buildRecommendation(weakTopics, questions),
  };
}

export function summarizeQuestionResult(questionResult: SessionQuestionResult): string {
  if (questionResult.needsManualScore) {
    return 'Needs self-score';
  }

  if (!questionResult.answered) {
    return 'Skipped';
  }

  if (questionResult.score === questionResult.maxScore) {
    return 'Correct';
  }

  return 'Review';
}
