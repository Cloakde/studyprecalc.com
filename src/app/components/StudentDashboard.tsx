import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Clock3,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { type CSSProperties, useMemo } from 'react';

import type { PublicAccount } from '../../data/localAccountStore';
import type { Attempt } from '../../domain/attempts/types';
import type { Question } from '../../domain/questions/types';
import { createDashboardAnalytics, summarizeQuestionResult } from '../../domain/sessions';
import type { DashboardTrend, SessionResult } from '../../domain/sessions';
import { MathText } from './MathText';

type DashboardMode = 'practice' | 'session' | 'review';

type StudentDashboardProps = {
  account: PublicAccount;
  attempts: Attempt[];
  sessions: SessionResult[];
  questions: Question[];
  onNavigate: (mode: DashboardMode) => void;
};

type UnitVisual = {
  color: string;
  tint: string;
  border: string;
  curve: 'poly' | 'expo' | 'trig' | 'param';
};

const UNIT_VISUALS: UnitVisual[] = [
  { color: '#0f766e', tint: '#ecfdf5', border: '#99f6e4', curve: 'poly' },
  { color: '#f97316', tint: '#fff7ed', border: '#fed7aa', curve: 'expo' },
  { color: '#2563eb', tint: '#eff6ff', border: '#bfdbfe', curve: 'trig' },
  { color: '#7c3aed', tint: '#f5f3ff', border: '#ddd6fe', curve: 'param' },
];

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

