import { LogIn, UserPlus } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import type { LoginInput, SignupInput } from '../../data/localAccountStore';

type AccountAuthProps = {
  onLogin: (input: LoginInput) => Promise<unknown>;
  onSignup: (input: SignupInput) => Promise<unknown>;
  backendLabel?: string;
};

type AuthMode = 'login' | 'signup';

function isEmailConfirmationResult(result: unknown): result is { requiresEmailConfirmation: true } {
  return (
    typeof result === 'object' &&
    result !== null &&
    'requiresEmailConfirmation' in result &&
    result.requiresEmailConfirmation === true
  );
}

export function AccountAuth({
  backendLabel = 'Local account',
  onLogin,
  onSignup,
}: AccountAuthProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    setError('');
    setIsSubmitting(true);

    try {
      if (mode === 'signup') {
        const result = await onSignup({ displayName, email, password });
        setNotice(
          isEmailConfirmationResult(result)
            ? 'Account created. Check your email if confirmation is enabled.'
            : 'Account created.',
        );
      } else {
        await onLogin({ email, password });
      }

      setPassword('');
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="auth-heading">
        <div className="auth-panel__intro">
          <p className="eyebrow">{backendLabel}</p>
          <h1 id="auth-heading">{mode === 'signup' ? 'Create Account' : 'Sign In'}</h1>
          <p>Save practice history, sessions, and dashboard progress in this browser.</p>
        </div>

        <div className="auth-toggle" role="tablist" aria-label="Account mode">
          <button
            aria-selected={mode === 'login'}
            data-active={mode === 'login'}
            onClick={() => {
              setMode('login');
              setError('');
              setNotice('');
            }}
            role="tab"
            type="button"
          >
            <LogIn aria-hidden="true" />
            Log In
          </button>
          <button
            aria-selected={mode === 'signup'}
            data-active={mode === 'signup'}
            onClick={() => {
              setMode('signup');
              setError('');
              setNotice('');
            }}
            role="tab"
            type="button"
          >
            <UserPlus aria-hidden="true" />
            Sign Up
          </button>
        </div>

        {notice ? <div className="form-notice">{notice}</div> : null}
        {error ? <div className="form-error">{error}</div> : null}

        <form className="auth-form" onSubmit={submitAuth}>
          {mode === 'signup' ? (
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
      </section>
    </main>
  );
}
