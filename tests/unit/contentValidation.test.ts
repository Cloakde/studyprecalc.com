import seedQuestionSet from '../../content/questions/seed-ap-precalc.json';
import { type AuthoringQuestion, validateAuthoringMetadata } from '../../scripts/validate-content';

const makeQuestion = (overrides: Partial<AuthoringQuestion> = {}): AuthoringQuestion => {
  const baseQuestion: AuthoringQuestion = {
    id: 'pc-mcq-rat-999',
    tags: ['rational-functions', 'holes'],
    explanation: {
      commonMistakes: ['Confusing a removable discontinuity with a vertical asymptote.'],
    },
  };

  return {
    ...baseQuestion,
    ...overrides,
    explanation: {
      ...baseQuestion.explanation,
      ...overrides.explanation,
    },
  };
};

const issueCodesFor = (question: AuthoringQuestion) =>
  validateAuthoringMetadata([{ sourcePath: 'test-content.json', questions: [question] }]).map(
    (issue) => issue.code,
  );

describe('validateAuthoringMetadata', () => {
  it('accepts the seed content authoring metadata', () => {
    const issues = validateAuthoringMetadata([
      {
        sourcePath: 'content/questions/seed-ap-precalc.json',
        questions: seedQuestionSet.questions,
      },
    ]);

    expect(issues).toEqual([]);
  });

  it('flags duplicate question IDs across question sets', () => {
    const issues = validateAuthoringMetadata([
      {
        sourcePath: 'content/questions/a.json',
        questions: [makeQuestion()],
      },
      {
        sourcePath: 'content/questions/b.json',
        questions: [makeQuestion({ tags: ['exponential-functions'] })],
      },
    ]);

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'duplicate-question-id',
        file: 'content/questions/b.json',
        questionId: 'pc-mcq-rat-999',
      }),
    );
  });

  it('flags duplicate tags after trimming and case normalization', () => {
    expect(issueCodesFor(makeQuestion({ tags: ['models', ' Models '] }))).toContain(
      'duplicate-tag',
    );
  });

  it('flags missing or empty common mistakes', () => {
    expect(issueCodesFor(makeQuestion({ explanation: { commonMistakes: [] } }))).toContain(
      'empty-common-mistakes',
    );
    expect(issueCodesFor(makeQuestion({ explanation: { commonMistakes: ['   '] } }))).toContain(
      'empty-common-mistakes',
    );
  });

  it('flags video references without transcripts', () => {
    expect(
      issueCodesFor(
        makeQuestion({
          explanation: {
            commonMistakes: ['Using the wrong monthly multiplier.'],
            video: { url: 'https://example.com/video/exponential-models' },
          },
        }),
      ),
    ).toContain('missing-video-transcript');
  });
});
