import type {
  QuestionContentRecord,
  QuestionContentTimestamp,
  QuestionPublicationStatus,
} from '../domain/questions/contentRecords';
import type { Question } from '../domain/questions/types';
import {
  createLocalQuestionContentStore,
  type CreateLocalQuestionContentStoreOptions,
} from './localQuestionContentStore';
import { isSupabaseConfigured } from './supabase/client';
import {
  createSupabaseQuestionContentStore,
  type CreateSupabaseQuestionContentStoreOptions,
} from './supabase/questionContentStore';

export type LoadQuestionContentRecordsOptions = {
  publishedOnly?: boolean;
  includeArchived?: boolean;
};

export type SaveQuestionContentInput = {
  question: Question;
  status?: QuestionPublicationStatus;
  questionSetVersion?: string;
  updatedBy?: string;
  now?: QuestionContentTimestamp;
};

export type ImportQuestionContentInput = {
  questions: Question[];
  status?: QuestionPublicationStatus;
  questionSetVersion?: string;
  updatedBy?: string;
  now?: QuestionContentTimestamp;
};

export type QuestionContentImportResult = {
  records: QuestionContentRecord[];
  imported: number;
  skipped: number;
};

export type QuestionContentStore = {
  kind: 'local' | 'supabase' | 'fallback';
  loadRecords: (options?: LoadQuestionContentRecordsOptions) => Promise<QuestionContentRecord[]>;
  listPublishedQuestions: () => Promise<Question[]>;
  getQuestion: (questionId: string) => Promise<QuestionContentRecord | null>;
  saveQuestion: (input: SaveQuestionContentInput) => Promise<QuestionContentRecord>;
  importQuestions: (input: ImportQuestionContentInput) => Promise<QuestionContentImportResult>;
  setPublicationStatus: (
    questionId: string,
    status: QuestionPublicationStatus,
    options?: {
      now?: QuestionContentTimestamp;
      updatedBy?: string;
    },
  ) => Promise<QuestionContentRecord>;
  deleteQuestion: (questionId: string) => Promise<void>;
};

export type QuestionContentFallbackOperation =
  | 'loadRecords'
  | 'listPublishedQuestions'
  | 'getQuestion'
  | 'saveQuestion'
  | 'importQuestions'
  | 'setPublicationStatus'
  | 'deleteQuestion'
  | 'localMirror';

export type CreateQuestionContentStoreOptions = {
  preferSupabase?: boolean;
  supabaseEnabled?: boolean;
  fallbackToLocal?: boolean;
  userId?: string;
  localStore?: QuestionContentStore;
  local?: CreateLocalQuestionContentStoreOptions;
  supabase?: Omit<CreateSupabaseQuestionContentStoreOptions, 'enabled' | 'userId'>;
  onFallback?: (operation: QuestionContentFallbackOperation, error: unknown) => void;
};

async function mirrorLocalWrite(
  operation: QuestionContentFallbackOperation,
  action: () => Promise<unknown>,
  onFallback?: (operation: QuestionContentFallbackOperation, error: unknown) => void,
) {
  try {
    await action();
  } catch (error) {
    onFallback?.(operation, error);
  }
}

export function createQuestionContentStoreWithFallback(
  primary: QuestionContentStore,
  fallback: QuestionContentStore,
  onFallback?: (operation: QuestionContentFallbackOperation, error: unknown) => void,
): QuestionContentStore {
  return {
    kind: 'fallback',
    async loadRecords(options) {
      try {
        return await primary.loadRecords(options);
      } catch (error) {
        onFallback?.('loadRecords', error);
        return fallback.loadRecords(options);
      }
    },
    async listPublishedQuestions() {
      try {
        return await primary.listPublishedQuestions();
      } catch (error) {
        onFallback?.('listPublishedQuestions', error);
        return fallback.listPublishedQuestions();
      }
    },
    async getQuestion(questionId) {
      try {
        return await primary.getQuestion(questionId);
      } catch (error) {
        onFallback?.('getQuestion', error);
        return fallback.getQuestion(questionId);
      }
    },
    async saveQuestion(input) {
      try {
        const savedRecord = await primary.saveQuestion(input);
        await mirrorLocalWrite('localMirror', () => fallback.saveQuestion(input), onFallback);
        return savedRecord;
      } catch (error) {
        onFallback?.('saveQuestion', error);
        return fallback.saveQuestion(input);
      }
    },
    async importQuestions(input) {
      try {
        const result = await primary.importQuestions(input);
        await mirrorLocalWrite('localMirror', () => fallback.importQuestions(input), onFallback);
        return result;
      } catch (error) {
        onFallback?.('importQuestions', error);
        return fallback.importQuestions(input);
      }
    },
    async setPublicationStatus(questionId, status, options) {
      try {
        const updatedRecord = await primary.setPublicationStatus(questionId, status, options);
        await mirrorLocalWrite(
          'localMirror',
          () =>
            fallback.saveQuestion({
              question: updatedRecord.question,
              status: updatedRecord.publication.status,
              questionSetVersion: updatedRecord.publication.questionSetVersion,
              updatedBy: options?.updatedBy,
              now: updatedRecord.publication.updatedAt,
            }),
          onFallback,
        );
        return updatedRecord;
      } catch (error) {
        onFallback?.('setPublicationStatus', error);
        return fallback.setPublicationStatus(questionId, status, options);
      }
    },
    async deleteQuestion(questionId) {
      try {
        await primary.deleteQuestion(questionId);
        await mirrorLocalWrite(
          'localMirror',
          () => fallback.deleteQuestion(questionId),
          onFallback,
        );
      } catch (error) {
        onFallback?.('deleteQuestion', error);
        await fallback.deleteQuestion(questionId);
      }
    },
  };
}

export function createQuestionContentStore(
  options: CreateQuestionContentStoreOptions = {},
): QuestionContentStore {
  const fallbackStore = options.localStore ?? createLocalQuestionContentStore(options.local);
  const shouldUseSupabase =
    options.preferSupabase ?? options.supabaseEnabled ?? isSupabaseConfigured;

  if (!shouldUseSupabase) {
    return fallbackStore;
  }

  const supabaseStore = createSupabaseQuestionContentStore({
    ...options.supabase,
    enabled: shouldUseSupabase,
    userId: options.userId,
  });

  if (options.fallbackToLocal === false) {
    return supabaseStore;
  }

  return createQuestionContentStoreWithFallback(supabaseStore, fallbackStore, options.onFallback);
}
