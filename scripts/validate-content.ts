import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { QuestionSetSchema } from '../src/data/schemas/questionSchema';

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), '..');
const questionsDir = path.join(repoRoot, 'content', 'questions');

export type AuthoringIssueCode =
  | 'duplicate-question-id'
  | 'duplicate-tag'
  | 'empty-common-mistakes'
  | 'missing-video-transcript';

export type AuthoringIssue = {
  code: AuthoringIssueCode;
  message: string;
  file?: string;
  questionId?: string;
  fieldPath?: string;
};

export type AuthoringQuestion = {
  id: string;
  tags: string[];
  explanation: {
    commonMistakes?: string[];
    video?: {
      url?: string;
      transcriptPath?: string;
    };
  };
};

export type AuthoringQuestionSet = {
  sourcePath?: string;
  questions: AuthoringQuestion[];
};

type SeenQuestionId = {
  sourcePath?: string;
  questionIndex: number;
};

const formatQuestionPath = (questionIndex: number, fieldPath: string) =>
  `questions[${questionIndex}].${fieldPath}`;

const isBlank = (value: string | undefined) => value === undefined || value.trim().length === 0;

const normalizeTag = (tag: string) => tag.trim().toLowerCase();

const describeQuestionLocation = (sourcePath: string | undefined, questionIndex: number) => {
  const source = sourcePath ?? 'provided question set';
  return `${source} questions[${questionIndex}]`;
};

export const validateAuthoringMetadata = (
  questionSets: AuthoringQuestionSet[],
): AuthoringIssue[] => {
  const issues: AuthoringIssue[] = [];
  const seenQuestionIds = new Map<string, SeenQuestionId>();

  for (const questionSet of questionSets) {
    questionSet.questions.forEach((question, questionIndex) => {
      const previousQuestion = seenQuestionIds.get(question.id);

      if (previousQuestion) {
        issues.push({
          code: 'duplicate-question-id',
          message: `Duplicate question ID "${question.id}" also appears in ${describeQuestionLocation(
            previousQuestion.sourcePath,
            previousQuestion.questionIndex,
          )}.`,
          file: questionSet.sourcePath,
          questionId: question.id,
          fieldPath: formatQuestionPath(questionIndex, 'id'),
        });
      } else {
        seenQuestionIds.set(question.id, {
          sourcePath: questionSet.sourcePath,
          questionIndex,
        });
      }

      const seenTags = new Map<string, number>();

      question.tags.forEach((tag, tagIndex) => {
        const normalizedTag = normalizeTag(tag);
        const previousTagIndex = seenTags.get(normalizedTag);

        if (previousTagIndex !== undefined) {
          issues.push({
            code: 'duplicate-tag',
            message: `Question "${question.id}" repeats tag "${tag}" already used at tags[${previousTagIndex}].`,
            file: questionSet.sourcePath,
            questionId: question.id,
            fieldPath: formatQuestionPath(questionIndex, `tags[${tagIndex}]`),
          });
        } else {
          seenTags.set(normalizedTag, tagIndex);
        }
      });

      const commonMistakes = question.explanation.commonMistakes;

      if (
        commonMistakes === undefined ||
        commonMistakes.length === 0 ||
        commonMistakes.some(isBlank)
      ) {
        issues.push({
          code: 'empty-common-mistakes',
          message: `Question "${question.id}" must include non-empty common mistakes for author review.`,
          file: questionSet.sourcePath,
          questionId: question.id,
          fieldPath: formatQuestionPath(questionIndex, 'explanation.commonMistakes'),
        });
      }

      const video = question.explanation.video;

      if (video?.url && isBlank(video.transcriptPath)) {
        issues.push({
          code: 'missing-video-transcript',
          message: `Question "${question.id}" has a video URL but no transcriptPath.`,
          file: questionSet.sourcePath,
          questionId: question.id,
          fieldPath: formatQuestionPath(questionIndex, 'explanation.video.transcriptPath'),
        });
      }
    });
  }

  return issues;
};

export const formatAuthoringIssue = (issue: AuthoringIssue) => {
  const location = [issue.file, issue.fieldPath, issue.questionId].filter(Boolean).join(' ');

  return location ? `${location}: ${issue.message}` : issue.message;
};

const isCliEntryPoint = () =>
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === currentFile;

const runContentValidation = async () => {
  const files = (await readdir(questionsDir)).filter((file) => file.endsWith('.json'));
  const validQuestionSets: AuthoringQuestionSet[] = [];
  let questionCount = 0;
  let hasFailure = false;

  if (files.length === 0) {
    console.error('No question JSON files found in content/questions.');
    process.exit(1);
  }

  for (const file of files) {
    const fullPath = path.join(questionsDir, file);
    const relativePath = path.relative(repoRoot, fullPath);
    const raw = await readFile(fullPath, 'utf8');
    let parsedJson: unknown;

    try {
      parsedJson = JSON.parse(raw) as unknown;
    } catch (error) {
      hasFailure = true;
      console.error(`Invalid JSON: ${relativePath}`);
      console.error(error);
      continue;
    }

    const result = QuestionSetSchema.safeParse(parsedJson);

    if (!result.success) {
      hasFailure = true;
      console.error(`Invalid content: ${relativePath}`);
      console.error(result.error.format());
      continue;
    }

    questionCount += result.data.questions.length;
    validQuestionSets.push({
      sourcePath: relativePath,
      questions: result.data.questions,
    });

    console.log(`Validated ${result.data.questions.length} questions in ${relativePath}.`);
  }

  const authoringIssues = validateAuthoringMetadata(validQuestionSets);

  for (const issue of authoringIssues) {
    hasFailure = true;
    console.error(`Authoring metadata issue [${issue.code}]: ${formatAuthoringIssue(issue)}`);
  }

  if (hasFailure) {
    process.exit(1);
  }

  console.log(`Content validation passed for ${questionCount} questions.`);
};

if (isCliEntryPoint()) {
  runContentValidation().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
