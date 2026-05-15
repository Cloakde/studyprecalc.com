import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildContentReadinessReport,
  type ContentReadinessReport,
} from '../src/domain/questions/contentReadiness';
import { QuestionSetSchema, type ValidatedQuestionSet } from '../src/data/schemas/questionSchema';
import {
  formatAuthoringIssue,
  validateAuthoringMetadata,
  type AuthoringIssue,
  type AuthoringQuestionSet,
} from './validate-content';

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), '..');
const defaultInputPath = 'content/questions';

export type FirstPackReadinessStatus = 'pass' | 'fail' | 'warn';

export type FirstPackReadinessCheck = {
  name: string;
  status: FirstPackReadinessStatus;
  message: string;
  ownerAction?: string;
};

export type FirstPackQuestionSet = {
  sourcePath: string;
  questionSet: ValidatedQuestionSet;
};

export type FirstPackSchemaIssue = {
  file: string;
  message: string;
};

export type FirstPackReadinessOptions = {
  minQuestions: number;
  disallowLocalMedia: boolean;
  failOnWarnings: boolean;
  requirePublished: boolean;
  allowArchived: boolean;
};

export type FirstPackReadinessResult = {
  checks: FirstPackReadinessCheck[];
  questionSets: FirstPackQuestionSet[];
  schemaIssues: FirstPackSchemaIssue[];
  authoringIssues: AuthoringIssue[];
  readinessReport: ContentReadinessReport;
  totalQuestionCount: number;
  activeQuestionCount: number;
  archivedQuestionCount: number;
  unpublishedActiveQuestionIds: string[];
};

export type FirstPackReadinessCliConfig = {
  inputPaths: string[];
  options: FirstPackReadinessOptions;
  help: boolean;
};

export const defaultFirstPackReadinessOptions: FirstPackReadinessOptions = {
  minQuestions: 1,
  disallowLocalMedia: true,
  failOnWarnings: false,
  requirePublished: false,
  allowArchived: false,
};

function toRelativePath(filePath: string): string {
  const relativePath = path.relative(repoRoot, filePath);

  return relativePath && !relativePath.startsWith('..') ? relativePath : filePath;
}

function parseMinQuestions(value: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('--min-questions must be a positive whole number.');
  }

  return parsed;
}

function formatSchemaPath(pathSegments: Array<string | number>): string {
  if (pathSegments.length === 0) {
    return '(root)';
  }

  return pathSegments
    .map((segment) => (typeof segment === 'number' ? `[${segment}]` : segment))
    .join('.');
}

function formatCheck(check: FirstPackReadinessCheck): string {
  const label = check.status.toUpperCase().padEnd(4, ' ');

  return `[${label}] ${check.name}: ${check.message}`;
}

function getActiveQuestionReports(report: ContentReadinessReport) {
  return report.questionReports.filter((questionReport) => questionReport.status !== 'archived');
}

function getUniqueOwnerActions(checks: FirstPackReadinessCheck[]): string[] {
  return checks
    .map((check) => check.ownerAction)
    .filter((action): action is string => Boolean(action))
    .filter((action, index, actions) => actions.indexOf(action) === index);
}

async function expandInputPath(inputPath: string): Promise<string[]> {
  const absolutePath = path.resolve(repoRoot, inputPath);
  const stats = await stat(absolutePath);

  if (stats.isDirectory()) {
    const files = await readdir(absolutePath);

    return files
      .filter((file) => file.endsWith('.json'))
      .sort((left, right) => left.localeCompare(right))
      .map((file) => path.join(absolutePath, file));
  }

  if (!stats.isFile()) {
    throw new Error(`${inputPath} is not a file or directory.`);
  }

  return [absolutePath];
}

export async function loadFirstPackQuestionSets(
  inputPaths: string[] = [defaultInputPath],
): Promise<{
  questionSets: FirstPackQuestionSet[];
  schemaIssues: FirstPackSchemaIssue[];
}> {
  const uniqueFiles = new Set<string>();
  const questionSets: FirstPackQuestionSet[] = [];
  const schemaIssues: FirstPackSchemaIssue[] = [];

  for (const inputPath of inputPaths) {
    let expandedFiles: string[];

    try {
      expandedFiles = await expandInputPath(inputPath);
    } catch (error) {
      schemaIssues.push({
        file: inputPath,
        message: error instanceof Error ? error.message : 'Unable to read input path.',
      });
      continue;
    }

    for (const filePath of expandedFiles) {
      if (uniqueFiles.has(filePath)) {
        continue;
      }

      uniqueFiles.add(filePath);
      const sourcePath = toRelativePath(filePath);
      let parsedJson: unknown;

      try {
        parsedJson = JSON.parse(await readFile(filePath, 'utf8')) as unknown;
      } catch (error) {
        schemaIssues.push({
          file: sourcePath,
          message: error instanceof Error ? error.message : 'Invalid JSON.',
        });
        continue;
      }

      const parsedQuestionSet = QuestionSetSchema.safeParse(parsedJson);

      if (!parsedQuestionSet.success) {
        parsedQuestionSet.error.issues.forEach((issue) => {
          schemaIssues.push({
            file: sourcePath,
            message: `${formatSchemaPath(issue.path)}: ${issue.message}`,
          });
        });
        continue;
      }

      questionSets.push({
        sourcePath,
        questionSet: parsedQuestionSet.data,
      });
    }
  }

  if (uniqueFiles.size === 0) {
    schemaIssues.push({
      file: inputPaths.join(', ') || defaultInputPath,
      message: 'No JSON question set files found.',
    });
  }

  return { questionSets, schemaIssues };
}

