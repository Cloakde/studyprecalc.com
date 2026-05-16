import { BookOpenCheck, CheckCircle2, Clock3, FileText, Play, XCircle } from 'lucide-react';
import { useMemo, useState, type ComponentProps } from 'react';

import {
  apPrepExamBlueprint,
  getExamReadiness,
  selectExamQuestions,
  unitPracticeExamBlueprints,
  type ExamBlueprint,
  type ExamQuestionRequirement,
  type ExamReadiness,
  type ExamTimingMode,
} from '../../domain/exams';
import type { Question } from '../../domain/questions/types';
import { SessionPractice } from './SessionPractice';

type ExamPracticeProps = {
  questions: Question[];
  questionSetVersion: string;
} & Pick<
  ComponentProps<typeof SessionPractice>,
  'onSaveMcqAttempt' | 'onSaveFrqAttempt' | 'onSaveSessionResult'
>;

type ActiveExam = {
  blueprint: ExamBlueprint;
  timingMode: ExamTimingMode;
  questions: Question[];
};

type ExamCardViewModel = {
  blueprint: ExamBlueprint;
  readiness: ExamReadiness;
};

function formatExamDuration(seconds: number | undefined): string {
  if (!seconds) {
    return 'Untimed';
  }

  const minutes = Math.round(seconds / 60);

  if (minutes >= 60 && minutes % 60 === 0) {
    return `${minutes / 60} hr`;
  }

  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hr ${remainingMinutes} min`;
  }

  return `${minutes} min`;
}

function getTimeLimitMinutes(blueprint: ExamBlueprint, timingMode: ExamTimingMode): number {
  return Math.round((blueprint.timing[timingMode].durationSeconds ?? 0) / 60);
}

function formatRequirement(requirement: ExamQuestionRequirement): string {
  return `${requirement.count} ${requirement.type.toUpperCase()}`;
}

function getReadinessLabel(readiness: ExamReadiness): string {
  if (readiness.ready) {
    return 'Ready';
  }

  const missingCount = readiness.requirements.reduce(
    (total, requirement) => total + requirement.missingCount,
    0,
  );

  return `${missingCount} question${missingCount === 1 ? '' : 's'} short`;
}

function orderExamQuestions(candidates: Question[]): Question[] {
  return [...candidates].sort(
    (first, second) =>
      first.unit.localeCompare(second.unit) ||
      first.type.localeCompare(second.type) ||
      first.id.localeCompare(second.id),
  );
}

function ExamCard({
  model,
  onStart,
}: {
  model: ExamCardViewModel;
  onStart: (blueprint: ExamBlueprint, timingMode: ExamTimingMode) => void;
}) {
  const { blueprint, readiness } = model;
  const statusId = `exam-status-${blueprint.id}`;
  const unitsLabel = blueprint.unitIds.map((unitId) => unitId.replace('unit-', 'Unit ')).join(', ');

  return (
    <article className="exam-card" data-ready={readiness.ready}>
      <header className="exam-card__header">
        <span className="exam-card__icon">
          {blueprint.mode === 'ap-prep' ? (
            <BookOpenCheck aria-hidden="true" />
          ) : (
            <FileText aria-hidden="true" />
          )}
        </span>
        <div>
          <p className="eyebrow">{blueprint.mode === 'ap-prep' ? 'AP Prep' : unitsLabel}</p>
          <h2>{blueprint.title}</h2>
        </div>
      </header>

      <div className="summary-strip exam-card__meta" aria-label={`${blueprint.title} structure`}>
        <span>{blueprint.requirements.map(formatRequirement).join(' + ')}</span>
        <span>{formatExamDuration(blueprint.timing.timed.durationSeconds)} timed</span>
        <span>{unitsLabel}</span>
      </div>

      <div className="exam-readiness" id={statusId} role="status">
        {readiness.ready ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
        <div>
          <strong>{getReadinessLabel(readiness)}</strong>
          <span>
            {readiness.totalAvailableCount}/{readiness.totalRequiredCount} required questions
            available.
          </span>
        </div>
      </div>

      <dl className="exam-requirements">
        {readiness.requirements.map((requirement) => (
          <div key={`${blueprint.id}-${requirement.type}`}>
            <dt>{requirement.type.toUpperCase()}</dt>
            <dd>
              {requirement.availableCount}/{requirement.count}
            </dd>
          </div>
        ))}
      </dl>

      <div className="manager-actions">
        <button
          aria-describedby={statusId}
          className="ghost-button"
          disabled={!readiness.ready}
          onClick={() => onStart(blueprint, 'untimed')}
          type="button"
        >
          <Play aria-hidden="true" />
          Practice Untimed
        </button>
        <button
          aria-describedby={statusId}
          className="primary-button"
          disabled={!readiness.ready}
          onClick={() => onStart(blueprint, 'timed')}
          type="button"
        >
          <Clock3 aria-hidden="true" />
          Start Timed
        </button>
      </div>
    </article>
  );
}

export function ExamPractice({
  questions,
  questionSetVersion,
  onSaveMcqAttempt,
  onSaveFrqAttempt,
  onSaveSessionResult,
}: ExamPracticeProps) {
  const [activeExam, setActiveExam] = useState<ActiveExam | null>(null);
  const unitExamModels = useMemo(
    () =>
      unitPracticeExamBlueprints.map((blueprint) => ({
        blueprint,
        readiness: getExamReadiness(blueprint, questions),
      })),
    [questions],
  );
  const apPrepModel = useMemo(
    () => ({
      blueprint: apPrepExamBlueprint,
      readiness: getExamReadiness(apPrepExamBlueprint, questions),
    }),
    [questions],
  );

  function startExam(blueprint: ExamBlueprint, timingMode: ExamTimingMode) {
    const selection = selectExamQuestions(blueprint, questions, {
      questionOrder: orderExamQuestions,
    });

    if (!selection.ready) {
      return;
    }

    setActiveExam({
      blueprint,
      timingMode,
      questions: selection.questions,
    });
  }

  if (activeExam) {
    const timeLimitMinutes = getTimeLimitMinutes(activeExam.blueprint, activeExam.timingMode);
    const timingLabel =
      activeExam.timingMode === 'timed'
        ? `${formatExamDuration(activeExam.blueprint.timing.timed.durationSeconds)} timed`
        : 'Untimed';

    return (
      <div className="exam-run-shell">
        <div className="exam-return-bar">
          <button className="ghost-button" onClick={() => setActiveExam(null)} type="button">
            Back to Exams
          </button>
          <span>
            {activeExam.blueprint.title} | {timingLabel}
          </span>
        </div>
        <SessionPractice
          key={`${activeExam.blueprint.id}-${activeExam.timingMode}`}
          onSaveFrqAttempt={onSaveFrqAttempt}
          onSaveMcqAttempt={onSaveMcqAttempt}
          onSaveSessionResult={onSaveSessionResult}
          questions={activeExam.questions}
          questionSetVersion={`${questionSetVersion}:${activeExam.blueprint.id}`}
          setupPreset={{
            eyebrow: activeExam.blueprint.mode === 'ap-prep' ? 'AP Prep Exam' : 'Practice Exam',
            title: activeExam.blueprint.title,
            introTitle: `${timingLabel} Exam`,
            description:
              activeExam.blueprint.mode === 'ap-prep'
                ? 'AP prep exams only include Units 1-3.'
                : 'This practice exam uses the published questions assigned to this unit.',
            lockQuestionSet: true,
            defaultRequestedCount: activeExam.questions.length,
            defaultTimeLimitMinutes: timeLimitMinutes,
          }}
        />
      </div>
    );
  }

  return (
    <main className="exam-shell">
      <header className="session-header exam-header">
        <div>
          <p className="eyebrow">Practice Exams</p>
          <h1>Exam Mode</h1>
          <p>Start full-unit practice exams or AP prep exams. AP prep is limited to Units 1-3.</p>
        </div>
        <div className="summary-strip" aria-label="Exam readiness summary">
          <span>{questions.length} published questions</span>
          <span>
            {unitExamModels.filter((model) => model.readiness.ready).length}/4 unit exams ready
          </span>
          <span>{apPrepModel.readiness.ready ? 'AP prep ready' : 'AP prep needs questions'}</span>
        </div>
      </header>

      <section className="exam-section" aria-labelledby="unit-practice-exams">
        <div className="exam-section__heading">
          <div>
            <p className="eyebrow">Units</p>
            <h2 id="unit-practice-exams">Unit Practice Exams</h2>
          </div>
          <span>Each unit exam uses 12 MCQ and 2 FRQ.</span>
        </div>
        <div className="exam-grid">
          {unitExamModels.map((model) => (
            <ExamCard key={model.blueprint.id} model={model} onStart={startExam} />
          ))}
        </div>
      </section>

      <section className="exam-section" aria-labelledby="ap-prep-exams">
        <div className="exam-section__heading">
          <div>
            <p className="eyebrow">AP Exam Prep</p>
            <h2 id="ap-prep-exams">Units 1-3 Prep</h2>
          </div>
          <span>AP Precalculus exam prep excludes Unit 4.</span>
        </div>
        <div className="exam-grid exam-grid--single">
          <ExamCard model={apPrepModel} onStart={startExam} />
        </div>
      </section>
    </main>
  );
}
