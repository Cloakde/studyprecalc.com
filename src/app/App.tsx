import { AlertCircle, LogOut, UserCircle } from 'lucide-react';
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
import { useSupabaseAdminMfaStore } from '../data/supabase/adminMfaStore';
import { useSupabaseClassStore } from '../data/supabase/classStore';
import { isSupabaseConfigured } from '../data/supabase/client';
import { useSupabaseAttemptStore } from '../data/supabase/attemptStore';
import { useSupabaseInviteStore } from '../data/supabase/inviteStore';
import { uploadSupabaseImage } from '../data/supabase/mediaStore';
import { useSupabaseQuestionContentStore } from '../data/supabase/questionContentStore';
import { useSupabaseSessionStore } from '../data/supabase/sessionStore';
import { AccountAuth } from './components/AccountAuth';
import { AdminClassManager } from './components/AdminClassManager';
import { AdminMfaGate, type AdminMfaRequirement } from './components/AdminMfaGate';
import { AttemptReview } from './components/AttemptReview';
import { ContentManager, type ContentManagerImageUploadContext } from './components/ContentManager';
import { Home } from './components/Home';
import { QuestionPractice } from './components/QuestionPractice';
import { SessionPractice } from './components/SessionPractice';
import { StudentDashboard } from './components/StudentDashboard';

type AppMode = 'dashboard' | 'practice' | 'session' | 'review' | 'manage' | 'classes';

const localDevAdminEmail = 'admin@studyprecalc.local';
const localDevAdminPassword = 'localadmin';
const localDevAdminSessionKey = 'precalcapp.local-dev-admin.active';

