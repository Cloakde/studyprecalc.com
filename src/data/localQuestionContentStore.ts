import {
  createQuestionContentRecord,
  getPublishedQuestions,
  isQuestionPublicationStatus,
  isPublishedQuestionContentRecord,
  setQuestionContentRecordStatus,
  sortQuestionContentRecords,
  updateQuestionContentRecord,
  type QuestionContentRecord,
  type QuestionContentTimestamp,
  type QuestionPublicationStatus,
} from '../domain/questions/contentRecords';
import type { Question } from '../domain/questions/types';
import type {
  ImportQuestionContentInput,
  LoadQuestionContentRecordsOptions,
  QuestionContentImportResult,
  QuestionContentStore,
  SaveQuestionContentInput,
} from './questionContentStore';
import { QuestionSchema } from './schemas/questionSchema';

export const localQuestionContentStorageKey = 'precalcapp.questionContent.v1';
export const legacyCustomQuestionsStorageKey = 'precalcapp.customQuestions.v1';
export const questionContentExportVersion = 'precalcapp.questionContent.v1';

export type QuestionContentStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

export type QuestionContentExportPayload = {
  version: typeof questionContentExportVersion;
  exportedAt: string;
  records: QuestionContentRecord[];
};

export type QuestionContentImportParseResult = {
  records: QuestionContentRecord[];
  rejectedCount: number;
  errors: string[];
};

export type CreateLocalQuestionContentStoreOptions = {
  storage?: QuestionContentStorage | null;
  storageKey?: string;
  legacyStorageKey?: string;
  protectedQuestionIds?: Iterable<string>;
  defaultQuestionSetVersion?: string;
  now?: () => Date;
};

type ParsedCandidates = {
  candidates: unknown[];
  questionSetVersion?: string;
};

function getBrowserStorage(): QuestionContentStorage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

function toIsoTimestamp(timestamp: QuestionContentTimestamp): string {
  return timestamp instanceof Date ? timestamp.toISOString() : timestamp;
}

function timestampOrDefault(candidate: unknown, fallback: string): string {
  return typeof candidate === 'string' && candidate.trim() ? candidate : fallback;
}

function stringOrUndefined(candidate: unknown): string | undefined {
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : undefined;
}

function formatContentRecordIssues(candidateIndex: number, issues: string[]): string {
  return `Question content record ${candidateIndex + 1}: ${issues.join('; ')}`;
}

function describeQuestionSchemaError(
  candidateIndex: number,
  error: { issues: { path: PropertyKey[]; message: string }[] },
) {
  return formatContentRecordIssues(
    candidateIndex,
    error.issues.map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return `${path}${issue.message}`;
    }),
  );
}

function getQuestionContentCandidates(payload: unknown): ParsedCandidates | null {
  if (Array.isArray(payload)) {
    return {
      candidates: payload,
    };
  }

  if (typeof payload !== 'object' || payload === null) {
    return null;
  }

  const objectPayload = payload as {
    records?: unknown;
    questions?: unknown;
    version?: unknown;
  };
  const questionSetVersion =
    typeof objectPayload.version === 'string' && objectPayload.version.trim()
      ? objectPayload.version
      : undefined;

  if (Array.isArray(objectPayload.records)) {
    return {
      candidates: objectPayload.records,
      questionSetVersion,
    };
  }

  if (Array.isArray(objectPayload.questions)) {
    return {
      candidates: objectPayload.questions,
      questionSetVersion,
    };
  }

  return null;
}

function parseRecordCandidate(
  candidate: unknown,
  candidateIndex: number,
  defaultQuestionSetVersion: string,
  now: string,
): QuestionContentRecord | string {
  const candidateObject =
    typeof candidate === 'object' && candidate !== null
      ? (candidate as Record<string, unknown>)
      : {};
  const questionCandidate =
    'question' in candidateObject ? candidateObject.question : (candidate as unknown);
  const questionResult = QuestionSchema.safeParse(questionCandidate);

  if (!questionResult.success) {
    return describeQuestionSchemaError(candidateIndex, questionResult.error);
  }

  const question = questionResult.data as Question;
  const declaredId = stringOrUndefined(candidateObject.id);

  if (declaredId && declaredId !== question.id) {
    return formatContentRecordIssues(candidateIndex, [
      `record id ${declaredId} does not match question id ${question.id}`,
    ]);
  }

  const publicationCandidate =
    typeof candidateObject.publication === 'object' && candidateObject.publication !== null
      ? (candidateObject.publication as Record<string, unknown>)
      : candidateObject;
  const rawStatus = publicationCandidate.status;
  const status = isQuestionPublicationStatus(rawStatus) ? rawStatus : 'draft';
  const questionSetVersion =
    stringOrUndefined(publicationCandidate.questionSetVersion) ?? defaultQuestionSetVersion;
  const updatedAt = timestampOrDefault(publicationCandidate.updatedAt, now);
  const createdAt = timestampOrDefault(publicationCandidate.createdAt, updatedAt);
  const publishedAt = stringOrUndefined(publicationCandidate.publishedAt);
  const archivedAt = stringOrUndefined(publicationCandidate.archivedAt);

  return createQuestionContentRecord(question, {
    status,
    questionSetVersion,
    createdAt,
    updatedAt,
    createdBy: stringOrUndefined(publicationCandidate.createdBy),
    updatedBy: stringOrUndefined(publicationCandidate.updatedBy),
    ...(publishedAt ? { publishedAt } : {}),
    ...(archivedAt ? { archivedAt } : {}),
  });
}

