import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Clock3,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useMemo } from 'react';

import type { PublicAccount } from '../../data/localAccountStore';
import type { Attempt } from '../../domain/attempts/types';
import type { Question } from '../../domain/questions/types';
import { createDashboardAnalytics, summarizeQuestionResult } from '../../domain/sessions';
import type { DashboardTrend, SessionResult } from '../../domain/sessions';

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

function formatTrend(trend: DashboardTrend): string {
  if (trend.trend === 'new') {
    return 'New data';
  }

  if (trend.trend === 'flat') {
    return 'Stable';
  }

  return `${trend.trend === 'up' ? '+' : ''}${trend.trendDelta} pts recent`;
}

function TrendIcon({ trend }: { trend: DashboardTrend }) {
  if (trend.trend === 'up') {
    return <TrendingUp aria-hidden="true" />;
  }

  if (trend.trend === 'down') {
    return <TrendingDown aria-hidden="true" />;
  }

  return <BarChart3 aria-hidden="true" />;
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
    const analytics = createDashboardAnalytics({ attempts, questions, sessions });
    const recommendedNext = analytics.recommendedNext;

    return {
      averageScore: formatPercent(totalSessionScore, totalSessionMaxScore),
      analytics,
      correctMcqAttempts,
      mcqAccuracy:
        mcqAttempts.length > 0 ? formatPercent(correctMcqAttempts, mcqAttempts.length) : '0%',
      pendingFrqCount,
      recentSessions: [...sessions]
        .sort((first, second) => Date.parse(second.submittedAt) - Date.parse(first.submittedAt))
        .slice(0, 4),
      recommendedNext,
      totalMissedCount,
    };
  }, [attempts, questions, sessions]);

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
            <h2>{dashboard.recommendedNext?.skill ?? 'Start a session'}</h2>
            <p>
              {dashboard.recommendedNext
                ? `${dashboard.recommendedNext.reason} Practice ${dashboard.recommendedNext.topic} in ${dashboard.recommendedNext.unit}.`
                : 'Complete a session to unlock unit recommendations.'}
            </p>
          </div>
          {dashboard.recommendedNext ? (
            <div className="unit-list" aria-label="Recommended practice details">
              <div className="unit-row">
                <div>
                  <strong>{dashboard.recommendedNext.percent}%</strong>
                  <span>{dashboard.recommendedNext.missedCount} missed</span>
                </div>
                <meter max="100" min="0" value={dashboard.recommendedNext.percent}>
                  {dashboard.recommendedNext.percent}%
                </meter>
                <span>{dashboard.recommendedNext.availableQuestionIds.length} q</span>
              </div>
            </div>
          ) : null}
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
          {dashboard.analytics.unitTrends.length === 0 ? (
            <p className="dashboard-empty">No unit data yet.</p>
          ) : (
            <div className="unit-list">
              {dashboard.analytics.unitTrends.slice(0, 3).map((unit) => (
                <div className="unit-row" key={unit.label}>
                  <div>
                    <strong>{unit.label}</strong>
                    <span>
                      {unit.missedCount} missed | {formatTrend(unit)}
                    </span>
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
              <p className="eyebrow">Skills & Topics</p>
              <h2>Weakest Trends</h2>
            </div>
          </header>
          {dashboard.analytics.weakTopics.length === 0 ? (
            <p className="dashboard-empty">No topic data yet.</p>
          ) : (
            <div className="unit-list">
              {dashboard.analytics.weakTopics.slice(0, 4).map((topic) => (
                <div className="unit-row" key={`${topic.unit}-${topic.topic}-${topic.skill}`}>
                  <div>
                    <strong>{topic.topic}</strong>
                    <span>{topic.skill}</span>
                  </div>
                  <meter max="100" min="0" value={topic.percent}>
                    {topic.percent}%
                  </meter>
                  <span title={formatTrend(topic)}>
                    <TrendIcon trend={topic} />
                    {topic.percent}%
                  </span>
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
                  <details style={{ gridColumn: '1 / -1' }}>
                    <summary>Question details</summary>
                    <div className="unit-list" aria-label="Session question details">
                      {session.questionResults.map((questionResult) => (
                        <div className="unit-row" key={questionResult.questionId}>
                          <div>
                            <strong>{questionResult.skill}</strong>
                            <span>
                              {questionResult.topic} | {summarizeQuestionResult(questionResult)}
                            </span>
                          </div>
                          <meter max={questionResult.maxScore} min="0" value={questionResult.score}>
                            {questionResult.score}/{questionResult.maxScore}
                          </meter>
                          <span>
                            {questionResult.score}/{questionResult.maxScore}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
