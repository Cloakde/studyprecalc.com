import type { Question } from './types';

export const publicationStatuses = ['draft', 'published', 'archived'] as const;

export type PublicationStatus = (typeof publicationStatuses)[number];
export type QuestionPublicationStatus = PublicationStatus;

export const defaultPublicationStatus: PublicationStatus = 'draft';

export const questionContentPayloadVersion = 'precalcapp.questionContent.v1';

export type QuestionPublicationState = object & {
  publicationStatus?: PublicationStatus;
};

export type PublishableQuestion = Question & QuestionPublicationState;
export type PublishedQuestion<T extends QuestionPublicationState = PublishableQuestion> = T & {
  publicationStatus: 'published';
};

export type QuestionContentRecord = {
  id: string;
  question: Question;
  status: QuestionPublicationStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
};

export type QuestionContentPayload = {
  version: typeof questionContentPayloadVersion;
  records: QuestionContentRecord[];
};

type QuestionContentRecordOptions = {
  status?: QuestionPublicationStatus;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  createdBy?: string;
  now?: () => string | Date;
};

function toIsoTimestamp(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function createTimestamp(options: QuestionContentRecordOptions): string {
  return toIsoTimestamp(options.now?.() ?? new Date());
}

function sortQuestionContentRecords(records: QuestionContentRecord[]): QuestionContentRecord[] {
  return [...records].sort((a, b) => a.id.localeCompare(b.id));
}

export function isQuestionPublicationStatus(value: unknown): value is QuestionPublicationStatus {
  return publicationStatuses.includes(value as QuestionPublicationStatus);
}

export function getPublicationStatus(question: QuestionPublicationState): PublicationStatus {
  return question.publicationStatus ?? defaultPublicationStatus;
}

export function setQuestionPublicationStatus<T extends QuestionPublicationState>(
  question: T,
  publicationStatus: PublicationStatus,
): T & { publicationStatus: PublicationStatus } {
  return {
    ...question,
    publicationStatus,
  };
}

export function markQuestionDraft<T extends QuestionPublicationState>(
  question: T,
): T & { publicationStatus: 'draft' } {
  return {
    ...question,
    publicationStatus: 'draft',
  };
}

export function publishQuestion<T extends QuestionPublicationState>(
  question: T,
): PublishedQuestion<T> {
  return {
    ...question,
    publicationStatus: 'published',
  };
}

export function archiveQuestion<T extends QuestionPublicationState>(
  question: T,
): T & { publicationStatus: 'archived' } {
  return {
    ...question,
    publicationStatus: 'archived',
  };
}

export function isDraftQuestion(question: QuestionPublicationState): boolean {
  return getPublicationStatus(question) === 'draft';
}

export function isPublishedQuestion(question: QuestionPublicationState): boolean {
  return getPublicationStatus(question) === 'published';
}

export function isArchivedQuestion(question: QuestionPublicationState): boolean {
  return getPublicationStatus(question) === 'archived';
}

export function publicationStatusFromPublishedFlag(isPublished: boolean): PublicationStatus {
  return isPublished ? 'published' : defaultPublicationStatus;
}

export function publicationStatusToPublishedFlag(status: PublicationStatus): boolean {
  return status === 'published';
}

export function createQuestionContentRecord(
  question: Question,
  options: QuestionContentRecordOptions = {},
): QuestionContentRecord {
  const timestamp = createTimestamp(options);
  const status = options.status ?? getPublicationStatus(question);

  return {
    id: question.id,
    question: setQuestionPublicationStatus(question, status),
    status,
    createdAt: options.createdAt ? toIsoTimestamp(options.createdAt) : timestamp,
    updatedAt: options.updatedAt ? toIsoTimestamp(options.updatedAt) : timestamp,
    ...(options.createdBy ? { createdBy: options.createdBy } : {}),
  };
}

export function upsertQuestionContentRecord(
  records: readonly QuestionContentRecord[],
  question: Question,
  options: QuestionContentRecordOptions = {},
): QuestionContentRecord[] {
  const existingRecord = records.find((record) => record.id === question.id);
  const timestamp = createTimestamp(options);
  const status = options.status ?? existingRecord?.status ?? getPublicationStatus(question);
  const nextRecord: QuestionContentRecord = {
    id: question.id,
    question: setQuestionPublicationStatus(question, status),
    status,
    createdAt: options.createdAt
      ? toIsoTimestamp(options.createdAt)
      : (existingRecord?.createdAt ?? timestamp),
    updatedAt: options.updatedAt ? toIsoTimestamp(options.updatedAt) : timestamp,
    ...(existingRecord?.createdBy || options.createdBy
      ? { createdBy: existingRecord?.createdBy ?? options.createdBy }
      : {}),
  };

  return sortQuestionContentRecords([
    ...records.filter((record) => record.id !== question.id),
    nextRecord,
  ]);
}

export function setQuestionContentStatus(
  records: readonly QuestionContentRecord[],
  questionId: string,
  status: QuestionPublicationStatus,
  options: Pick<QuestionContentRecordOptions, 'updatedAt' | 'now'> = {},
): QuestionContentRecord[] {
  const timestamp = options.updatedAt
    ? toIsoTimestamp(options.updatedAt)
    : createTimestamp(options);

  return sortQuestionContentRecords(
    records.map((record) =>
      record.id === questionId
        ? {
            ...record,
            question: setQuestionPublicationStatus(record.question, status),
            status,
            updatedAt: timestamp,
          }
        : record,
    ),
  );
}

export function getPublishedQuestions(records: readonly QuestionContentRecord[]): Question[] {
  return records
    .filter((record) => record.status === 'published')
    .map((record) => setQuestionPublicationStatus(record.question, 'published'));
}
