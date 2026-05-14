import type { Attempt } from '../../src/domain/attempts';
import type { SessionResult } from '../../src/domain/sessions';
import { attemptFromSupabaseRow, attemptToSupabaseRow } from '../../src/data/supabase/attemptStore';
import { sessionFromSupabaseRow, sessionToSupabaseRow } from '../../src/data/supabase/sessionStore';

function createAttempt(): Attempt {
  return {
    id: 'attempt-1',
    questionId: 'pc-mcq-rat-001',
    questionType: 'mcq',
    startedAt: '2026-05-13T10:00:00.000Z',
    submittedAt: '2026-05-13T10:01:00.000Z',
    updatedAt: '2026-05-13T10:01:10.000Z',
    response: {
      type: 'mcq',
      selectedChoiceId: 'A',
    },
    score: 1,
    maxScore: 1,
    isCorrect: true,
    timeSpentSeconds: 60,
  };
}

function createSession(): SessionResult {
  return {
    id: 'session-1',
    questionSetVersion: '0.1.0',
    startedAt: '2026-05-13T10:00:00.000Z',
    submittedAt: '2026-05-13T10:05:00.000Z',
    updatedAt: '2026-05-13T10:05:30.000Z',
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
        attemptId: 'attempt-1',
        timeSpentSeconds: 60,
      },
    ],
  };
}

describe('supabase row mapping', () => {
  it('round-trips attempts through Supabase row shape', () => {
    const attempt = createAttempt();
    const row = attemptToSupabaseRow(attempt, 'user-1');

    expect(row).toMatchObject({
      user_id: 'user-1',
      question_id: 'pc-mcq-rat-001',
      max_score: 1,
      time_spent_seconds: 60,
    });
    expect(attemptFromSupabaseRow(row)).toEqual(attempt);
  });

  it('round-trips session results through Supabase row shape', () => {
    const session = createSession();
    const row = sessionToSupabaseRow(session, 'user-1');

    expect(row).toMatchObject({
      user_id: 'user-1',
      question_set_version: '0.1.0',
      planned_question_count: 1,
      pending_manual_score_count: 0,
    });
    expect(sessionFromSupabaseRow(row)).toEqual(session);
  });
});
