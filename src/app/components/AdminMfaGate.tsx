import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  KeyRound,
  LoaderCircle,
  QrCode,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { type FormEvent, useId, useState } from 'react';

import '../styles/admin-mfa.css';

export type AdminMfaGateState = 'loading' | 'setup_required' | 'challenge_required' | 'verified';

export type AdminMfaRequirement = {
  state: AdminMfaGateState;
  factorId?: string;
  challengeId?: string;
  accountLabel?: string;
  lastVerifiedAt?: string;
  message?: string;
};

export type AdminMfaEnrollment = {
  factorId?: string;
  qrCodeUrl?: string;
  manualSecret?: string;
  issuer?: string;
  accountLabel?: string;
};

export type AdminMfaVerificationInput = {
  code: string;
  factorId?: string;
  challengeId?: string;
};

export type AdminMfaGateProps = {
  requirement: AdminMfaRequirement;
  enrollment?: AdminMfaEnrollment | null;
  error?: string;
  notice?: string;
  isStartingEnrollment?: boolean;
  isVerifyingEnrollment?: boolean;
  isVerifyingChallenge?: boolean;
  isRefreshing?: boolean;
  startEnrollment: () => void | Promise<void>;
  verifyEnrollment: (input: AdminMfaVerificationInput) => void | Promise<void>;
  verifyChallenge: (input: AdminMfaVerificationInput) => void | Promise<void>;
  refresh?: () => void | Promise<void>;
  clearError?: () => void;
};

function formatVerifiedAt(value: string | undefined): string {
  if (!value) {
    return 'Verified for this admin session.';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Verified for this admin session.';
  }

  return `Verified ${new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)}.`;
}

function getFactorId(
  requirement: AdminMfaRequirement,
  enrollment: AdminMfaEnrollment | null | undefined,
): string | undefined {
  return enrollment?.factorId ?? requirement.factorId;
}