export function checkFirstPackReadiness(
  questionSets: FirstPackQuestionSet[],
  schemaIssues: FirstPackSchemaIssue[] = [],
  options: FirstPackReadinessOptions = defaultFirstPackReadinessOptions,
): FirstPackReadinessResult {
  const questions = questionSets.flatMap((questionSet) => questionSet.questionSet.questions);
  const readinessReport = buildContentReadinessReport(questions, {
    disallowLocalMedia: options.disallowLocalMedia,
  });
  const activeQuestionReports = getActiveQuestionReports(readinessReport);
  const archivedQuestionCount =
    readinessReport.questionReports.length - activeQuestionReports.length;
  const authoringQuestionSets: AuthoringQuestionSet[] = questionSets.map((questionSet) => ({
    sourcePath: questionSet.sourcePath,
    questions: questionSet.questionSet.questions,
  }));
  const authoringIssues = validateAuthoringMetadata(authoringQuestionSets);
  const unpublishedActiveQuestionIds = activeQuestionReports
    .filter((questionReport) => questionReport.status !== 'published')
    .map((questionReport) => questionReport.questionId);
  const activeBlockerCount = activeQuestionReports.reduce(
    (total, questionReport) => total + questionReport.blockerCount,
    0,
  );
  const activeWarningCount = activeQuestionReports.reduce(
    (total, questionReport) => total + questionReport.warningCount,
    0,
  );
  const localMediaBlockerCount = readinessReport.issues.filter(
    (issue) => issue.code === 'local-media-publish-blocker',
  ).length;
  const checks: FirstPackReadinessCheck[] = [
    {
      name: 'question set schema',
      status: schemaIssues.length === 0 ? 'pass' : 'fail',
      message:
        schemaIssues.length === 0
          ? `${questionSets.length} question set file(s) parsed.`
          : `${schemaIssues.length} schema/JSON issue(s) found.`,
      ownerAction: 'Fix JSON/schema errors, export the pack again, and rerun this command.',
    },
    {
      name: 'active question count',
      status: activeQuestionReports.length >= options.minQuestions ? 'pass' : 'fail',
      message: `${activeQuestionReports.length} active question(s); minimum is ${options.minQuestions}.`,
      ownerAction: `Add at least ${options.minQuestions} non-archived owner-authored question(s).`,
    },
    {
      name: 'archived content',
      status: archivedQuestionCount === 0 ? 'pass' : options.allowArchived ? 'warn' : 'fail',
      message:
        archivedQuestionCount === 0
          ? 'No archived questions are included in the launch pack.'
          : `${archivedQuestionCount} archived question(s) included.`,
      ownerAction: 'Export a launch pack that contains only draft or published questions.',
    },
    {
      name: 'authoring metadata',
      status: authoringIssues.length === 0 ? 'pass' : 'fail',
      message:
        authoringIssues.length === 0
          ? 'IDs, tags, common mistakes, and video transcript metadata passed.'
          : `${authoringIssues.length} metadata issue(s) found.`,
      ownerAction: 'Fix authoring metadata issues before the pack is handed to students.',
    },
    {
      name: 'publish blockers',
      status: activeBlockerCount === 0 ? 'pass' : 'fail',
      message:
        activeBlockerCount === 0
          ? 'No active readiness blockers found.'
          : `${activeBlockerCount} active readiness blocker(s) found.`,
      ownerAction: 'Fix every blocker in the content readiness report before publishing.',
    },
    {
      name: 'cloud media portability',
      status: !options.disallowLocalMedia || localMediaBlockerCount === 0 ? 'pass' : 'fail',
      message: options.disallowLocalMedia
        ? localMediaBlockerCount === 0
          ? 'No browser-local image or video references found.'
          : `${localMediaBlockerCount} browser-local media reference(s) must be replaced.`
        : 'Browser-local media references are allowed for this run.',
      ownerAction:
        'Upload images through the cloud manager or use approved public URLs before student release.',
    },
    {
      name: 'readiness warnings',
      status: activeWarningCount === 0 ? 'pass' : options.failOnWarnings ? 'fail' : 'warn',
      message:
        activeWarningCount === 0
          ? 'No active readiness warnings found.'
          : `${activeWarningCount} active readiness warning(s) found.`,
      ownerAction: 'Review warnings for weak metadata, duplicate tags, or weak alt text.',
    },
    {
      name: 'publication status',
      status:
        !options.requirePublished || unpublishedActiveQuestionIds.length === 0 ? 'pass' : 'fail',
      message: options.requirePublished
        ? unpublishedActiveQuestionIds.length === 0
          ? 'Every active question is marked published in the checked pack.'
          : `${unpublishedActiveQuestionIds.length} active question(s) are not marked published.`
        : 'Draft questions are allowed; this run checks publish readiness before release.',
      ownerAction:
        'Publish the active questions in the admin content manager, export again, and rerun with --require-published.',
    },
  ];

  return {
    checks,
    questionSets,
    schemaIssues,
    authoringIssues,
    readinessReport,
    totalQuestionCount: questions.length,
    activeQuestionCount: activeQuestionReports.length,
    archivedQuestionCount,
    unpublishedActiveQuestionIds,
  };
}

