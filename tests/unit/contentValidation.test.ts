import seedQuestionSet from '../../content/questions/seed-ap-precalc.json';
import { type AuthoringQuestion, validateAuthoringMetadata } from '../../scripts/validate-content';

const makeQuestion = (overrides: Partial<AuthoringQuestion> = {}): AuthoringQuestion => {
  const baseQuestion: AuthoringQuestion = {
    id: 'test-mcq-999',
    tags: ['test-topic', 'test-skill'],
    explanation: {
      commonMistakes: ['Selecting a distractor without checking the prompt.'],
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
  it('accepts the empty starter content set', () => {
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
        questions: [makeQuestion({ tags: ['test-topic-two'] })],
      },
    ]);

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'duplicate-question-id',
        file: 'content/questions/b.json',
        questionId: 'test-mcq-999',
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
