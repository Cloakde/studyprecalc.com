import { ArrowLeft, KeyRound, LogIn, UserPlus } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import type { LoginInput, SignupInput } from '../../data/localAccountStore';

type AccountAuthProps = {
  onLogin: (input: LoginInput) => Promise<unknown>;
  onSignup: (input: SignupInput) => Promise<unknown>;
  backendLabel?: string;
  allowSignup?: boolean;
  supportingNotice?: string;
  onBackToHome?: () => void;
};

type AuthMode = 'login' | 'signup';

const SIGNUP_DISABLED_MESSAGE =
  'Sign ups are currently closed. Study Precalc is invite-only for now.';
const INVITE_SIGNUP_UNLOCKED_MESSAGE = 'Invite code entered. Create your account.';

function isEmailConfirmationResult(result: unknown): result is { requiresEmailConfirmation: true } {
  return (
    typeof result === 'object' &&
    result !== null &&
    'requiresEmailConfirmation' in result &&
    result.requiresEmailConfirmation === true
  );
}

export function AccountAuth({
  allowSignup = false,
  backendLabel = 'Local account',
  onBackToHome,
  onLogin,
  onSignup,
  supportingNotice,
}: AccountAuthProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [acceptedInviteCode, setAcceptedInviteCode] = useState('');
  const [isInviteSignupUnlocked, setIsInviteSignupUnlocked] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canUseSignup = allowSignup || isInviteSignupUnlocked;

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    setError('');

    try {
      if (mode === 'signup') {
        if (!canUseSignup) {
          setError(SIGNUP_DISABLED_MESSAGE);
          return;
        }

        setIsSubmitting(true);
        const result = await onSignup({
          displayName,
          email,
          password,
          inviteCode: acceptedInviteCode,
        });
        setNotice(
          isEmailConfirmationResult(result)
            ? 'Account created. Check your email if confirmation is enabled.'
            : 'Account created.',
        );
      } else {
        setIsSubmitting(true);
        await onLogin({ email, password });
      }

      setPassword('');
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function submitInviteCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    setError('');

    if (!inviteCode.trim()) {
      setError('Enter an invite code to continue.');
      return;
    }

    setIsInviteSignupUnlocked(true);
    setAcceptedInviteCode(inviteCode.trim().toUpperCase());
    setInviteCode('');
    setNotice(INVITE_SIGNUP_UNLOCKED_MESSAGE);
  }

  const authHeading =
    mode === 'signup' ? (canUseSignup ? 'Create Account' : 'Enter Invite Code') : 'Sign In';

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="auth-heading">
        {onBackToHome ? (
          <button className="auth-back-home" onClick={onBackToHome} type="button">
            <ArrowLeft aria-hidden="true" />
            Back to home
          </button>
        ) : null}
        <div className="auth-panel__intro">
          <p className="eyebrow">{backendLabel}</p>
          <h1 id="auth-heading">{authHeading}</h1>
          <p>
            {mode === 'signup' && !canUseSignup
              ? 'Enter your invite code to open account creation.'
              : 'Save practice history, sessions, and dashboard progress in this browser.'}
          </p>
        </div>

        <div className="auth-toggle" aria-label="Account mode">
          <button
            aria-pressed={mode === 'login'}
            data-active={mode === 'login'}
            onClick={() => {
              setMode('login');
              setError('');
              setNotice('');
            }}
            type="button"
          >
            <LogIn aria-hidden="true" />
            Log In
          </button>
          <button
            aria-pressed={mode === 'signup'}
            data-active={mode === 'signup'}
            onClick={() => {
              setMode('signup');
              setError('');
              setNotice('');
            }}
            type="button"
          >
            <UserPlus aria-hidden="true" />
            Sign Up
          </button>
        </div>

        {notice ? <div className="form-notice">{notice}</div> : null}
        {supportingNotice ? <div className="form-notice">{supportingNotice}</div> : null}
        {error ? (
          <div className="form-error" role="alert">
            {error}
          </div>
        ) : null}

        {mode === 'signup' && !canUseSignup ? (
          <form className="auth-form auth-form--invite" onSubmit={submitInviteCode}>
            <label>
              Invite Code
              <input
                autoComplete="one-time-code"
                onChange={(event) => setInviteCode(event.target.value)}
                required
                type="text"
                value={inviteCode}
              />
            </label>
            <button className="primary-button" type="submit">
              <KeyRound aria-hidden="true" />
              Unlock Sign Up
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={submitAuth}>
            {mode === 'signup' ? (
              <>
                {acceptedInviteCode ? (
                  <div className="invite-chip">
                    <KeyRound aria-hidden="true" />
                    <span>{acceptedInviteCode}</span>
                  </div>
                ) : null}
                <label>
                  Name
                  <input
                    autoComplete="name"
                    onChange={(event) => setDisplayName(event.target.value)}
                    required
                    type="text"
                    value={displayName}
                  />
                </label>
              </>
            ) : null}
            <label>
              Email
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <label>
              Password
              <input
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            <button className="primary-button" disabled={isSubmitting} type="submit">
              {mode === 'signup' ? <UserPlus aria-hidden="true" /> : <LogIn aria-hidden="true" />}
              {isSubmitting ? 'Working...' : mode === 'signup' ? 'Create Account' : 'Log In'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
