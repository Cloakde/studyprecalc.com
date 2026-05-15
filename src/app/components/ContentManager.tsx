import {
  Archive,
  CheckCircle2,
  CircleAlert,
  Cloud,
  Copy,
  Download,
  Eye,
  FileUp,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Save,
  Send,
  Trash2,
  Video,
  XCircle,
} from 'lucide-react';
import { type ChangeEvent, type RefObject, useEffect, useMemo, useRef, useState } from 'react';

import {
  createLocalImageReference,
  isLocalImageReference,
  saveLocalImageFile,
} from '../../data/localImageStore';
import {
  createLocalVideoReference,
  isLocalVideoReference,
  saveLocalVideoFile,
} from '../../data/localVideoStore';
import { QuestionSchema, QuestionSetSchema } from '../../data/schemas/questionSchema';
import {
  buildContentReadinessDashboard,
  buildContentReadinessReport,
  contentReadinessIssueCategories,
  contentReadinessIssueCategoryLabels,
} from '../../domain/questions/contentReadiness';
import type {
  ContentReadinessCategoryFilter,
  ContentReadinessDashboardGroupBy,
  ContentReadinessSeverityFilter,
  ContentReadinessStatusFilter,
} from '../../domain/questions/contentReadiness';
import type { QuestionPublicationStatus } from '../../domain/questions/publication';
import type {
  CalculatorPolicy,
  Difficulty,
  FrqQuestion,
  McqChoice,
  McqQuestion,
  Question,
  QuestionAsset,
  QuestionSection,
  VideoExplanation as VideoExplanationData,
} from '../../domain/questions/types';
import {
  clearContentManagerDraftAutosave,
  createContentManagerDraftFingerprint,
  getContentManagerDraftAutosaveStorage,
  hasContentManagerDraftUnsavedChanges,
  loadContentManagerDraftAutosave,
  saveContentManagerDraftAutosave,
} from '../contentManagerDraftAutosave';
import { MathText } from './MathText';
import { QuestionAssetGallery } from './QuestionAssetGallery';
import { VideoExplanation } from './VideoExplanation';

type ContentManagerProps = {
  customQuestions: Question[];
  seedQuestionIds: Set<string>;
  onSaveQuestion: (question: Question, status?: QuestionPublicationStatus) => void;
  onDeleteQuestion: (questionId: string) => void;
  onImportQuestions: (questions: Question[]) => { imported: number; skipped: number };
  onSetQuestionStatus: (questionId: string, status: QuestionPublicationStatus) => void;
  getQuestionStatus: (questionId: string) => QuestionPublicationStatus;
  contentSourceLabel?: string;
  contentError?: string;
  isContentLoading?: boolean;
  onRefreshContent?: () => void;
  onUploadImageFile?: (
    file: File,
    context: ContentManagerImageUploadContext,
  ) => Promise<ContentManagerImageUploadResult>;
};

export type ContentManagerImageUploadPlacement = 'question' | 'explanation';

export type ContentManagerImageUploadContext = {
  placement: ContentManagerImageUploadPlacement;
  assetId: string;
  questionId: string;
  questionTitle?: string;
  questionUnit?: string;
  questionTopic?: string;
};

export type ContentManagerImageUploadResult = {
  path: string;
  alt?: string;
  caption?: string;
  fileName?: string;
};

type ChoiceDraft = {
  id: McqChoice['id'];
  text: string;
  explanation: string;
};

type RubricDraft = {
  id: string;
  description: string;
  points: string;
};

type FrqPartDraft = {
  id: string;
  prompt: string;
  sampleResponse: string;
  expectedWork: string;
  rubric: RubricDraft[];
};

type AssetDraft = {
  id: string;
  type: QuestionAsset['type'];
  path: string;
  alt: string;
  caption: string;
};

type DraftWorkflowState = QuestionPublicationStatus;

type PreviewMode = 'student' | 'answer';

type LibraryTypeFilter = 'all' | QuestionDraft['type'];

type LibraryStatusFilter = 'all' | DraftWorkflowState;

type LibrarySortMode = 'skill' | 'unit' | 'status' | 'type';

type ReadinessStatusFilter = ContentReadinessStatusFilter;

type ReadinessGroupMode = ContentReadinessDashboardGroupBy;

type ReadinessCheck = {
  id: string;
  label: string;
  complete: boolean;
};

export type ContentManagerDestructiveActionTarget = {
  id: string;
  label: string;
  workflowState: QuestionPublicationStatus;
};

type QuestionDraft = {
  id: string;
  workflowState: DraftWorkflowState;
  type: 'mcq' | 'frq';
  unit: string;
  topic: string;
  skill: string;
  difficulty: Difficulty;
  calculator: CalculatorPolicy;
  section: QuestionSection;
  tags: string;
  prompt: string;
  questionAssets: AssetDraft[];
  explanationSummary: string;
  explanationSteps: string;
  commonMistakes: string;
  solutionAssets: AssetDraft[];
  videoUrl: string;
  videoThumbnailPath: string;
  videoTranscriptPath: string;
  videoDurationSeconds: string;
  choices: ChoiceDraft[];
  correctChoiceId: McqChoice['id'];
  frqParts: FrqPartDraft[];
};

const defaultChoices: ChoiceDraft[] = [
  { id: 'A', text: '', explanation: '' },
  { id: 'B', text: '', explanation: '' },
  { id: 'C', text: '', explanation: '' },
  { id: 'D', text: '', explanation: '' },
];

const defaultFrqPart: FrqPartDraft = {
  id: 'a',
  prompt: '',
  sampleResponse: '',
  expectedWork: '',
  rubric: [
    {
      id: 'criterion-1',
      description: '',
      points: '1',
    },
  ],
};

