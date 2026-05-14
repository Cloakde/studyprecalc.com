import { QuestionSetSchema } from '../../src/data/schemas/questionSchema';
import {
  archiveQuestion,
  createQuestionContentRecord,
  getPublishedQuestions,
  getPublicationStatus,
  isArchivedQuestion,
  isDraftQuestion,
  isPublishedQuestion,
  markQuestionDraft,
  publicationStatusFromPublishedFlag,
  publicationStatusToPublishedFlag,
  publishQuestion,
  setQuestionContentStatus,
  upsertQuestionContentRecord,
} from '../../src/domain/questions/publication';
import {
  canViewQuestion,
  getStudentVisibleQuestions,
  getVisibleQuestionsForAudience,
} from '../../src/domain/questions/visibility';
import { testMcqQuestion, testQuestionSet } from '../fixtures/testQuestions';

describe('question publication lifecycle', () => {
  it('treats legacy questions without status as drafts', () => {
    expect(getPublicationStatus(testMcqQuestion)).toBe('draft');
    expect(isDraftQuestion(testMcqQuestion)).toBe(true);
    expect(isPublishedQuestion(testMcqQuestion)).toBe(false);
    expect(isArchivedQuestion(testMcqQuestion)).toBe(false);
  });

  it('returns immutable copies when changing lifecycle status', () => {
    const publishedQuestion = publishQuestion(testMcqQuestion);
    const archivedQuestion = archiveQuestion(publishedQuestion);
    const draftQuestion = markQuestionDraft(archivedQuestion);

    expect(testMcqQuestion).not.toHaveProperty('publicationStatus');
    expect(publishedQuestion).toMatchObject({
      id: testMcqQuestion.id,
      publicationStatus: 'published',
    });
    expect(archivedQuestion).toMatchObject({
      id: testMcqQuestion.id,
      publicationStatus: 'archived',
    });
    expect(draftQuestion).toMatchObject({ id: testMcqQuestion.id, publicationStatus: 'draft' });
  });

  it('maps Supabase-style published flags to lifecycle status', () => {
    expect(publicationStatusFromPublishedFlag(true)).toBe('published');
    expect(publicationStatusFromPublishedFlag(false)).toBe('draft');
    expect(publicationStatusToPublishedFlag('published')).toBe(true);
    expect(publicationStatusToPublishedFlag('draft')).toBe(false);
    expect(publicationStatusToPublishedFlag('archived')).toBe(false);
  });

  it('creates and updates content records while preserving publication status', () => {
    const createdRecord = createQuestionContentRecord(testMcqQuestion, {
      status: 'draft',
      now: () => new Date('2026-05-13T10:00:00.000Z'),
    });
    const publishedRecords = setQuestionContentStatus(
      [createdRecord],
      testMcqQuestion.id,
      'published',
      {
        updatedAt: '2026-05-13T11:00:00.000Z',
      },
    );
    const upsertedRecords = upsertQuestionContentRecord(
      publishedRecords,
      { ...testMcqQuestion, prompt: 'Updated prompt.' },
      { now: () => new Date('2026-05-13T12:00:00.000Z') },
    );

    expect(upsertedRecords[0]).toMatchObject({
      id: testMcqQuestion.id,
      status: 'published',
      createdAt: '2026-05-13T10:00:00.000Z',
      updatedAt: '2026-05-13T12:00:00.000Z',
      question: {
        prompt: 'Updated prompt.',
        publicationStatus: 'published',
      },
    });
    expect(getPublishedQuestions(upsertedRecords).map((question) => question.id)).toEqual([
      testMcqQuestion.id,
    ]);
  });
});

describe('question publication visibility', () => {
  const draftQuestion = markQuestionDraft({ ...testMcqQuestion, id: 'draft-question' });
  const publishedQuestion = publishQuestion({ ...testMcqQuestion, id: 'published-question' });
  const archivedQuestion = archiveQuestion({ ...testMcqQuestion, id: 'archived-question' });
  const questions = [draftQuestion, publishedQuestion, archivedQuestion];

  it('shows students only published questions', () => {
    expect(canViewQuestion(draftQuestion, { role: 'student' })).toBe(false);
    expect(canViewQuestion(publishedQuestion, { role: 'student' })).toBe(true);
    expect(canViewQuestion(archivedQuestion, { role: 'student' })).toBe(false);
    expect(getStudentVisibleQuestions(questions).map((question) => question.id)).toEqual([
      'published-question',
    ]);
  });

  it('lets admins preview drafts while keeping archived content hidden by default', () => {
    expect(
      getVisibleQuestionsForAudience(questions, { role: 'admin' }).map((question) => question.id),
    ).toEqual(['draft-question', 'published-question']);
  });

  it('lets admin callers opt out of draft preview or include archived content', () => {
    expect(
      getVisibleQuestionsForAudience(questions, { role: 'admin', previewDrafts: false }).map(
        (question) => question.id,
      ),
    ).toEqual(['published-question']);

    expect(
      getVisibleQuestionsForAudience(questions, { role: 'admin', includeArchived: true }).map(
        (question) => question.id,
      ),
    ).toEqual(['draft-question', 'published-question', 'archived-question']);
  });
});

describe('question publication schema', () => {
  it('accepts explicit publication status values', () => {
    const parsed = QuestionSetSchema.parse({
      version: testQuestionSet.version,
      questions: [
        {
          ...testMcqQuestion,
          id: 'published-schema-question',
          publicationStatus: 'published',
        },
      ],
    });

    expect(parsed.questions[0]).toMatchObject({
      id: 'published-schema-question',
      publicationStatus: 'published',
    });
  });

  it('rejects invalid publication statuses', () => {
    expect(() =>
      QuestionSetSchema.parse({
        version: testQuestionSet.version,
        questions: [
          {
            ...testMcqQuestion,
            id: 'invalid-publication-status-question',
            publicationStatus: 'retired',
          },
        ],
      }),
    ).toThrow();
  });
});