function getAdminMfaGateRequirement({
  account,
  factorId,
  isLoading,
  requirementStatus,
}: {
  account: PublicAccount | null;
  factorId?: string;
  isLoading: boolean;
  requirementStatus?: string;
}): AdminMfaRequirement {
  if (isLoading) {
    return {
      state: 'loading',
      accountLabel: account?.email,
      message: 'Checking admin MFA status before unlocking protected tools.',
    };
  }

  if (requirementStatus === 'satisfied') {
    return {
      state: 'verified',
      accountLabel: account?.email,
      factorId,
      message: 'Admin MFA is verified for this Supabase session.',
    };
  }

  if (requirementStatus === 'verification-required') {
    return {
      state: 'challenge_required',
      accountLabel: account?.email,
      factorId,
      message: 'Enter your authenticator code to unlock admin tools.',
    };
  }

  return {
    state: 'setup_required',
    accountLabel: account?.email,
    factorId,
    message: 'Set up 2FA before using production admin tools.',
  };
}

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
  const [unauthView, setUnauthView] = useState<'home' | 'auth'>('home');
  const [localDevAdminAccount, setLocalDevAdminAccount] = useState<PublicAccount | null>(
    loadLocalDevAdminSession,
  );
  const localAccountStore = useLocalAccountStore();
  const supabaseAccountStore = useSupabaseAccountStore();
  const cloudOrLocalAccountStore = isSupabaseConfigured ? supabaseAccountStore : localAccountStore;
  const currentAccount = localDevAdminAccount ?? cloudOrLocalAccountStore.currentAccount;
  const accountId = currentAccount?.id;
  const isCloudBackendActive = isSupabaseConfigured && !localDevAdminAccount;
  const isCloudAdminAccount = isCloudBackendActive && currentAccount?.role === 'admin';
  const adminMfaStore = useSupabaseAdminMfaStore({
    enabled: isCloudAdminAccount,
  });
  const [isStartingAdminMfaEnrollment, setIsStartingAdminMfaEnrollment] = useState(false);
  const [isVerifyingAdminMfaEnrollment, setIsVerifyingAdminMfaEnrollment] = useState(false);
  const [isVerifyingAdminMfaChallenge, setIsVerifyingAdminMfaChallenge] = useState(false);
  const [adminMfaNotice, setAdminMfaNotice] = useState('');
  const canManageContent =
    currentAccount?.role === 'admin' &&
    (!isCloudAdminAccount || adminMfaStore.requirement.isSatisfied);
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
    enabled: isCloudBackendActive && canManageContent && Boolean(accountId),
    userId: accountId,
  });
  const activeInviteStore = isCloudBackendActive ? cloudInviteStore : localInviteStore;
  const localClassStore = useLocalClassStore();
  const cloudClassStore = useSupabaseClassStore({
    enabled: isCloudBackendActive && canManageContent && Boolean(accountId),
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
  const signedInAccountError = isSupabaseConfigured ? supabaseAccountStore.lastError : '';
  const signedInPersistenceError = isCloudBackendActive
    ? [cloudAttemptStore.lastError, cloudSessionStore.lastError].filter(Boolean).join(' ')
    : '';
  const signedInError = [signedInAccountError, signedInPersistenceError].filter(Boolean).join(' ');

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

  const adminMfaRequirement = getAdminMfaGateRequirement({
    account: currentAccount,
    factorId: adminMfaStore.enrollment?.factorId ?? adminMfaStore.preferredFactor?.id,
    isLoading: adminMfaStore.isLoading,
    requirementStatus: adminMfaStore.requirement.status,
  });
  const adminMfaEnrollment = adminMfaStore.enrollment
    ? {
        factorId: adminMfaStore.enrollment.factorId,
        qrCodeUrl: adminMfaStore.enrollment.qrCode,
        manualSecret: adminMfaStore.enrollment.secret,
        issuer: 'Study Precalc',
        accountLabel: currentAccount?.email,
      }
    : null;
  const shouldShowAdminMfaGate = isCloudAdminAccount && !adminMfaStore.requirement.isSatisfied;

  const clearAdminMfaMessages = useCallback(() => {
    setAdminMfaNotice('');
    adminMfaStore.clearLastError();
  }, [adminMfaStore]);

  const startAdminMfaEnrollment = useCallback(async () => {
    setAdminMfaNotice('');
    setIsStartingAdminMfaEnrollment(true);

    try {
      await adminMfaStore.startTotpEnrollment(
        currentAccount?.email
          ? `Study Precalc admin (${currentAccount.email})`
          : 'Study Precalc admin',
      );
      setAdminMfaNotice('Scan the QR code, then enter the current authenticator code.');
    } finally {
      setIsStartingAdminMfaEnrollment(false);
    }
  }, [adminMfaStore, currentAccount?.email]);

  const verifyAdminMfaEnrollment = useCallback(
    async ({ code, factorId }: { code: string; factorId?: string }) => {
      const activeFactorId = factorId ?? adminMfaStore.enrollment?.factorId;

      if (!activeFactorId) {
        throw new Error('Start MFA setup before verifying a code.');
      }

      setAdminMfaNotice('');
      setIsVerifyingAdminMfaEnrollment(true);

      try {
        await adminMfaStore.verifyTotpEnrollment(activeFactorId, code);
        setAdminMfaNotice('Admin MFA is verified. Protected admin tools are unlocked.');
      } finally {
        setIsVerifyingAdminMfaEnrollment(false);
      }
    },
    [adminMfaStore],
  );

  const verifyAdminMfaChallenge = useCallback(
    async ({ code, factorId }: { code: string; factorId?: string }) => {
      const activeFactorId = factorId ?? adminMfaStore.preferredFactor?.id;

      if (!activeFactorId) {
        throw new Error('No verified MFA factor is available for this account.');
      }

      setAdminMfaNotice('');
      setIsVerifyingAdminMfaChallenge(true);

      try {
        await adminMfaStore.verifyTotpFactor(activeFactorId, code);
        setAdminMfaNotice('Admin MFA is verified. Protected admin tools are unlocked.');
      } finally {
        setIsVerifyingAdminMfaChallenge(false);
      }
    },
    [adminMfaStore],
  );

  useEffect(() => {
    if (currentAccount) {
      setMode('dashboard');
    }
  }, [currentAccount?.id, currentAccount]);

  useEffect(() => {
    if (!isCloudAdminAccount) {
      setAdminMfaNotice('');
      return;
    }

    if (adminMfaStore.requirement.isSatisfied) {
      void refreshContent();
    }
  }, [adminMfaStore.requirement.isSatisfied, isCloudAdminAccount, refreshContent]);

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
    setUnauthView('home');

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
    if (unauthView === 'home') {
      return (
        <Home onGetStarted={() => setUnauthView('auth')} onSignIn={() => setUnauthView('auth')} />
      );
    }

    return (
      <AccountAuth
        backendLabel={isSupabaseConfigured ? 'Cloud account' : 'Local account'}
        onBackToHome={() => setUnauthView('home')}
        onLogin={loginAccount}
        onResendEmailCode={isSupabaseConfigured ? supabaseAccountStore.resendEmailCode : undefined}
        onSignup={signupAccount}
        onVerifyEmailCode={isSupabaseConfigured ? supabaseAccountStore.verifyEmailCode : undefined}
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
          {isCloudAdminAccount ? (
            <span className="account-role account-role--security">
              {adminMfaStore.requirement.isSatisfied ? '2FA Verified' : '2FA Required'}
            </span>
          ) : null}
        </div>
        <button className="ghost-button" onClick={logoutAccount} type="button">
          <UserCircle aria-hidden="true" />
          {currentAccount.email}
          <LogOut aria-hidden="true" />
        </button>
      </header>
      {signedInError ? (
        <div className="form-error app-alert" role="alert">
          <AlertCircle aria-hidden="true" />
          {signedInError}
        </div>
      ) : null}
      {shouldShowAdminMfaGate ? (
        <main className="admin-mfa-shell">
          <AdminMfaGate
            clearError={clearAdminMfaMessages}
            enrollment={adminMfaEnrollment}
            error={adminMfaStore.lastError}
            isRefreshing={adminMfaStore.isLoading}
            isStartingEnrollment={isStartingAdminMfaEnrollment}
            isVerifyingChallenge={isVerifyingAdminMfaChallenge}
            isVerifyingEnrollment={isVerifyingAdminMfaEnrollment}
            notice={adminMfaNotice}
            refresh={async () => {
              await adminMfaStore.refresh();
            }}
            requirement={adminMfaRequirement}
            startEnrollment={startAdminMfaEnrollment}
            verifyChallenge={verifyAdminMfaChallenge}
            verifyEnrollment={verifyAdminMfaEnrollment}
          />
        </main>
      ) : null}
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
