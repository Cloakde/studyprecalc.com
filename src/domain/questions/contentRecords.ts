import {
  publicationStatusFromPublishedFlag,
  publicationStatusToPublishedFlag,
  publicationStatuses,
  type PublicationStatus,
} from './publication';
import type { Question } from './types';

export type QuestionPublicationStatus = PublicationStatus;

export type QuestionContentTimestamp = Date | string;

export type QuestionPublicationMetadata = {
  status: QuestionPublicationStatus;
  questionSetVersion: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  publishedAt?: string;
  archivedAt?: string;
};

export type QuestionContentRecord = {
  id: string;
  question: Question;
  publication: QuestionPublicationMetadata;
};

export type CreateQuestionContentRecordOptions = {
  status?: QuestionPublicationStatus;
  questionSetVersion?: string;
  now?: QuestionContentTimestamp;
  createdAt?: QuestionContentTimestamp;
  updatedAt?: QuestionContentTimestamp;
  createdBy?: string;
  updatedBy?: string;
  publishedAt?: QuestionContentTimestamp;
  archivedAt?: QuestionContentTimestamp;
};

export type UpdateQuestionContentRecordOptions = {
  status?: QuestionPublicationStatus;
  questionSetVersion?: string;
  now?: QuestionContentTimestamp;
  updatedBy?: string;
};

export type SetQuestionContentStatusOptions = {
  now?: QuestionContentTimestamp;
  updatedBy?: string;
};

export { publicationStatusFromPublishedFlag, publicationStatusToPublishedFlag };

export function isQuestionPublicationStatus(
  candidate: unknown,
): candidate is QuestionPublicationStatus {
  return (
    typeof candidate === 'string' &&
    publicationStatuses.includes(candidate as QuestionPublicationStatus)
  );
}

export function toQuestionContentTimestamp(timestamp: QuestionContentTimestamp): string {
  return timestamp instanceof Date ? timestamp.toISOString() : timestamp;
}

function getCurrentTimestamp(now: QuestionContentTimestamp | undefined): string {
  return toQuestionContentTimestamp(now ?? new Date());
}

function cleanOptionalString(value: string | undefined): string | undefined {
  const cleaned = value?.trim();
  return cleaned ? cleaned : undefined;
}

function withLifecycleDates(
  metadata: QuestionPublicationMetadata,
  previousStatus?: QuestionPublicationStatus,
): QuestionPublicationMetadata {
  const nextMetadata: QuestionPublicationMetadata = { ...metadata };

  if (metadata.status === 'published') {
    nextMetadata.publishedAt =
      previousStatus === 'published' && metadata.publishedAt
        ? metadata.publishedAt
        : metadata.updatedAt;
    delete nextMetadata.archivedAt;
  } else if (metadata.status === 'archived') {
    nextMetadata.archivedAt =
      previousStatus === 'archived' && metadata.archivedAt
        ? metadata.archivedAt
        : metadata.updatedAt;
  } else {
    delete nextMetadata.archivedAt;
  }

  return nextMetadata;
}

export function createQuestionContentRecord(
  question: Question,
  options: CreateQuestionContentRecordOptions = {},
): QuestionContentRecord {
  const updatedAt = getCurrentTimestamp(options.updatedAt ?? options.now);
  const createdAt = getCurrentTimestamp(options.createdAt ?? updatedAt);
  const status = options.status ?? 'draft';
  const metadata = withLifecycleDates(
    {
      status,
      questionSetVersion: options.questionSetVersion ?? 'local',
      createdAt,
      updatedAt,
      ...(cleanOptionalString(options.createdBy) ? { createdBy: options.createdBy?.trim() } : {}),
      ...(cleanOptionalString(options.updatedBy) ? { updatedBy: options.updatedBy?.trim() } : {}),
      ...(options.publishedAt
        ? { publishedAt: toQuestionContentTimestamp(options.publishedAt) }
        : {}),
      ...(options.archivedAt ? { archivedAt: toQuestionContentTimestamp(options.archivedAt) } : {}),
    },
    status,
  );

  return {
    id: question.id,
    question,
    publication: metadata,
  };
}

export function updateQuestionContentRecord(
  record: QuestionContentRecord,
  question: Question,
  options: UpdateQuestionContentRecordOptions = {},
): QuestionContentRecord {
  const updatedAt = getCurrentTimestamp(options.now);
  const status = options.status ?? record.publication.status;
  const metadata = withLifecycleDates(
    {
      ...record.publication,
      status,
      questionSetVersion: options.questionSetVersion ?? record.publication.questionSetVersion,
      updatedAt,
      ...(cleanOptionalString(options.updatedBy) ? { updatedBy: options.updatedBy?.trim() } : {}),
    },
    record.publication.status,
  );

  return {
    id: question.id,
    question,
    publication: metadata,
  };
}

export function setQuestionContentRecordStatus(
  record: QuestionContentRecord,
  status: QuestionPublicationStatus,
  options: SetQuestionContentStatusOptions = {},
): QuestionContentRecord {
  const updatedAt = getCurrentTimestamp(options.now);
  const metadata = withLifecycleDates(
    {
      ...record.publication,
      status,
      updatedAt,
      ...(cleanOptionalString(options.updatedBy) ? { updatedBy: options.updatedBy?.trim() } : {}),
    },
    record.publication.status,
  );

  return {
    ...record,
    publication: metadata,
  };
}

export function sortQuestionContentRecords(
  records: QuestionContentRecord[],
): QuestionContentRecord[] {
  return [...records].sort((first, second) => first.id.localeCompare(second.id));
}

export function isPublishedQuestionContentRecord(record: QuestionContentRecord): boolean {
  return record.publication.status === 'published';
}

export function getPublishedQuestions(records: QuestionContentRecord[]): Question[] {
  return sortQuestionContentRecords(records)
    .filter(isPublishedQuestionContentRecord)
    .map((record) => record.question);
}

export function upsertQuestionContentRecord(
  records: QuestionContentRecord[],
  question: Question,
  options: UpdateQuestionContentRecordOptions = {},
): QuestionContentRecord[] {
  const existingRecord = records.find((record) => record.id === question.id);
  const nextRecord = existingRecord
    ? updateQuestionContentRecord(existingRecord, question, options)
    : createQuestionContentRecord(question, options);
  const withoutExistingRecord = records.filter((record) => record.id !== question.id);

  return sortQuestionContentRecords([...withoutExistingRecord, nextRecord]);
}