function filterQuestionContentRecords(
  records: QuestionContentRecord[],
  options: LoadQuestionContentRecordsOptions | undefined,
): QuestionContentRecord[] {
  if (options?.publishedOnly) {
    return records.filter(isPublishedQuestionContentRecord);
  }

  if (options?.includeArchived === false) {
    return records.filter((record) => record.publication.status !== 'archived');
  }

  return records;
}

function getAcceptedImportQuestions(
  input: ImportQuestionContentInput,
  existingRecords: QuestionContentRecord[],
  protectedQuestionIds: Set<string>,
): Question[] {
  const existingIds = new Set(existingRecords.map((record) => record.id));
  const seenIncomingIds = new Set<string>();
  const acceptedQuestions: Question[] = [];

  input.questions.forEach((question) => {
    const validatedQuestion = QuestionSchema.parse(question) as Question;

    if (
      protectedQuestionIds.has(validatedQuestion.id) ||
      existingIds.has(validatedQuestion.id) ||
      seenIncomingIds.has(validatedQuestion.id)
    ) {
      return;
    }

    seenIncomingIds.add(validatedQuestion.id);
    acceptedQuestions.push(validatedQuestion);
  });

  return acceptedQuestions;
}

export function createQuestionContentExportPayload(
  records: QuestionContentRecord[],
  exportedAt: QuestionContentTimestamp = new Date(),
): QuestionContentExportPayload {
  return {
    version: questionContentExportVersion,
    exportedAt: toIsoTimestamp(exportedAt),
    records: sortQuestionContentRecords(records),
  };
}

export function serializeQuestionContentRecords(
  records: QuestionContentRecord[],
  exportedAt?: QuestionContentTimestamp,
): string {
  return JSON.stringify(createQuestionContentExportPayload(records, exportedAt), null, 2);
}

export function parseQuestionContentImportPayload(
  payload: unknown,
  options: {
    defaultQuestionSetVersion?: string;
    now?: QuestionContentTimestamp;
  } = {},
): QuestionContentImportParseResult {
  let parsedPayload = payload;

  if (typeof payload === 'string') {
    try {
      parsedPayload = JSON.parse(payload) as unknown;
    } catch {
      return {
        records: [],
        rejectedCount: 1,
        errors: ['Question content import payload must be valid JSON.'],
      };
    }
  }

  const parsedCandidates = getQuestionContentCandidates(parsedPayload);

  if (!parsedCandidates) {
    return {
      records: [],
      rejectedCount: 1,
      errors: [
        'Question content import payload must be an array, records payload, or question set.',
      ],
    };
  }

  const now = toIsoTimestamp(options.now ?? new Date());
  const defaultQuestionSetVersion =
    parsedCandidates.questionSetVersion ?? options.defaultQuestionSetVersion ?? 'local';
  const records: QuestionContentRecord[] = [];
  const errors: string[] = [];

  parsedCandidates.candidates.forEach((candidate, index) => {
    const record = parseRecordCandidate(candidate, index, defaultQuestionSetVersion, now);

    if (typeof record === 'string') {
      errors.push(record);
      return;
    }

    records.push(record);
  });

  return {
    records: sortQuestionContentRecords(records),
    rejectedCount: errors.length,
    errors,
  };
}

export function loadQuestionContentRecordsFromStorage(
  storage: QuestionContentStorage | null = getBrowserStorage(),
  storageKey = localQuestionContentStorageKey,
  legacyStorageKey = legacyCustomQuestionsStorageKey,
): QuestionContentRecord[] {
  if (!storage) {
    return [];
  }

  const raw = storage.getItem(storageKey) ?? storage.getItem(legacyStorageKey);

  if (!raw) {
    return [];
  }

  return parseQuestionContentImportPayload(raw).records;
}

