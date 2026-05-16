import { getPublicationStatus, type QuestionPublicationStatus } from './publication';
import type { FrqPart, McqChoice, Question, QuestionAsset, RubricCriterion } from './types';

export type ContentReadinessIssueSeverity = 'warning' | 'blocker';

export type ContentReadinessIssueCategory =
  | 'accessibility'
  | 'explanation'
  | 'frq'
  | 'media'
  | 'metadata'
  | 'publishing';

export const contentReadinessIssueCategories: ContentReadinessIssueCategory[] = [
  'publishing',
  'media',
  'metadata',
  'explanation',
  'frq',
  'accessibility',
];

export const contentReadinessIssueCategoryLabels: Record<ContentReadinessIssueCategory, string> = {
  accessibility: 'Accessibility',
  explanation: 'Explanation',
  frq: 'FRQ scoring',
  media: 'Media',
  metadata: 'Metadata',
  publishing: 'Publishing',
};

export const contentReadinessStatusLabels: Record<QuestionPublicationStatus, string> = {
  archived: 'Archived',
  draft: 'Draft',
  published: 'Published',
};

export const contentReadinessSeverityLabels: Record<ContentReadinessIssueSeverity, string> = {
  blocker: 'Blockers',
  warning: 'Warnings',
};

export type ContentReadinessIssueCode =
  | 'duplicate-question-id'
  | 'duplicate-tag'
  | 'generic-metadata'
  | 'invalid-correct-choice'
  | 'invalid-video-duration'
  | 'invalid-frq-rubric-points'
  | 'local-media-publish-blocker'
  | 'missing-choice-explanation'
  | 'missing-choice-text'
  | 'missing-common-mistakes'
  | 'missing-explanation-steps'
  | 'missing-explanation-summary'
  | 'missing-frq-expected-work'
  | 'missing-frq-part'
  | 'missing-frq-part-prompt'
  | 'missing-frq-rubric'
  | 'missing-frq-rubric-description'
  | 'missing-frq-sample-response'
  | 'missing-image-alt-text'
  | 'missing-image-caption'
  | 'missing-prompt'
  | 'missing-question-id'
  | 'missing-skill'
  | 'missing-tags'
  | 'missing-topic'
  | 'missing-unit'
  | 'missing-video-duration'
  | 'missing-video-thumbnail'
  | 'missing-video-transcript'
  | 'placeholder-media-url'
  | 'template-placeholder'
  | 'weak-image-alt-text'
  | 'weak-tags';

export type ContentReadinessIssue = {
  code: ContentReadinessIssueCode;
  category: ContentReadinessIssueCategory;
  severity: ContentReadinessIssueSeverity;
  questionId: string;
  fieldPath: string;
  message: string;
};

export type ContentReadinessQuestionReport = {
  questionId: string;
  questionLabel: string;
  questionType: Question['type'];
  status: QuestionPublicationStatus;
  issues: ContentReadinessIssue[];
  blockerCount: number;
  warningCount: number;
  isReadyToPublish: boolean;
};

export type ContentReadinessSummary = {
  questionCount: number;
  readyQuestionCount: number;
  warningOnlyQuestionCount: number;
  blockedQuestionCount: number;
  issueCount: number;
  blockerCount: number;
  warningCount: number;
  publishBlockerCount: number;
};

export type ContentReadinessReport = {
  summary: ContentReadinessSummary;
  questionReports: ContentReadinessQuestionReport[];
  issues: ContentReadinessIssue[];
};

export type ContentReadinessSeverityFilter = 'all' | ContentReadinessIssueSeverity;

export type ContentReadinessStatusFilter = 'all' | QuestionPublicationStatus;

export type ContentReadinessCategoryFilter = 'all' | ContentReadinessIssueCategory;

export type ContentReadinessDashboardGroupBy = 'category' | 'severity' | 'status';

export type ContentReadinessDashboardFilters = {
  severity?: ContentReadinessSeverityFilter;
  status?: ContentReadinessStatusFilter;
  category?: ContentReadinessCategoryFilter;
  groupBy?: ContentReadinessDashboardGroupBy;
};

export type ContentReadinessDashboardIssue = ContentReadinessIssue & {
  questionReportKey: string;
  questionLabel: string;
  questionType: Question['type'];
  status: QuestionPublicationStatus;
  actionMessage: string;
};

export type ContentReadinessDashboardGroup = {
  key: string;
  label: string;
  issueCount: number;
  blockerCount: number;
  warningCount: number;
  questionCount: number;
  issues: ContentReadinessDashboardIssue[];
};

export type ContentReadinessDashboardCounts = {
  severity: Record<ContentReadinessSeverityFilter, number>;
  status: Record<ContentReadinessStatusFilter, number>;
  category: Record<ContentReadinessCategoryFilter, number>;
};

export type ContentReadinessDashboard = {
  filters: Required<ContentReadinessDashboardFilters>;
  counts: ContentReadinessDashboardCounts;
  groups: ContentReadinessDashboardGroup[];
  visibleIssues: ContentReadinessDashboardIssue[];
  visibleIssueCount: number;
  visibleQuestionCount: number;
  totalIssueCount: number;
  emptyMessage: string;
};

