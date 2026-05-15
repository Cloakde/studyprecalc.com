import { getPublicationStatus, type QuestionPublicationStatus } from './publication';
import type { FrqPart, McqChoice, Question, QuestionAsset, RubricCriterion } from './types';

export type ContentReadinessIssueSeverity = 'warning' | 'blocker';

export type ContentReadinessIssueCategory =
  | 'accessibility'
  | 'explanation'
  | 'frq'
  | 'metadata'
  | 'publishing';

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
  | 'missing-prompt'
  | 'missing-question-id'
  | 'missing-skill'
  | 'missing-tags'
  | 'missing-topic'
  | 'missing-unit'
  | 'missing-video-transcript'
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

function questionUsesLocalMedia(question: Question): boolean {
  const questionAssetsUseLocalMedia = question.assets?.some((asset) =>
    isLocalImagePath(asset.path),
  );
  const explanationAssetsUseLocalMedia = question.explanation.assets?.some((asset) =>
    isLocalImagePath(asset.path),
  );
  const videoUsesLocalMedia = isLocalVideoPath(question.explanation.video?.url);

  return Boolean(
    questionAssetsUseLocalMedia || explanationAssetsUseLocalMedia || videoUsesLocalMedia,
  );
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

    if (seenTags.has(normalized)) {
      addIssue(
        issues,
        {
          code: 'duplicate-tag',
          category: 'metadata',
          severity: 'warning',
          fieldPath: `tags[${tagIndex}]`,
          message: `Remove duplicate tag "${tag}".`,
        },
        questionId,
      );
    }

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
}

function checkAssets(
  assets: QuestionAsset[] | undefined,
  fieldPathPrefix: string,
  questionId: string,
  issues: MutableIssueList,
) {
  assets?.forEach((asset, assetIndex) => {
    const fieldPath = `${fieldPathPrefix}[${assetIndex}].alt`;

    if (!hasText(asset.alt)) {
      addIssue(
        issues,
        {
          code: 'missing-image-alt-text',
          category: 'accessibility',
          severity: 'blocker',
          fieldPath,
          message: 'Add descriptive alt text for every question image, graph, or table.',
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
          fieldPath,
          message:
            'Replace generic image alt text with what the student needs to know from the image.',
        },
        questionId,
      );
    }
  });
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

  if (options.disallowLocalMedia && status !== 'archived' && questionUsesLocalMedia(question)) {
    addIssue(
      issues,
      {
        code: 'local-media-publish-blocker',
        category: 'publishing',
        severity: 'blocker',
        fieldPath: 'assets',
        message:
          'Cloud-published questions cannot use browser-local images or videos. Upload images to cloud storage and use an external video link.',
      },
      questionId,
    );
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
