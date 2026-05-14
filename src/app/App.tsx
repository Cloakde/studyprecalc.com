import { LogOut, UserCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  createAccountScopedStorageKey,
  type LoginInput,
  type PublicAccount,
  useLocalAccountStore,
} from '../data/localAccountStore';
import { useLocalAttemptStore } from '../data/localAttemptStore';
import { useManagedQuestionBank } from '../data/localQuestionStore';
import { useLocalSessionStore } from '../data/localSessionStore';
import { questionBank as seedQuestionBank, questionSetVersion } from '../data/seed/questionBank';
import { useSupabaseAccountStore } from '../data/supabase/accountStore';
import { isSupabaseConfigured } from '../data/supabase/client';
import { useSupabaseAttemptStore } from '../data/supabase/attemptStore';
import { useSupabaseSessionStore } from '../data/supabase/sessionStore';
import { AccountAuth } from './components/AccountAuth';
import { AttemptReview } from './components/AttemptReview';
import { ContentManager } from './components/ContentManager';
import { QuestionPractice } from './components/QuestionPractice';
import { SessionPractice } from './components/SessionPractice';
import { StudentDashboard } from './components/StudentDashboard';

type AppMode = 'dashboard' | 'practice' | 'session' | 'review' | 'manage';

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
  const {
    questionBank,
    customQuestions,
    seedQuestionIds,
    saveCustomQuestion,
    deleteCustomQuestion,
    importCustomQuestions,
  } = useManagedQuestionBank(seedQuestionBank);
  const accountId = currentAccount?.id;
  const attemptStore = useLocalAttemptStore({
    storageKey: createAccountScopedStorageKey(accountId, 'attempts'),
  });
  const sessionStore = useLocalSessionStore({
    storageKey: createAccountScopedStorageKey(accountId, 'sessions'),
  });
  const cloudAttemptStore = useSupabaseAttemptStore({
    enabled: isSupabaseConfigured && !localDevAdminAccount,
    userId: accountId,
  });
  const cloudSessionStore = useSupabaseSessionStore({
    enabled: isSupabaseConfigured && !localDevAdminAccount,
    userId: accountId,
  });
  const activeAttemptStore =
    isSupabaseConfigured && !localDevAdminAccount ? cloudAttemptStore : attemptStore;
  const activeSessionStore =
    isSupabaseConfigured && !localDevAdminAccount ? cloudSessionStore : sessionStore;

  useEffect(() => {
    if (currentAccount) {
      setMode('dashboard');
    }
  }, [currentAccount?.id, currentAccount]);

  useEffect(() => {
    if (!canManageContent && mode === 'manage') {
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
        onSignup={cloudOrLocalAccountStore.signup}
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
          <button
            className="mode-tabs__button"
            data-active={mode === 'manage'}
            onClick={() => setMode('manage')}
            type="button"
          >
            Manage Content
          </button>
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
            seedQuestionIds={seedQuestionIds}
          />
        ) : null
      ) : null}
    </>
  );
}