export type ContentReadinessOptions = {
  getStatus?: (question: Question, questionIndex: number) => QuestionPublicationStatus;
  disallowLocalMedia?: boolean;
};

type MutableIssueList = ContentReadinessIssue[];

const genericMetadataValues = new Set([
  'n/a',
  'na',
  'none',
  'placeholder',
  'skill',
  'tbd',
  'test',
  'test skill',
  'test topic',
  'test unit',
  'todo',
  'topic',
  'unit',
]);

const weakAltTextValues = new Set([
  'chart',
  'diagram',
  'graph',
  'image',
  'photo',
  'picture',
  'plot',
  'table',
  'uploaded image',
]);

const contentReadinessActionMessages: Record<ContentReadinessIssueCode, string> = {
  'duplicate-question-id': 'Rename one of the duplicate IDs so each saved question is stable.',
  'duplicate-tag': 'Remove repeated tags and keep one canonical spelling.',
  'generic-metadata': 'Replace placeholder metadata with AP Precalculus-specific language.',
  'invalid-correct-choice': 'Select a correct answer ID that matches one of the MCQ choices.',
  'invalid-frq-rubric-points':
    'Enter positive whole-number point values for each rubric criterion.',
  'invalid-video-duration': 'Enter the video duration as a positive whole number of seconds.',
  'local-media-publish-blocker':
    'Replace browser-local media with cloud image references or an external video link.',
  'missing-choice-explanation':
    'Add choice-level feedback explaining why the answer is correct or incorrect.',
  'missing-choice-text': 'Add visible answer text for each MCQ choice.',
  'missing-common-mistakes': 'Add at least one likely mistake students should review.',
  'missing-explanation-steps': 'Add worked solution steps for the explanation panel.',
  'missing-explanation-summary': 'Add a concise solution summary before launch review.',
  'missing-frq-expected-work':
    'List the expected work steps students should show for each FRQ part.',
  'missing-frq-part': 'Add at least one FRQ part before this question can launch.',
  'missing-frq-part-prompt': 'Add the student-facing prompt for each FRQ part.',
  'missing-frq-rubric': 'Add rubric criteria so FRQ self-scoring is possible.',
  'missing-frq-rubric-description':
    'Describe what earns each rubric point in student-facing language.',
  'missing-frq-sample-response':
    'Add a sample response for students to compare after attempting the FRQ.',
  'missing-image-caption':
    'Add a short caption that names the prompt or explanation visual for student review.',
  'missing-image-alt-text': 'Write alt text that communicates the image, graph, or table content.',
  'missing-prompt': 'Add the student-facing question prompt.',
  'missing-question-id': 'Add a stable, unique question ID.',
  'missing-skill': 'Add the assessed AP Precalculus skill.',
  'missing-tags': 'Add searchable tags for review, assignment, and import QA.',
  'missing-topic': 'Add the topic used for practice filters and dashboard reporting.',
  'missing-unit': 'Add the AP Precalculus unit or local course unit.',
  'missing-video-duration':
    'Add the external video duration in seconds so students can plan review time.',
  'missing-video-thumbnail':
    'Add a thumbnail image for external video explanations before launch review.',
  'missing-video-transcript': 'Add a transcript path for every attached video explanation.',
  'placeholder-media-url':
    'Replace placeholder media URLs with final owner-controlled images, transcripts, or videos.',
  'template-placeholder': 'Replace every OWNER_TODO template placeholder with final content.',
  'weak-image-alt-text':
    'Replace generic alt text with the specific math information shown in the image.',
  'weak-tags': 'Add another searchable tag that captures the topic or skill.',
};

const contentReadinessStatusOrder: QuestionPublicationStatus[] = ['published', 'draft', 'archived'];

const contentReadinessSeverityOrder: ContentReadinessIssueSeverity[] = ['blocker', 'warning'];

const defaultDashboardFilters: Required<ContentReadinessDashboardFilters> = {
  severity: 'all',
  status: 'all',
  category: 'all',
  groupBy: 'severity',
};

function trimText(value: string | undefined): string {
  return value?.trim() ?? '';
}

function hasText(value: string | undefined): boolean {
  return trimText(value).length > 0;
}

function cleanedList(values: string[] | undefined): string[] {
  return values?.map((value) => value.trim()).filter(Boolean) ?? [];
}

function addIssue(
  issues: MutableIssueList,
  issue: Omit<ContentReadinessIssue, 'questionId'> & { questionId?: string },
  fallbackQuestionId: string,
) {
  issues.push({
    ...issue,
    questionId: issue.questionId ?? fallbackQuestionId,
  });
}

function normalizedTag(value: string): string {
  return value.trim().toLowerCase();
}

function isWeakMetadataValue(value: string | undefined): boolean {
  const normalized = trimText(value).toLowerCase();

  return normalized.length > 0 && genericMetadataValues.has(normalized);
}

