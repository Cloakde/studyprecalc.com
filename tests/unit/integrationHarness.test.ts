import {
  getActivePublicAccount,
  loadAccountPayload,
  saveAccountPayload,
} from '../../src/data/localAccountStore';
import { saveAttemptsToStorage } from '../../src/data/localAttemptStore';
import { createLocalClass, loadClassPayload } from '../../src/data/localClassStore';
import { createLocalInvite, loadInvitePayload } from '../../src/data/localInviteStore';
import { createLocalQuestionContentStore } from '../../src/data/localQuestionContentStore';
import { saveSessionsToStorage } from '../../src/data/localSessionStore';
import { createQuestionContentStoreWithFallback } from '../../src/data/questionContentStore';
import { createMcqAttempt } from '../../src/domain/attempts';
import { createSessionResult } from '../../src/domain/sessions';
import {
  canUseAdminSurfaces,
  createFailingQuestionContentStore,
  createIntegrationMcqQuestion,
  createMemoryStorage,
  loadPersistedDashboardState,
  loadVisibleQuestionIdsForRole,
  signupLocalAccountThroughInvite,
} from '../fixtures/integrationHarness';
import { testQuestionSet } from '../fixtures/testQuestions';

describe('integration harness invite signup flow', () => {
  it('validates, signs up, consumes an invite, and enrolls the student locally', async () => {
    const storage = createMemoryStorage();
    const accountStorageKey = 'integration.accounts';
    const classStorageKey = 'integration.classes';
    const inviteStorageKey = 'integration.invites';

    createLocalClass(
      {
        name: 'Period 1 Precalculus',
        createdBy: 'admin-1',
      },
      {
        storage,
        storageKey: classStorageKey,
        now: () => new Date('2026-05-14T07:45:00.000Z'),
        createId: () => 'class-1',
      },
    );
    createLocalInvite(
      {
        code: 'PD7!RD8@P9#?',
        email: 'Student@One.Example',
        classId: 'class-1',
        createdByAccountId: 'admin-1',
        expiresAt: '2026-05-15T08:00:00.000Z',
      },
      {
        storage,
        storageKey: inviteStorageKey,
        now: () => new Date('2026-05-14T07:50:00.000Z'),
        createId: () => 'invite-1',
      },
    );

    const result = await signupLocalAccountThroughInvite(
      {
        displayName: 'Student One',
        email: ' student@one.example ',
        password: 'secret1',
        inviteCode: ' pd7!rd8@p9#? ',
      },
      {
        storage,
        accountStorageKey,
        classStorageKey,
        inviteStorageKey,
        accountId: 'account-1',
      },
    );

    expect(result.validation).toMatchObject({ status: 'valid' });
    expect(result.account).toMatchObject({
      id: 'account-1',
      email: 'student@one.example',
      role: 'student',
    });
    expect(result.consumedInvite).toMatchObject({
      status: 'consumed',
      invite: {
        code: 'PD7!RD8@P9#?',
        consumedByAccountId: 'account-1',
      },
    });
    expect(result.enrollment).toMatchObject({
      classId: 'class-1',
      accountId: 'account-1',
      role: 'student',
    });
    expect(loadInvitePayload(storage, inviteStorageKey).invites[0]).toMatchObject({
      consumedByAccountId: 'account-1',
    });
    expect(loadClassPayload(storage, classStorageKey).enrollments).toHaveLength(1);
  });

  it('does not create an account when invite validation fails', async () => {
    const storage = createMemoryStorage();
    const accountStorageKey = 'integration.accounts.invalid';
    const inviteStorageKey = 'integration.invites.invalid';

    createLocalInvite(
      {
        code: 'EM7!IL8@BD9#',
        email: 'invited@example.com',
        expiresAt: '2026-05-15T08:00:00.000Z',
      },
      {
        storage,
        storageKey: inviteStorageKey,
        now: () => new Date('2026-05-14T07:50:00.000Z'),
        createId: () => 'invite-email-bound',
      },
    );

    await expect(
      signupLocalAccountThroughInvite(
        {
          displayName: 'Wrong Student',
          email: 'wrong@example.com',
          password: 'secret1',
          inviteCode: 'EM7!IL8@BD9#',
        },
        {
          storage,
          accountStorageKey,
          inviteStorageKey,
        },
      ),
    ).rejects.toThrow('Invite code is not available (email-mismatch).');

    expect(loadAccountPayload(storage, accountStorageKey).accounts).toEqual([]);
    expect(loadInvitePayload(storage, inviteStorageKey).invites[0].consumedAt).toBeUndefined();
  });
});

