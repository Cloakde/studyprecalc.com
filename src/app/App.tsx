import { LogOut, UserCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { createAccountScopedStorageKey, useLocalAccountStore } from '../data/localAccountStore';
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

export function App() {
  const [mode, setMode] = useState<AppMode>('dashboard');
  const localAccountStore = useLocalAccountStore();
  const supabaseAccountStore = useSupabaseAccountStore();
  const accountStore = isSupabaseConfigured ? supabaseAccountStore : localAccountStore;
  const {
    questionBank,
    customQuestions,
    seedQuestionIds,
    saveCustomQuestion,
    deleteCustomQuestion,
    importCustomQuestions,
  } = useManagedQuestionBank(seedQuestionBank);
  const accountId = accountStore.currentAccount?.id;
  const attemptStore = useLocalAttemptStore({
    storageKey: createAccountScopedStorageKey(accountId, 'attempts'),
  });
  const sessionStore = useLocalSessionStore({
    storageKey: createAccountScopedStorageKey(accountId, 'sessions'),
  });
  const cloudAttemptStore = useSupabaseAttemptStore({
    enabled: isSupabaseConfigured,
    userId: accountId,
  });
  const cloudSessionStore = useSupabaseSessionStore({
    enabled: isSupabaseConfigured,
    userId: accountId,
  });
  const activeAttemptStore = isSupabaseConfigured ? cloudAttemptStore : attemptStore;
  const activeSessionStore = isSupabaseConfigured ? cloudSessionStore : sessionStore;

  useEffect(() => {
    if (accountStore.currentAccount) {
      setMode('dashboard');
    }
  }, [accountStore.currentAccount?.id, accountStore.currentAccount]);

  if (isSupabaseConfigured && supabaseAccountStore.isLoading) {
    return (
      <main className="auth-shell">
        <section className="auth-panel" aria-label="Loading account">
          <p className="eyebrow">Cloud account</p>
          <h1>Loading</h1>
        </section>
      </main>
    );
  }

  if (!accountStore.currentAccount) {
    return (
      <AccountAuth
        backendLabel={isSupabaseConfigured ? 'Cloud account' : 'Local account'}
        onLogin={accountStore.login}
        onSignup={accountStore.signup}
      />
    );
  }

  return (
    <>
      <header className="account-bar">
        <div>
          <p className="eyebrow">AP Precalculus Practice</p>
          <strong>{accountStore.currentAccount.displayName}</strong>
        </div>
        <button className="ghost-button" onClick={accountStore.logout} type="button">
          <UserCircle aria-hidden="true" />
          {accountStore.currentAccount.email}
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
        <button
          className="mode-tabs__button"
          data-active={mode === 'manage'}
          onClick={() => setMode('manage')}
          type="button"
        >
          Manage Content
        </button>
      </nav>
      {mode === 'dashboard' ? (
        <StudentDashboard
          account={accountStore.currentAccount}
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
        <ContentManager
          customQuestions={customQuestions}
          onDeleteQuestion={deleteCustomQuestion}
          onImportQuestions={importCustomQuestions}
          onSaveQuestion={saveCustomQuestion}
          seedQuestionIds={seedQuestionIds}
        />
      ) : null}
    </>
  );
}
