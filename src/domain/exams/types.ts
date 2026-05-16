import type { Question, QuestionType } from '../questions/types';

export type ExamUnitId = 'unit-1' | 'unit-2' | 'unit-3' | 'unit-4';

export type ExamMode = 'unit-practice' | 'ap-prep';

export type ExamTimingMode = 'timed' | 'untimed';

export type ExamQuestionRequirement = {
  type: QuestionType;
  count: number;
  unitIds?: ExamUnitId[];
};

export type ExamTimingMetadata = {
  mode: ExamTimingMode;
  durationSeconds?: number;
};

export type ExamBlueprint = {
  id: string;
  title: string;
  mode: ExamMode;
  unitIds: ExamUnitId[];
  requirements: ExamQuestionRequirement[];
  timing: {
    timed: ExamTimingMetadata;
    untimed: ExamTimingMetadata;
  };
};

export type ExamUnitDefinition = {
  id: ExamUnitId;
  number: 1 | 2 | 3 | 4;
  title: string;
  assessedOnApExam: boolean;
  aliases: string[];
};

export type ExamQuestionAvailability = {
  includeDrafts?: boolean;
  includeArchived?: boolean;
};

export type ExamReadinessRequirement = ExamQuestionRequirement & {
  availableCount: number;
  ready: boolean;
  missingCount: number;
};

export type ExamReadiness = {
  blueprintId: string;
  ready: boolean;
  totalRequiredCount: number;
  totalAvailableCount: number;
  requirements: ExamReadinessRequirement[];
};

export type ExamSelectionOptions = ExamQuestionAvailability & {
  questionOrder?: (questions: Question[]) => Question[];
};

export type ExamQuestionSelection = {
  blueprintId: string;
  ready: boolean;
  questions: Question[];
  readiness: ExamReadiness;
};

export type ExamScoreItem = {
  questionId: string;
  questionType: QuestionType;
  score: number;
  maxScore: number;
  answered?: boolean;
  pendingManualScore?: boolean;
};

export type ExamScoreSummary = {
  score: number;
  maxScore: number;
  percent: number;
  answeredQuestionCount: number;
  totalQuestionCount: number;
  pendingManualScoreCount: number;
  missedQuestionIds: string[];
};
