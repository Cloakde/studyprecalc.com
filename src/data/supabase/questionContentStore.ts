import type { SupabaseClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  createQuestionContentRecord,
  getPublishedQuestions,
  isQuestionPublicationStatus,
  isPublishedQuestionContentRecord,
  publicationStatusToPublishedFlag,
  setQuestionContentRecordStatus,
  sortQuestionContentRecords,
  updateQuestionContentRecord,
  upsertQuestionContentRecord,
  type QuestionContentRecord,
  type QuestionContentTimestamp,
  type QuestionPublicationStatus,
} from '../../domain/questions/contentRecords';
import type { Question } from '../../domain/questions/types';
import type {
  ImportQuestionContentInput,
  LoadQuestionContentRecordsOptions,
  QuestionContentImportResult,
  QuestionContentStore,
  SaveQuestionContentInput,
} from '../questionContentStore';
import { QuestionSchema } from '../schemas/questionSchema';
import { supabase } from './client';
import { parseSupabaseImageReference, supabaseImageBucket } from './mediaStore';

export type QuestionContentRow = {
  id: string;
  question_set_version: string;
  content: unknown;
  status?: QuestionPublicationStatus | null;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type QuestionMediaPlacement = 'question' | 'explanation';

type CloudQuestionImageAsset = {
  assetId: string;
  placement: QuestionMediaPlacement;
  storagePath: string;
  sortOrder: number;
};

type MediaRecordReferenceRow = {
  id: string;
  storage_path: string | null;
};

type QuestionMediaLinkRow = {
  id: string;
  placement: QuestionMediaPlacement;
  asset_id: string | null;
};

export type CreateSupabaseQuestionContentStoreOptions = {
  enabled: boolean;
  client?: SupabaseClient | null;
  userId?: string;
  defaultQuestionSetVersion?: string;
  now?: () => Date;
};

export type UseSupabaseQuestionContentStoreOptions = {
  enabled: boolean;
  userId?: string;
  seedQuestions?: Question[];
  defaultQuestionSetVersion?: string;
  now?: () => Date;
};

function isObject(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === 'object' && candidate !== null;
}

function stringOrUndefined(candidate: unknown): string | undefined {
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : undefined;
}

function parseQuestionContentCandidate(candidate: unknown): Question {
  const questionResult = QuestionSchema.safeParse(candidate);

  if (!questionResult.success) {
    throw questionResult.error;
  }

  return questionResult.data as Question;
}

export function extractCloudQuestionImageAssets(question: Question): CloudQuestionImageAsset[] {
  const assets: CloudQuestionImageAsset[] = [];

  const collectAssets = (placement: QuestionMediaPlacement, assetsCandidate: unknown) => {
    if (!Array.isArray(assetsCandidate)) {
      return;
    }

    assetsCandidate.forEach((assetCandidate) => {
      if (
        !isObject(assetCandidate) ||
        typeof assetCandidate.id !== 'string' ||
        typeof assetCandidate.path !== 'string'
      ) {
        return;
      }

      const storagePath = parseSupabaseImageReference(assetCandidate.path);

      if (!storagePath) {
        return;
      }

      assets.push({
        assetId: assetCandidate.id,
        placement,
        storagePath,
        sortOrder: assets.filter((asset) => asset.placement === placement).length,
      });
    });
  };

  collectAssets('question', question.assets);
  collectAssets('explanation', question.explanation.assets);

  return assets;
}

function questionHasBrowserLocalMedia(question: Question): boolean {
  const hasLocalQuestionImage =
    question.assets?.some((asset) => asset.path.startsWith('local-image:')) ?? false;
  const hasLocalExplanationImage =
    question.explanation.assets?.some((asset) => asset.path.startsWith('local-image:')) ?? false;
  const hasLocalVideo = question.explanation.video?.url.startsWith('local-video:') ?? false;

  return hasLocalQuestionImage || hasLocalExplanationImage || hasLocalVideo;
}

function getQuestionContentEnvelope(row: QuestionContentRow) {
  if (isObject(row.content) && 'question' in row.content) {
    return {
      question: row.content.question,
      publication: isObject(row.content.publication) ? row.content.publication : {},
    };
  }

  return {
    question: row.content,
    publication: {},
  };
}

function getSupabaseRecordStatus(
  status: QuestionPublicationStatus | null | undefined,
  isPublished: boolean,
  publicationCandidate: Record<string, unknown>,
): QuestionPublicationStatus {
  if (status === 'published' || status === 'draft' || status === 'archived') {
    return status;
  }

  if (isPublished) {
    return 'published';
  }

  return publicationCandidate.status === 'archived' ? 'archived' : 'draft';
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

function assertSupabaseClient(enabled: boolean, client: SupabaseClient | null): SupabaseClient {
  if (!enabled || !client) {
    throw new Error('Supabase question content store is not enabled.');
  }

  return client;
}

export function questionContentRecordFromSupabaseRow(
  row: QuestionContentRow,
): QuestionContentRecord {
  const envelope = getQuestionContentEnvelope(row);
  let question: Question;

  try {
    question = parseQuestionContentCandidate(envelope.question);
  } catch {
    throw new Error(`Invalid Supabase question content row: ${row.id}`);
  }

  const publication = envelope.publication;
  const rawStatus = publication.status;
  const status = isQuestionPublicationStatus(rawStatus)
    ? getSupabaseRecordStatus(row.status, row.is_published, publication)
    : getSupabaseRecordStatus(row.status, row.is_published, {});

  return createQuestionContentRecord(question, {
    status,
    questionSetVersion:
      stringOrUndefined(publication.questionSetVersion) ?? row.question_set_version ?? 'server',
    createdAt: stringOrUndefined(publication.createdAt) ?? row.created_at,
    updatedAt: stringOrUndefined(publication.updatedAt) ?? row.updated_at,
    createdBy: row.created_by ?? stringOrUndefined(publication.createdBy),
    updatedBy: stringOrUndefined(publication.updatedBy),
    ...(stringOrUndefined(publication.publishedAt)
      ? { publishedAt: stringOrUndefined(publication.publishedAt) }
      : {}),
    ...(stringOrUndefined(publication.archivedAt)
      ? { archivedAt: stringOrUndefined(publication.archivedAt) }
      : {}),
  });
}

async function syncQuestionMediaLinks(
  client: SupabaseClient,
  questionId: string,
  question: Question,
): Promise<void> {
  const assets = extractCloudQuestionImageAssets(question);
  const storagePaths = [...new Set(assets.map((asset) => asset.storagePath))];
  const mediaIdByStoragePath = new Map<string, string>();
  const linkPlacements: QuestionMediaPlacement[] = ['question', 'explanation'];

  if (storagePaths.length > 0) {
    const { data, error } = await client
      .from('media_records')
      .select('id, storage_path')
      .eq('storage_bucket', supabaseImageBucket)
      .in('storage_path', storagePaths);

    if (error) {
      throw new Error(error.message);
    }

    (data ?? []).forEach((row) => {
      const mediaRecord = row as MediaRecordReferenceRow;

      if (mediaRecord.storage_path) {
        mediaIdByStoragePath.set(mediaRecord.storage_path, mediaRecord.id);
      }
    });

    const missingStoragePaths = storagePaths.filter(
      (storagePath) => !mediaIdByStoragePath.has(storagePath),
    );

    if (missingStoragePaths.length > 0) {
      throw new Error(
        `Missing media records for question image(s): ${missingStoragePaths.join(', ')}`,
      );
    }
  }

  if (assets.length === 0) {
    const { error: deleteError } = await client
      .from('question_media')
      .delete()
      .eq('question_id', questionId)
      .in('placement', linkPlacements);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return;
  }

  const { data: existingLinkData, error: existingLinkError } = await client
    .from('question_media')
    .select('id, placement, asset_id')
    .eq('question_id', questionId)
    .in('placement', linkPlacements);

  if (existingLinkError) {
    throw new Error(existingLinkError.message);
  }

  const desiredLinkKeys = new Set(assets.map((asset) => `${asset.placement}:${asset.assetId}`));
  const staleLinkIds = (existingLinkData ?? [])
    .map((row) => row as QuestionMediaLinkRow)
    .filter((row) => !desiredLinkKeys.has(`${row.placement}:${row.asset_id ?? ''}`))
    .map((row) => row.id);

  const { error: upsertError } = await client.from('question_media').upsert(
    assets.map((asset) => ({
      question_id: questionId,
      media_id: mediaIdByStoragePath.get(asset.storagePath),
      placement: asset.placement,
      asset_id: asset.assetId,
      sort_order: asset.sortOrder,
    })),
    { onConflict: 'question_id,placement,asset_id' },
  );

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  if (staleLinkIds.length === 0) {
    return;
  }

  const { error: deleteError } = await client
    .from('question_media')
    .delete()
    .eq('question_id', questionId)
    .in('id', staleLinkIds);

  if (deleteError) {
    throw new Error(deleteError.message);
  }
}

export function questionContentRecordToSupabaseRow(
  record: QuestionContentRecord,
  userId?: string,
): QuestionContentRow {
  const createdBy = record.publication.createdBy ?? userId ?? null;

  return {
    id: record.id,
    question_set_version: record.publication.questionSetVersion,
    content: {
      question: record.question,
      publication: record.publication,
    },
    status: record.publication.status,
    is_published: publicationStatusToPublishedFlag(record.publication.status),
    created_by: createdBy,
    created_at: record.publication.createdAt,
    updated_at: record.publication.updatedAt,
  };
}

export function createSupabaseQuestionContentStore({
  enabled,
  client = supabase,
  userId,
  defaultQuestionSetVersion = 'server',
  now: nowOption,
}: CreateSupabaseQuestionContentStoreOptions): QuestionContentStore {
  const now = nowOption ?? (() => new Date());

  async function loadRecordById(questionId: string): Promise<QuestionContentRecord | null> {
    const activeClient = assertSupabaseClient(enabled, client);
    const { data, error } = await activeClient
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? questionContentRecordFromSupabaseRow(data as QuestionContentRow) : null;
  }

  async function persistRecord(record: QuestionContentRecord): Promise<QuestionContentRecord> {
    const activeClient = assertSupabaseClient(enabled, client);

    if (
      record.publication.status === 'published' &&
      questionHasBrowserLocalMedia(record.question)
    ) {
      throw new Error(
        'Cloud-published questions cannot use browser-local images or videos. Upload images to cloud storage and use an external video link.',
      );
    }

    const row = questionContentRecordToSupabaseRow(record, userId);
    const { data, error } = await activeClient
      .from('questions')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await syncQuestionMediaLinks(activeClient, record.id, record.question);

    return questionContentRecordFromSupabaseRow((data ?? row) as QuestionContentRow);
  }

  async function loadRecords(
    options?: LoadQuestionContentRecordsOptions,
  ): Promise<QuestionContentRecord[]> {
    const activeClient = assertSupabaseClient(enabled, client);
    let query = activeClient.from('questions').select('*');

    if (options?.publishedOnly) {
      query = query.or('status.eq.published,is_published.eq.true');
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return filterQuestionContentRecords(
      sortQuestionContentRecords(
        (data ?? []).map((row) => questionContentRecordFromSupabaseRow(row as QuestionContentRow)),
      ),
      options,
    );
  }

  return {
    kind: 'supabase',
    loadRecords,
    async listPublishedQuestions() {
      return getPublishedQuestions(await loadRecords({ publishedOnly: true }));
    },
    async getQuestion(questionId) {
      return loadRecordById(questionId);
    },
    async saveQuestion(input: SaveQuestionContentInput) {
      const question = parseQuestionContentCandidate(input.question);
      const existingRecord = await loadRecordById(question.id);
      const record = existingRecord
        ? updateQuestionContentRecord(existingRecord, question, {
            status: input.status,
            questionSetVersion: input.questionSetVersion,
            now: input.now ?? now(),
            updatedBy: input.updatedBy ?? userId,
          })
        : createQuestionContentRecord(question, {
            status: input.status ?? 'draft',
            questionSetVersion: input.questionSetVersion ?? defaultQuestionSetVersion,
            now: input.now ?? now(),
            createdBy: input.updatedBy ?? userId,
            updatedBy: input.updatedBy ?? userId,
          });

      return persistRecord(record);
    },
    async importQuestions(input: ImportQuestionContentInput): Promise<QuestionContentImportResult> {
      const existingRecords = await loadRecords();
      const existingIds = new Set(existingRecords.map((record) => record.id));
      const seenIncomingIds = new Set<string>();
      const importedRecords: QuestionContentRecord[] = [];

      input.questions.forEach((questionCandidate) => {
        const question = QuestionSchema.parse(questionCandidate) as Question;

        if (existingIds.has(question.id) || seenIncomingIds.has(question.id)) {
          return;
        }

        seenIncomingIds.add(question.id);
        importedRecords.push(
          createQuestionContentRecord(question, {
            status: input.status ?? 'draft',
            questionSetVersion: input.questionSetVersion ?? defaultQuestionSetVersion,
            now: input.now ?? now(),
            createdBy: input.updatedBy ?? userId,
            updatedBy: input.updatedBy ?? userId,
          }),
        );
      });

      if (importedRecords.length > 0) {
        const activeClient = assertSupabaseClient(enabled, client);
        const { error } = await activeClient.from('questions').upsert(
          importedRecords.map((record) => questionContentRecordToSupabaseRow(record, userId)),
          { onConflict: 'id' },
        );

        if (error) {
          throw new Error(error.message);
        }

        await Promise.all(
          importedRecords.map((record) =>
            syncQuestionMediaLinks(activeClient, record.id, record.question),
          ),
        );
      }

      return {
        records: await loadRecords(),
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
      const existingRecord = await loadRecordById(questionId);

      if (!existingRecord) {
        throw new Error(`Question content record not found: ${questionId}`);
      }

      return persistRecord(
        setQuestionContentRecordStatus(existingRecord, status, {
          now: options.now ?? now(),
          updatedBy: options.updatedBy ?? userId,
        }),
      );
    },
    async deleteQuestion(questionId) {
      const activeClient = assertSupabaseClient(enabled, client);
      const { error } = await activeClient.from('questions').delete().eq('id', questionId);

      if (error) {
        throw new Error(error.message);
      }
    },
  };
}

export function useSupabaseQuestionContentStore({
  enabled,
  userId,
  seedQuestions = [],
  defaultQuestionSetVersion = 'server',
  now: nowOption,
}: UseSupabaseQuestionContentStoreOptions) {
  const now = useMemo(() => nowOption ?? (() => new Date()), [nowOption]);
  const store = useMemo(
    () =>
      createSupabaseQuestionContentStore({
        enabled,
        userId,
        defaultQuestionSetVersion,
        now,
      }),
    [defaultQuestionSetVersion, enabled, now, userId],
  );
  const [contentRecords, setContentRecords] = useState<QuestionContentRecord[]>([]);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [contentError, setContentError] = useState('');
  const contentRecordsRef = useRef(contentRecords);
  const questionWriteQueuesRef = useRef(new Map<string, Promise<void>>());
  const questionOperationVersionsRef = useRef(new Map<string, number>());
  const nextQuestionOperationVersionRef = useRef(0);

  const seedQuestionIds = useMemo(
    () => new Set(seedQuestions.map((question) => question.id)),
    [seedQuestions],
  );

  const setSortedContentRecords = useCallback((records: QuestionContentRecord[]) => {
    const sortedRecords = sortQuestionContentRecords(records);
    contentRecordsRef.current = sortedRecords;
    setContentRecords(sortedRecords);
    return sortedRecords;
  }, []);

  const nextQuestionOperationVersion = useCallback((questionId: string) => {
    nextQuestionOperationVersionRef.current += 1;
    const version = nextQuestionOperationVersionRef.current;
    questionOperationVersionsRef.current.set(questionId, version);
    return version;
  }, []);

  const isLatestQuestionOperation = useCallback(
    (questionId: string, version: number) =>
      questionOperationVersionsRef.current.get(questionId) === version,
    [],
  );

  const enqueueQuestionWrite = useCallback((questionId: string, write: () => Promise<void>) => {
    const previousWrite = questionWriteQueuesRef.current.get(questionId) ?? Promise.resolve();
    const queuedWrite = previousWrite.then(write, write);
    const trackedWrite = queuedWrite.catch(() => undefined);

    questionWriteQueuesRef.current.set(questionId, trackedWrite);
    void trackedWrite.finally(() => {
      if (questionWriteQueuesRef.current.get(questionId) === trackedWrite) {
        questionWriteQueuesRef.current.delete(questionId);
      }
    });

    return queuedWrite;
  }, []);

  const refreshContent = useCallback(async () => {
    if (!enabled) {
      setSortedContentRecords([]);
      setIsContentLoading(false);
      setContentError('');
      return;
    }

    setIsContentLoading(true);

    try {
      const records = await store.loadRecords();
      setSortedContentRecords(records);
      setContentError('');
    } catch (error) {
      setContentError(error instanceof Error ? error.message : 'Unable to load question content.');
    } finally {
      setIsContentLoading(false);
    }
  }, [enabled, setSortedContentRecords, store]);

  useEffect(() => {
    void refreshContent();
  }, [refreshContent]);

  const questionBank = useMemo(() => {
    const publishedCustomQuestions = getPublishedQuestions(contentRecords).filter(
      (question) => !seedQuestionIds.has(question.id),
    );

    return [...seedQuestions, ...publishedCustomQuestions];
  }, [contentRecords, seedQuestionIds, seedQuestions]);

  const customQuestions = useMemo(
    () => contentRecords.map((record) => record.question),
    [contentRecords],
  );

  const saveCustomQuestion = useCallback(
    (question: Question, status?: QuestionPublicationStatus) => {
      const operationVersion = nextQuestionOperationVersion(question.id);
      const operationNow = now();
      const optimisticRecords = upsertQuestionContentRecord(contentRecordsRef.current, question, {
        status,
        questionSetVersion: defaultQuestionSetVersion,
        now: operationNow,
        updatedBy: userId,
      });
      setSortedContentRecords(optimisticRecords);

      void enqueueQuestionWrite(question.id, async () => {
        const record = await store.saveQuestion({
          question,
          status,
          questionSetVersion: defaultQuestionSetVersion,
          updatedBy: userId,
          now: operationNow,
        });

        if (isLatestQuestionOperation(question.id, operationVersion)) {
          setSortedContentRecords([
            ...contentRecordsRef.current.filter((currentRecord) => currentRecord.id !== record.id),
            record,
          ]);
          setContentError('');
        }
      }).catch((error) => {
        if (isLatestQuestionOperation(question.id, operationVersion)) {
          setContentError(
            error instanceof Error ? error.message : 'Unable to save question content.',
          );
        }
      });
    },
    [
      defaultQuestionSetVersion,
      enqueueQuestionWrite,
      isLatestQuestionOperation,
      nextQuestionOperationVersion,
      now,
      setSortedContentRecords,
      store,
      userId,
    ],
  );

  const deleteCustomQuestion = useCallback(
    (questionId: string) => {
      const operationVersion = nextQuestionOperationVersion(questionId);
      setSortedContentRecords(
        contentRecordsRef.current.filter((record) => record.id !== questionId),
      );

      void enqueueQuestionWrite(questionId, async () => {
        await store.deleteQuestion(questionId);

        if (isLatestQuestionOperation(questionId, operationVersion)) {
          setContentError('');
        }
      }).catch((error) => {
        if (isLatestQuestionOperation(questionId, operationVersion)) {
          setContentError(
            error instanceof Error ? error.message : 'Unable to delete question content.',
          );
        }
      });
    },
    [
      enqueueQuestionWrite,
      isLatestQuestionOperation,
      nextQuestionOperationVersion,
      setSortedContentRecords,
      store,
    ],
  );

  const importCustomQuestions = useCallback(
    (questions: Question[]) => {
      const existingIds = new Set(contentRecordsRef.current.map((record) => record.id));
      const seenIncomingIds = new Set<string>();
      const allowedQuestions = questions.filter((question) => {
        if (
          seedQuestionIds.has(question.id) ||
          existingIds.has(question.id) ||
          seenIncomingIds.has(question.id)
        ) {
          return false;
        }

        seenIncomingIds.add(question.id);
        return true;
      });
      const importedRecords = allowedQuestions.map((question) =>
        createQuestionContentRecord(question, {
          status: 'draft',
          questionSetVersion: defaultQuestionSetVersion,
          now: now(),
          createdBy: userId,
          updatedBy: userId,
        }),
      );

      setSortedContentRecords([...contentRecordsRef.current, ...importedRecords]);

      void store
        .importQuestions({
          questions: allowedQuestions,
          status: 'draft',
          questionSetVersion: defaultQuestionSetVersion,
          updatedBy: userId,
        })
        .then((result) => {
          setSortedContentRecords(result.records);
          setContentError('');
        })
        .catch((error) => {
          setContentError(
            error instanceof Error ? error.message : 'Unable to import question content.',
          );
        });

      return {
        imported: allowedQuestions.length,
        skipped: questions.length - allowedQuestions.length,
      };
    },
    [defaultQuestionSetVersion, now, seedQuestionIds, setSortedContentRecords, store, userId],
  );

  const setCustomQuestionStatus = useCallback(
    (questionId: string, status: QuestionPublicationStatus) => {
      const operationVersion = nextQuestionOperationVersion(questionId);
      const operationNow = now();
      const existingRecord = contentRecordsRef.current.find((record) => record.id === questionId);

      if (existingRecord) {
        const updatedRecord = setQuestionContentRecordStatus(existingRecord, status, {
          now: operationNow,
          updatedBy: userId,
        });
        setSortedContentRecords([
          ...contentRecordsRef.current.filter((record) => record.id !== questionId),
          updatedRecord,
        ]);
      }

      void enqueueQuestionWrite(questionId, async () => {
        const record = await store.setPublicationStatus(questionId, status, {
          now: operationNow,
          updatedBy: userId,
        });

        if (isLatestQuestionOperation(questionId, operationVersion)) {
          setSortedContentRecords([
            ...contentRecordsRef.current.filter((currentRecord) => currentRecord.id !== record.id),
            record,
          ]);
          setContentError('');
        }
      }).catch((error) => {
        if (isLatestQuestionOperation(questionId, operationVersion)) {
          setContentError(
            error instanceof Error ? error.message : 'Unable to update question status.',
          );
        }
      });
    },
    [
      enqueueQuestionWrite,
      isLatestQuestionOperation,
      nextQuestionOperationVersion,
      now,
      setSortedContentRecords,
      store,
      userId,
    ],
  );

  const getQuestionStatus = useCallback(
    (questionId: string): QuestionPublicationStatus =>
      contentRecordsRef.current.find((record) => record.id === questionId)?.publication.status ??
      'draft',
    [],
  );

  return {
    questionBank,
    customQuestions,
    contentRecords,
    seedQuestionIds,
    saveCustomQuestion,
    deleteCustomQuestion,
    importCustomQuestions,
    setCustomQuestionStatus,
    getQuestionStatus,
    isContentLoading,
    contentError,
    refreshContent,
  };
}