function hasTemplatePlaceholder(value: string | undefined): boolean {
  return /\bOWNER_TODO\b/i.test(value ?? '');
}

function checkTemplatePlaceholder(
  value: string | undefined,
  fieldPath: string,
  questionId: string,
  issues: MutableIssueList,
) {
  if (!hasTemplatePlaceholder(value)) {
    return;
  }

  addIssue(
    issues,
    {
      code: 'template-placeholder',
      category: 'publishing',
      severity: 'blocker',
      fieldPath,
      message: 'Replace the owner template placeholder before launch review.',
    },
    questionId,
  );
}

function getPathLabel(path: string | undefined): string {
  const trimmedPath = trimText(path)
    .replace(/^supabase-image:/, '')
    .replace(/^local-image:/, '')
    .replace(/[?#].*$/, '');
  const lastSegment = trimmedPath.split(/[\\/]/).filter(Boolean).pop() ?? trimmedPath;

  return lastSegment
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .toLowerCase();
}

function isWeakAltText(asset: QuestionAsset): boolean {
  const altText = trimText(asset.alt).toLowerCase();

  if (!altText) {
    return false;
  }

  if (altText.length < 8 || weakAltTextValues.has(altText)) {
    return true;
  }

  const pathLabel = getPathLabel(asset.path);

  return Boolean(pathLabel) && altText === pathLabel;
}

function isLocalImagePath(path: string | undefined): boolean {
  return trimText(path).startsWith('local-image:');
}

function isLocalVideoPath(path: string | undefined): boolean {
  return trimText(path).startsWith('local-video:');
}

function isHttpUrl(value: string | undefined): boolean {
  const trimmedValue = trimText(value);

  if (!trimmedValue) {
    return false;
  }

  try {
    const url = new URL(trimmedValue);

    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isPlaceholderMediaReference(value: string | undefined): boolean {
  const trimmedValue = trimText(value);

  if (!trimmedValue) {
    return false;
  }

  if (/\b(OWNER_TODO|placeholder)\b/i.test(trimmedValue)) {
    return true;
  }

  if (!isHttpUrl(trimmedValue)) {
    return false;
  }

  const hostname = new URL(trimmedValue).hostname.toLowerCase();

  return hostname === 'example.com' || hostname === 'example.org' || hostname.endsWith('.example');
}

function checkMetadata(
  question: Question,
  questionId: string,
  issues: MutableIssueList,
  duplicateQuestionIds: Set<string>,
) {
  if (!hasText(question.id)) {
    addIssue(
      issues,
      {
        code: 'missing-question-id',
        category: 'publishing',
        severity: 'blocker',
        fieldPath: 'id',
        message: 'Add a stable question ID before publishing.',
      },
      questionId,
    );
  } else if (duplicateQuestionIds.has(question.id)) {
    addIssue(
      issues,
      {
        code: 'duplicate-question-id',
        category: 'publishing',
        severity: 'blocker',
        fieldPath: 'id',
        message: `Question ID "${question.id}" is used more than once.`,
      },
      questionId,
    );
  }

  const requiredMetadata: Array<{
    fieldPath: 'unit' | 'topic' | 'skill' | 'prompt';
    code: ContentReadinessIssueCode;
    message: string;
  }> = [
    {
      fieldPath: 'unit',
      code: 'missing-unit',
      message: 'Add a unit so the question can be filtered and assigned.',
    },
    {
      fieldPath: 'topic',
      code: 'missing-topic',
      message: 'Add a topic so the question appears in topic review.',
    },
    {
      fieldPath: 'skill',
      code: 'missing-skill',
      message: 'Add a skill statement for practice and reporting surfaces.',
    },
    {
      fieldPath: 'prompt',
      code: 'missing-prompt',
      message: 'Add the student-facing prompt before publishing.',
    },
  ];

  requiredMetadata.forEach(({ fieldPath, code, message }) => {
    if (!hasText(question[fieldPath])) {
      addIssue(
        issues,
        {
          code,
          category: fieldPath === 'prompt' ? 'publishing' : 'metadata',
          severity: 'blocker',
          fieldPath,
          message,
        },
        questionId,
      );
    } else if (fieldPath !== 'prompt' && isWeakMetadataValue(question[fieldPath])) {
      addIssue(
        issues,
        {
          code: 'generic-metadata',
          category: 'metadata',
          severity: 'warning',
          fieldPath,
          message: `Replace the generic ${fieldPath} value with AP Precalculus-specific metadata.`,
        },
        questionId,
      );
    }

    checkTemplatePlaceholder(question[fieldPath], fieldPath, questionId, issues);
  });

  const tags = cleanedList(question.tags);

  if (tags.length === 0) {
    addIssue(
      issues,
      {
        code: 'missing-tags',
        category: 'metadata',
        severity: 'blocker',
        fieldPath: 'tags',
        message: 'Add at least one searchable tag before publishing.',
      },
      questionId,
    );
  } else if (tags.length < 2) {
    addIssue(
      issues,
      {
        code: 'weak-tags',
        category: 'metadata',
        severity: 'warning',
        fieldPath: 'tags',
        message: 'Add a second tag so admins can find this question by skill and topic.',
      },
      questionId,
    );
  }

  const seenTags = new Set<string>();

  tags.forEach((tag, tagIndex) => {
    const normalized = normalizedTag(tag);
    const fieldPath = `tags[${tagIndex}]`;

    if (seenTags.has(normalized)) {
      addIssue(
        issues,
        {
          code: 'duplicate-tag',
          category: 'metadata',
          severity: 'warning',
          fieldPath,
          message: `Remove duplicate tag "${tag}".`,
        },
        questionId,
      );
    }

    checkTemplatePlaceholder(tag, fieldPath, questionId, issues);
    seenTags.add(normalized);
  });
}

function checkExplanation(question: Question, questionId: string, issues: MutableIssueList) {
  if (!hasText(question.explanation.summary)) {
    addIssue(
      issues,
      {
        code: 'missing-explanation-summary',
        category: 'explanation',
        severity: 'blocker',
        fieldPath: 'explanation.summary',
        message: 'Add an explanation summary before publishing.',
      },
      questionId,
    );
  }

  checkTemplatePlaceholder(question.explanation.summary, 'explanation.summary', questionId, issues);

  if (cleanedList(question.explanation.steps).length === 0) {
    addIssue(
      issues,
      {
        code: 'missing-explanation-steps',
        category: 'explanation',
        severity: 'blocker',
        fieldPath: 'explanation.steps',
        message: 'Add worked solution steps before publishing.',
      },
      questionId,
    );
  }

  question.explanation.steps.forEach((step, stepIndex) =>
    checkTemplatePlaceholder(step, `explanation.steps[${stepIndex}]`, questionId, issues),
  );

  if (cleanedList(question.explanation.commonMistakes).length === 0) {
    addIssue(
      issues,
      {
        code: 'missing-common-mistakes',
        category: 'explanation',
        severity: 'blocker',
        fieldPath: 'explanation.commonMistakes',
        message: 'Add at least one common mistake for review guidance.',
      },
      questionId,
    );
  }

  question.explanation.commonMistakes?.forEach((mistake, mistakeIndex) =>
    checkTemplatePlaceholder(
      mistake,
      `explanation.commonMistakes[${mistakeIndex}]`,
      questionId,
      issues,
    ),
  );

  const video = question.explanation.video;

  if (video?.url && !hasText(video.transcriptPath)) {
    addIssue(
      issues,
      {
        code: 'missing-video-transcript',
        category: 'explanation',
        severity: 'blocker',
        fieldPath: 'explanation.video.transcriptPath',
        message: 'Add a transcript path for the video explanation.',
      },
      questionId,
    );
  }

  if (isHttpUrl(video?.url)) {
    if (!hasText(video?.thumbnailPath)) {
      addIssue(
        issues,
        {
          code: 'missing-video-thumbnail',
          category: 'media',
          severity: 'warning',
          fieldPath: 'explanation.video.thumbnailPath',
          message: 'Add a thumbnail image for the external video explanation.',
        },
        questionId,
      );
    }

    if (video?.durationSeconds === undefined) {
      addIssue(
        issues,
        {
          code: 'missing-video-duration',
          category: 'media',
          severity: 'warning',
          fieldPath: 'explanation.video.durationSeconds',
          message: 'Add the external video duration in seconds for student planning.',
        },
        questionId,
      );
    }
  }

  if (
    video?.durationSeconds !== undefined &&
    (!Number.isInteger(video.durationSeconds) || video.durationSeconds <= 0)
  ) {
    addIssue(
      issues,
      {
        code: 'invalid-video-duration',
        category: 'explanation',
        severity: 'blocker',
        fieldPath: 'explanation.video.durationSeconds',
        message: 'Use a positive whole-number duration for the video explanation.',
      },
      questionId,
    );
  }

  const videoMediaReferences: Array<[fieldPath: string, value: string | undefined]> = [
    ['explanation.video.url', video?.url],
    ['explanation.video.thumbnailPath', video?.thumbnailPath],
    ['explanation.video.transcriptPath', video?.transcriptPath],
  ];

  videoMediaReferences.forEach(([fieldPath, value]) => {
    if (!isPlaceholderMediaReference(value)) {
      return;
    }

    addIssue(
      issues,
      {
        code: 'placeholder-media-url',
        category: 'media',
        severity: 'blocker',
        fieldPath,
        message: 'Replace placeholder video media URLs before publishing.',
      },
      questionId,
    );
  });
}

function checkAssets(
  assets: QuestionAsset[] | undefined,
  fieldPathPrefix: string,
  questionId: string,
  issues: MutableIssueList,
) {
  assets?.forEach((asset, assetIndex) => {
    const assetFieldPath = `${fieldPathPrefix}[${assetIndex}]`;
    const altFieldPath = `${assetFieldPath}.alt`;

    if (isPlaceholderMediaReference(asset.path)) {
      addIssue(
        issues,
        {
          code: 'placeholder-media-url',
          category: 'media',
          severity: 'blocker',
          fieldPath: `${assetFieldPath}.path`,
          message: 'Replace placeholder image media URLs before publishing.',
        },
        questionId,
      );
    }

    if (!hasText(asset.alt)) {
      addIssue(
        issues,
        {
          code: 'missing-image-alt-text',
          category: 'accessibility',
          severity: 'blocker',
          fieldPath: altFieldPath,
          message: `Add descriptive alt text for every ${fieldPathPrefix === 'assets' ? 'prompt' : 'explanation'} image, graph, or table.`,
        },
        questionId,
      );
      return;
    }

    if (isWeakAltText(asset)) {
      addIssue(
        issues,
        {
          code: 'weak-image-alt-text',
          category: 'accessibility',
          severity: 'warning',
          fieldPath: altFieldPath,
          message:
            'Replace generic image alt text with what the student needs to know from the image.',
        },
        questionId,
      );
    }

    if ((asset.type === 'graph' || asset.type === 'table') && !hasText(asset.caption)) {
      addIssue(
        issues,
        {
          code: 'missing-image-caption',
          category: 'media',
          severity: 'warning',
          fieldPath: `${assetFieldPath}.caption`,
          message: `Add a short caption for this ${fieldPathPrefix === 'assets' ? 'prompt' : 'explanation'} ${asset.type}.`,
        },
        questionId,
      );
    }

    checkTemplatePlaceholder(asset.alt, altFieldPath, questionId, issues);
    checkTemplatePlaceholder(asset.caption, `${assetFieldPath}.caption`, questionId, issues);
  });
}

function checkLocalMediaReferences(
  question: Question,
  questionId: string,
  issues: MutableIssueList,
) {
  question.assets?.forEach((asset, assetIndex) => {
    if (!isLocalImagePath(asset.path)) {
      return;
    }

    addIssue(
      issues,
      {
        code: 'local-media-publish-blocker',
        category: 'media',
        severity: 'blocker',
        fieldPath: `assets[${assetIndex}].path`,
        message:
          'Prompt images stored in one browser profile must be uploaded to cloud storage before publishing.',
      },
      questionId,
    );
  });

  question.explanation.assets?.forEach((asset, assetIndex) => {
    if (!isLocalImagePath(asset.path)) {
      return;
    }

    addIssue(
      issues,
      {
        code: 'local-media-publish-blocker',
        category: 'media',
        severity: 'blocker',
        fieldPath: `explanation.assets[${assetIndex}].path`,
        message:
          'Explanation images stored in one browser profile must be uploaded to cloud storage before publishing.',
      },
      questionId,
    );
  });

  if (isLocalVideoPath(question.explanation.video?.url)) {
    addIssue(
      issues,
      {
        code: 'local-media-publish-blocker',
        category: 'media',
        severity: 'blocker',
        fieldPath: 'explanation.video.url',
        message:
          'Local draft videos cannot be published; use an approved external video link before student release.',
      },
      questionId,
    );
  }
}

function checkMcq(
  question: Question & { type: 'mcq' },
  questionId: string,
  issues: MutableIssueList,
) {
  const choiceIds = new Set<McqChoice['id']>();

  question.choices.forEach((choice, choiceIndex) => {
    choiceIds.add(choice.id);

    if (!hasText(choice.text)) {
      addIssue(
        issues,
        {
          code: 'missing-choice-text',
          category: 'publishing',
          severity: 'blocker',
          fieldPath: `choices[${choiceIndex}].text`,
          message: `Add answer text for choice ${choice.id}.`,
        },
        questionId,
      );
    }

    checkTemplatePlaceholder(choice.text, `choices[${choiceIndex}].text`, questionId, issues);

    if (!hasText(choice.explanation)) {
      addIssue(
        issues,
        {
          code: 'missing-choice-explanation',
          category: 'explanation',
          severity: 'blocker',
          fieldPath: `choices[${choiceIndex}].explanation`,
          message: `Add feedback for choice ${choice.id}.`,
        },
        questionId,
      );
    }

    checkTemplatePlaceholder(
      choice.explanation,
      `choices[${choiceIndex}].explanation`,
      questionId,
      issues,
    );
  });

  if (!choiceIds.has(question.correctChoiceId)) {
    addIssue(
      issues,
      {
        code: 'invalid-correct-choice',
        category: 'publishing',
        severity: 'blocker',
        fieldPath: 'correctChoiceId',
        message: 'Choose a correct answer that matches one of the MCQ choices.',
      },
      questionId,
    );
  }
}

function checkRubricCriterion(
  criterion: RubricCriterion,
  criterionIndex: number,
  partIndex: number,
  questionId: string,
  issues: MutableIssueList,
) {
  if (!hasText(criterion.description)) {
    addIssue(
      issues,
      {
        code: 'missing-frq-rubric-description',
        category: 'frq',
        severity: 'blocker',
        fieldPath: `parts[${partIndex}].rubric[${criterionIndex}].description`,
        message: 'Add a description for each FRQ rubric criterion.',
      },
      questionId,
    );
  }

  checkTemplatePlaceholder(
    criterion.description,
    `parts[${partIndex}].rubric[${criterionIndex}].description`,
    questionId,
    issues,
  );

  if (!Number.isInteger(criterion.points) || criterion.points <= 0) {
    addIssue(
      issues,
      {
        code: 'invalid-frq-rubric-points',
        category: 'frq',
        severity: 'blocker',
        fieldPath: `parts[${partIndex}].rubric[${criterionIndex}].points`,
        message: 'Use positive whole-number points for each FRQ rubric criterion.',
      },
      questionId,
    );
  }
}

function checkFrqPart(
  part: FrqPart,
  partIndex: number,
  questionId: string,
  issues: MutableIssueList,
) {
  if (!hasText(part.prompt)) {
    addIssue(
      issues,
      {
        code: 'missing-frq-part-prompt',
        category: 'frq',
        severity: 'blocker',
        fieldPath: `parts[${partIndex}].prompt`,
        message: 'Add a prompt for each FRQ part.',
      },
      questionId,
    );
  }

  checkTemplatePlaceholder(part.prompt, `parts[${partIndex}].prompt`, questionId, issues);

  if (!hasText(part.sampleResponse)) {
    addIssue(
      issues,
      {
        code: 'missing-frq-sample-response',
        category: 'frq',
        severity: 'blocker',
        fieldPath: `parts[${partIndex}].sampleResponse`,
        message: 'Add a sample response for each FRQ part.',
      },
      questionId,
    );
  }

  checkTemplatePlaceholder(
    part.sampleResponse,
    `parts[${partIndex}].sampleResponse`,
    questionId,
    issues,
  );

  if (cleanedList(part.expectedWork).length === 0) {
    addIssue(
      issues,
      {
        code: 'missing-frq-expected-work',
        category: 'frq',
        severity: 'blocker',
        fieldPath: `parts[${partIndex}].expectedWork`,
        message: 'Add expected work steps for each FRQ part.',
      },
      questionId,
    );
  }

  part.expectedWork.forEach((step, stepIndex) =>
    checkTemplatePlaceholder(
      step,
      `parts[${partIndex}].expectedWork[${stepIndex}]`,
      questionId,
      issues,
    ),
  );

  if (!part.rubric || part.rubric.length === 0) {
    addIssue(
      issues,
      {
        code: 'missing-frq-rubric',
        category: 'frq',
        severity: 'blocker',
        fieldPath: `parts[${partIndex}].rubric`,
        message: 'Add at least one rubric criterion for each FRQ part.',
      },
      questionId,
    );
    return;
  }

  part.rubric.forEach((criterion, criterionIndex) =>
    checkRubricCriterion(criterion, criterionIndex, partIndex, questionId, issues),
  );
}

function checkFrq(
  question: Question & { type: 'frq' },
  questionId: string,
  issues: MutableIssueList,
) {
  if (question.parts.length === 0) {
    addIssue(
      issues,
      {
        code: 'missing-frq-part',
        category: 'frq',
        severity: 'blocker',
        fieldPath: 'parts',
        message: 'Add at least one FRQ part before publishing.',
      },
      questionId,
    );
    return;
  }

  question.parts.forEach((part, partIndex) => checkFrqPart(part, partIndex, questionId, issues));
}

function getQuestionLabel(question: Question): string {
  return (
    trimText(question.skill) ||
    trimText(question.topic) ||
    trimText(question.id) ||
    'Untitled question'
  );
}

function getDuplicateQuestionIds(questions: readonly Question[]): Set<string> {
  const seenQuestionIds = new Set<string>();
  const duplicateQuestionIds = new Set<string>();

  questions.forEach((question) => {
    const questionId = trimText(question.id);

    if (!questionId) {
      return;
    }

    if (seenQuestionIds.has(questionId)) {
      duplicateQuestionIds.add(questionId);
      return;
    }

    seenQuestionIds.add(questionId);
  });

  return duplicateQuestionIds;
}

export function getContentReadinessIssues(
  question: Question,
  options: ContentReadinessOptions & {
    duplicateQuestionIds?: Set<string>;
    questionIndex?: number;
  } = {},
): ContentReadinessIssue[] {
  const issues: ContentReadinessIssue[] = [];
  const questionId = trimText(question.id) || `question-${options.questionIndex ?? 0}`;
  const duplicateQuestionIds = options.duplicateQuestionIds ?? new Set<string>();
  const status =
    options.getStatus?.(question, options.questionIndex ?? 0) ?? getPublicationStatus(question);

  checkMetadata(question, questionId, issues, duplicateQuestionIds);
  checkExplanation(question, questionId, issues);
  checkAssets(question.assets, 'assets', questionId, issues);
  checkAssets(question.explanation.assets, 'explanation.assets', questionId, issues);

  if (question.type === 'mcq') {
    checkMcq(question, questionId, issues);
  } else {
    checkFrq(question, questionId, issues);
  }

  if (options.disallowLocalMedia && status !== 'archived') {
    checkLocalMediaReferences(question, questionId, issues);
  }

  return issues;
}

export function buildContentReadinessReport(
  questions: readonly Question[],
  options: ContentReadinessOptions = {},
): ContentReadinessReport {
  const duplicateQuestionIds = getDuplicateQuestionIds(questions);
  const questionReports = questions.map((question, questionIndex) => {
    const status = options.getStatus?.(question, questionIndex) ?? getPublicationStatus(question);
    const issues = getContentReadinessIssues(question, {
      ...options,
      duplicateQuestionIds,
      questionIndex,
    });
    const blockerCount = issues.filter((issue) => issue.severity === 'blocker').length;
    const warningCount = issues.length - blockerCount;

    return {
      questionId: trimText(question.id) || `question-${questionIndex}`,
      questionLabel: getQuestionLabel(question),
      questionType: question.type,
      status,
      issues,
      blockerCount,
      warningCount,
      isReadyToPublish: blockerCount === 0,
    };
  });
  const issues = questionReports.flatMap((questionReport) => questionReport.issues);
  const blockerCount = issues.filter((issue) => issue.severity === 'blocker').length;
  const warningCount = issues.length - blockerCount;
  const publishBlockerCount = questionReports
    .filter((questionReport) => questionReport.status !== 'archived')
    .reduce((total, questionReport) => total + questionReport.blockerCount, 0);

  return {
    summary: {
      questionCount: questions.length,
      readyQuestionCount: questionReports.filter(
        (questionReport) => questionReport.isReadyToPublish,
      ).length,
      warningOnlyQuestionCount: questionReports.filter(
        (questionReport) => questionReport.blockerCount === 0 && questionReport.warningCount > 0,
      ).length,
      blockedQuestionCount: questionReports.filter(
        (questionReport) => questionReport.blockerCount > 0,
      ).length,
      issueCount: issues.length,
      blockerCount,
      warningCount,
      publishBlockerCount,
    },
    questionReports,
    issues,
  };
}

export function getContentReadinessActionMessage(issue: ContentReadinessIssue): string {
  return contentReadinessActionMessages[issue.code] ?? issue.message;
}

function normalizeDashboardFilters(
  filters: ContentReadinessDashboardFilters,
): Required<ContentReadinessDashboardFilters> {
  return {
    severity: filters.severity ?? defaultDashboardFilters.severity,
    status: filters.status ?? defaultDashboardFilters.status,
    category: filters.category ?? defaultDashboardFilters.category,
    groupBy: filters.groupBy ?? defaultDashboardFilters.groupBy,
  };
}

function createDashboardIssues(report: ContentReadinessReport): ContentReadinessDashboardIssue[] {
  return report.questionReports.flatMap((questionReport, questionReportIndex) =>
    questionReport.issues.map((issue) => ({
      ...issue,
      questionReportKey: `${questionReport.questionId}:${questionReportIndex}`,
      questionLabel: questionReport.questionLabel,
      questionType: questionReport.questionType,
      status: questionReport.status,
      actionMessage: getContentReadinessActionMessage(issue),
    })),
  );
}

function createDashboardCounts(
  issues: readonly ContentReadinessDashboardIssue[],
): ContentReadinessDashboardCounts {
  const severity: Record<ContentReadinessSeverityFilter, number> = {
    all: issues.length,
    blocker: 0,
    warning: 0,
  };
  const status: Record<ContentReadinessStatusFilter, number> = {
    all: issues.length,
    archived: 0,
    draft: 0,
    published: 0,
  };
  const category: Record<ContentReadinessCategoryFilter, number> = {
    all: issues.length,
    accessibility: 0,
    explanation: 0,
    frq: 0,
    media: 0,
    metadata: 0,
    publishing: 0,
  };

  issues.forEach((issue) => {
    severity[issue.severity] += 1;
    status[issue.status] += 1;
    category[issue.category] += 1;
  });

  return {
    severity,
    status,
    category,
  };
}

function dashboardIssueMatchesFilters(
  issue: ContentReadinessDashboardIssue,
  filters: Required<ContentReadinessDashboardFilters>,
): boolean {
  const matchesSeverity = filters.severity === 'all' || issue.severity === filters.severity;
  const matchesStatus = filters.status === 'all' || issue.status === filters.status;
  const matchesCategory = filters.category === 'all' || issue.category === filters.category;

  return matchesSeverity && matchesStatus && matchesCategory;
}

function compareDashboardIssues(
  leftIssue: ContentReadinessDashboardIssue,
  rightIssue: ContentReadinessDashboardIssue,
): number {
  const leftSeverityIndex = contentReadinessSeverityOrder.indexOf(leftIssue.severity);
  const rightSeverityIndex = contentReadinessSeverityOrder.indexOf(rightIssue.severity);

  if (leftSeverityIndex !== rightSeverityIndex) {
    return leftSeverityIndex - rightSeverityIndex;
  }

  const leftStatusIndex = contentReadinessStatusOrder.indexOf(leftIssue.status);
  const rightStatusIndex = contentReadinessStatusOrder.indexOf(rightIssue.status);

  if (leftStatusIndex !== rightStatusIndex) {
    return leftStatusIndex - rightStatusIndex;
  }

  const leftCategoryIndex = contentReadinessIssueCategories.indexOf(leftIssue.category);
  const rightCategoryIndex = contentReadinessIssueCategories.indexOf(rightIssue.category);

  if (leftCategoryIndex !== rightCategoryIndex) {
    return leftCategoryIndex - rightCategoryIndex;
  }

  return `${leftIssue.questionId} ${leftIssue.fieldPath}`.localeCompare(
    `${rightIssue.questionId} ${rightIssue.fieldPath}`,
  );
}

function getDashboardGroupKey(
  issue: ContentReadinessDashboardIssue,
  groupBy: ContentReadinessDashboardGroupBy,
): string {
  if (groupBy === 'status') {
    return issue.status;
  }

  if (groupBy === 'category') {
    return issue.category;
  }

  return issue.severity;
}

function getDashboardGroupLabel(key: string, groupBy: ContentReadinessDashboardGroupBy): string {
  if (groupBy === 'status') {
    return contentReadinessStatusLabels[key as QuestionPublicationStatus] ?? key;
  }

  if (groupBy === 'category') {
    return contentReadinessIssueCategoryLabels[key as ContentReadinessIssueCategory] ?? key;
  }

  return contentReadinessSeverityLabels[key as ContentReadinessIssueSeverity] ?? key;
}

function getDashboardGroupOrder(key: string, groupBy: ContentReadinessDashboardGroupBy): number {
  if (groupBy === 'status') {
    return contentReadinessStatusOrder.indexOf(key as QuestionPublicationStatus);
  }

  if (groupBy === 'category') {
    return contentReadinessIssueCategories.indexOf(key as ContentReadinessIssueCategory);
  }

  return contentReadinessSeverityOrder.indexOf(key as ContentReadinessIssueSeverity);
}

function createDashboardGroups(
  issues: readonly ContentReadinessDashboardIssue[],
  groupBy: ContentReadinessDashboardGroupBy,
): ContentReadinessDashboardGroup[] {
  const groupsByKey = new Map<string, ContentReadinessDashboardIssue[]>();

  issues.forEach((issue) => {
    const groupKey = getDashboardGroupKey(issue, groupBy);
    const existingIssues = groupsByKey.get(groupKey);

    if (existingIssues) {
      existingIssues.push(issue);
      return;
    }

    groupsByKey.set(groupKey, [issue]);
  });

  return [...groupsByKey.entries()]
    .map(([key, groupIssues]) => {
      const uniqueQuestionIds = new Set(groupIssues.map((issue) => issue.questionReportKey));
      const blockerCount = groupIssues.filter((issue) => issue.severity === 'blocker').length;

      return {
        key,
        label: getDashboardGroupLabel(key, groupBy),
        issueCount: groupIssues.length,
        blockerCount,
        warningCount: groupIssues.length - blockerCount,
        questionCount: uniqueQuestionIds.size,
        issues: groupIssues,
      };
    })
    .sort((leftGroup, rightGroup) => {
      const leftIndex = getDashboardGroupOrder(leftGroup.key, groupBy);
      const rightIndex = getDashboardGroupOrder(rightGroup.key, groupBy);

      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }

      return leftGroup.label.localeCompare(rightGroup.label);
    });
}

function getDashboardEmptyMessage(report: ContentReadinessReport, totalIssueCount: number): string {
  if (report.summary.questionCount === 0) {
    return 'No authored questions to scan yet.';
  }

  if (totalIssueCount === 0) {
    return 'No launch QA issues found in saved authored questions.';
  }

  return 'No readiness items match the selected filters.';
}

export function buildContentReadinessDashboard(
  report: ContentReadinessReport,
  filters: ContentReadinessDashboardFilters = {},
): ContentReadinessDashboard {
  const normalizedFilters = normalizeDashboardFilters(filters);
  const allIssues = createDashboardIssues(report).sort(compareDashboardIssues);
  const visibleIssues = allIssues.filter((issue) =>
    dashboardIssueMatchesFilters(issue, normalizedFilters),
  );
  const visibleQuestionCount = new Set(visibleIssues.map((issue) => issue.questionReportKey)).size;

  return {
    filters: normalizedFilters,
    counts: createDashboardCounts(allIssues),
    groups: createDashboardGroups(visibleIssues, normalizedFilters.groupBy),
    visibleIssues,
    visibleIssueCount: visibleIssues.length,
    visibleQuestionCount,
    totalIssueCount: allIssues.length,
    emptyMessage: getDashboardEmptyMessage(report, allIssues.length),
  };
}