describe('integration harness role and content visibility', () => {
  it('keeps admin role access distinct from student accounts loaded from storage', () => {
    const storage = createMemoryStorage();
    const storageKey = 'integration.accounts.roles';

    saveAccountPayload(
      {
        version: 'precalcapp.accounts.v1',
        activeAccountId: 'admin-1',
        accounts: [
          {
            id: 'admin-1',
            email: 'admin@example.com',
            displayName: 'Admin',
            role: 'admin',
            passwordSalt: 'salt-admin',
            passwordHash: 'hash-admin',
            createdAt: '2026-05-14T08:00:00.000Z',
          },
          {
            id: 'student-1',
            email: 'student@example.com',
            displayName: 'Student',
            role: 'student',
            passwordSalt: 'salt-student',
            passwordHash: 'hash-student',
            createdAt: '2026-05-14T08:00:00.000Z',
          },
        ],
      },
      storage,
      storageKey,
    );

    const adminAccount = getActivePublicAccount(loadAccountPayload(storage, storageKey));
    expect(canUseAdminSurfaces(adminAccount)).toBe(true);

    saveAccountPayload(
      {
        version: 'precalcapp.accounts.v1',
        activeAccountId: 'student-1',
        accounts: loadAccountPayload(storage, storageKey).accounts,
      },
      storage,
      storageKey,
    );

    const studentAccount = getActivePublicAccount(loadAccountPayload(storage, storageKey));
    expect(canUseAdminSurfaces(studentAccount)).toBe(false);
  });

  it('shows students published questions while admins can inspect active drafts', async () => {
    const storage = createMemoryStorage();
    const store = createLocalQuestionContentStore({
      storage,
      storageKey: 'integration.question-content.visibility',
      now: () => new Date('2026-05-14T08:00:00.000Z'),
    });

    await store.saveQuestion({
      question: createIntegrationMcqQuestion('integration-draft'),
      status: 'draft',
      updatedBy: 'admin-1',
    });
    await store.saveQuestion({
      question: createIntegrationMcqQuestion('integration-published'),
      status: 'published',
      updatedBy: 'admin-1',
    });
    await store.saveQuestion({
      question: createIntegrationMcqQuestion('integration-archived'),
      status: 'archived',
      updatedBy: 'admin-1',
    });

    expect(await loadVisibleQuestionIdsForRole(store, 'student')).toEqual([
      'integration-published',
    ]);
    expect(await loadVisibleQuestionIdsForRole(store, 'admin')).toEqual([
      'integration-draft',
      'integration-published',
    ]);
    expect((await store.loadRecords({ includeArchived: true })).map((record) => record.id)).toEqual(
      ['integration-archived', 'integration-draft', 'integration-published'],
    );
  });
});

describe('integration harness local fallback and empty banks', () => {
  it('starts with an empty local question bank and falls back when the primary store fails', async () => {
    const storage = createMemoryStorage();
    const localStore = createLocalQuestionContentStore({
      storage,
      storageKey: 'integration.question-content.fallback',
      now: () => new Date('2026-05-14T08:00:00.000Z'),
    });
    const fallbackEvents: string[] = [];
    const store = createQuestionContentStoreWithFallback(
      createFailingQuestionContentStore(),
      localStore,
      (operation) => fallbackEvents.push(operation),
    );

    expect(await localStore.loadRecords()).toEqual([]);
    expect(await store.listPublishedQuestions()).toEqual([]);

    await store.saveQuestion({
      question: createIntegrationMcqQuestion('integration-fallback-published'),
      status: 'published',
      updatedBy: 'admin-1',
      now: '2026-05-14T08:05:00.000Z',
    });

    expect((await store.listPublishedQuestions()).map((question) => question.id)).toEqual([
      'integration-fallback-published',
    ]);
    expect(fallbackEvents).toEqual([
      'listPublishedQuestions',
      'saveQuestion',
      'listPublishedQuestions',
    ]);
  });
});

