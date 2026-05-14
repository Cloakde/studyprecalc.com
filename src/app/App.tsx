import { LogOut, UserCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  createAccountScopedStorageKey,
  type LoginInput,
  type PublicAccount,
  type SignupInput,
  useLocalAccountStore,
} from '../data/localAccountStore';
import { useLocalAttemptStore } from '../data/localAttemptStore';
import { useLocalClassStore } from '../data/localClassStore';
import { useLocalInviteStore } from '../data/localInviteStore';
import { useManagedQuestionBank } from '../data/localQuestionStore';
import { useLocalSessionStore } from '../data/localSessionStore';
import { questionBank as seedQuestionBank, questionSetVersion } from '../data/seed/questionBank';
import { useSupabaseAccountStore } from '../data/supabase/accountStore';
import { useSupabaseClassStore } from '../data/supabase/classStore';
import { isSupabaseConfigured } from '../data/supabase/client';
import { useSupabaseAttemptStore } from '../data/supabase/attemptStore';
import { useSupabaseInviteStore } from '../data/supabase/inviteStore';
import { uploadSupabaseImage } from '../data/supabase/mediaStore';
import { useSupabaseQuestionContentStore } from '../data/supabase/questionContentStore';
import { useSupabaseSessionStore } from '../data/supabase/sessionStore';
import { AccountAuth } from './components/AccountAuth';
import { AdminClassManager } from './components/AdminClassManager';
import { AttemptReview } from './components/AttemptReview';
import {
  ContentManager,
  type ContentManagerImageUploadContext,
} from './components/ContentManager';
import { QuestionPractice } from './components/QuestionPractice';
import { SessionPractice } from './components/SessionPractice';
import { StudentDashboard } from './components/StudentDashboard';

type AppMode = 'dashboard' | 'practice' | 'session' | 'review' | 'manage' | 'classes';

const localDevAdminEmail = 'admin@studyprecalc.local';
const localDevAdminPassword = 'localadmin';
const localDevAdminSessionKey = 'precalcapp.local-dev-admin.active';

function createLocalDevAdminAccount(): PublicAccount {
  return {
    id: 'local-dev-admin',
    email: localDevAdminEmail,
    displayName: 'Local Admin',
    role: 'admin',
    createdAt: '2026-05-13T00:00:00.000Z',
  };
}

function loadLocalDevAdminSession(): PublicAccount | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return null;
  }

  return window.sessionStorage.getItem(localDevAdminSessionKey) === 'true'
    ? createLocalDevAdminAccount()
    : null;
}

function isLocalDevAdminLogin(input: LoginInput): boolean {
  return (
    import.meta.env.DEV &&
    input.email.trim().toLowerCase() === localDevAdminEmail &&
    input.password === localDevAdminPassword
  );
}

function filenameToAltText(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
}

