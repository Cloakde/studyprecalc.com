import { AlertCircle, ArrowRight, BarChart3, BookOpenCheck, Clock3, Target } from 'lucide-react';
import { useMemo } from 'react';

import type { PublicAccount } from '../../data/localAccountStore';
import type { Attempt } from '../../domain/attempts/types';
import type { Question } from '../../domain/questions/types';
import type { SessionResult } from '../../domain/sessions/types';

type DashboardMode = 'practice' | 'session' | 'review';

type StudentDashboardProps = {
  account: PublicAccount;
  attempts: Attempt[];
  sessions: SessionResult[];
  questions: Question[];
  onNavigate: (mode: DashboardMode) => void;
};

function formatPercent(score: number, maxScore: number): string {
  if (maxScore <= 0) {
    return '0%';
  }

  return `${Math.round((score / maxScore) * 100)}%`;
}

function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function StudentDashboard({
  account,
  attempts,
  sessions,
  questions,
  onNavigate,
}: StudentDashboardProps) {
  const dashboard = useMemo(() => {
    const totalSessionScore = sessions.reduce((total, session) => total + session.score, 0);
    const totalSessionMaxScore = sessions.reduce((total, session) => total + session.maxScore, 0);
    const pendingFrqCount = sessions.reduce(
      (total, session) => total + session.pendingManualScoreCount,
      0,
    );
    const totalMissedCount = sessions.reduce(
      (total, session) => total + session.missedQuestionIds.length,
      0,
    );
    const mcqAttempts = attempts.filter((attempt) => attempt.questionType === 'mcq');
    const correctMcqAttempts = mcqAttempts.filter((attempt) => attempt.isCorrect).length;
    const unitStats = new Map<string, { score: number; maxScore: number; missed: number }>();

    sessions.forEach((session) => {
      session.questionResults.forEach((questionResult) => {
        const current = unitStats.get(questionResult.unit) ?? {
          score: 0,
          maxScore: 0,
          missed: 0,
        };

        current.score += questionResult.score;
        current.maxScore += questionResult.maxScore;

        if (!questionResult.needsManualScore && questionResult.score < questionResult.maxScore) {
          current.missed += 1;
        }

        unitStats.set(questionResult.unit, current);
      });
    });

    const weakUnits = [...unitStats.entries()]
      .map(([unit, stats]) => ({
        unit,
        ...stats,
        percent: stats.maxScore > 0 ? Math.round((stats.score / stats.maxScore) * 100) : 0,
      }))
      .sort((first, second) => {
        if (first.percent !== second.percent) {
          return first.percent - second.percent;
        }

        return second.missed - first.missed;
      })
      .slice(0, 3);
    const recommendedUnit = weakUnits[0]?.unit;

    return {
      averageScore: formatPercent(totalSessionScore, totalSessionMaxScore),
      correctMcqAttempts,
      mcqAccuracy:
        mcqAttempts.length > 0 ? formatPercent(correctMcqAttempts, mcqAttempts.length) : '0%',
      pendingFrqCount,
      recentSessions: sessions.slice(0, 4),
      recommendedUnit,
      totalMissedCount,
      weakUnits,
    };
  }, [attempts, sessions]);

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Student Dashboard</p>
          <h1>{account.displayName}</h1>
        </div>
        <div className="summary-strip" aria-label="Dashboard summary">
          <span>{questions.length} questions</span>
          <span>{sessions.length} sessions</span>
          <span>{attempts.length} attempts</span>
        </div>
      </header>

      <section className="dashboard-stats" aria-label="Progress summary">
        <article>
          <BarChart3 aria-hidden="true" />
          <strong>{dashboard.averageScore}</strong>
          <span>Session Average</span>
        </article>
        <article>
          <Target aria-hidden="true" />
          <strong>{dashboard.mcqAccuracy}</strong>
          <span>MCQ Accuracy</span>
        </article>
        <article>
          <AlertCircle aria-hidden="true" />
          <strong>{dashboard.totalMissedCount}</strong>
          <span>Missed Questions</span>
        </article>
        <article>
          <BookOpenCheck aria-hidden="true" />
          <strong>{dashboard.pendingFrqCount}</strong>
          <span>FRQs To Self-Score</span>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-panel dashboard-panel--action">
          <div>
            <p className="eyebrow">Recommended Next</p>
            <h2>{dashboard.recommendedUnit ?? 'Start a session'}</h2>
            <p>
              {dashboard.recommendedUnit
                ? 'Build a focused session from your weakest unit.'
                : 'Complete a session to unlock unit recommendations.'}
            </p>
          </div>
          <button className="primary-button" onClick={() => onNavigate('session')} type="button">
            Start Session
            <ArrowRight aria-hidden="true" />
          </button>
        </article>

        <article className="dashboard-panel">
          <header className="dashboard-panel__header">
            <div>
              <p className="eyebrow">Weak Units</p>
              <h2>Focus Areas</h2>
            </div>
            <button className="ghost-button" onClick={() => onNavigate('practice')} type="button">
              Practice
            </button>
          </header>
          {dashboard.weakUnits.length === 0 ? (
            <p className="dashboard-empty">No unit data yet.</p>
          ) : (
            <div className="unit-list">
              {dashboard.weakUnits.map((unit) => (
                <div className="unit-row" key={unit.unit}>
                  <div>
                    <strong>{unit.unit}</strong>
                    <span>{unit.missed} missed</span>
                  </div>
                  <meter max="100" min="0" value={unit.percent}>
                    {unit.percent}%
                  </meter>
                  <span>{unit.percent}%</span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="dashboard-panel">
          <header className="dashboard-panel__header">
            <div>
              <p className="eyebrow">Recent Sessions</p>
              <h2>History</h2>
            </div>
            <button className="ghost-button" onClick={() => onNavigate('review')} type="button">
              Review
            </button>
          </header>
          {dashboard.recentSessions.length === 0 ? (
            <p className="dashboard-empty">No saved sessions yet.</p>
          ) : (
            <div className="session-history-list">
              {dashboard.recentSessions.map((session) => (
                <article className="session-history-card" key={session.id}>
                  <div>
                    <strong>{session.percent}%</strong>
                    <span>
                      {session.score}/{session.maxScore} points
                    </span>
                  </div>
                  <div>
                    <p>{formatDate(session.submittedAt)}</p>
                    <small>
                      <Clock3 aria-hidden="true" />
                      {formatDuration(session.durationSeconds)}
                    </small>
                  </div>
                  <span>{session.plannedQuestionCount} questions</span>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