function getTrendTone(trend: DashboardTrend): 'good' | 'neutral' | 'needs-work' {
  if (trend.trend === 'up') {
    return 'good';
  }

  if (trend.trend === 'down') {
    return 'needs-work';
  }

  return 'neutral';
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

function getUnitVisual(unit: string | undefined): UnitVisual {
  const match = unit?.match(/\d+/);
  const parsedUnit = match ? Number.parseInt(match[0] ?? '', 10) : Number.NaN;

  if (Number.isFinite(parsedUnit) && parsedUnit > 0) {
    return UNIT_VISUALS[(parsedUnit - 1) % UNIT_VISUALS.length] ?? UNIT_VISUALS[0];
  }

  const hash = [...(unit ?? '')].reduce((total, char) => total + char.charCodeAt(0), 0);
  return UNIT_VISUALS[hash % UNIT_VISUALS.length] ?? UNIT_VISUALS[0];
}

function getUnitStyle(unit: string | undefined): CSSProperties {
  const visual = getUnitVisual(unit);

  return {
    '--unit-color': visual.color,
    '--unit-tint': visual.tint,
    '--unit-border': visual.border,
  } as CSSProperties;
}

function createCurvePath(curve: UnitVisual['curve']): string {
  const points: string[] = [];
  const sampleCount = curve === 'param' ? 96 : 68;

  for (let index = 0; index < sampleCount; index += 1) {
    const t = index / (sampleCount - 1);
    let x = 8 + t * 84;
    let y = 50;

    if (curve === 'poly') {
      const centered = t - 0.48;
      y = 49 - centered * 38 - centered * centered * centered * 84;
    } else if (curve === 'expo') {
      y = 82 - Math.pow(t, 2.45) * 66;
    } else if (curve === 'trig') {
      y = 50 - Math.sin(t * Math.PI * 2.35) * 23;
    } else {
      const angle = t * Math.PI * 2;
      x = 50 + Math.sin(angle) * 33;
      y = 50 + Math.sin(angle * 2) * 24;
    }

    points.push(`${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }

  return points.join(' ');
}

function createSparkPath(values: number[]): string {
  const normalizedValues = values.length < 2 ? [values[0] ?? 0, values[0] ?? 0] : values;
  const min = Math.min(...normalizedValues);
  const max = Math.max(...normalizedValues);
  const spread = Math.max(1, max - min);

  return normalizedValues
    .map((value, index) => {
      const x = 6 + (index / (normalizedValues.length - 1)) * 88;
      const y = 54 - ((value - min) / spread) * 38;

      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function Sparkline({ values, color = 'currentColor' }: { values: number[]; color?: string }) {
  const path = createSparkPath(values);

  return (
    <svg aria-hidden="true" className="dashboard-sparkline" viewBox="0 0 100 60">
      <path d="M 6 56 L 94 56" fill="none" stroke="#dbe4ee" strokeWidth="2" />
      <path d={path} fill="none" stroke={color} strokeLinecap="round" strokeWidth="4" />
    </svg>
  );
}

function UnitCurve({ unit }: { unit: string | undefined }) {
  const visual = getUnitVisual(unit);

  return (
    <svg aria-hidden="true" className="dashboard-unit-curve" viewBox="0 0 100 100">
      <path d="M 8 80 L 92 80" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
      <path d="M 16 92 L 16 10" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
      <path
        d={createCurvePath(visual.curve)}
        fill="none"
        stroke={visual.color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="5"
      />
    </svg>
  );
}

function DashboardGraphBackdrop() {
  return (
    <svg aria-hidden="true" className="dashboard-hero__bg" viewBox="0 0 900 360">
      <defs>
        <pattern height="36" id="dashboard-grid-pattern" patternUnits="userSpaceOnUse" width="36">
          <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#dbe4ee" strokeWidth="1" />
        </pattern>
      </defs>
      <rect fill="url(#dashboard-grid-pattern)" height="360" width="900" />
      <path
        d="M 0 244 C 156 156 255 300 394 208 C 522 123 629 199 900 88"
        fill="none"
        opacity="0.2"
        stroke="#0f766e"
        strokeWidth="6"
      />
      <path
        d="M 0 298 C 142 228 276 253 390 164 C 537 48 673 166 900 124"
        fill="none"
        opacity="0.16"
        stroke="#f97316"
        strokeWidth="5"
      />
    </svg>
  );
}

function getSessionTrendValues(sessions: SessionResult[]): number[] {
  const values = [...sessions]
    .sort((first, second) => Date.parse(first.submittedAt) - Date.parse(second.submittedAt))
    .slice(-8)
    .map((session) => session.percent);

  return values.length > 0 ? values : [0, 0];
}

function getMissedTrendValues(sessions: SessionResult[]): number[] {
  const values = [...sessions]
    .sort((first, second) => Date.parse(first.submittedAt) - Date.parse(second.submittedAt))
    .slice(-8)
    .map((session) => session.missedQuestionIds.length);

  return values.length > 0 ? values : [0, 0];
}

function createQuestionUnitTrends(questions: Question[]): DashboardTrend[] {
  const unitCounts = questions.reduce<Map<string, number>>((counts, question) => {
    counts.set(question.unit, (counts.get(question.unit) ?? 0) + 1);
    return counts;
  }, new Map());

  return [...unitCounts.entries()].map(([unit, questionCount]) => ({
    label: unit,
    unit,
    questionCount,
    score: 0,
    maxScore: 0,
    percent: 0,
    missedCount: 0,
    pendingManualScoreCount: 0,
    trend: 'new',
    trendDelta: 0,
  }));
}

function getSessionTone(percent: number): 'good' | 'mid' | 'low' {
  if (percent >= 80) {
    return 'good';
  }

  if (percent >= 60) {
    return 'mid';
  }

  return 'low';
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
    const recommendedQuestion = recommendedNext
      ? questions.find((question) => recommendedNext.availableQuestionIds.includes(question.id))
      : undefined;
    const unitHighlights =
      analytics.unitTrends.length > 0 ? analytics.unitTrends : createQuestionUnitTrends(questions);

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
      recommendedQuestion,
      sessionTrendValues: getSessionTrendValues(sessions),
      missedTrendValues: getMissedTrendValues(sessions),
      totalMissedCount,
      unitHighlights,
    };
  }, [attempts, questions, sessions]);

  return (
    <main className="dashboard-shell dashboard-shell--visual">
      <section className="dashboard-hero" aria-labelledby="dashboard-title">
        <DashboardGraphBackdrop />
        <div className="dashboard-hero__content">
          <div className="dashboard-hero__intro">
            <p className="eyebrow">Student Dashboard</p>
            <h1 id="dashboard-title">Welcome back, {account.displayName}</h1>
            <p>
              Track practice like a set of functions: current score, weak intervals, and the next
              useful session are all kept in view.
            </p>
            <div className="summary-strip dashboard-summary-strip" aria-label="Dashboard summary">
              <span>{questions.length} questions</span>
              <span>{sessions.length} sessions</span>
              <span>{attempts.length} attempts</span>
            </div>
          </div>

          <article
            className="dashboard-mission"
            style={getUnitStyle(dashboard.recommendedNext?.unit)}
          >
            <div>
              <p className="eyebrow">Recommended Next</p>
              <h2>{dashboard.recommendedNext?.skill ?? 'Start a session'}</h2>
              <p>
                {dashboard.recommendedNext
                  ? `${dashboard.recommendedNext.reason} Practice ${dashboard.recommendedNext.topic} in ${dashboard.recommendedNext.unit}.`
                  : 'Complete a session to unlock personalized unit recommendations.'}
              </p>
            </div>
            {dashboard.recommendedQuestion ? (
              <div className="dashboard-mission__preview" aria-label="Recommended question preview">
                <span>{dashboard.recommendedQuestion.type.toUpperCase()}</span>
                <MathText text={dashboard.recommendedQuestion.prompt} />
              </div>
            ) : (
              <div className="dashboard-mission__preview" aria-label="Question bank status">
                <span>Queue</span>
                <p>Add published questions to activate personalized missions.</p>
              </div>
            )}
            <button className="primary-button" onClick={() => onNavigate('session')} type="button">
              Start Session
              <ArrowRight aria-hidden="true" />
            </button>
          </article>
        </div>
      </section>

      <section className="dashboard-stats dashboard-stats--visual" aria-label="Progress summary">
        <article className="dashboard-stat-card" data-tone="teal">
          <span className="dashboard-stat-card__icon">
            <BarChart3 aria-hidden="true" />
          </span>
          <div>
            <strong>{dashboard.averageScore}</strong>
            <span>Session Average</span>
          </div>
          <Sparkline color="#0f766e" values={dashboard.sessionTrendValues} />
        </article>
        <article className="dashboard-stat-card" data-tone="orange">
          <span className="dashboard-stat-card__icon">
            <Target aria-hidden="true" />
          </span>
          <div>
            <strong>{dashboard.mcqAccuracy}</strong>
            <span>MCQ Accuracy</span>
          </div>
          <Sparkline color="#f97316" values={[0, dashboard.correctMcqAttempts, attempts.length]} />
        </article>
        <article className="dashboard-stat-card" data-tone="blue">
          <span className="dashboard-stat-card__icon">
            <AlertCircle aria-hidden="true" />
          </span>
          <div>
            <strong>{dashboard.totalMissedCount}</strong>
            <span>Missed Questions</span>
          </div>
          <Sparkline color="#2563eb" values={dashboard.missedTrendValues} />
        </article>
        <article className="dashboard-stat-card" data-tone="violet">
          <span className="dashboard-stat-card__icon">
            <BookOpenCheck aria-hidden="true" />
          </span>
          <div>
            <strong>{dashboard.pendingFrqCount}</strong>
            <span>FRQs To Self-Score</span>
          </div>
          <Sparkline
            color="#7c3aed"
            values={[0, dashboard.pendingFrqCount, dashboard.pendingFrqCount]}
          />
        </article>
      </section>

      <section className="dashboard-unit-grid" aria-label="Unit progress">
        {dashboard.unitHighlights.length === 0 ? (
          <article className="dashboard-panel dashboard-panel--empty-wide">
            <p className="eyebrow">Unit Map</p>
            <h2>No unit data yet</h2>
            <p className="dashboard-empty">
              Add or publish questions, then complete practice to fill in the dashboard.
            </p>
          </article>
        ) : (
          dashboard.unitHighlights.slice(0, 4).map((unit) => (
            <article
              className="dashboard-unit-card"
              key={unit.label}
              style={getUnitStyle(unit.unit)}
            >
              <div>
                <p className="eyebrow">{unit.unit ?? unit.label}</p>
                <h2>{unit.label}</h2>
              </div>
              <UnitCurve unit={unit.unit} />
              <div className="dashboard-unit-card__meta">
                <strong>
                  {unit.maxScore > 0 ? `${unit.percent}%` : `${unit.questionCount} q`}
                </strong>
                <span data-tone={getTrendTone(unit)}>
                  <TrendIcon trend={unit} />
                  {formatTrend(unit)}
                </span>
              </div>
              <div className="dashboard-progress-bar" aria-label={`${unit.label} progress`}>
                <span style={{ width: `${unit.maxScore > 0 ? unit.percent : 0}%` }} />
              </div>
            </article>
          ))
        )}
      </section>

      <section className="dashboard-grid dashboard-grid--visual">
        <article className="dashboard-panel dashboard-panel--focus">
          <header className="dashboard-panel__header">
            <div>
              <p className="eyebrow">Skills & Topics</p>
              <h2>Weakest Trends</h2>
            </div>
            <button className="ghost-button" onClick={() => onNavigate('practice')} type="button">
              Practice
            </button>
          </header>
          {dashboard.analytics.weakTopics.length === 0 ? (
            <p className="dashboard-empty">No topic data yet.</p>
          ) : (
            <div className="dashboard-topic-list">
              {dashboard.analytics.weakTopics.slice(0, 5).map((topic) => (
                <div
                  className="dashboard-topic-row"
                  key={`${topic.unit}-${topic.topic}-${topic.skill}`}
                  style={getUnitStyle(topic.unit)}
                >
                  <Activity aria-hidden="true" />
                  <div>
                    <strong>{topic.topic}</strong>
                    <span>{topic.skill}</span>
                  </div>
                  <div className="dashboard-progress-bar" aria-label={`${topic.topic} score`}>
                    <span style={{ width: `${topic.percent}%` }} />
                  </div>
                  <span title={formatTrend(topic)}>
                    {topic.percent}% <TrendIcon trend={topic} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="dashboard-panel dashboard-panel--sessions">
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
                <article
                  className="dashboard-session-row"
                  data-tone={getSessionTone(session.percent)}
                  key={session.id}
                >
                  <div className="dashboard-session-row__score">
                    <strong>{session.percent}%</strong>
                    <span>
                      {session.score}/{session.maxScore}
                    </span>
                  </div>
                  <div className="dashboard-session-row__meta">
                    <p>{formatDate(session.submittedAt)}</p>
                    <small>
                      <Clock3 aria-hidden="true" />
                      {formatDuration(session.durationSeconds)}
                    </small>
                  </div>
                  <div className="dashboard-session-dots" aria-label="Session question outcomes">
                    {session.questionResults.slice(0, 12).map((questionResult) => (
                      <span
                        data-state={summarizeQuestionResult(questionResult).toLowerCase()}
                        key={questionResult.questionId}
                        title={`${questionResult.skill}: ${summarizeQuestionResult(questionResult)}`}
                      />
                    ))}
                  </div>
                  <details>
                    <summary>{session.plannedQuestionCount} question details</summary>
                    <div className="unit-list" aria-label="Session question details">
                      {session.questionResults.map((questionResult) => (
                        <div className="unit-row" key={questionResult.questionId}>
                          <div>
                            <strong>{questionResult.skill}</strong>
                            <span>
                              {questionResult.topic} | {summarizeQuestionResult(questionResult)}
                            </span>
                          </div>
                          <div
                            className="dashboard-progress-bar"
                            aria-label={`${questionResult.skill} score`}
                          >
                            <span
                              style={{
                                width: `${
                                  questionResult.maxScore > 0
                                    ? Math.round(
                                        (questionResult.score / questionResult.maxScore) * 100,
                                      )
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
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
