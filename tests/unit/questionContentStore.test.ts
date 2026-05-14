import {
  createQuestionContentRecord,
  setQuestionContentRecordStatus,
} from '../../src/domain/questions/contentRecords';
import {
  createQuestionContentStoreWithFallback,
  type QuestionContentStore,
} from '../../src/data/questionContentStore';
import {
  createLocalQuestionContentStore,
  legacyCustomQuestionsStorageKey,
  loadQuestionContentRecordsFromStorage,
  parseQuestionContentImportPayload,
  questionContentExportVersion,
  type QuestionContentStorage,
} from '../../src/data/localQuestionContentStore';
import {
  questionContentRecordFromSupabaseRow,
  questionContentRecordToSupabaseRow,
  type QuestionContentRow,
} from '../../src/data/supabase/questionContentStore';
import { testFrqQuestion, testMcqQuestion } from '../fixtures/testQuestions';

function createMemoryStorage(): QuestionContentStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

function createFailingStore(): QuestionContentStore {
  async function fail(): Promise<never> {
    throw new Error('cloud unavailable');
  }

  return {
    kind: 'supabase',
    loadRecords: fail,
    listPublishedQuestions: fail,
    getQuestion: fail,
    saveQuestion: fail,
    importQuestions: fail,
    setPublicationStatus: fail,
    deleteQuestion: fail,
  };
}

describe('question content records', () => {
  it('tracks draft, published, and archived lifecycle metadata outside the question body', () => {
    const draftRecord = createQuestionContentRecord(testMcqQuestion, {
      questionSetVersion: 'content-v1',
      now: '2026-05-13T10:00:00.000Z',
      createdBy: 'admin-1',
    });
    const publishedRecord = setQuestionContentRecordStatus(draftRecord, 'published', {
      now: '2026-05-13T10:05:00.000Z',
      updatedBy: 'admin-1',
    });
    const archivedRecord = setQuestionContentRecordStatus(publishedRecord, 'archived', {
      now: '2026-05-13T10:10:00.000Z',
      updatedBy: 'admin-1',
    });

    expect(draftRecord.question).toEqual(testMcqQuestion);
    expect(draftRecord.publication).toMatchObject({
      status: 'draft',
      questionSetVersion: 'content-v1',
      createdBy: 'admin-1',
    });
    expect(publishedRecord.publication).toMatchObject({
      status: 'published',
      publishedAt: '2026-05-13T10:05:00.000Z',
    });
    expect(archivedRecord.publication).toMatchObject({
      status: 'archived',
      archivedAt: '2026-05-13T10:10:00.000Z',
    });
    expect('publication' in archivedRecord.question).toBe(false);
  });
});