export function saveQuestionContentRecordsToStorage(
  records: QuestionContentRecord[],
  storage: QuestionContentStorage | null = getBrowserStorage(),
  storageKey = localQuestionContentStorageKey,
): QuestionContentRecord[] {
  const sortedRecords = sortQuestionContentRecords(records);

  if (storage) {
    storage.setItem(storageKey, serializeQuestionContentRecords(sortedRecords));
  }

  return sortedRecords;
}

export function clearQuestionContentRecordsFromStorage(
  storage: QuestionContentStorage | null = getBrowserStorage(),
  storageKey = localQuestionContentStorageKey,
) {
  storage?.removeItem(storageKey);
}

export function createLocalQuestionContentStore(
  options: CreateLocalQuestionContentStoreOptions = {},
): QuestionContentStore {
  const storage = options.storage === undefined ? getBrowserStorage() : options.storage;
  const storageKey = options.storageKey ?? localQuestionContentStorageKey;
  const legacyStorageKey = options.legacyStorageKey ?? legacyCustomQuestionsStorageKey;
  const defaultQuestionSetVersion = options.defaultQuestionSetVersion ?? 'local';
  const now = options.now ?? (() => new Date());
  const protectedQuestionIds = new Set(options.protectedQuestionIds ?? []);
  let memoryRecords = loadQuestionContentRecordsFromStorage(storage, storageKey, legacyStorageKey);

  function readRecords() {
    memoryRecords = storage
      ? loadQuestionContentRecordsFromStorage(storage, storageKey, legacyStorageKey)
      : memoryRecords;
    return memoryRecords;
  }

  function writeRecords(records: QuestionContentRecord[]) {
    memoryRecords = saveQuestionContentRecordsToStorage(records, storage, storageKey);
    return memoryRecords;
  }

  return {
    kind: 'local',
    async loadRecords(loadOptions) {
      return filterQuestionContentRecords(sortQuestionContentRecords(readRecords()), loadOptions);
    },
    async listPublishedQuestions() {
      return getPublishedQuestions(readRecords());
    },
    async getQuestion(questionId) {
      return readRecords().find((record) => record.id === questionId) ?? null;
    },
    async saveQuestion(input: SaveQuestionContentInput) {
      const question = QuestionSchema.parse(input.question) as Question;
      const existingRecord = readRecords().find((record) => record.id === question.id);
      const record = existingRecord
        ? updateQuestionContentRecord(existingRecord, question, {
            status: input.status,
            questionSetVersion: input.questionSetVersion,
            now: input.now ?? now(),
            updatedBy: input.updatedBy,
          })
        : createQuestionContentRecord(question, {
            status: input.status ?? 'draft',
            questionSetVersion: input.questionSetVersion ?? defaultQuestionSetVersion,
            now: input.now ?? now(),
            createdBy: input.updatedBy,
            updatedBy: input.updatedBy,
          });
      const nextRecords = writeRecords([
        ...readRecords().filter((currentRecord) => currentRecord.id !== record.id),
        record,
      ]);

      return nextRecords.find((currentRecord) => currentRecord.id === record.id) ?? record;
    },
    async importQuestions(input: ImportQuestionContentInput): Promise<QuestionContentImportResult> {
      const currentRecords = readRecords();
      const acceptedQuestions = getAcceptedImportQuestions(
        input,
        currentRecords,
        protectedQuestionIds,
      );
      const importedRecords = acceptedQuestions.map((question) =>
        createQuestionContentRecord(question, {
          status: input.status ?? 'draft',
          questionSetVersion: input.questionSetVersion ?? defaultQuestionSetVersion,
          now: input.now ?? now(),
          createdBy: input.updatedBy,
          updatedBy: input.updatedBy,
        }),
      );
      const records = writeRecords([...currentRecords, ...importedRecords]);

      return {
        records,
        imported: importedRecords.length,
        skipped: input.questions.length - importedRecords.length,
      };
    },
    async setPublicationStatus(
      questionId: string,
      status: QuestionPublicationStatus,
      options: {
        now?: QuestionContentTimestamp;
        updatedBy?: string;
      } = {},
    ) {
      const records = readRecords();
      const existingRecord = records.find((record) => record.id === questionId);

      if (!existingRecord) {
        throw new Error(`Question content record not found: ${questionId}`);
      }

      const updatedRecord = setQuestionContentRecordStatus(existingRecord, status, {
        now: options.now ?? now(),
        updatedBy: options.updatedBy,
      });
      const nextRecords = writeRecords([
        ...records.filter((record) => record.id !== questionId),
        updatedRecord,
      ]);

      return nextRecords.find((record) => record.id === questionId) ?? updatedRecord;
    },
    async deleteQuestion(questionId) {
      writeRecords(readRecords().filter((record) => record.id !== questionId));
    },
  };
}