export function App() {
  const [mode, setMode] = useState<AppMode>('dashboard');
  const [localDevAdminAccount, setLocalDevAdminAccount] = useState<PublicAccount | null>(
    loadLocalDevAdminSession,
  );
  const localAccountStore = useLocalAccountStore();
  const supabaseAccountStore = useSupabaseAccountStore();
  const cloudOrLocalAccountStore = isSupabaseConfigured ? supabaseAccountStore : localAccountStore;
  const currentAccount = localDevAdminAccount ?? cloudOrLocalAccountStore.currentAccount;
  const canManageContent = currentAccount?.role === 'admin';
  const accountId = currentAccount?.id;
  const isCloudBackendActive = isSupabaseConfigured && !localDevAdminAccount;
  const localQuestionStore = useManagedQuestionBank(seedQuestionBank);
  const cloudQuestionStore = useSupabaseQuestionContentStore({
    enabled: isCloudBackendActive && Boolean(accountId),
    userId: accountId,
    seedQuestions: seedQuestionBank,
  });
  const activeQuestionStore = isCloudBackendActive ? cloudQuestionStore : localQuestionStore;
  const {
    questionBank,
    customQuestions,
    seedQuestionIds,
    saveCustomQuestion,
    deleteCustomQuestion,
    importCustomQuestions,
    setCustomQuestionStatus,
    getQuestionStatus,
    isContentLoading,
    contentError,
    refreshContent,
  } = activeQuestionStore;
  const localInviteStore = useLocalInviteStore();
  const cloudInviteStore = useSupabaseInviteStore({
    enabled: isCloudBackendActive && Boolean(accountId),
    userId: accountId,
  });
  const activeInviteStore = isCloudBackendActive ? cloudInviteStore : localInviteStore;
  const localClassStore = useLocalClassStore();
  const cloudClassStore = useSupabaseClassStore({
    enabled: isCloudBackendActive && Boolean(accountId),
    userId: accountId,
  });
  const activeClassStore = isCloudBackendActive ? cloudClassStore : localClassStore;
  const attemptStore = useLocalAttemptStore({
    storageKey: createAccountScopedStorageKey(accountId, 'attempts'),
  });
  const sessionStore = useLocalSessionStore({
    storageKey: createAccountScopedStorageKey(accountId, 'sessions'),
  });
  const cloudAttemptStore = useSupabaseAttemptStore({
    enabled: isCloudBackendActive,
    userId: accountId,
  });
  const cloudSessionStore = useSupabaseSessionStore({
    enabled: isCloudBackendActive,
    userId: accountId,
  });
  const activeAttemptStore = isCloudBackendActive ? cloudAttemptStore : attemptStore;
  const activeSessionStore = isCloudBackendActive ? cloudSessionStore : sessionStore;

  const uploadCloudQuestionImage = useCallback(
    async (file: File, context: ContentManagerImageUploadContext) => {
      const fallbackAlt =
        filenameToAltText(file.name) ||
        (context.placement === 'question' ? 'Question image' : 'Explanation image');
      const asset = await uploadSupabaseImage({
        file,
        alt: fallbackAlt,
        caption: fallbackAlt,
        createdBy: accountId,
        assetId: context.assetId,
        assetType: 'image',
      });

      return {
        path: asset.path,
        alt: asset.alt,
        caption: asset.caption,
        fileName: file.name,
      };
    },
    [accountId],
  );

  useEffect(() => {
    if (currentAccount) {
      setMode('dashboard');
    }
  }, [currentAccount?.id, currentAccount]);

  useEffect(() => {
    if (!canManageContent && (mode === 'manage' || mode === 'classes')) {
      setMode('dashboard');
    }
  }, [canManageContent, mode]);

  async function loginAccount(input: LoginInput) {
    if (isLocalDevAdminLogin(input)) {
      const account = createLocalDevAdminAccount();
      setLocalDevAdminAccount(account);

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(localDevAdminSessionKey, 'true');
      }

      return account;
    }

    return cloudOrLocalAccountStore.login(input);
  }

  async function signupAccount(input: SignupInput) {
    if (!input.inviteCode?.trim()) {
      throw new Error('Enter an invite code to create an account.');
    }

    if (isCloudBackendActive) {
      return supabaseAccountStore.signup(input);
    }

    const validation = localInviteStore.validateInviteCode({
      code: input.inviteCode,
      email: input.email,
    });

    if (validation.status !== 'valid') {
      throw new Error(`Invite code is not available (${validation.reason}).`);
    }

    const account = await localAccountStore.signup(input);
    const consumedInvite = localInviteStore.consumeInviteCode({
      code: input.inviteCode,
      email: input.email,
      accountId: account.id,
    });

    if (consumedInvite.status === 'consumed' && consumedInvite.invite.classId) {
      localClassStore.enrollAccount(consumedInvite.invite.classId, account);
    }

    return account;
  }

  function logoutAccount() {
    if (localDevAdminAccount) {
      setLocalDevAdminAccount(null);

      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(localDevAdminSessionKey);
      }

      return;
    }

    cloudOrLocalAccountStore.logout();
  }

  if (!localDevAdminAccount && isSupabaseConfigured && supabaseAccountStore.isLoading) {
    return (
      <main className="auth-shell">
        <section className="auth-panel" aria-label="Loading account">
          <p className="eyebrow">Cloud account</p>
          <h1>Loading</h1>
        </section>
      </main>
    );
  }

  if (!currentAccount) {
    return (
      <AccountAuth
        backendLabel={isSupabaseConfigured ? 'Cloud account' : 'Local account'}
        onLogin={loginAccount}
        onSignup={signupAccount}
        supportingNotice={
          import.meta.env.DEV
            ? `Local admin: ${localDevAdminEmail} / ${localDevAdminPassword}`
            : undefined
        }
      />
    );
  }

  return (
    <>
      <header className="account-bar">
        <div>
          <p className="eyebrow">AP Precalculus Practice</p>
          <strong>{currentAccount.displayName}</strong>
          {currentAccount.role === 'admin' ? <span className="account-role">Admin</span> : null}
        </div>
        <button className="ghost-button" onClick={logoutAccount} type="button">
          <UserCircle aria-hidden="true" />
          {currentAccount.email}
          <LogOut aria-hidden="true" />
        </button>
      </header>
      <nav className="mode-tabs" aria-label="Application sections">
        <button
          className="mode-tabs__button"
          data-active={mode === 'dashboard'}
          onClick={() => setMode('dashboard')}
          type="button"
        >
          Dashboard
        </button>
        <button
          className="mode-tabs__button"
          data-active={mode === 'practice'}
          onClick={() => setMode('practice')}
          type="button"
        >
          Practice
        </button>
        <button
          className="mode-tabs__button"
          data-active={mode === 'session'}
          onClick={() => setMode('session')}
          type="button"
        >
          Session
        </button>
        <button
          className="mode-tabs__button"
          data-active={mode === 'review'}
          onClick={() => setMode('review')}
          type="button"
        >
          Review
        </button>
        {canManageContent ? (
          <>
            <button
              className="mode-tabs__button"
              data-active={mode === 'manage'}
              onClick={() => setMode('manage')}
              type="button"
            >
              Manage Content
            </button>
            <button
              className="mode-tabs__button"
              data-active={mode === 'classes'}
              onClick={() => setMode('classes')}
              type="button"
            >
              Classes
            </button>
          </>
        ) : null}
      </nav>
      {mode === 'dashboard' ? (
        <StudentDashboard
          account={currentAccount}
          attempts={activeAttemptStore.attempts}
          onNavigate={setMode}
          questions={questionBank}
          sessions={activeSessionStore.sessions}
        />
      ) : null}
      {mode === 'practice' ? (
        <QuestionPractice
          attemptsByQuestionId={activeAttemptStore.attemptsByQuestionId}
          onSaveFrqAttempt={(
            question,
            partResponses,
            earnedPointsByCriterion,
            startedAt,
            attemptId,
            submittedAt,
          ) =>
            activeAttemptStore.saveFrqAttempt({
              id: attemptId,
              startedAt,
              submittedAt,
              question,
              partResponses,
              earnedPointsByCriterion,
            })
          }
          onSaveMcqAttempt={(question, selectedChoiceId, startedAt) =>
            activeAttemptStore.saveMcqAttempt({
              startedAt,
              question,
              selectedChoiceId,
            })
          }
          questions={questionBank}
          questionSetVersion={questionSetVersion}
        />
      ) : null}
      <div hidden={mode !== 'session'}>
        <SessionPractice
          onSaveFrqAttempt={(
            question,
            partResponses,
            earnedPointsByCriterion,
            startedAt,
            attemptId,
            submittedAt,
          ) =>
            activeAttemptStore.saveFrqAttempt({
              id: attemptId,
              startedAt,
              submittedAt,
              question,
              partResponses,
              earnedPointsByCriterion,
            })
          }
          onSaveMcqAttempt={(question, selectedChoiceId, startedAt, submittedAt) =>
            activeAttemptStore.saveMcqAttempt({
              startedAt,
              submittedAt,
              question,
              selectedChoiceId,
            })
          }
          onSaveSessionResult={activeSessionStore.saveSessionResult}
          questions={questionBank}
          questionSetVersion={questionSetVersion}
        />
      </div>
      {mode === 'review' ? (
        <AttemptReview
          attempts={activeAttemptStore.attempts}
          onClearAttempts={activeAttemptStore.clearAttempts}
          onExportAttempts={activeAttemptStore.exportAttempts}
          onImportAttempts={activeAttemptStore.importAttempts}
          onRemoveAttempt={activeAttemptStore.removeAttempt}
          questions={questionBank}
        />
      ) : null}
      {mode === 'manage' ? (
        canManageContent ? (
          <ContentManager
            customQuestions={customQuestions}
            onDeleteQuestion={deleteCustomQuestion}
            onImportQuestions={importCustomQuestions}
            onSaveQuestion={saveCustomQuestion}
            onSetQuestionStatus={setCustomQuestionStatus}
            seedQuestionIds={seedQuestionIds}
            getQuestionStatus={getQuestionStatus}
            contentSourceLabel={
              isCloudBackendActive ? 'Supabase content library' : 'Local content library'
            }
            contentError={contentError}
            isContentLoading={isContentLoading}
            onUploadImageFile={isCloudBackendActive ? uploadCloudQuestionImage : undefined}
            onRefreshContent={() => void refreshContent()}
          />
        ) : null
      ) : null}
      {mode === 'classes' ? (
        canManageContent ? (
          <AdminClassManager
            classes={activeClassStore.classes}
            enrollments={activeClassStore.enrollments}
            invites={activeInviteStore.invites}
            onCreateClass={(input) =>
              activeClassStore.createClass({
                ...input,
                createdBy: accountId,
              })
            }
            onCreateInvite={(input) =>
              activeInviteStore.createInvite({
                ...input,
                createdByAccountId: accountId,
              })
            }
            onRefresh={() => {
              void activeInviteStore.refreshInvites?.();
              void activeClassStore.refreshClasses?.();
            }}
            onRevokeInvite={(inviteId) => activeInviteStore.revokeInvite(inviteId)}
          />
        ) : null
      ) : null}
    </>
  );
}
