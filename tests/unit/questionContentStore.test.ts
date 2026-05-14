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
  createSupabaseQuestionContentStore,
  extractCloudQuestionImageAssets,
  questionContentRecordFromSupabaseRow,
  questionContentRecordToSupabaseRow,
  type QuestionContentRow,
} from '../../src/data/supabase/questionContentStore';
import type { Question } from '../../src/domain/questions/types';
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

type MockSupabaseError = {
  message: string;
};

type MockSupabaseOperation = {
  table: string;
  action: string;
  values?: unknown;
};

type MockSupabaseClientOptions = {
  mediaRecords?: Array<{ id: string; storage_path: string }>;
  mediaRecordError?: MockSupabaseError | null;
  questionMediaDeleteError?: MockSupabaseError | null;
  questionMediaInsertError?: MockSupabaseError | null;
};

function createMockSupabaseClient({
  mediaRecords = [],
  mediaRecordError = null,
  questionMediaDeleteError = null,
  questionMediaInsertError = null,
}: MockSupabaseClientOptions = {}) {
  const operations: MockSupabaseOperation[] = [];
  let upsertedQuestionRow: QuestionContentRow | null = null;

  const client = {
    from(table: string) {
      let action = '';

      const builder = {
        select() {
          action = action || 'select';
          return builder;
        },
        eq() {
          return builder;
        },
        in() {
          if (table === 'media_records') {
            operations.push({ table, action: 'select' });
            return Promise.resolve({
              data: mediaRecords,
              error: mediaRecordError,
            });
          }

          if (table === 'question_media' && action === 'delete') {
            return Promise.resolve({
              data: null,
              error: questionMediaDeleteError,
            });
          }

          return builder;
        },
        maybeSingle() {
          return Promise.resolve({
            data: null,
            error: null,
          });
        },
        upsert(values: QuestionContentRow | QuestionContentRow[]) {
          action = 'upsert';
          operations.push({ table, action, values });
          upsertedQuestionRow = Array.isArray(values) ? values[0] : values;
          return builder;
        },
        single() {
          return Promise.resolve({
            data: upsertedQuestionRow,
            error: null,
          });
        },
        delete() {
          action = 'delete';
          operations.push({ table, action });
          return builder;
        },
        insert(values: unknown) {
          operations.push({ table, action: 'insert', values });
          return Promise.resolve({
            data: null,
            error: questionMediaInsertError,
          });
        },
        order() {
          return Promise.resolve({
            data: [],
            error: null,
          });
        },
      };

      return builder;
    },
  };

  return {
    client,
    operations,
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

describe('Supabase question media links', () => {
  it('extracts only stable Supabase image references from question and explanation assets', () => {
    const question: Question = {
      ...testMcqQuestion,
      assets: [
        {
          id: 'question-cloud',
          type: 'image',
          path: 'supabase-image:questions/test/question.png',
          alt: 'Cloud question image',
        },
        {
          id: 'question-local',
          type: 'image',
          path: 'local-image:local_1',
          alt: 'Local question image',
        },
        {
          id: 'question-url',
          type: 'image',
          path: 'https://example.com/question.png',
          alt: 'External question image',
        },
      ],
      explanation: {
        ...testMcqQuestion.explanation,
        assets: [
          {
            id: 'explanation-cloud',
            type: 'image',
            path: 'supabase-image:questions/test/explanation.png',
            alt: 'Cloud explanation image',
          },
          {
            id: 'explanation-graph',
            type: 'graph',
            path: 'supabase-image:questions/test/graph.png',
            alt: 'Cloud graph image',
          },
        ],
      },
    };

    expect(extractCloudQuestionImageAssets(question)).toEqual([
      {
        assetId: 'question-cloud',
        placement: 'question',
        storagePath: 'questions/test/question.png',
        sortOrder: 0,
      },
      {
        assetId: 'explanation-cloud',
        placement: 'explanation',
        storagePath: 'questions/test/explanation.png',
        sortOrder: 0,
      },
      {
        assetId: 'explanation-graph',
        placement: 'explanation',
        storagePath: 'questions/test/graph.png',
        sortOrder: 1,
      },
    ]);
  });

  it('clears stale question and explanation links without inserting rows when no cloud images exist', async () => {
    const { client, operations } = createMockSupabaseClient();
    const store = createSupabaseQuestionContentStore({
      enabled: true,
      client: client as never,
      userId: 'admin-1',
      now: () => new Date('2026-05-14T10:00:00.000Z'),
    });
    const question: Question = {
      ...testMcqQuestion,
      assets: [
        {
          id: 'local-image',
          type: 'image',
          path: 'local-image:local_1',
          alt: 'Local image',
        },
      ],
      explanation: {
        ...testMcqQuestion.explanation,
        assets: [
          {
            id: 'external-image',
            type: 'image',
            path: 'https://example.com/explanation.png',
            alt: 'External image',
          },
        ],
      },
    };

    await store.saveQuestion({
      question,
      status: 'draft',
      now: '2026-05-14T10:00:00.000Z',
    });

    expect(operations.filter((operation) => operation.table === 'media_records')).toEqual([]);
    expect(operations).toContainEqual({
      table: 'question_media',
      action: 'delete',
    });
    expect(operations.some((operation) => operation.action === 'insert')).toBe(false);
  });

  it('rejects publishing browser-local media to the cloud store', async () => {
    const { client, operations } = createMockSupabaseClient();
    const store = createSupabaseQuestionContentStore({
      enabled: true,
      client: client as never,
      userId: 'admin-1',
    });
    const question: Question = {
      ...testMcqQuestion,
      assets: [
        {
          id: 'local-image',
          type: 'image',
          path: 'local-image:local_1',
          alt: 'Local image',
        },
      ],
    };

    await expect(
      store.saveQuestion({
        question,
        status: 'published',
      }),
    ).rejects.toThrow('Cloud-published questions cannot use browser-local images or videos');
    expect(operations.some((operation) => operation.table === 'questions')).toBe(false);
  });

  it('resolves media records and syncs cloud image links after saving a question', async () => {
    const { client, operations } = createMockSupabaseClient({
      mediaRecords: [
        {
          id: 'media-question',
          storage_path: 'questions/test/question.png',
        },
        {
          id: 'media-explanation',
          storage_path: 'questions/test/explanation.png',
        },
      ],
    });
    const store = createSupabaseQuestionContentStore({
      enabled: true,
      client: client as never,
      userId: 'admin-1',
      now: () => new Date('2026-05-14T10:00:00.000Z'),
    });
    const question: Question = {
      ...testMcqQuestion,
      assets: [
        {
          id: 'prompt-image',
          type: 'image',
          path: 'supabase-image:questions/test/question.png',
          alt: 'Question cloud image',
        },
      ],
      explanation: {
        ...testMcqQuestion.explanation,
        assets: [
          {
            id: 'solution-image',
            type: 'image',
            path: 'supabase-image:questions/test/explanation.png',
            alt: 'Explanation cloud image',
          },
        ],
      },
    };

    const savedRecord = await store.saveQuestion({
      question,
      status: 'published',
      now: '2026-05-14T10:00:00.000Z',
    });

    const insertOperation = operations.find(
      (operation) => operation.table === 'question_media' && operation.action === 'insert',
    );

    expect(savedRecord.question).toEqual(question);
    expect(operations).toContainEqual({ table: 'media_records', action: 'select' });
    expect(operations).toContainEqual({ table: 'question_media', action: 'delete' });
    expect(insertOperation?.values).toEqual([
      {
        question_id: testMcqQuestion.id,
        media_id: 'media-question',
        placement: 'question',
        asset_id: 'prompt-image',
        sort_order: 0,
      },
      {
        question_id: testMcqQuestion.id,
        media_id: 'media-explanation',
        placement: 'explanation',
        asset_id: 'solution-image',
        sort_order: 0,
      },
    ]);
  });

  it('surfaces media link sync failures after the question row is saved', async () => {
    const { client, operations } = createMockSupabaseClient({
      mediaRecords: [
        {
          id: 'media-question',
          storage_path: 'questions/test/question.png',
        },
      ],
      questionMediaInsertError: {
        message: 'question_media insert denied',
      },
    });
    const store = createSupabaseQuestionContentStore({
      enabled: true,
      client: client as never,
      userId: 'admin-1',
    });
    const question: Question = {
      ...testMcqQuestion,
      assets: [
        {
          id: 'prompt-image',
          type: 'image',
          path: 'supabase-image:questions/test/question.png',
          alt: 'Question cloud image',
        },
      ],
    };

    await expect(
      store.saveQuestion({
        question,
        status: 'published',
      }),
    ).rejects.toThrow('question_media insert denied');
    expect(operations).toContainEqual({
      table: 'questions',
      action: 'upsert',
      values: expect.any(Object),
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