const maxLocalVideoFileSizeBytes = 250 * 1024 * 1024;
const maxLocalImageFileSizeBytes = 20 * 1024 * 1024;
const maxCloudImageFileSizeBytes = 1 * 1024 * 1024;
const supportedCloudImageExtensions = /\.(gif|jpeg|jpg|png|webp)$/i;
const supportedCloudImageMimeTypes = new Set([
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function createAssetId(prefix = 'asset'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createBlankDraft(): QuestionDraft {
  return {
    id: `user-${Date.now()}`,
    workflowState: 'draft',
    type: 'mcq',
    unit: '',
    topic: '',
    skill: '',
    difficulty: 'intro',
    calculator: 'none',
    section: 'practice',
    tags: '',
    prompt: '',
    questionAssets: [],
    explanationSummary: '',
    explanationSteps: '',
    commonMistakes: '',
    solutionAssets: [],
    videoUrl: '',
    videoThumbnailPath: '',
    videoTranscriptPath: '',
    videoDurationSeconds: '',
    choices: defaultChoices.map((choice) => ({ ...choice })),
    correctChoiceId: 'A',
    frqParts: [
      { ...defaultFrqPart, rubric: defaultFrqPart.rubric.map((criterion) => ({ ...criterion })) },
    ],
  };
}

function isQuestionDraftRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDraftWorkflowState(value: unknown): value is DraftWorkflowState {
  return value === 'draft' || value === 'published' || value === 'archived';
}

function isQuestionDraftType(value: unknown): value is QuestionDraft['type'] {
  return value === 'mcq' || value === 'frq';
}

function isDraftDifficulty(value: unknown): value is Difficulty {
  return value === 'intro' || value === 'medium' || value === 'advanced';
}

function isDraftCalculatorPolicy(value: unknown): value is CalculatorPolicy {
  return value === 'none' || value === 'graphing';
}

function isDraftQuestionSection(value: unknown): value is QuestionSection {
  return (
    value === 'practice' ||
    value === 'mcq-a' ||
    value === 'mcq-b' ||
    value === 'frq-a' ||
    value === 'frq-b'
  );
}

function isDraftChoiceId(value: unknown): value is McqChoice['id'] {
  return value === 'A' || value === 'B' || value === 'C' || value === 'D';
}

function isChoiceDraft(value: unknown): value is ChoiceDraft {
  if (!isQuestionDraftRecord(value)) {
    return false;
  }

  return (
    isDraftChoiceId(value.id) &&
    typeof value.text === 'string' &&
    typeof value.explanation === 'string'
  );
}

function isRubricDraft(value: unknown): value is RubricDraft {
  if (!isQuestionDraftRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.description === 'string' &&
    typeof value.points === 'string'
  );
}

function isFrqPartDraft(value: unknown): value is FrqPartDraft {
  if (!isQuestionDraftRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.prompt === 'string' &&
    typeof value.sampleResponse === 'string' &&
    typeof value.expectedWork === 'string' &&
    Array.isArray(value.rubric) &&
    value.rubric.every(isRubricDraft)
  );
}

function isAssetDraft(value: unknown): value is AssetDraft {
  if (!isQuestionDraftRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    (value.type === 'image' || value.type === 'graph' || value.type === 'table') &&
    typeof value.path === 'string' &&
    typeof value.alt === 'string' &&
    typeof value.caption === 'string'
  );
}

function isQuestionDraft(value: unknown): value is QuestionDraft {
  if (!isQuestionDraftRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    isDraftWorkflowState(value.workflowState) &&
    isQuestionDraftType(value.type) &&
    typeof value.unit === 'string' &&
    typeof value.topic === 'string' &&
    typeof value.skill === 'string' &&
    isDraftDifficulty(value.difficulty) &&
    isDraftCalculatorPolicy(value.calculator) &&
    isDraftQuestionSection(value.section) &&
    typeof value.tags === 'string' &&
    typeof value.prompt === 'string' &&
    Array.isArray(value.questionAssets) &&
    value.questionAssets.every(isAssetDraft) &&
    typeof value.explanationSummary === 'string' &&
    typeof value.explanationSteps === 'string' &&
    typeof value.commonMistakes === 'string' &&
    Array.isArray(value.solutionAssets) &&
    value.solutionAssets.every(isAssetDraft) &&
    typeof value.videoUrl === 'string' &&
    typeof value.videoThumbnailPath === 'string' &&
    typeof value.videoTranscriptPath === 'string' &&
    typeof value.videoDurationSeconds === 'string' &&
    Array.isArray(value.choices) &&
    value.choices.every(isChoiceDraft) &&
    isDraftChoiceId(value.correctChoiceId) &&
    Array.isArray(value.frqParts) &&
    value.frqParts.every(isFrqPartDraft)
  );
}

function hasMeaningfulDraftId(draft: QuestionDraft): boolean {
  return hasText(draft.id) && !/^user-\d+$/.test(draft.id.trim());
}

function isMeaningfulQuestionDraft(draft: QuestionDraft): boolean {
  const textFields = [
    draft.unit,
    draft.topic,
    draft.skill,
    draft.tags,
    draft.prompt,
    draft.explanationSummary,
    draft.explanationSteps,
    draft.commonMistakes,
    draft.videoUrl,
    draft.videoThumbnailPath,
    draft.videoTranscriptPath,
    draft.videoDurationSeconds,
  ];

  return (
    hasMeaningfulDraftId(draft) ||
    textFields.some(hasText) ||
    draft.questionAssets.some((asset) =>
      [asset.path, asset.alt, asset.caption].some((value) => value.trim().length > 0),
    ) ||
    draft.solutionAssets.some((asset) =>
      [asset.path, asset.alt, asset.caption].some((value) => value.trim().length > 0),
    ) ||
    draft.choices.some((choice) => hasText(choice.text) || hasText(choice.explanation)) ||
    draft.frqParts.some(
      (part) =>
        hasText(part.prompt) ||
        hasText(part.sampleResponse) ||
        hasText(part.expectedWork) ||
        part.rubric.some(
          (criterion) => hasText(criterion.description) || criterion.points.trim() !== '1',
        ),
    )
  );
}

function getQuestionDraftFingerprintInput(
  draft: QuestionDraft,
  selectedQuestionId: string | null,
): {
  draft: Omit<QuestionDraft, 'workflowState'>;
  selectedQuestionId: string | null;
} {
  const { workflowState, ...draftContent } = draft;

  void workflowState;

  return {
    draft: draftContent,
    selectedQuestionId,
  };
}

function createQuestionDraftChangeFingerprint(
  draft: QuestionDraft,
  selectedQuestionId: string | null,
): string {
  return createContentManagerDraftFingerprint(
    getQuestionDraftFingerprintInput(draft, selectedQuestionId),
  );
}

function hasQuestionDraftUnsavedChanges(
  draft: QuestionDraft,
  selectedQuestionId: string | null,
  lastSavedFingerprint: string,
): boolean {
  return (
    isMeaningfulQuestionDraft(draft) &&
    hasContentManagerDraftUnsavedChanges(
      getQuestionDraftFingerprintInput(draft, selectedQuestionId),
      lastSavedFingerprint,
    )
  );
}

function linesToList(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function listToLines(value: string[] | undefined): string {
  return value?.join('\n') ?? '';
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function tagsToList(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseDurationSeconds(value: string): number | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const seconds = Number(trimmed);

  if (!Number.isInteger(seconds) || seconds <= 0) {
    return undefined;
  }

  return seconds;
}

function isSupportedVideoFile(file: File): boolean {
  return file.type.startsWith('video/') || /\.(m4v|mov|mp4|ogg|ogv|webm)$/i.test(file.name);
}

function isSupportedImageFile(file: File): boolean {
  if (file.type) {
    return supportedCloudImageMimeTypes.has(file.type);
  }

  return supportedCloudImageExtensions.test(file.name);
}

function isSupportedCloudImageFile(file: File): boolean {
  if (file.type) {
    return supportedCloudImageMimeTypes.has(file.type);
  }

  return supportedCloudImageExtensions.test(file.name);
}

function filenameToAltText(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
}

function assetToDraft(asset: QuestionAsset): AssetDraft {
  return {
    id: asset.id,
    type: asset.type,
    path: asset.path,
    alt: asset.alt,
    caption: asset.caption ?? '',
  };
}

function draftAssetsToAssets(drafts: AssetDraft[]): QuestionAsset[] | undefined {
  const assets = drafts
    .map((asset) => ({
      id: asset.id.trim(),
      type: asset.type,
      path: asset.path.trim(),
      alt: asset.alt.trim(),
      caption: asset.caption.trim() || undefined,
    }))
    .filter((asset) => asset.id && asset.path && asset.alt);

  return assets.length > 0 ? assets : undefined;
}

function questionHasLocalMedia(question: Question): boolean {
  const questionAssetHasLocalMedia =
    question.assets?.some((asset) => isLocalImageReference(asset.path)) ?? false;
  const solutionAssetHasLocalMedia =
    question.explanation.assets?.some((asset) => isLocalImageReference(asset.path)) ?? false;
  const videoHasLocalMedia = isLocalVideoReference(question.explanation.video?.url);

  return questionAssetHasLocalMedia || solutionAssetHasLocalMedia || videoHasLocalMedia;
}

function draftHasLocalMedia(draft: QuestionDraft): boolean {
  return (
    draft.questionAssets.some((asset) => isLocalImageReference(asset.path)) ||
    draft.solutionAssets.some((asset) => isLocalImageReference(asset.path)) ||
    isLocalVideoReference(draft.videoUrl)
  );
}

function questionToDraft(
  question: Question,
  workflowState: DraftWorkflowState = 'published',
): QuestionDraft {
  const video = question.explanation.video;

  return {
    id: question.id,
    workflowState,
    type: question.type,
    unit: question.unit,
    topic: question.topic,
    skill: question.skill,
    difficulty: question.difficulty,
    calculator: question.calculator,
    section: question.section,
    tags: question.tags.join(', '),
    prompt: question.prompt,
    questionAssets: question.assets?.map(assetToDraft) ?? [],
    explanationSummary: question.explanation.summary,
    explanationSteps: listToLines(question.explanation.steps),
    commonMistakes: listToLines(question.explanation.commonMistakes),
    solutionAssets: question.explanation.assets?.map(assetToDraft) ?? [],
    videoUrl: video?.url ?? '',
    videoThumbnailPath: video?.thumbnailPath ?? '',
    videoTranscriptPath: video?.transcriptPath ?? '',
    videoDurationSeconds: video?.durationSeconds ? String(video.durationSeconds) : '',
    choices:
      question.type === 'mcq'
        ? question.choices.map((choice) => ({ ...choice }))
        : defaultChoices.map((choice) => ({ ...choice })),
    correctChoiceId: question.type === 'mcq' ? question.correctChoiceId : 'A',
    frqParts:
      question.type === 'frq'
        ? question.parts.map((part) => ({
            id: part.id,
            prompt: part.prompt,
            sampleResponse: part.sampleResponse,
            expectedWork: listToLines(part.expectedWork),
            rubric: part.rubric.map((criterion) => ({
              id: criterion.id,
              description: criterion.description,
              points: String(criterion.points),
            })),
          }))
        : [
            {
              ...defaultFrqPart,
              rubric: defaultFrqPart.rubric.map((criterion) => ({ ...criterion })),
            },
          ],
  };
}

function draftToQuestion(draft: QuestionDraft): Question {
  const explanation = {
    summary: draft.explanationSummary.trim(),
    steps: linesToList(draft.explanationSteps),
    commonMistakes: linesToList(draft.commonMistakes),
    assets: draftAssetsToAssets(draft.solutionAssets),
    video: draft.videoUrl.trim()
      ? {
          url: draft.videoUrl.trim(),
          thumbnailPath: draft.videoThumbnailPath.trim() || undefined,
          transcriptPath: draft.videoTranscriptPath.trim() || undefined,
          durationSeconds: parseDurationSeconds(draft.videoDurationSeconds),
        }
      : undefined,
  };

  const baseQuestion = {
    id: draft.id.trim(),
    unit: draft.unit.trim(),
    topic: draft.topic.trim(),
    skill: draft.skill.trim(),
    difficulty: draft.difficulty,
    calculator: draft.calculator,
    section: draft.section,
    tags: tagsToList(draft.tags),
    prompt: draft.prompt.trim(),
    assets: draftAssetsToAssets(draft.questionAssets),
    explanation,
  };

  if (draft.type === 'mcq') {
    return {
      ...baseQuestion,
      type: 'mcq',
      choices: draft.choices.map((choice) => ({
        id: choice.id,
        text: choice.text.trim(),
        explanation: choice.explanation.trim(),
      })),
      correctChoiceId: draft.correctChoiceId,
    } satisfies McqQuestion;
  }

  return {
    ...baseQuestion,
    type: 'frq',
    parts: draft.frqParts.map((part) => ({
      id: part.id.trim(),
      prompt: part.prompt.trim(),
      sampleResponse: part.sampleResponse.trim(),
      expectedWork: linesToList(part.expectedWork),
      rubric: part.rubric.map((criterion) => ({
        id: criterion.id.trim(),
        description: criterion.description.trim(),
        points: Number(criterion.points),
      })),
    })),
  } satisfies FrqQuestion;
}

function formatValidationError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Question could not be saved.';
}

function getWorkflowStateLabel(workflowState: DraftWorkflowState): string {
  if (workflowState === 'published') {
    return 'Published';
  }

  if (workflowState === 'archived') {
    return 'Archived';
  }

  return 'Draft';
}

function getQuestionActionLabel(question: Question): string {
  return question.skill.trim() || question.topic.trim() || question.id;
}

function getQuestionTargetDisplay(target: ContentManagerDestructiveActionTarget): string {
  if (target.label === target.id) {
    return `"${target.id}"`;
  }

  return `"${target.label}" (ID: ${target.id})`;
}

function createDestructiveQuestionActionTarget(
  question: Question,
  workflowState: DraftWorkflowState,
): ContentManagerDestructiveActionTarget {
  return {
    id: question.id,
    label: getQuestionActionLabel(question),
    workflowState,
  };
}

function getArchiveQuestionConfirmationMessage(
  target: ContentManagerDestructiveActionTarget,
): string {
  return [
    `Archive ${getQuestionTargetDisplay(target)}?`,
    '',
    'Archive hides the question from students and keeps it in Manage Content so it can be reviewed, restored, or republished later.',
    `Current status: ${getWorkflowStateLabel(target.workflowState)}.`,
    '',
    'Use permanent delete only for mistaken or duplicate records.',
  ].join('\n');
}

function getPermanentDeleteQuestionConfirmationPhrase(questionId: string): string {
  return `DELETE ${questionId}`;
}

function getPermanentDeleteQuestionPrompt(target: ContentManagerDestructiveActionTarget): string {
  const confirmationPhrase = getPermanentDeleteQuestionConfirmationPhrase(target.id);

  return [
    `Permanently delete ${getQuestionTargetDisplay(target)}?`,
    '',
    'This permanently removes the question record from Manage Content. This cannot be undone.',
    'If you only need to hide it from students, cancel and use Archive from Students instead.',
    '',
    `Type ${confirmationPhrase} to permanently delete.`,
  ].join('\n');
}

function isPermanentDeleteQuestionConfirmation(
  confirmationText: string | null,
  questionId: string,
): boolean {
  return confirmationText === getPermanentDeleteQuestionConfirmationPhrase(questionId);
}

const contentManagerDestructiveActionSafety = {
  getArchiveQuestionConfirmationMessage,
  getPermanentDeleteQuestionConfirmationPhrase,
  getPermanentDeleteQuestionPrompt,
  isPermanentDeleteQuestionConfirmation,
} as const;

// eslint-disable-next-line react-refresh/only-export-components
export { contentManagerDestructiveActionSafety };

function getQuestionSearchText(question: Question, workflowState: DraftWorkflowState): string {
  return [
    question.id,
    question.type,
    question.unit,
    question.topic,
    question.skill,
    question.section,
    question.difficulty,
    question.calculator,
    workflowState,
    ...question.tags,
  ]
    .join(' ')
    .toLowerCase();
}

function createDuplicateQuestionId(questionId: string, existingQuestionIds: Set<string>): string {
  const baseId = `${questionId}-copy`;

  if (!existingQuestionIds.has(baseId)) {
    return baseId;
  }

  let copyNumber = 2;
  let nextId = `${baseId}-${copyNumber}`;

  while (existingQuestionIds.has(nextId)) {
    copyNumber += 1;
    nextId = `${baseId}-${copyNumber}`;
  }

  return nextId;
}

function draftToVideoExplanation(draft: QuestionDraft): VideoExplanationData | undefined {
  if (!draft.videoUrl.trim()) {
    return undefined;
  }

  return {
    url: draft.videoUrl.trim(),
    thumbnailPath: draft.videoThumbnailPath.trim() || undefined,
    transcriptPath: draft.videoTranscriptPath.trim() || undefined,
    durationSeconds: parseDurationSeconds(draft.videoDurationSeconds),
  };
}

function getReadinessChecks(draft: QuestionDraft): ReadinessCheck[] {
  const checks: ReadinessCheck[] = [
    {
      id: 'identity',
      label: 'ID, unit, topic, skill, and tags',
      complete:
        hasText(draft.id) &&
        hasText(draft.unit) &&
        hasText(draft.topic) &&
        hasText(draft.skill) &&
        tagsToList(draft.tags).length > 0,
    },
    {
      id: 'prompt',
      label: 'Student prompt',
      complete: hasText(draft.prompt),
    },
    {
      id: 'solution',
      label: 'Explanation, steps, and common mistakes',
      complete:
        hasText(draft.explanationSummary) &&
        linesToList(draft.explanationSteps).length > 0 &&
        linesToList(draft.commonMistakes).length > 0,
    },
    {
      id: 'video',
      label: 'Video transcript when video is attached',
      complete: !hasText(draft.videoUrl) || hasText(draft.videoTranscriptPath),
    },
    {
      id: 'duration',
      label: 'Positive whole-number video duration',
      complete:
        !hasText(draft.videoDurationSeconds) ||
        parseDurationSeconds(draft.videoDurationSeconds) !== undefined,
    },
  ];

  if (draft.type === 'mcq') {
    checks.push({
      id: 'choices',
      label: 'Four choices with explanations',
      complete:
        draft.choices.length === 4 &&
        draft.choices.every((choice) => hasText(choice.text) && hasText(choice.explanation)),
    });
    checks.push({
      id: 'correct-choice',
      label: 'Correct choice selected',
      complete: draft.choices.some((choice) => choice.id === draft.correctChoiceId),
    });
  } else {
    checks.push({
      id: 'frq-parts',
      label: 'FRQ parts, sample responses, work, and rubric',
      complete:
        draft.frqParts.length > 0 &&
        draft.frqParts.every(
          (part) =>
            hasText(part.id) &&
            hasText(part.prompt) &&
            hasText(part.sampleResponse) &&
            linesToList(part.expectedWork).length > 0 &&
            part.rubric.length > 0 &&
            part.rubric.every(
              (criterion) =>
                hasText(criterion.id) &&
                hasText(criterion.description) &&
                Number.isInteger(Number(criterion.points)) &&
                Number(criterion.points) > 0,
            ),
        ),
    });
  }

  return checks;
}

export function ContentManager({
  customQuestions,
  seedQuestionIds,
  onSaveQuestion,
  onDeleteQuestion,
  onImportQuestions,
  onSetQuestionStatus,
  getQuestionStatus,
  contentSourceLabel = 'Local fallback',
  contentError = '',
  isContentLoading = false,
  onRefreshContent,
  onUploadImageFile,
}: ContentManagerProps) {
  const initialDraftRef = useRef<QuestionDraft | null>(null);
  const [draft, setDraft] = useState<QuestionDraft>(() => {
    const initialDraft = createBlankDraft();
    initialDraftRef.current = initialDraft;
    return initialDraft;
  });
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('student');
  const [lastSavedDraftFingerprint, setLastSavedDraftFingerprint] = useState<string>(() =>
    createQuestionDraftChangeFingerprint(initialDraftRef.current ?? createBlankDraft(), null),
  );
  const [isDraftAutosaveReady, setIsDraftAutosaveReady] = useState(false);
  const [draftAutosaveMessage, setDraftAutosaveMessage] = useState('');
  const [librarySearchText, setLibrarySearchText] = useState('');
  const [libraryTypeFilter, setLibraryTypeFilter] = useState<LibraryTypeFilter>('all');
  const [libraryStatusFilter, setLibraryStatusFilter] = useState<LibraryStatusFilter>('all');
  const [librarySortMode, setLibrarySortMode] = useState<LibrarySortMode>('skill');
  const [readinessSeverityFilter, setReadinessSeverityFilter] =
    useState<ContentReadinessSeverityFilter>('all');
  const [readinessStatusFilter, setReadinessStatusFilter] = useState<ReadinessStatusFilter>('all');
  const [readinessCategoryFilter, setReadinessCategoryFilter] =
    useState<ContentReadinessCategoryFilter>('all');
  const [readinessGroupMode, setReadinessGroupMode] = useState<ReadinessGroupMode>('severity');
  const [workflowStatesByQuestionId, setWorkflowStatesByQuestionId] = useState<
    Record<string, DraftWorkflowState>
  >({});
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadingImageTarget, setUploadingImageTarget] = useState<'question' | 'solution' | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const questionImageInputRef = useRef<HTMLInputElement | null>(null);
  const solutionImageInputRef = useRef<HTMLInputElement | null>(null);
  const activeDraftIdRef = useRef(draft.id);

  const selectedQuestion = useMemo(
    () => customQuestions.find((question) => question.id === selectedQuestionId) ?? null,
    [customQuestions, selectedQuestionId],
  );
  const selectedQuestionWorkflowState = selectedQuestion
    ? (workflowStatesByQuestionId[selectedQuestion.id] ?? getQuestionStatus(selectedQuestion.id))
    : null;
  const hasUnsavedDraftChanges = hasQuestionDraftUnsavedChanges(
    draft,
    selectedQuestionId,
    lastSavedDraftFingerprint,
  );
  const readinessChecks = useMemo(() => getReadinessChecks(draft), [draft]);
  const firstIncompleteReadinessCheck = readinessChecks.find((check) => !check.complete);
  const isReadyToPublish = readinessChecks.every((check) => check.complete);
  const contentReadinessReport = useMemo(
    () =>
      buildContentReadinessReport(customQuestions, {
        disallowLocalMedia: Boolean(onUploadImageFile),
        getStatus: (question) =>
          workflowStatesByQuestionId[question.id] ?? getQuestionStatus(question.id),
      }),
    [customQuestions, getQuestionStatus, onUploadImageFile, workflowStatesByQuestionId],
  );
  const contentReadinessDashboard = useMemo(
    () =>
      buildContentReadinessDashboard(contentReadinessReport, {
        severity: readinessSeverityFilter,
        status: readinessStatusFilter,
        category: readinessCategoryFilter,
        groupBy: readinessGroupMode,
      }),
    [
      contentReadinessReport,
      readinessCategoryFilter,
      readinessGroupMode,
      readinessSeverityFilter,
      readinessStatusFilter,
    ],
  );
  const previewVideo = useMemo(() => draftToVideoExplanation(draft), [draft]);
  const displayedQuestions = useMemo(() => {
    const normalizedSearchText = librarySearchText.trim().toLowerCase();

    return customQuestions
      .filter((question) => {
        const workflowState =
          workflowStatesByQuestionId[question.id] ?? getQuestionStatus(question.id);
        const matchesSearch =
          !normalizedSearchText ||
          getQuestionSearchText(question, workflowState).includes(normalizedSearchText);
        const matchesType = libraryTypeFilter === 'all' || question.type === libraryTypeFilter;
        const matchesStatus =
          libraryStatusFilter === 'all' || workflowState === libraryStatusFilter;

        return matchesSearch && matchesType && matchesStatus;
      })
      .sort((leftQuestion, rightQuestion) => {
        const leftStatus =
          workflowStatesByQuestionId[leftQuestion.id] ?? getQuestionStatus(leftQuestion.id);
        const rightStatus =
          workflowStatesByQuestionId[rightQuestion.id] ?? getQuestionStatus(rightQuestion.id);

        if (librarySortMode === 'unit') {
          return `${leftQuestion.unit} ${leftQuestion.topic} ${leftQuestion.skill}`.localeCompare(
            `${rightQuestion.unit} ${rightQuestion.topic} ${rightQuestion.skill}`,
          );
        }

        if (librarySortMode === 'status') {
          return `${leftStatus} ${leftQuestion.skill}`.localeCompare(
            `${rightStatus} ${rightQuestion.skill}`,
          );
        }

        if (librarySortMode === 'type') {
          return `${leftQuestion.type} ${leftQuestion.skill}`.localeCompare(
            `${rightQuestion.type} ${rightQuestion.skill}`,
          );
        }

        return `${leftQuestion.skill} ${leftQuestion.topic} ${leftQuestion.id}`.localeCompare(
          `${rightQuestion.skill} ${rightQuestion.topic} ${rightQuestion.id}`,
        );
      });
  }, [
    customQuestions,
    getQuestionStatus,
    librarySearchText,
    librarySortMode,
    libraryStatusFilter,
    libraryTypeFilter,
    workflowStatesByQuestionId,
  ]);
  const imageStorageLabel = onUploadImageFile ? 'Cloud storage' : 'Browser-local storage';
  const imageUploadHelp = onUploadImageFile
    ? 'Image uploads are stored in cloud storage and linked to this question when saved. Cloud storage accepts PNG, JPG, WebP, or GIF files under 1 MB.'
    : 'Image uploads are stored in this browser with IndexedDB. Use PNG, JPG, WebP, or GIF files. Exported JSON keeps image references, not the image files.';

  useEffect(() => {
    activeDraftIdRef.current = draft.id;
  }, [draft.id]);

  useEffect(() => {
    const storage = getContentManagerDraftAutosaveStorage();

    if (!storage) {
      setIsDraftAutosaveReady(true);
      return;
    }

    const autosavedDraft = loadContentManagerDraftAutosave(storage, isQuestionDraft);

    if (!autosavedDraft) {
      clearContentManagerDraftAutosave(storage);
      setIsDraftAutosaveReady(true);
      return;
    }

    if (
      window.confirm(
        `Restore the admin question draft autosaved at ${autosavedDraft.savedAt}? Cancel discards this recovery copy.`,
      )
    ) {
      setDraft(autosavedDraft.draft);
      setSelectedQuestionId(autosavedDraft.selectedQuestionId);
      setPreviewMode(autosavedDraft.previewMode);
      setLastSavedDraftFingerprint(autosavedDraft.lastSavedFingerprint);
      setDraftAutosaveMessage('Unsaved changes were restored from this browser.');
      setNotice(`Restored autosaved draft from ${autosavedDraft.savedAt}.`);
      setError('');
    } else {
      clearContentManagerDraftAutosave(storage);
    }

    setIsDraftAutosaveReady(true);
  }, []);

  useEffect(() => {
    if (!isDraftAutosaveReady) {
      return;
    }

    const storage = getContentManagerDraftAutosaveStorage();

    if (!hasUnsavedDraftChanges) {
      if (storage) {
        clearContentManagerDraftAutosave(storage);
      }
      setDraftAutosaveMessage('');
      return;
    }

    if (!storage) {
      setDraftAutosaveMessage(
        'Autosave is unavailable in this browser. Save or publish before leaving.',
      );
      return;
    }

    const result = saveContentManagerDraftAutosave({
      storage,
      draft,
      selectedQuestionId,
      previewMode,
      lastSavedFingerprint: lastSavedDraftFingerprint,
    });

    setDraftAutosaveMessage(
      result.ok
        ? `Unsaved changes autosaved locally at ${result.savedAt}.`
        : 'Autosave could not write to this browser. Save or publish before leaving.',
    );
  }, [
    draft,
    hasUnsavedDraftChanges,
    isDraftAutosaveReady,
    lastSavedDraftFingerprint,
    previewMode,
    selectedQuestionId,
  ]);

  useEffect(() => {
    if (!hasUnsavedDraftChanges) {
      return;
    }

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', warnBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', warnBeforeUnload);
    };
  }, [hasUnsavedDraftChanges]);

  function markDraftAsSaved(nextDraft: QuestionDraft, nextSelectedQuestionId: string | null) {
    setLastSavedDraftFingerprint(
      createQuestionDraftChangeFingerprint(nextDraft, nextSelectedQuestionId),
    );
  }

  function clearStoredDraftAutosave() {
    const storage = getContentManagerDraftAutosaveStorage();

    if (storage) {
      clearContentManagerDraftAutosave(storage);
    }

    setDraftAutosaveMessage('');
  }

  function confirmDiscardUnsavedDraft(): boolean {
    if (!hasUnsavedDraftChanges) {
      return true;
    }

    return window.confirm(
      'You have unsaved question draft changes. Save Draft or Publish before leaving this editor, or continue to discard the in-form changes.',
    );
  }

  function updateDraft<Field extends keyof QuestionDraft>(
    field: Field,
    value: QuestionDraft[Field],
  ) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function startNewQuestion(
    type: 'mcq' | 'frq' = 'mcq',
    options: { skipUnsavedWarning?: boolean } = {},
  ) {
    if (!options.skipUnsavedWarning && !confirmDiscardUnsavedDraft()) {
      return;
    }

    const nextDraft = {
      ...createBlankDraft(),
      type,
    };

    setDraft(nextDraft);
    setSelectedQuestionId(null);
    setPreviewMode('student');
    markDraftAsSaved(nextDraft, null);
    clearStoredDraftAutosave();
    setNotice('');
    setError('');
  }

  function loadQuestionIntoEditor(question: Question) {
    if (!confirmDiscardUnsavedDraft()) {
      return;
    }

    const workflowState = workflowStatesByQuestionId[question.id] ?? getQuestionStatus(question.id);
    const nextDraft = questionToDraft(question, workflowState);

    setSelectedQuestionId(question.id);
    setDraft(nextDraft);
    markDraftAsSaved(nextDraft, question.id);
    clearStoredDraftAutosave();
    setNotice('');
    setError('');
  }

  function duplicateQuestion(question: Question) {
    if (!confirmDiscardUnsavedDraft()) {
      return;
    }

    const existingQuestionIds = new Set([
      ...customQuestions.map((customQuestion) => customQuestion.id),
      ...seedQuestionIds,
    ]);
    const duplicateId = createDuplicateQuestionId(question.id, existingQuestionIds);
    const duplicateDraft = questionToDraft(question, 'draft');
    const nextDraft: QuestionDraft = {
      ...duplicateDraft,
      id: duplicateId,
      skill: duplicateDraft.skill ? `${duplicateDraft.skill} Copy` : duplicateDraft.skill,
      workflowState: 'draft',
    };

    setSelectedQuestionId(null);
    setDraft(nextDraft);
    setPreviewMode('student');
    setError('');
    setNotice('Duplicated as an unsaved draft. Review it, then save or publish.');
  }

  function publishQuestion() {
    setNotice('');

    if (!isReadyToPublish) {
      setError(
        firstIncompleteReadinessCheck
          ? `Complete this publish check first: ${firstIncompleteReadinessCheck.label}.`
          : 'Complete the publish checklist before publishing.',
      );
      return;
    }

    if (previewMode !== 'answer') {
      setPreviewMode('answer');
      setError('Review the Answer Key preview, then click Publish again.');
      return;
    }

    saveQuestion('published');
  }

  function saveQuestion(workflowState: DraftWorkflowState = 'draft') {
    setNotice('');
    setError('');

    if (workflowState === 'published' && !isReadyToPublish) {
      setError(
        firstIncompleteReadinessCheck
          ? `Complete this publish check first: ${firstIncompleteReadinessCheck.label}.`
          : 'Complete the publish checklist before publishing.',
      );
      return;
    }

    if (seedQuestionIds.has(draft.id.trim())) {
      setError('That ID belongs to a built-in question. Use a different ID.');
      return;
    }

    if (
      customQuestions.some((question) => question.id === draft.id.trim()) &&
      selectedQuestionId !== draft.id.trim()
    ) {
      setError('That ID already belongs to another authored question. Use a different ID.');
      return;
    }

    if (linesToList(draft.commonMistakes).length === 0) {
      setError('Add at least one common mistake before saving.');
      return;
    }

    if (draft.videoUrl.trim() && !draft.videoTranscriptPath.trim()) {
      setError('Add a transcript path for the video explanation before saving.');
      return;
    }

    if (draft.videoDurationSeconds.trim() && !parseDurationSeconds(draft.videoDurationSeconds)) {
      setError('Use a positive whole number for video duration.');
      return;
    }

    if (onUploadImageFile && workflowState === 'published' && draftHasLocalMedia(draft)) {
      setError(
        'Cloud-published questions cannot use browser-local images or videos. Upload images to cloud storage and use an external video link.',
      );
      return;
    }

    try {
      const question = draftToQuestion(draft);
      const parsed = QuestionSchema.parse(question);
      const savedDraft = questionToDraft(parsed, workflowState);

      onSaveQuestion(parsed, workflowState);
      setWorkflowStatesByQuestionId((current) => ({
        ...current,
        [parsed.id]: workflowState,
      }));
      setSelectedQuestionId(parsed.id);
      setDraft(savedDraft);
      markDraftAsSaved(savedDraft, parsed.id);
      clearStoredDraftAutosave();
      setNotice(
        workflowState === 'published' ? 'Question saved and marked publish-ready.' : 'Draft saved.',
      );
    } catch (saveError) {
      setError(formatValidationError(saveError));
    }
  }

  function deleteQuestion(question: Question, workflowState: DraftWorkflowState) {
    setNotice('');
    setError('');

    const target = createDestructiveQuestionActionTarget(question, workflowState);
    const confirmationText = window.prompt(getPermanentDeleteQuestionPrompt(target));

    if (!isPermanentDeleteQuestionConfirmation(confirmationText, question.id)) {
      if (confirmationText !== null) {
        setError(
          `Permanent delete canceled. Type ${getPermanentDeleteQuestionConfirmationPhrase(
            question.id,
          )} exactly to delete this question.`,
        );
      }
      return;
    }

    onDeleteQuestion(question.id);
    setWorkflowStatesByQuestionId((current) => {
      const nextStates = { ...current };
      delete nextStates[question.id];
      return nextStates;
    });

    if (selectedQuestionId === question.id) {
      startNewQuestion('mcq', { skipUnsavedWarning: true });
    }

    setNotice('Question permanently deleted.');
  }

  function archiveQuestion(question: Question, workflowState: DraftWorkflowState) {
    setNotice('');
    setError('');

    if (workflowState === 'archived') {
      setNotice('Question is already archived and hidden from students.');
      return;
    }

    const target = createDestructiveQuestionActionTarget(question, workflowState);

    if (!window.confirm(getArchiveQuestionConfirmationMessage(target))) {
      return;
    }

    onSetQuestionStatus(question.id, 'archived');
    setWorkflowStatesByQuestionId((current) => ({
      ...current,
      [question.id]: 'archived',
    }));
    setDraft((current) => ({
      ...current,
      workflowState: 'archived',
    }));
    setNotice('Question archived. Students will not see it; the record remains in Manage Content.');
  }

  function exportQuestions() {
    const localMediaCount = customQuestions.filter(questionHasLocalMedia).length;

    if (
      localMediaCount > 0 &&
      !window.confirm(
        `${localMediaCount} question(s) reference uploaded local media. Exported JSON will not include those image or video files. Continue export?`,
      )
    ) {
      return;
    }

    const data = JSON.stringify(
      {
        version: 'local',
        questions: customQuestions,
      },
      null,
      2,
    );
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'precalcapp-question-pack.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importQuestions(event: ChangeEvent<HTMLInputElement>) {
    setNotice('');
    setError('');

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = QuestionSetSchema.parse(JSON.parse(text) as unknown);
      const result = onImportQuestions(parsed.questions);
      setNotice(
        `Imported ${result.imported} questions. Skipped ${result.skipped} built-in ID conflicts.`,
      );
    } catch (importError) {
      setError(formatValidationError(importError));
    } finally {
      event.target.value = '';
    }
  }

  async function uploadVideoFile(event: ChangeEvent<HTMLInputElement>) {
    setNotice('');
    setError('');

    const file = event.target.files?.[0];
    const draftIdAtUploadStart = draft.id;

    if (!file) {
      return;
    }

    try {
      if (!isSupportedVideoFile(file)) {
        setError('Choose a video file such as MP4, WebM, MOV, or OGG.');
        return;
      }

      if (file.size > maxLocalVideoFileSizeBytes) {
        const maxMegabytes = Math.round(maxLocalVideoFileSizeBytes / (1024 * 1024));
        setError(`Choose a video file smaller than ${maxMegabytes} MB.`);
        return;
      }

      setIsUploadingVideo(true);
      const record = await saveLocalVideoFile(file);

      if (activeDraftIdRef.current !== draftIdAtUploadStart) {
        setError(
          'Video upload finished after you changed drafts. Upload it again on the target question.',
        );
        return;
      }

      setDraft((current) => ({
        ...current,
        videoUrl: createLocalVideoReference(record.id),
      }));
      setNotice(`Uploaded ${record.name}. Save the question to attach it.`);
    } catch (uploadError) {
      setError(formatValidationError(uploadError));
    } finally {
      setIsUploadingVideo(false);
      event.target.value = '';
    }
  }

  function getAssetDraftField(
    target: 'question' | 'solution',
  ): 'questionAssets' | 'solutionAssets' {
    return target === 'question' ? 'questionAssets' : 'solutionAssets';
  }

  function addBlankAsset(target: 'question' | 'solution') {
    const field = getAssetDraftField(target);

    updateDraft(field, [
      ...draft[field],
      {
        id: createAssetId(target),
        type: 'image',
        path: '',
        alt: '',
        caption: '',
      },
    ]);
  }

  function updateAssetDraft<Field extends keyof AssetDraft>(
    target: 'question' | 'solution',
    index: number,
    field: Field,
    value: AssetDraft[Field],
  ) {
    const draftField = getAssetDraftField(target);
    const assets = [...draft[draftField]];
    assets[index] = {
      ...assets[index],
      [field]: value,
    };
    updateDraft(draftField, assets);
  }

  function removeAsset(target: 'question' | 'solution', index: number) {
    const field = getAssetDraftField(target);
    updateDraft(
      field,
      draft[field].filter((_, assetIndex) => assetIndex !== index),
    );
  }

  function createImageUploadContext(
    target: 'question' | 'solution',
    assetId: string,
  ): ContentManagerImageUploadContext {
    return {
      placement: target === 'question' ? 'question' : 'explanation',
      assetId,
      questionId: draft.id.trim() || draft.id,
      questionTitle: draft.skill.trim() || draft.topic.trim() || undefined,
      questionUnit: draft.unit.trim() || undefined,
      questionTopic: draft.topic.trim() || undefined,
    };
  }

  async function uploadImageFile(
    event: ChangeEvent<HTMLInputElement>,
    target: 'question' | 'solution',
  ) {
    setNotice('');
    setError('');

    const file = event.target.files?.[0];
    const draftIdAtUploadStart = draft.id;

    if (!file) {
      return;
    }

    try {
      setUploadingImageTarget(target);
      const field = getAssetDraftField(target);
      const assetId = createAssetId(target);
      let uploadedAsset: AssetDraft;
      let uploadedFileName = file.name;

      if (onUploadImageFile) {
        if (!isSupportedCloudImageFile(file)) {
          setError('Cloud image storage accepts PNG, JPG, WebP, or GIF files.');
          return;
        }

        if (file.size > maxCloudImageFileSizeBytes) {
          const maxMegabytes = Math.round(maxCloudImageFileSizeBytes / (1024 * 1024));
          setError(`Cloud image storage accepts images smaller than ${maxMegabytes} MB.`);
          return;
        }

        const upload = await onUploadImageFile(file, createImageUploadContext(target, assetId));
        const uploadPath = upload.path.trim();

        if (!uploadPath) {
          throw new Error('Cloud image upload did not return a usable image path.');
        }

        const fallbackAltText = filenameToAltText(upload.fileName ?? file.name) || 'Uploaded image';
        uploadedFileName = upload.fileName ?? file.name;
        uploadedAsset = {
          id: assetId,
          type: 'image',
          path: uploadPath,
          alt: upload.alt?.trim() || fallbackAltText,
          caption: upload.caption?.trim() || fallbackAltText,
        };
      } else {
        if (!isSupportedImageFile(file)) {
          setError('Choose an image file such as PNG, JPG, GIF, or WebP.');
          return;
        }

        if (file.size > maxLocalImageFileSizeBytes) {
          const maxMegabytes = Math.round(maxLocalImageFileSizeBytes / (1024 * 1024));
          setError(`Choose an image file smaller than ${maxMegabytes} MB.`);
          return;
        }

        const record = await saveLocalImageFile(file);
        const altText = filenameToAltText(record.name) || 'Uploaded image';
        uploadedFileName = record.name;
        uploadedAsset = {
          id: assetId,
          type: 'image',
          path: createLocalImageReference(record.id),
          alt: altText,
          caption: altText,
        };
      }

      if (activeDraftIdRef.current !== draftIdAtUploadStart) {
        setError(
          'Image upload finished after you changed drafts. Upload it again on the target question.',
        );
        return;
      }

      setDraft((current) => ({
        ...current,
        [field]: [...current[field], uploadedAsset],
      }));
      setNotice(
        onUploadImageFile
          ? `Uploaded ${uploadedFileName} to cloud storage. Save the question to attach it.`
          : `Uploaded ${uploadedFileName}. Save the question to attach it.`,
      );
    } catch (uploadError) {
      setError(formatValidationError(uploadError));
    } finally {
      setUploadingImageTarget(null);
      event.target.value = '';
    }
  }

  function renderAssetEditor(
    target: 'question' | 'solution',
    title: string,
    description: string,
    inputRef: RefObject<HTMLInputElement | null>,
  ) {
    const field = getAssetDraftField(target);
    const assets = draft[field];
    const isUploading = uploadingImageTarget === target;

    return (
      <section className="editor-section">
        <div className="section-heading-row">
          <div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
          <ImageIcon aria-hidden="true" />
        </div>
        <div className="asset-editor-actions">
          <button className="ghost-button" onClick={() => addBlankAsset(target)} type="button">
            <Plus aria-hidden="true" />
            Add Image URL
          </button>
          <button
            className="ghost-button"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <ImageIcon aria-hidden="true" />
            {isUploading ? 'Uploading...' : 'Upload Image File'}
          </button>
          <input
            accept="image/png,image/jpeg,image/gif,image/webp,.gif,.jpeg,.jpg,.png,.webp"
            className="visually-hidden"
            onChange={(event) => uploadImageFile(event, target)}
            ref={inputRef}
            type="file"
          />
        </div>
        <p className="asset-editor-note">
          {imageStorageLabel}: {imageUploadHelp}
        </p>
        {assets.length === 0 ? <p className="empty-list-copy">No images attached.</p> : null}
        {assets.map((asset, index) => (
          <div className="asset-editor-row" key={`${asset.id}-${index}`}>
            <div className="form-grid form-grid--two">
              <label>
                Type
                <select
                  onChange={(event) =>
                    updateAssetDraft(
                      target,
                      index,
                      'type',
                      event.target.value as QuestionAsset['type'],
                    )
                  }
                  value={asset.type}
                >
                  <option value="image">Image</option>
                  <option value="graph">Graph</option>
                  <option value="table">Table</option>
                </select>
              </label>
              <label>
                Path
                <input
                  onChange={(event) => updateAssetDraft(target, index, 'path', event.target.value)}
                  value={asset.path}
                />
              </label>
              <label>
                Alt text
                <input
                  onChange={(event) => updateAssetDraft(target, index, 'alt', event.target.value)}
                  value={asset.alt}
                />
              </label>
              <label>
                Caption
                <input
                  onChange={(event) =>
                    updateAssetDraft(target, index, 'caption', event.target.value)
                  }
                  value={asset.caption}
                />
              </label>
            </div>
            {isLocalImageReference(asset.path) ? (
              <p className="asset-editor-note">
                Uploaded image is stored in this browser. Exported JSON keeps the image reference,
                not the image file.
              </p>
            ) : onUploadImageFile && asset.path ? (
              <p className="asset-editor-note">
                Uploaded image is stored in cloud storage. Save the question to keep this link with
                the authored content.
              </p>
            ) : null}
            <button
              className="danger-button"
              onClick={() => removeAsset(target, index)}
              type="button"
            >
              <Trash2 aria-hidden="true" />
              Remove Image
            </button>
          </div>
        ))}
      </section>
    );
  }

  return (
    <main className="manager-shell">
      <header className="manager-header">
        <div>
          <p className="eyebrow">Content Manager</p>
          <h1>No-code Question Authoring</h1>
          <p className="manager-header__copy">
            Server publishing uses draft saves, publish readiness, and JSON backup handoff.
          </p>
        </div>
        <div className="manager-actions">
          <button className="ghost-button" onClick={() => startNewQuestion('mcq')} type="button">
            <Plus aria-hidden="true" />
            MCQ
          </button>
          <button className="ghost-button" onClick={() => startNewQuestion('frq')} type="button">
            <Plus aria-hidden="true" />
            FRQ
          </button>
          <button
            className="ghost-button"
            disabled={customQuestions.length === 0}
            onClick={exportQuestions}
            type="button"
          >
            <Download aria-hidden="true" />
            Export
          </button>
          <button
            className="ghost-button"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <FileUp aria-hidden="true" />
            Import
          </button>
          <input
            accept="application/json"
            className="visually-hidden"
            onChange={importQuestions}
            ref={fileInputRef}
            type="file"
          />
        </div>
      </header>
      <section className="manager-sync-panel" aria-label="Content library status">
        <div className="sync-card sync-card--primary">
          <Cloud aria-hidden="true" />
          <div>
            <strong>{contentSourceLabel}</strong>
            <span>
              {isContentLoading
                ? 'Loading content records'
                : 'Question records align to publishing status and local fallback.'}
            </span>
          </div>
        </div>
        <div className="sync-card">
          <RefreshCw aria-hidden="true" />
          <div>
            <strong>{customQuestions.length} authored</strong>
            <span>Loaded into the admin workspace</span>
          </div>
        </div>
        <div className="sync-card">
          <RefreshCw aria-hidden="true" />
          <div>
            <strong>{contentError ? 'Sync issue' : 'Refresh ready'}</strong>
            <span>{contentError || 'Reload the library after dashboard changes'}</span>
          </div>
        </div>
        {onRefreshContent ? (
          <button className="ghost-button" onClick={onRefreshContent} type="button">
            <RefreshCw aria-hidden="true" />
            Refresh Library
          </button>
        ) : null}
      </section>

      <section
        className="editor-section publish-readiness-panel"
        aria-label="Content readiness report"
      >
        <div className="section-heading-row">
          <div>
            <h3>Content Readiness Report</h3>
            <p>
              Saved questions are checked for explanation, rubric, image, metadata, and publish
              blockers.
            </p>
          </div>
          {contentReadinessReport.summary.publishBlockerCount === 0 ? (
            <CheckCircle2 aria-hidden="true" />
          ) : (
            <CircleAlert aria-hidden="true" />
          )}
        </div>
        <div className="manager-sync-panel">
          <div className="sync-card">
            <CheckCircle2 aria-hidden="true" />
            <div>
              <strong>{contentReadinessReport.summary.readyQuestionCount} ready</strong>
              <span>{contentReadinessReport.summary.questionCount} saved question(s) scanned</span>
            </div>
          </div>
          <div className="sync-card">
            <CircleAlert aria-hidden="true" />
            <div>
              <strong>{contentReadinessReport.summary.publishBlockerCount} publish blockers</strong>
              <span>
                {contentReadinessReport.summary.blockedQuestionCount} question(s) need required
                fixes
              </span>
            </div>
          </div>
          <div className="sync-card">
            <CircleAlert aria-hidden="true" />
            <div>
              <strong>{contentReadinessReport.summary.warningCount} warnings</strong>
              <span>
                {contentReadinessReport.summary.warningOnlyQuestionCount} question(s) have quality
                warnings only
              </span>
            </div>
          </div>
        </div>
        <div className="readiness-dashboard-controls" aria-label="Launch QA dashboard controls">
          <label>
            Severity
            <select
              onChange={(event) =>
                setReadinessSeverityFilter(event.target.value as ContentReadinessSeverityFilter)
              }
              value={readinessSeverityFilter}
            >
              <option value="all">
                All issues ({contentReadinessDashboard.counts.severity.all})
              </option>
              <option value="blocker">
                Blockers ({contentReadinessDashboard.counts.severity.blocker})
              </option>
              <option value="warning">
                Warnings ({contentReadinessDashboard.counts.severity.warning})
              </option>
            </select>
          </label>
          <label>
            Status
            <select
              onChange={(event) =>
                setReadinessStatusFilter(event.target.value as ReadinessStatusFilter)
              }
              value={readinessStatusFilter}
            >
              <option value="all">
                All statuses ({contentReadinessDashboard.counts.status.all})
              </option>
              <option value="published">
                Published ({contentReadinessDashboard.counts.status.published})
              </option>
              <option value="draft">Draft ({contentReadinessDashboard.counts.status.draft})</option>
              <option value="archived">
                Archived ({contentReadinessDashboard.counts.status.archived})
              </option>
            </select>
          </label>
          <label>
            Category
            <select
              onChange={(event) =>
                setReadinessCategoryFilter(event.target.value as ContentReadinessCategoryFilter)
              }
              value={readinessCategoryFilter}
            >
              <option value="all">
                All categories ({contentReadinessDashboard.counts.category.all})
              </option>
              {contentReadinessIssueCategories.map((category) => (
                <option key={category} value={category}>
                  {contentReadinessIssueCategoryLabels[category]} (
                  {contentReadinessDashboard.counts.category[category]})
                </option>
              ))}
            </select>
          </label>
          <label>
            Group by
            <select
              onChange={(event) => setReadinessGroupMode(event.target.value as ReadinessGroupMode)}
              value={readinessGroupMode}
            >
              <option value="severity">Blocker or warning</option>
              <option value="status">Publishing status</option>
              <option value="category">Issue category</option>
            </select>
          </label>
        </div>

        <p className="readiness-filter-summary" aria-live="polite">
          Showing {contentReadinessDashboard.visibleIssueCount} of{' '}
          {contentReadinessDashboard.totalIssueCount} readiness item(s) across{' '}
          {contentReadinessDashboard.visibleQuestionCount} question(s).
        </p>

        {contentReadinessDashboard.groups.length === 0 ? (
          <ul className="publish-check-list" aria-label="Content readiness status">
            <li data-complete={contentReadinessDashboard.totalIssueCount === 0}>
              {contentReadinessDashboard.totalIssueCount === 0 ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <CircleAlert aria-hidden="true" />
              )}
              <span>{contentReadinessDashboard.emptyMessage}</span>
            </li>
          </ul>
        ) : (
          <div className="readiness-dashboard-groups" aria-label="Filtered launch QA issues">
            {contentReadinessDashboard.groups.map((group) => (
              <section className="readiness-group" key={group.key}>
                <div className="readiness-group__header">
                  <div>
                    <h4>{group.label}</h4>
                    <span>
                      {group.issueCount} item(s) across {group.questionCount} question(s)
                    </span>
                  </div>
                  <div className="readiness-group__counts">
                    <span>{group.blockerCount} blocker(s)</span>
                    <span>{group.warningCount} warning(s)</span>
                  </div>
                </div>
                <ul className="readiness-issue-list">
                  {group.issues.map((issue, issueIndex) => (
                    <li
                      data-severity={issue.severity}
                      key={`${group.key}-${issue.questionId}-${issue.code}-${issueIndex}`}
                    >
                      <CircleAlert aria-hidden="true" />
                      <div>
                        <div className="readiness-issue-list__meta">
                          <span className="status-pill" data-status={issue.status}>
                            {getWorkflowStateLabel(issue.status)}
                          </span>
                          <span>{issue.questionType.toUpperCase()}</span>
                          <span>{contentReadinessIssueCategoryLabels[issue.category]}</span>
                          <span>{issue.fieldPath}</span>
                        </div>
                        <strong>
                          {issue.questionLabel} <span>ID: {issue.questionId}</span>
                        </strong>
                        <p>{issue.message}</p>
                        <p className="readiness-issue-list__action">
                          Action: {issue.actionMessage}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>

      <div className="manager-layout">
        <aside className="managed-list" aria-label="Authored questions">
          <h2>Authored Questions</h2>
          {customQuestions.length === 0 ? <p>No authored questions yet.</p> : null}
          {customQuestions.length > 0 ? (
            <div className="managed-list__controls" aria-label="Library search and filters">
              <label>
                Search library
                <input
                  onChange={(event) => setLibrarySearchText(event.target.value)}
                  placeholder="Skill, topic, tag, ID"
                  type="search"
                  value={librarySearchText}
                />
              </label>
              <div className="managed-list__filter-grid">
                <label>
                  Type
                  <select
                    onChange={(event) =>
                      setLibraryTypeFilter(event.target.value as LibraryTypeFilter)
                    }
                    value={libraryTypeFilter}
                  >
                    <option value="all">All types</option>
                    <option value="mcq">MCQ</option>
                    <option value="frq">FRQ</option>
                  </select>
                </label>
                <label>
                  Status
                  <select
                    onChange={(event) =>
                      setLibraryStatusFilter(event.target.value as LibraryStatusFilter)
                    }
                    value={libraryStatusFilter}
                  >
                    <option value="all">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
              </div>
              <label>
                Sort by
                <select
                  onChange={(event) => setLibrarySortMode(event.target.value as LibrarySortMode)}
                  value={librarySortMode}
                >
                  <option value="skill">Skill A-Z</option>
                  <option value="unit">Unit and topic</option>
                  <option value="status">Status</option>
                  <option value="type">Type</option>
                </select>
              </label>
              <small>
                Showing {displayedQuestions.length} of {customQuestions.length}
              </small>
            </div>
          ) : null}
          {customQuestions.length > 0 && displayedQuestions.length === 0 ? (
            <p>No questions match the current library filters.</p>
          ) : null}
          <div className="managed-list__items">
            {displayedQuestions.map((question) => {
              const workflowState =
                workflowStatesByQuestionId[question.id] ?? getQuestionStatus(question.id);

              return (
                <button
                  className="managed-list__item"
                  data-active={question.id === selectedQuestionId}
                  key={question.id}
                  onClick={() => loadQuestionIntoEditor(question)}
                  type="button"
                >
                  <div className="managed-list__item-header">
                    <strong>{question.skill || question.id}</strong>
                    <span className="status-pill" data-status={workflowState}>
                      {getWorkflowStateLabel(workflowState)}
                    </span>
                  </div>
                  <div className="managed-list__item-meta">
                    <span>{question.type.toUpperCase()}</span>
                    <span>{question.section.toUpperCase()}</span>
                  </div>
                  <small>{question.topic}</small>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="editor-panel">
          <div className="editor-toolbar">
            <div>
              <p className="eyebrow">{selectedQuestion ? 'Editing' : 'New Question'}</p>
              <h2>{draft.type === 'mcq' ? 'Multiple Choice' : 'Free Response'}</h2>
              <div className="editor-toolbar__meta">
                <span className="status-pill" data-status={draft.workflowState}>
                  {getWorkflowStateLabel(draft.workflowState)}
                </span>
                <span>{isReadyToPublish ? 'Ready to publish' : 'Needs review'}</span>
              </div>
            </div>
            <div className="action-row">
              <button className="ghost-button" onClick={() => saveQuestion('draft')} type="button">
                <Save aria-hidden="true" />
                Save Draft
              </button>
              <button
                className="primary-button"
                disabled={!isReadyToPublish}
                onClick={publishQuestion}
                type="button"
              >
                <Send aria-hidden="true" />
                Publish
              </button>
              {selectedQuestion ? (
                <>
                  <button
                    className="ghost-button"
                    onClick={() => duplicateQuestion(selectedQuestion)}
                    type="button"
                  >
                    <Copy aria-hidden="true" />
                    Duplicate
                  </button>
                  <button
                    className="ghost-button"
                    disabled={selectedQuestionWorkflowState === 'archived'}
                    onClick={() =>
                      archiveQuestion(selectedQuestion, selectedQuestionWorkflowState ?? 'draft')
                    }
                    title={
                      selectedQuestionWorkflowState === 'archived'
                        ? 'This question is already hidden from students.'
                        : 'Hide this question from students while keeping it recoverable.'
                    }
                    type="button"
                  >
                    <Archive aria-hidden="true" />
                    Archive from Students
                  </button>
                  <button
                    className="danger-button"
                    onClick={() =>
                      deleteQuestion(selectedQuestion, selectedQuestionWorkflowState ?? 'draft')
                    }
                    title="Permanently remove this question record. Use Archive from Students to hide without deleting."
                    type="button"
                  >
                    <Trash2 aria-hidden="true" />
                    Permanently Delete
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {notice ? <div className="form-notice">{notice}</div> : null}
          {error ? (
            <div className="form-error" role="alert">
              <XCircle aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}

          <section className="editor-section publish-readiness-panel">
            <div className="section-heading-row">
              <div>
                <h3>Draft and Publish</h3>
                <p>Draft saves preserve author work; publish marks the question publish-ready.</p>
              </div>
              {isReadyToPublish ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <CircleAlert aria-hidden="true" />
              )}
            </div>
            <div className="publish-status-row">
              <span className="status-pill" data-status={draft.workflowState}>
                {getWorkflowStateLabel(draft.workflowState)}
              </span>
              <span>
                {isReadyToPublish
                  ? 'All publish checks pass. Review the Answer Key preview before publishing.'
                  : firstIncompleteReadinessCheck
                    ? `Next: ${firstIncompleteReadinessCheck.label}`
                    : 'Complete checks before publish'}
              </span>
            </div>
            <div className="publish-status-row" aria-live="polite">
              <span>
                {hasUnsavedDraftChanges
                  ? draftAutosaveMessage ||
                    'Unsaved changes are waiting for local browser autosave.'
                  : 'No unsaved draft changes.'}
              </span>
            </div>
            <ul className="publish-check-list" aria-label="Publish readiness checks">
              {readinessChecks.map((check) => (
                <li data-complete={check.complete} key={check.id}>
                  {check.complete ? (
                    <CheckCircle2 aria-hidden="true" />
                  ) : (
                    <CircleAlert aria-hidden="true" />
                  )}
                  <span>{check.label}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="form-grid form-grid--four">
            <label>
              Type
              <select
                onChange={(event) =>
                  updateDraft('type', event.target.value as QuestionDraft['type'])
                }
                value={draft.type}
              >
                <option value="mcq">Multiple choice</option>
                <option value="frq">Free response</option>
              </select>
            </label>
            <label>
              ID
              <input onChange={(event) => updateDraft('id', event.target.value)} value={draft.id} />
            </label>
            <label>
              Difficulty
              <select
                onChange={(event) => updateDraft('difficulty', event.target.value as Difficulty)}
                value={draft.difficulty}
              >
                <option value="intro">Intro</option>
                <option value="medium">Medium</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
            <label>
              Calculator
              <select
                onChange={(event) =>
                  updateDraft('calculator', event.target.value as CalculatorPolicy)
                }
                value={draft.calculator}
              >
                <option value="none">No calculator</option>
                <option value="graphing">Graphing calculator</option>
              </select>
            </label>
          </div>

          <div className="form-grid form-grid--two">
            <label>
              Unit
              <input
                onChange={(event) => updateDraft('unit', event.target.value)}
                value={draft.unit}
              />
            </label>
            <label>
              Topic
              <input
                onChange={(event) => updateDraft('topic', event.target.value)}
                value={draft.topic}
              />
            </label>
            <label>
              Skill
              <input
                onChange={(event) => updateDraft('skill', event.target.value)}
                value={draft.skill}
              />
            </label>
            <label>
              Section
              <select
                onChange={(event) => updateDraft('section', event.target.value as QuestionSection)}
                value={draft.section}
              >
                <option value="practice">Practice</option>
                <option value="mcq-a">MCQ A</option>
                <option value="mcq-b">MCQ B</option>
                <option value="frq-a">FRQ A</option>
                <option value="frq-b">FRQ B</option>
              </select>
            </label>
          </div>

          <label>
            Tags
            <input
              onChange={(event) => updateDraft('tags', event.target.value)}
              placeholder="functions, modeling, calculator"
              value={draft.tags}
            />
          </label>

          <label>
            Prompt
            <textarea
              onChange={(event) => updateDraft('prompt', event.target.value)}
              rows={5}
              value={draft.prompt}
            />
          </label>

          {renderAssetEditor(
            'question',
            'Question Images',
            'Attach graphs, residual plots, tables, or diagrams that students need before answering.',
            questionImageInputRef,
          )}

          {draft.type === 'mcq' ? (
            <section className="editor-section">
              <h3>Choices</h3>
              <div className="choice-editor-grid">
                {draft.choices.map((choice, index) => (
                  <div className="choice-editor" key={choice.id}>
                    <label>
                      Choice {choice.id}
                      <textarea
                        onChange={(event) => {
                          const choices = [...draft.choices];
                          choices[index] = { ...choice, text: event.target.value };
                          updateDraft('choices', choices);
                        }}
                        rows={2}
                        value={choice.text}
                      />
                    </label>
                    <label>
                      Choice {choice.id} explanation
                      <textarea
                        onChange={(event) => {
                          const choices = [...draft.choices];
                          choices[index] = { ...choice, explanation: event.target.value };
                          updateDraft('choices', choices);
                        }}
                        rows={3}
                        value={choice.explanation}
                      />
                    </label>
                  </div>
                ))}
              </div>
              <label>
                Correct Choice
                <select
                  onChange={(event) =>
                    updateDraft('correctChoiceId', event.target.value as McqChoice['id'])
                  }
                  value={draft.correctChoiceId}
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </label>
            </section>
          ) : (
            <section className="editor-section">
              <div className="section-heading-row">
                <h3>FRQ Parts</h3>
                <button
                  className="ghost-button"
                  onClick={() =>
                    updateDraft('frqParts', [
                      ...draft.frqParts,
                      {
                        ...defaultFrqPart,
                        id: String.fromCharCode(97 + draft.frqParts.length),
                        rubric: defaultFrqPart.rubric.map((criterion) => ({
                          ...criterion,
                          id: `criterion-${draft.frqParts.length + 1}`,
                        })),
                      },
                    ])
                  }
                  type="button"
                >
                  <Plus aria-hidden="true" />
                  Part
                </button>
              </div>
              {draft.frqParts.map((part, partIndex) => (
                <div className="frq-editor-part" key={`${part.id}-${partIndex}`}>
                  <div className="form-grid form-grid--two">
                    <label>
                      Part ID
                      <input
                        onChange={(event) => {
                          const frqParts = [...draft.frqParts];
                          frqParts[partIndex] = { ...part, id: event.target.value };
                          updateDraft('frqParts', frqParts);
                        }}
                        value={part.id}
                      />
                    </label>
                    <button
                      className="ghost-button"
                      disabled={draft.frqParts.length === 1}
                      onClick={() =>
                        updateDraft(
                          'frqParts',
                          draft.frqParts.filter((_, index) => index !== partIndex),
                        )
                      }
                      type="button"
                    >
                      <Trash2 aria-hidden="true" />
                      Remove
                    </button>
                  </div>
                  <label>
                    Part prompt
                    <textarea
                      onChange={(event) => {
                        const frqParts = [...draft.frqParts];
                        frqParts[partIndex] = { ...part, prompt: event.target.value };
                        updateDraft('frqParts', frqParts);
                      }}
                      rows={3}
                      value={part.prompt}
                    />
                  </label>
                  <label>
                    Sample response
                    <textarea
                      onChange={(event) => {
                        const frqParts = [...draft.frqParts];
                        frqParts[partIndex] = { ...part, sampleResponse: event.target.value };
                        updateDraft('frqParts', frqParts);
                      }}
                      rows={4}
                      value={part.sampleResponse}
                    />
                  </label>
                  <label>
                    Expected work
                    <textarea
                      onChange={(event) => {
                        const frqParts = [...draft.frqParts];
                        frqParts[partIndex] = { ...part, expectedWork: event.target.value };
                        updateDraft('frqParts', frqParts);
                      }}
                      rows={3}
                      value={part.expectedWork}
                    />
                  </label>
                  <div className="section-heading-row">
                    <h4>Rubric</h4>
                    <button
                      className="ghost-button"
                      onClick={() => {
                        const frqParts = [...draft.frqParts];
                        const nextRubric = [
                          ...part.rubric,
                          {
                            id: `${part.id || 'part'}-criterion-${part.rubric.length + 1}`,
                            description: '',
                            points: '1',
                          },
                        ];
                        frqParts[partIndex] = { ...part, rubric: nextRubric };
                        updateDraft('frqParts', frqParts);
                      }}
                      type="button"
                    >
                      <Plus aria-hidden="true" />
                      Criterion
                    </button>
                  </div>
                  {part.rubric.map((criterion, criterionIndex) => (
                    <div className="rubric-editor-row" key={`${criterion.id}-${criterionIndex}`}>
                      <label>
                        Criterion ID
                        <input
                          onChange={(event) => {
                            const frqParts = [...draft.frqParts];
                            const rubric = [...part.rubric];
                            rubric[criterionIndex] = { ...criterion, id: event.target.value };
                            frqParts[partIndex] = { ...part, rubric };
                            updateDraft('frqParts', frqParts);
                          }}
                          value={criterion.id}
                        />
                      </label>
                      <label>
                        Points
                        <input
                          min="1"
                          onChange={(event) => {
                            const frqParts = [...draft.frqParts];
                            const rubric = [...part.rubric];
                            rubric[criterionIndex] = { ...criterion, points: event.target.value };
                            frqParts[partIndex] = { ...part, rubric };
                            updateDraft('frqParts', frqParts);
                          }}
                          type="number"
                          value={criterion.points}
                        />
                      </label>
                      <label>
                        Description
                        <textarea
                          onChange={(event) => {
                            const frqParts = [...draft.frqParts];
                            const rubric = [...part.rubric];
                            rubric[criterionIndex] = {
                              ...criterion,
                              description: event.target.value,
                            };
                            frqParts[partIndex] = { ...part, rubric };
                            updateDraft('frqParts', frqParts);
                          }}
                          rows={2}
                          value={criterion.description}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              ))}
            </section>
          )}

          <section className="editor-section">
            <h3>Solution</h3>
            <label>
              Explanation summary
              <textarea
                onChange={(event) => updateDraft('explanationSummary', event.target.value)}
                rows={3}
                value={draft.explanationSummary}
              />
            </label>
            <label>
              Solution steps
              <textarea
                onChange={(event) => updateDraft('explanationSteps', event.target.value)}
                rows={5}
                value={draft.explanationSteps}
              />
            </label>
            <label>
              Common mistakes
              <textarea
                onChange={(event) => updateDraft('commonMistakes', event.target.value)}
                rows={3}
                value={draft.commonMistakes}
              />
            </label>
          </section>

          {renderAssetEditor(
            'solution',
            'Solution Images',
            'Attach worked-solution graphs, annotated plots, or diagrams that appear after the explanation is revealed.',
            solutionImageInputRef,
          )}

          <section className="editor-section">
            <div className="section-heading-row">
              <h3>Video</h3>
              <Video aria-hidden="true" />
            </div>
            <div className="video-upload-panel">
              <div className="action-row">
                <button
                  className="ghost-button"
                  disabled={isUploadingVideo}
                  onClick={() => videoFileInputRef.current?.click()}
                  type="button"
                >
                  <Video aria-hidden="true" />
                  {isUploadingVideo ? 'Uploading...' : 'Upload Video File'}
                </button>
                {draft.videoUrl ? (
                  <button
                    className="ghost-button"
                    onClick={() => {
                      updateDraft('videoUrl', '');
                      updateDraft('videoThumbnailPath', '');
                      updateDraft('videoTranscriptPath', '');
                      updateDraft('videoDurationSeconds', '');
                    }}
                    type="button"
                  >
                    Clear Video
                  </button>
                ) : null}
              </div>
              <input
                accept="video/*,.m4v,.mov,.mp4,.ogg,.ogv,.webm"
                className="visually-hidden"
                onChange={uploadVideoFile}
                ref={videoFileInputRef}
                type="file"
              />
              {isLocalVideoReference(draft.videoUrl) ? (
                <p>
                  Uploaded video is stored in this browser and plays inside the app. Exported JSON
                  keeps the video reference, not the video file.
                </p>
              ) : (
                <p>Use a YouTube/Vimeo URL or upload a local video file for in-app playback.</p>
              )}
            </div>
            <div className="form-grid form-grid--two">
              <label>
                Video URL
                <input
                  onChange={(event) => updateDraft('videoUrl', event.target.value)}
                  value={draft.videoUrl}
                />
              </label>
              <label>
                Duration seconds
                <input
                  min="1"
                  onChange={(event) => updateDraft('videoDurationSeconds', event.target.value)}
                  type="number"
                  value={draft.videoDurationSeconds}
                />
              </label>
              <label>
                Thumbnail path
                <input
                  onChange={(event) => updateDraft('videoThumbnailPath', event.target.value)}
                  value={draft.videoThumbnailPath}
                />
              </label>
              <label>
                Transcript path
                <input
                  onChange={(event) => updateDraft('videoTranscriptPath', event.target.value)}
                  value={draft.videoTranscriptPath}
                />
              </label>
            </div>
          </section>
        </section>

        <aside className="preview-panel" aria-label="Question preview">
          <div className="section-heading-row">
            <h2>Preview</h2>
            <Eye aria-hidden="true" />
          </div>
          <div className="preview-mode-toggle" role="group" aria-label="Preview mode">
            <button
              aria-pressed={previewMode === 'student'}
              data-active={previewMode === 'student'}
              onClick={() => setPreviewMode('student')}
              type="button"
            >
              Student
            </button>
            <button
              aria-pressed={previewMode === 'answer'}
              data-active={previewMode === 'answer'}
              onClick={() => setPreviewMode('answer')}
              type="button"
            >
              Answer Key
            </button>
          </div>
          <div className="preview-publish-note">
            <Eye aria-hidden="true" />
            <span>
              {previewMode === 'answer'
                ? 'Answer Key preview is active for publish review.'
                : 'Publish will first switch here so you can review the student prompt and answer key.'}
            </span>
          </div>
          <div className="preview-meta-strip" aria-label="Question metadata preview">
            <span>{draft.unit || 'Unit'}</span>
            <span>{draft.topic || 'Topic'}</span>
            <span>{draft.difficulty}</span>
            <span>{draft.calculator === 'graphing' ? 'Calculator' : 'No calculator'}</span>
          </div>
          <article className="preview-card preview-card--question">
            <h3>Prompt</h3>
            <MathText block text={draft.prompt || 'Question prompt preview'} />
            <QuestionAssetGallery
              ariaLabel="Question image preview"
              assets={draftAssetsToAssets(draft.questionAssets)}
            />
            {draft.type === 'mcq' ? (
              <div className="preview-choice-list" aria-label="Multiple choice preview">
                {draft.choices.map((choice) => (
                  <div
                    className="preview-choice"
                    data-correct={previewMode === 'answer' && choice.id === draft.correctChoiceId}
                    key={choice.id}
                  >
                    <span className="preview-choice__letter">{choice.id}</span>
                    <div>
                      <MathText text={choice.text || `Choice ${choice.id} text`} />
                      {previewMode === 'answer' ? (
                        <small>
                          {choice.explanation || `Choice ${choice.id} explanation preview`}
                        </small>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="preview-frq-list" aria-label="Free response preview">
                {draft.frqParts.map((part, index) => (
                  <div className="preview-frq-part" key={`${part.id}-${index}`}>
                    <h4>Part {part.id || String.fromCharCode(97 + index)}</h4>
                    <MathText block text={part.prompt || 'FRQ part prompt preview'} />
                    {previewMode === 'student' ? <div className="preview-response-box" /> : null}
                  </div>
                ))}
              </div>
            )}
          </article>
          {previewMode === 'answer' ? (
            <>
              {draft.type === 'frq' ? (
                <div className="preview-card">
                  <h3>FRQ Key</h3>
                  {draft.frqParts.map((part, index) => (
                    <div className="preview-frq-key" key={`${part.id}-key-${index}`}>
                      <h4>Part {part.id || String.fromCharCode(97 + index)}</h4>
                      <MathText block text={part.sampleResponse || 'Sample response preview'} />
                      {linesToList(part.expectedWork).length > 0 ? (
                        <ol className="preview-ordered-list">
                          {linesToList(part.expectedWork).map((step, stepIndex) => (
                            <li key={`${part.id}-work-${stepIndex}`}>
                              <MathText text={step} />
                            </li>
                          ))}
                        </ol>
                      ) : null}
                      {part.rubric.length > 0 ? (
                        <div className="preview-rubric-list">
                          {part.rubric.map((criterion, criterionIndex) => (
                            <div
                              className="preview-rubric-item"
                              key={`${criterion.id}-${criterionIndex}`}
                            >
                              <strong>{criterion.points || '0'} pt</strong>
                              <span>{criterion.description || 'Rubric criterion preview'}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="preview-card">
                <h3>Solution</h3>
                <MathText block text={draft.explanationSummary || 'Solution summary preview'} />
                {linesToList(draft.explanationSteps).length > 0 ? (
                  <ol className="preview-ordered-list">
                    {linesToList(draft.explanationSteps).map((step, index) => (
                      <li key={`${step}-${index}`}>
                        <MathText text={step} />
                      </li>
                    ))}
                  </ol>
                ) : null}
                {linesToList(draft.commonMistakes).length > 0 ? (
                  <div className="preview-mistakes">
                    <h4>Common Mistakes</h4>
                    <ul>
                      {linesToList(draft.commonMistakes).map((mistake, index) => (
                        <li key={`${mistake}-${index}`}>
                          <MathText text={mistake} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <QuestionAssetGallery
                  ariaLabel="Solution image preview"
                  assets={draftAssetsToAssets(draft.solutionAssets)}
                />
                {previewVideo ? (
                  <VideoExplanation
                    className="preview-video"
                    title="Video Preview"
                    video={previewVideo}
                  />
                ) : null}
              </div>
            </>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
