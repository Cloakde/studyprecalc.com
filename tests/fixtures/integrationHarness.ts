import {
  signupLocalAccount,
  type AccountStorage,
  type PublicAccount,
  type SignupInput,
} from '../../src/data/localAccountStore';
import { loadAttemptsFromStorage, type AttemptStorage } from '../../src/data/localAttemptStore';
import { enrollLocalAccountInClass } from '../../src/data/localClassStore';
import {
  consumeLocalInviteCode,
  validateLocalInviteCode,
  type InviteStorage,
} from '../../src/data/localInviteStore';
import type { QuestionContentStorage } from '../../src/data/localQuestionContentStore';
import { loadSessionsFromStorage, type SessionStorage } from '../../src/data/localSessionStore';
import type { QuestionContentStore } from '../../src/data/questionContentStore';
import type { ClassEnrollment } from '../../src/domain/classes';
import type { Attempt } from '../../src/domain/attempts';
import { createDashboardAnalytics, type DashboardAnalytics } from '../../src/domain/sessions';
import type { SessionResult } from '../../src/domain/sessions';
import type { InviteConsumeResult, InviteValidationResult } from '../../src/domain/invites';
import type { McqQuestion, Question } from '../../src/domain/questions/types';
import { testMcqQuestion } from './testQuestions';

export type IntegrationMemoryStorage = AccountStorage &
  AttemptStorage &
  InviteStorage &
  QuestionContentStorage &
  SessionStorage;

export function createMemoryStorage(): IntegrationMemoryStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

export function createIntegrationMcqQuestion(id: string, prompt?: string): McqQuestion {
  return {
    ...testMcqQuestion,
    id,
    prompt: prompt ?? `Integration harness question ${id}.`,
    tags: [...testMcqQuestion.tags, id],
  };
}

export function createFailingQuestionContentStore(
  message = 'primary question content store unavailable',
): QuestionContentStore {
  async function fail(): Promise<never> {
    throw new Error(message);
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

export function canUseAdminSurfaces(account: Pick<PublicAccount, 'role'> | null): boolean {
  return account?.role === 'admin';
}

export async function loadVisibleQuestionIdsForRole(
  store: QuestionContentStore,
  role: PublicAccount['role'],
): Promise<string[]> {
  if (role === 'student') {
    return (await store.listPublishedQuestions()).map((question) => question.id);
  }

  return (await store.loadRecords({ includeArchived: false })).map((record) => record.id);
}

export function loadPersistedDashboardState(options: {
  storage: IntegrationMemoryStorage;
  attemptStorageKey: string;
  sessionStorageKey: string;
  questions: Question[];
}): {
  attempts: Attempt[];
  sessions: SessionResult[];
  analytics: DashboardAnalytics;
} {
  const attempts = loadAttemptsFromStorage(options.storage, options.attemptStorageKey);
  const sessions = loadSessionsFromStorage(options.storage, options.sessionStorageKey);

  return {
    attempts,
    sessions,
    analytics: createDashboardAnalytics({
      attempts,
      sessions,
      questions: options.questions,
    }),
  };
}

export async function signupLocalAccountThroughInvite(
  input: SignupInput,
  options: {
    storage: IntegrationMemoryStorage;
    accountStorageKey: string;
    inviteStorageKey: string;
    classStorageKey?: string;
    accountId?: string;
    passwordSalt?: string;
    enrollmentId?: string;
    validationNow?: Date;
    signupNow?: Date;
    consumedNow?: Date;
    enrollmentNow?: Date;
  },
): Promise<{
  account: PublicAccount;
  validation: InviteValidationResult;
  consumedInvite: InviteConsumeResult;
  enrollment: ClassEnrollment | null;
}> {
  const validation = validateLocalInviteCode(
    {
      code: input.inviteCode ?? '',
      email: input.email,
    },
    {
      storage: options.storage,
      storageKey: options.inviteStorageKey,
      now: () => options.validationNow ?? new Date('2026-05-14T08:00:00.000Z'),
    },
  );

  if (validation.status !== 'valid') {
    throw new Error(`Invite code is not available (${validation.reason}).`);
  }

  const signup = await signupLocalAccount(input, {
    storage: options.storage,
    storageKey: options.accountStorageKey,
    now: () => options.signupNow ?? new Date('2026-05-14T08:05:00.000Z'),
    createId: () => options.accountId ?? 'integration-account-1',
    createSalt: () => options.passwordSalt ?? 'integration-salt-1',
  });
  const consumedInvite = consumeLocalInviteCode(
    {
      code: input.inviteCode ?? '',
      email: input.email,
      accountId: signup.account.id,
    },
    {
      storage: options.storage,
      storageKey: options.inviteStorageKey,
      now: () => options.consumedNow ?? new Date('2026-05-14T08:10:00.000Z'),
    },
  );
  let enrollment: ClassEnrollment | null = null;

  if (consumedInvite.status === 'consumed' && consumedInvite.invite.classId) {
    enrollment = enrollLocalAccountInClass(consumedInvite.invite.classId, signup.account, {
      storage: options.storage,
      storageKey: options.classStorageKey,
      now: () => options.enrollmentNow ?? new Date('2026-05-14T08:15:00.000Z'),
      createId: () => options.enrollmentId ?? 'integration-enrollment-1',
    }).enrollment;
  }

  return {
    account: signup.account,
    validation,
    consumedInvite,
    enrollment,
  };
}