describe('integration harness live smoke expectations', () => {
  it('simulates invite enrollment, content visibility, and dashboard persistence without network access', async () => {
    const storage = createMemoryStorage();
    const accountStorageKey = 'integration.live.accounts';
    const attemptStorageKey = 'integration.live.attempts';
    const classStorageKey = 'integration.live.classes';
    const contentStorageKey = 'integration.live.content';
    const inviteStorageKey = 'integration.live.invites';
    const sessionStorageKey = 'integration.live.sessions';
    const publishedQuestion = createIntegrationMcqQuestion('live-published');
    const draftQuestion = createIntegrationMcqQuestion('live-draft');
    const archivedQuestion = createIntegrationMcqQuestion('live-archived');
    const contentStore = createLocalQuestionContentStore({
      storage,
      storageKey: contentStorageKey,
      now: () => new Date('2026-05-15T09:00:00.000Z'),
    });

    createLocalClass(
      {
        name: 'Live Smoke Period',
        createdBy: 'admin-live',
      },
      {
        storage,
        storageKey: classStorageKey,
        now: () => new Date('2026-05-15T08:00:00.000Z'),
        createId: () => 'class-live',
      },
    );
    createLocalInvite(
      {
        code: 'LV7!SM8@K9#?',
        email: 'smoke.student@example.com',
        classId: 'class-live',
        createdByAccountId: 'admin-live',
        expiresAt: '2026-05-16T08:00:00.000Z',
      },
      {
        storage,
        storageKey: inviteStorageKey,
        now: () => new Date('2026-05-15T08:05:00.000Z'),
        createId: () => 'invite-live',
      },
    );

    const signup = await signupLocalAccountThroughInvite(
      {
        displayName: 'Smoke Student',
        email: 'smoke.student@example.com',
        password: 'secret1',
        inviteCode: 'LV7!SM8@K9#?',
      },
      {
        storage,
        accountStorageKey,
        classStorageKey,
        inviteStorageKey,
        accountId: 'student-live',
        enrollmentId: 'enrollment-live',
      },
    );

    await contentStore.saveQuestion({
      question: draftQuestion,
      status: 'draft',
      updatedBy: 'admin-live',
      now: '2026-05-15T09:00:00.000Z',
    });
    await contentStore.saveQuestion({
      question: publishedQuestion,
      status: 'published',
      updatedBy: 'admin-live',
      now: '2026-05-15T09:05:00.000Z',
    });
    await contentStore.saveQuestion({
      question: archivedQuestion,
      status: 'published',
      updatedBy: 'admin-live',
      now: '2026-05-15T09:10:00.000Z',
    });
    await contentStore.setPublicationStatus(archivedQuestion.id, 'archived', {
      updatedBy: 'admin-live',
      now: '2026-05-15T09:15:00.000Z',
    });

    const linkedAttempt = createMcqAttempt({
      id: 'attempt-live-session',
      question: publishedQuestion,
      selectedChoiceId: 'A',
      startedAt: '2026-05-15T10:00:00.000Z',
      submittedAt: '2026-05-15T10:01:00.000Z',
    });
    const standaloneAttempt = createMcqAttempt({
      id: 'attempt-live-standalone',
      question: publishedQuestion,
      selectedChoiceId: 'B',
      startedAt: '2026-05-15T10:30:00.000Z',
      submittedAt: '2026-05-15T10:31:00.000Z',
    });
    const session = createSessionResult({
      id: 'session-live',
      questionSetVersion: testQuestionSet.version,
      questions: [publishedQuestion],
      responses: {
        [publishedQuestion.id]: {
          startedAt: '2026-05-15T10:00:00.000Z',
          submittedAt: '2026-05-15T10:01:00.000Z',
          selectedChoiceId: 'A',
          partResponses: {},
          earnedPointsByCriterion: {},
          attemptId: linkedAttempt.id,
        },
      },
      markedQuestionIds: [],
      startedAt: '2026-05-15T10:00:00.000Z',
      submittedAt: '2026-05-15T10:01:00.000Z',
      filters: {
        type: 'mcq',
        unit: 'all',
        difficulty: 'all',
        calculator: 'all',
      },
    });

    saveAttemptsToStorage([linkedAttempt, standaloneAttempt], storage, attemptStorageKey);
    saveSessionsToStorage([session], storage, sessionStorageKey);

    expect(signup).toMatchObject({
      validation: { status: 'valid' },
      account: { id: 'student-live', role: 'student' },
      consumedInvite: {
        status: 'consumed',
        invite: {
          code: 'LV7!SM8@K9#?',
          consumedByAccountId: 'student-live',
        },
      },
      enrollment: {
        id: 'enrollment-live',
        classId: 'class-live',
        accountId: 'student-live',
      },
    });
    await expect(loadVisibleQuestionIdsForRole(contentStore, 'student')).resolves.toEqual([
      publishedQuestion.id,
    ]);
    await expect(loadVisibleQuestionIdsForRole(contentStore, 'admin')).resolves.toEqual([
      draftQuestion.id,
      publishedQuestion.id,
    ]);

    const reloadedDashboard = loadPersistedDashboardState({
      storage,
      attemptStorageKey,
      sessionStorageKey,
      questions: [publishedQuestion],
    });

    expect(reloadedDashboard.attempts.map((attempt) => attempt.id)).toEqual([
      standaloneAttempt.id,
      linkedAttempt.id,
    ]);
    expect(reloadedDashboard.sessions.map((storedSession) => storedSession.id)).toEqual([
      session.id,
    ]);
    expect(reloadedDashboard.analytics.unitTrends[0]).toMatchObject({
      label: publishedQuestion.unit,
      questionCount: 2,
      score: 1,
      maxScore: 2,
      missedCount: 1,
    });
    expect(reloadedDashboard.analytics.recommendedNext).toMatchObject({
      availableQuestionIds: [publishedQuestion.id],
      skill: publishedQuestion.skill,
    });
  });
});