describe('local question content store', () => {
  it('loads legacy local question packs as draft content records', () => {
    const storage = createMemoryStorage();

    storage.setItem(
      legacyCustomQuestionsStorageKey,
      JSON.stringify({
        version: 'legacy-local',
        questions: [testMcqQuestion],
      }),
    );

    const records = loadQuestionContentRecordsFromStorage(storage);

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      id: testMcqQuestion.id,
      question: testMcqQuestion,
      publication: {
        status: 'draft',
        questionSetVersion: 'legacy-local',
      },
    });
  });

  it('saves records locally and returns only published questions for student-facing reads', async () => {
    const storage = createMemoryStorage();
    const store = createLocalQuestionContentStore({
      storage,
      defaultQuestionSetVersion: 'local-v1',
      now: () => new Date('2026-05-13T10:00:00.000Z'),
    });

    await store.saveQuestion({
      question: testMcqQuestion,
      status: 'draft',
      updatedBy: 'admin-1',
      now: '2026-05-13T10:00:00.000Z',
    });
    expect(await store.listPublishedQuestions()).toEqual([]);

    await store.setPublicationStatus(testMcqQuestion.id, 'published', {
      now: '2026-05-13T10:05:00.000Z',
      updatedBy: 'admin-1',
    });

    const publishedQuestions = await store.listPublishedQuestions();
    const storedRecords = await store.loadRecords();

    expect(publishedQuestions).toEqual([testMcqQuestion]);
    expect(storedRecords[0].publication).toMatchObject({
      status: 'published',
      questionSetVersion: 'local-v1',
      publishedAt: '2026-05-13T10:05:00.000Z',
    });
  });

  it('skips protected, duplicate, and existing questions during import', async () => {
    const storage = createMemoryStorage();
    const store = createLocalQuestionContentStore({
      storage,
      protectedQuestionIds: [testFrqQuestion.id],
    });

    await store.saveQuestion({ question: testMcqQuestion });

    const result = await store.importQuestions({
      questions: [testMcqQuestion, testFrqQuestion, testFrqQuestion],
      status: 'draft',
    });

    expect(result).toMatchObject({
      imported: 0,
      skipped: 3,
    });
    expect(result.records.map((record) => record.id)).toEqual([testMcqQuestion.id]);
  });

  it('parses exported content payloads and reports invalid record errors', () => {
    const payload = {
      version: questionContentExportVersion,
      records: [
        createQuestionContentRecord(testMcqQuestion, {
          now: '2026-05-13T10:00:00.000Z',
        }),
        {
          id: 'bad-record',
          question: {
            ...testMcqQuestion,
            id: '',
          },
          publication: {
            status: 'draft',
          },
        },
      ],
    };

    const result = parseQuestionContentImportPayload(JSON.stringify(payload));

    expect(result.records).toHaveLength(1);
    expect(result.rejectedCount).toBe(1);
    expect(result.errors[0]).toContain('Question content record 2');
  });
});

describe('Supabase question content row mapping', () => {
  it('round-trips a published record through the existing questions table shape', () => {
    const record = createQuestionContentRecord(testMcqQuestion, {
      status: 'published',
      questionSetVersion: 'server-v1',
      now: '2026-05-13T10:00:00.000Z',
      createdBy: 'admin-1',
      updatedBy: 'admin-1',
    });
    const row = questionContentRecordToSupabaseRow(record, 'admin-1');

    expect(row).toMatchObject({
      id: testMcqQuestion.id,
      question_set_version: 'server-v1',
      is_published: true,
      created_by: 'admin-1',
    });
    expect(questionContentRecordFromSupabaseRow(row)).toEqual(record);
  });

  it('maps bare legacy JSON content and archived metadata from Supabase rows', () => {
    const row: QuestionContentRow = {
      id: testFrqQuestion.id,
      question_set_version: 'server-v1',
      content: {
        question: testFrqQuestion,
        publication: {
          status: 'archived',
          archivedAt: '2026-05-13T10:10:00.000Z',
        },
      },
      is_published: false,
      created_by: null,
      created_at: '2026-05-13T10:00:00.000Z',
      updated_at: '2026-05-13T10:10:00.000Z',
    };

    const record = questionContentRecordFromSupabaseRow(row);

    expect(record).toMatchObject({
      id: testFrqQuestion.id,
      question: testFrqQuestion,
      publication: {
        status: 'archived',
        questionSetVersion: 'server-v1',
        archivedAt: '2026-05-13T10:10:00.000Z',
      },
    });
  });
});

describe('question content store fallback', () => {
  it('uses the local store when the primary store fails', async () => {
    const fallbackEvents: string[] = [];
    const localStore = createLocalQuestionContentStore({
      storage: createMemoryStorage(),
    });
    const store = createQuestionContentStoreWithFallback(
      createFailingStore(),
      localStore,
      (operation) => fallbackEvents.push(operation),
    );

    const savedRecord = await store.saveQuestion({
      question: testMcqQuestion,
      status: 'published',
      now: '2026-05-13T10:00:00.000Z',
    });

    expect(savedRecord.publication.status).toBe('published');
    expect(await store.listPublishedQuestions()).toEqual([testMcqQuestion]);
    expect(fallbackEvents).toEqual(['saveQuestion', 'listPublishedQuestions']);
  });
});