export function AdminMfaGate({
  enrollment,
  error,
  isRefreshing = false,
  isStartingEnrollment = false,
  isVerifyingChallenge = false,
  isVerifyingEnrollment = false,
  notice,
  clearError,
  refresh,
  startEnrollment,
  verifyChallenge,
  verifyEnrollment,
  requirement,
}: AdminMfaGateProps) {
  const setupCodeId = useId();
  const challengeCodeId = useId();
  const [setupCode, setSetupCode] = useState('');
  const [challengeCode, setChallengeCode] = useState('');
  const [copyNotice, setCopyNotice] = useState('');
  const [copyError, setCopyError] = useState('');
  const displayedError = error ?? copyError;
  const displayedNotice = notice ?? copyNotice;
  const accountLabel = enrollment?.accountLabel ?? requirement.accountLabel ?? 'Admin account';
  const factorId = getFactorId(requirement, enrollment);

  function clearMessages() {
    setCopyNotice('');
    setCopyError('');
    clearError?.();
  }

  async function copyManualSecret() {
    clearMessages();

    if (!enrollment?.manualSecret) {
      setCopyError('Manual setup key is unavailable.');
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setCopyError('Clipboard copy is unavailable in this browser.');
      return;
    }

    try {
      await navigator.clipboard.writeText(enrollment.manualSecret);
      setCopyNotice('Manual setup key copied.');
    } catch (copyFailure) {
      setCopyError(
        copyFailure instanceof Error ? copyFailure.message : 'Unable to copy manual setup key.',
      );
    }
  }

  async function submitEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    const code = setupCode.replace(/\s/g, '');

    if (!code) {
      setCopyError('Enter the verification code from your authenticator app.');
      return;
    }

    try {
      await verifyEnrollment({ code, factorId });
      setSetupCode('');
    } catch (verificationError) {
      setCopyError(
        verificationError instanceof Error ? verificationError.message : 'Unable to verify setup.',
      );
    }
  }

  async function submitChallenge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    const code = challengeCode.replace(/\s/g, '');

    if (!code) {
      setCopyError('Enter the verification code from your authenticator app.');
      return;
    }

    try {
      await verifyChallenge({
        challengeId: requirement.challengeId,
        code,
        factorId,
      });
      setChallengeCode('');
    } catch (verificationError) {
      setCopyError(
        verificationError instanceof Error ? verificationError.message : 'Unable to verify code.',
      );
    }
  }

  async function handleStartEnrollment() {
    clearMessages();

    try {
      await startEnrollment();
    } catch (enrollmentError) {
      setCopyError(
        enrollmentError instanceof Error ? enrollmentError.message : 'Unable to start MFA setup.',
      );
    }
  }

  async function handleRefreshRequirement() {
    if (!refresh) {
      return;
    }

    clearMessages();

    try {
      await refresh();
    } catch (refreshError) {
      setCopyError(refreshError instanceof Error ? refreshError.message : 'Unable to refresh MFA.');
    }
  }

  function renderRefreshButton() {
    if (!refresh) {
      return null;
    }

    return (
      <button
        className="admin-mfa__button admin-mfa__button--secondary"
        disabled={isRefreshing}
        onClick={() => {
          void handleRefreshRequirement();
        }}
        type="button"
      >
        <RotateCcw aria-hidden="true" />
        {isRefreshing ? 'Refreshing' : 'Refresh'}
      </button>
    );
  }

  function renderMessages() {
    return (
      <>
        {displayedNotice ? (
          <div className="admin-mfa__notice" role="status">
            <CheckCircle2 aria-hidden="true" />
            <span>{displayedNotice}</span>
          </div>
        ) : null}
        {displayedError ? (
          <div className="admin-mfa__error" role="alert">
            <AlertCircle aria-hidden="true" />
            <span>{displayedError}</span>
            {clearError || copyError ? (
              <button className="admin-mfa__message-action" onClick={clearMessages} type="button">
                Clear
              </button>
            ) : null}
          </div>
        ) : null}
      </>
    );
  }

  function renderSetupRequired() {
    const hasEnrollment = Boolean(enrollment?.qrCodeUrl || enrollment?.manualSecret);

    return (
      <div className="admin-mfa__body">
        <section className="admin-mfa__panel" aria-labelledby="admin-mfa-setup-title">
          <div className="admin-mfa__panel-heading">
            <QrCode aria-hidden="true" />
            <div>
              <h3 id="admin-mfa-setup-title">Set up authenticator app</h3>
              <p>Scan the QR code or enter the setup key, then confirm the six-digit code.</p>
            </div>
          </div>

          {hasEnrollment ? (
            <div className="admin-mfa__setup-grid">
              <div className="admin-mfa__qr-frame">
                {enrollment?.qrCodeUrl ? (
                  <img
                    alt={`Authenticator QR code for ${accountLabel}`}
                    src={enrollment.qrCodeUrl}
                  />
                ) : (
                  <QrCode aria-hidden="true" />
                )}
              </div>

              <div className="admin-mfa__manual">
                <span>Manual setup key</span>
                <code>{enrollment?.manualSecret ?? 'Unavailable'}</code>
                <button
                  className="admin-mfa__button admin-mfa__button--secondary"
                  disabled={!enrollment?.manualSecret}
                  onClick={() => void copyManualSecret()}
                  type="button"
                >
                  <Clipboard aria-hidden="true" />
                  Copy Key
                </button>
              </div>
            </div>
          ) : (
            <div className="admin-mfa__empty">
              <p>Enrollment details have not been created yet.</p>
              <button
                className="admin-mfa__button admin-mfa__button--primary"
                disabled={isStartingEnrollment}
                onClick={() => {
                  void handleStartEnrollment();
                }}
                type="button"
              >
                <KeyRound aria-hidden="true" />
                {isStartingEnrollment ? 'Starting Setup' : 'Start Setup'}
              </button>
            </div>
          )}

          {hasEnrollment ? (
            <form className="admin-mfa__form" onSubmit={submitEnrollment}>
              <label htmlFor={setupCodeId}>Verification Code</label>
              <div className="admin-mfa__code-row">
                <input
                  autoComplete="one-time-code"
                  id={setupCodeId}
                  inputMode="numeric"
                  maxLength={8}
                  onChange={(event) => setSetupCode(event.target.value)}
                  pattern="[0-9 ]*"
                  required
                  value={setupCode}
                />
                <button
                  className="admin-mfa__button admin-mfa__button--primary"
                  disabled={isVerifyingEnrollment}
                  type="submit"
                >
                  <ShieldCheck aria-hidden="true" />
                  {isVerifyingEnrollment ? 'Verifying' : 'Verify Setup'}
                </button>
              </div>
            </form>
          ) : null}
        </section>
      </div>
    );
  }

  function renderChallengeRequired() {
    return (
      <div className="admin-mfa__body">
        <section className="admin-mfa__panel" aria-labelledby="admin-mfa-challenge-title">
          <div className="admin-mfa__panel-heading">
            <KeyRound aria-hidden="true" />
            <div>
              <h3 id="admin-mfa-challenge-title">Enter verification code</h3>
              <p>Use the current code from your authenticator app to continue.</p>
            </div>
          </div>

          <form className="admin-mfa__form" onSubmit={submitChallenge}>
            <label htmlFor={challengeCodeId}>Verification Code</label>
            <div className="admin-mfa__code-row">
              <input
                autoComplete="one-time-code"
                id={challengeCodeId}
                inputMode="numeric"
                maxLength={8}
                onChange={(event) => setChallengeCode(event.target.value)}
                pattern="[0-9 ]*"
                required
                value={challengeCode}
              />
              <button
                className="admin-mfa__button admin-mfa__button--primary"
                disabled={isVerifyingChallenge}
                type="submit"
              >
                <ShieldCheck aria-hidden="true" />
                {isVerifyingChallenge ? 'Verifying' : 'Verify'}
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  function renderVerified() {
    return (
      <div className="admin-mfa__verified">
        <CheckCircle2 aria-hidden="true" />
        <div>
          <h3>Admin MFA verified</h3>
          <p>{formatVerifiedAt(requirement.lastVerifiedAt)}</p>
        </div>
      </div>
    );
  }

  function renderContent() {
    if (requirement.state === 'loading') {
      return (
        <div className="admin-mfa__loading" role="status">
          <LoaderCircle aria-hidden="true" />
          <span>Checking admin MFA status...</span>
        </div>
      );
    }

    if (requirement.state === 'setup_required') {
      return renderSetupRequired();
    }

    if (requirement.state === 'challenge_required') {
      return renderChallengeRequired();
    }

    return renderVerified();
  }

  return (
    <section className="admin-mfa" aria-labelledby="admin-mfa-title">
      <div className="admin-mfa__header">
        <div className="admin-mfa__title">
          <ShieldCheck aria-hidden="true" />
          <div>
            <p className="admin-mfa__eyebrow">Admin Security</p>
            <h2 id="admin-mfa-title">Multi-factor verification</h2>
            <p>{requirement.message ?? 'Verify MFA before using protected admin tools.'}</p>
          </div>
        </div>
        <div className="admin-mfa__actions">{renderRefreshButton()}</div>
      </div>

      {renderMessages()}
      {renderContent()}
    </section>
  );
}