export function formatFirstPackReadinessResult(result: FirstPackReadinessResult): string {
  const lines = [
    'First-pack launch readiness',
    '',
    `Files checked: ${result.questionSets.length}`,
    `Questions checked: ${result.totalQuestionCount} total, ${result.activeQuestionCount} active, ${result.archivedQuestionCount} archived`,
    '',
    ...result.checks.map(formatCheck),
  ];

  if (result.schemaIssues.length > 0) {
    lines.push('', 'Schema/JSON issues:');
    result.schemaIssues.forEach((issue) => {
      lines.push(`- ${issue.file}: ${issue.message}`);
    });
  }

  if (result.authoringIssues.length > 0) {
    lines.push('', 'Authoring metadata issues:');
    result.authoringIssues.forEach((issue) => {
      lines.push(`- [${issue.code}] ${formatAuthoringIssue(issue)}`);
    });
  }

  if (result.readinessReport.issues.length > 0) {
    lines.push('', 'Content readiness issues:');
    result.readinessReport.issues.forEach((issue) => {
      lines.push(
        `- [${issue.severity}] ${issue.questionId} ${issue.fieldPath} (${issue.code}): ${issue.message}`,
      );
    });
  }

  if (result.unpublishedActiveQuestionIds.length > 0) {
    lines.push('', `Not marked published: ${result.unpublishedActiveQuestionIds.join(', ')}`);
  }

  const ownerActions = getUniqueOwnerActions(
    result.checks.filter((check) => check.status !== 'pass'),
  );

  if (ownerActions.length > 0) {
    lines.push('', 'Owner next action(s):');
    ownerActions.forEach((action) => lines.push(`- ${action}`));
  } else {
    lines.push(
      '',
      'Next: import or confirm this owner-authored pack in Manage Content, publish it, and run the live admin/student smoke checklist when production Supabase is configured.',
    );
  }

  return lines.join('\n');
}

export function getFirstPackReadinessExitCode(result: FirstPackReadinessResult): number {
  return result.checks.some((check) => check.status === 'fail') ? 1 : 0;
}

export function parseFirstPackReadinessArgs(argv: string[]): FirstPackReadinessCliConfig {
  const inputPaths: string[] = [];
  const options = { ...defaultFirstPackReadinessOptions };
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === '--allow-local-media') {
      options.disallowLocalMedia = false;
    } else if (arg === '--fail-on-warnings') {
      options.failOnWarnings = true;
    } else if (arg === '--require-published') {
      options.requirePublished = true;
    } else if (arg === '--allow-archived') {
      options.allowArchived = true;
    } else if (arg === '--min-questions') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('--min-questions requires a value.');
      }

      options.minQuestions = parseMinQuestions(value);
      index += 1;
    } else if (arg.startsWith('--min-questions=')) {
      options.minQuestions = parseMinQuestions(arg.slice('--min-questions='.length));
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      inputPaths.push(arg);
    }
  }

  return {
    inputPaths: inputPaths.length > 0 ? inputPaths : [defaultInputPath],
    options,
    help,
  };
}

function getUsage(): string {
  return [
    'Usage: npm run check:first-pack -- [path ...] [options]',
    '',
    'Paths may be question-set JSON files or directories containing JSON question sets.',
    `Default path: ${defaultInputPath}`,
    '',
    'Options:',
    '  --min-questions <n>   Require at least n active questions. Default: 1.',
    '  --allow-local-media   Permit local-image:/local-video: references for a local-only dry run.',
    '  --allow-archived      Warn instead of fail when archived questions are included.',
    '  --require-published   Require every active question to be marked publicationStatus=published.',
    '  --fail-on-warnings    Treat readiness warnings as failures.',
    '  --help                Show this help.',
  ].join('\n');
}

const isCliEntryPoint = () =>
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === currentFile;

async function main() {
  const config = parseFirstPackReadinessArgs(process.argv.slice(2));

  if (config.help) {
    console.log(getUsage());
    return;
  }

  const loadedQuestionSets = await loadFirstPackQuestionSets(config.inputPaths);
  const result = checkFirstPackReadiness(
    loadedQuestionSets.questionSets,
    loadedQuestionSets.schemaIssues,
    config.options,
  );

  console.log(formatFirstPackReadinessResult(result));
  process.exitCode = getFirstPackReadinessExitCode(result);
}

if (isCliEntryPoint()) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
