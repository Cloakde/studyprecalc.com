import { ArrowLeft, KeyRound, LogIn, MailCheck, RotateCcw, UserPlus } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import type { LoginInput, SignupInput } from '../../data/localAccountStore';
import type { EmailVerificationInput } from '../../data/supabase/accountStore';
import { inviteCodeLength } from '../../domain/invites';

export type SignupInviteValidationInput = {
  code: string;
  email: string;
};

type AccountAuthProps = {
  onLogin: (input: LoginInput) => Promise<unknown>;
  onSignup: (input: SignupInput) => Promise<unknown>;
  onValidateInviteCode: (input: SignupInviteValidationInput) => Promise<unknown> | unknown;
  onVerifyEmailCode?: (input: EmailVerificationInput) => Promise<unknown>;
  onResendEmailCode?: (email: string) => Promise<unknown>;
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

function getVerificationEmail(result: unknown, fallbackEmail: string): string {
  if (
    typeof result === 'object' &&
    result !== null &&
    'verificationEmail' in result &&
    typeof result.verificationEmail === 'string' &&
    result.verificationEmail.trim()
  ) {
    return result.verificationEmail.trim();
  }

  return fallbackEmail.trim();
}

export function AccountAuth({
  allowSignup = false,
  backendLabel = 'Local account',
  onBackToHome,
  onLogin,
  onResendEmailCode,
  onSignup,
  onValidateInviteCode,
  onVerifyEmailCode,
  supportingNotice,
}: AccountAuthProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [acceptedInviteCode, setAcceptedInviteCode] = useState('');
  const [isInviteSignupUnlocked, setIsInviteSignupUnlocked] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendingCode, setIsResendingCode] = useState(false);
  const canUseSignup = allowSignup || isInviteSignupUnlocked;
  const isVerifyingEmail = Boolean(pendingVerificationEmail);

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

        if (isEmailConfirmationResult(result)) {
          const verificationEmail = getVerificationEmail(result, email);
          setPendingVerificationEmail(verificationEmail);
          setNotice(`Account created. Enter the verification code sent to ${verificationEmail}.`);
        } else {
          setNotice('Account created.');
        }
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

  async function submitEmailVerificationCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    setError('');

    if (!onVerifyEmailCode) {
      setError('Email code verification is not available for this account backend.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onVerifyEmailCode({
        email: pendingVerificationEmail,
        code: emailVerificationCode,
      });
      setEmailVerificationCode('');
      setPendingVerificationEmail('');
      setPassword('');
      setNotice('Email verified. You are signed in.');
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Unable to verify email code.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resendEmailVerificationCode() {
    setNotice('');
    setError('');

    if (!onResendEmailCode) {
      setError('Email code resend is not available for this account backend.');
      return;
    }

    try {
      setIsResendingCode(true);
      await onResendEmailCode(pendingVerificationEmail);
      setNotice(`A new verification code was sent to ${pendingVerificationEmail}.`);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Unable to resend email code.');
    } finally {
      setIsResendingCode(false);
    }
  }

  async function submitInviteCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    setError('');

    if (!inviteCode.trim()) {
      setError('Enter an invite code to continue.');
      return;
    }

    if (!email.trim()) {
      setError('Enter the email address the invite was sent to.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onValidateInviteCode({
        code: inviteCode,
        email,
      });
      setIsInviteSignupUnlocked(true);
      setAcceptedInviteCode(inviteCode.trim().toUpperCase());
      setInviteCode('');
      setNotice(INVITE_SIGNUP_UNLOCKED_MESSAGE);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Invite code is not available.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const authHeading =
    mode === 'signup'
      ? isVerifyingEmail
        ? 'Verify Email'
        : canUseSignup
          ? 'Create Account'
          : 'Enter Invite Code'
      : 'Sign In';

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
            {mode === 'signup' && isVerifyingEmail
              ? 'Enter the code from your email to finish account setup.'
              : mode === 'signup' && !canUseSignup
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
              setPendingVerificationEmail('');
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

        {mode === 'signup' && isVerifyingEmail ? (
          <form className="auth-form auth-form--verify" onSubmit={submitEmailVerificationCode}>
            <div className="invite-chip">
              <MailCheck aria-hidden="true" />
              <span>{pendingVerificationEmail}</span>
            </div>
            <label>
              Email Verification Code
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={8}
                onChange={(event) => setEmailVerificationCode(event.target.value)}
                pattern="[0-9\\s-]*"
                required
                type="text"
                value={emailVerificationCode}
              />
            </label>
            <button className="primary-button" disabled={isSubmitting} type="submit">
              <MailCheck aria-hidden="true" />
              {isSubmitting ? 'Verifying...' : 'Verify Email'}
            </button>
            <button
              className="ghost-button"
              disabled={isResendingCode}
              onClick={() => void resendEmailVerificationCode()}
              type="button"
            >
              <RotateCcw aria-hidden="true" />
              {isResendingCode ? 'Sending...' : 'Resend Code'}
            </button>
          </form>
        ) : mode === 'signup' && !canUseSignup ? (
          <form className="auth-form auth-form--invite" onSubmit={submitInviteCode}>
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
              Invite Code
              <input
                autoComplete="one-time-code"
                maxLength={inviteCodeLength}
                onChange={(event) => setInviteCode(event.target.value)}
                placeholder="12-character code"
                required
                type="text"
                value={inviteCode}
              />
            </label>
            <button className="primary-button" disabled={isSubmitting} type="submit">
              <KeyRound aria-hidden="true" />
              {isSubmitting ? 'Checking...' : 'Unlock Sign Up'}
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
