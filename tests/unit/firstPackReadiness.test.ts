import {
  checkFirstPackReadiness,
  defaultFirstPackReadinessOptions,
  formatFirstPackReadinessResult,
  getFirstPackReadinessExitCode,
  parseFirstPackReadinessArgs,
  type FirstPackQuestionSet,
} from '../../scripts/check-first-pack-readiness';
import type { FrqQuestion, McqQuestion, Question } from '../../src/domain/questions/types';
import { testFrqQuestion, testMcqQuestion } from '../fixtures/testQuestions';

function makeReadyMcq(overrides: Partial<McqQuestion> = {}): McqQuestion {
  return {
    ...testMcqQuestion,
    id: 'owner-mcq-001',
    unit: 'Polynomial and Rational Functions',
    topic: 'Rates of change',
    skill: 'Interpret average rate of change from a table',
    tags: ['rates-of-change', 'no-calculator'],
    publicationStatus: 'draft',
    ...overrides,
    explanation: {
      ...testMcqQuestion.explanation,
      ...overrides.explanation,
    },
  };
}

function makeReadyFrq(overrides: Partial<FrqQuestion> = {}): FrqQuestion {
  return {
    ...testFrqQuestion,
    id: 'owner-frq-001',
    unit: 'Exponential and Logarithmic Functions',
    topic: 'Exponential model interpretation',
    skill: 'Build and justify an exponential model',
    tags: ['exponential-models', 'frq'],
    publicationStatus: 'draft',
    ...overrides,
    explanation: {
      ...testFrqQuestion.explanation,
      ...overrides.explanation,
    },
  };
}

function makeQuestionSets(questions: Question[]): FirstPackQuestionSet[] {
  return [
    {
      sourcePath: 'owner-first-pack.json',
      questionSet: {
        version: 'test',
        questions,
      },
    },
  ];
}

describe('first-pack readiness checks', () => {
  it('passes a ready owner-authored pack without requiring Supabase credentials', () => {
    const result = checkFirstPackReadiness(makeQuestionSets([makeReadyMcq(), makeReadyFrq()]));

    expect(getFirstPackReadinessExitCode(result)).toBe(0);
    expect(result.checks.every((check) => check.status === 'pass')).toBe(true);
    expect(formatFirstPackReadinessResult(result)).toContain(
      'Next: import or confirm this owner-authored pack',
    );
  });

  it('fails when authoring metadata and publish readiness blockers remain', () => {
    const result = checkFirstPackReadiness(
      makeQuestionSets([
        makeReadyMcq({
          id: 'owner-mcq-blocked',
          explanation: {
            ...testMcqQuestion.explanation,
            commonMistakes: [],
          },
        }),
      ]),
    );
    const output = formatFirstPackReadinessResult(result);

    expect(getFirstPackReadinessExitCode(result)).toBe(1);
    expect(result.authoringIssues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'empty-common-mistakes' })]),
    );
    expect(result.readinessReport.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'missing-common-mistakes' })]),
    );
    expect(output).toContain('Authoring metadata issues:');
    expect(output).toContain('Content readiness issues:');
  });

  it('blocks browser-local media by default and allows it only for explicit local dry runs', () => {
    const localMediaQuestion = makeReadyMcq({
      id: 'owner-mcq-local-media',
      assets: [
        {
          id: 'local-graph',
          type: 'graph',
          path: 'local-image:abc123',
          alt: 'Graph of a polynomial model with labeled intercepts and turning points',
        },
      ],
    });

    const defaultResult = checkFirstPackReadiness(makeQuestionSets([localMediaQuestion]));
    const localDryRunResult = checkFirstPackReadiness(makeQuestionSets([localMediaQuestion]), [], {
      ...defaultFirstPackReadinessOptions,
      disallowLocalMedia: false,
    });

    expect(getFirstPackReadinessExitCode(defaultResult)).toBe(1);
    expect(defaultResult.readinessReport.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'local-media-publish-blocker' })]),
    );
    expect(getFirstPackReadinessExitCode(localDryRunResult)).toBe(0);
  });

  it('can require published status for the final export check', () => {
    const result = checkFirstPackReadiness(
      makeQuestionSets([makeReadyMcq({ id: 'owner-mcq-draft', publicationStatus: 'draft' })]),
      [],
      {
        ...defaultFirstPackReadinessOptions,
        requirePublished: true,
      },
    );

    expect(getFirstPackReadinessExitCode(result)).toBe(1);
    expect(result.unpublishedActiveQuestionIds).toEqual(['owner-mcq-draft']);
    expect(formatFirstPackReadinessResult(result)).toContain(
      'Not marked published: owner-mcq-draft',
    );
  });

  it('parses command-line options and input paths', () => {
    const config = parseFirstPackReadinessArgs([
      'exports/owner-pack.json',
      '--min-questions',
      '5',
      '--allow-local-media',
      '--require-published',
      '--fail-on-warnings',
    ]);

    expect(config.inputPaths).toEqual(['exports/owner-pack.json']);
    expect(config.options).toMatchObject({
      minQuestions: 5,
      disallowLocalMedia: false,
      requirePublished: true,
      failOnWarnings: true,
    });
    expect(() => parseFirstPackReadinessArgs(['--min-questions', '0'])).toThrow(
      '--min-questions must be a positive whole number.',
    );
  });
});
