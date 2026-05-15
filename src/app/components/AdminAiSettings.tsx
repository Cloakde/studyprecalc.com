import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Gauge,
  LockKeyhole,
  Server,
  XCircle,
} from 'lucide-react';

import {
  defaultAiDailyRequestLimit,
  isAiGradingAvailable,
  resolveAiGradingConfig,
  type AiGradingEnvironment,
} from '../../domain/ai';

type AdminAiSettingsProps = {
  env?: AiGradingEnvironment;
};

type StatusTone = 'blocked' | 'ready' | 'warning' | 'neutral';

type StatusCard = {
  label: string;
  value: string;
  detail: string;
  tone: StatusTone;
  icon: typeof AlertTriangle;
};

function getEnvString(env: AiGradingEnvironment, key: string): string {
  const value = env[key];

  return typeof value === 'string' ? value.trim() : '';
}

function isTruthyEnvValue(value: string | boolean | number | undefined): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  return value === 'true' || value === '1';
}

function hasPositiveIntegerValue(value: string): boolean {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0;
}

function renderStatusIcon(tone: StatusTone) {
  if (tone === 'ready') {
    return <CheckCircle2 aria-hidden="true" />;
  }

  if (tone === 'blocked') {
    return <XCircle aria-hidden="true" />;
  }

  return <AlertTriangle aria-hidden="true" />;
}

export function AdminAiSettings({
  env = import.meta.env as AiGradingEnvironment,
}: AdminAiSettingsProps) {
  const config = resolveAiGradingConfig(env);
  const featureFlagEnabled = isTruthyEnvValue(env.VITE_AI_FRQ_GRADING_ENABLED);
  const geminiConfigured = config.provider?.provider === 'gemini';
  const proxyConfigured = Boolean(getEnvString(env, 'VITE_AI_FRQ_PROXY_ENDPOINT'));
  const dailyLimitRaw = getEnvString(env, 'VITE_AI_FRQ_DAILY_LIMIT');
  const dailyLimitConfigured = hasPositiveIntegerValue(dailyLimitRaw);
  const foundationReady = isAiGradingAvailable(config);

  const cards: StatusCard[] = [
    {
      label: 'Live grading',
      value: 'Not live',
      detail: 'No student workflow calls Gemini or a grading proxy yet.',
      tone: 'blocked',
      icon: AlertTriangle,
    },
    {
      label: 'Feature flag',
      value: featureFlagEnabled ? 'On' : 'Off',
      detail: featureFlagEnabled
        ? foundationReady
          ? 'The disabled prototype config resolves, but the app remains status-only.'
          : 'Requested in env, but required provider settings are incomplete.'
        : 'Disabled by default through VITE_AI_FRQ_GRADING_ENABLED.',
      tone: featureFlagEnabled ? 'warning' : 'neutral',
      icon: Bot,
    },
    {
      label: 'Gemini',
      value: geminiConfigured ? 'Configured' : 'Incomplete',
      detail: geminiConfigured
        ? 'Provider and model are present in the AI grading config.'
        : 'Set the Gemini provider and model before any future proxy can grade.',
      tone: geminiConfigured ? 'ready' : 'warning',
      icon: Bot,
    },
    {
      label: 'Proxy',
      value: proxyConfigured ? 'Configured' : 'Missing',
      detail: proxyConfigured
        ? 'A browser-safe proxy endpoint is present; secrets still stay server-side.'
        : 'Future live grading should use a backend proxy before Gemini calls are enabled.',
      tone: proxyConfigured ? 'ready' : 'warning',
      icon: Server,
    },
    {
      label: 'Daily limit',
      value: `${config.dailyRequestLimit} per student`,
      detail: dailyLimitConfigured
        ? 'Configured through VITE_AI_FRQ_DAILY_LIMIT.'
        : `Using the default limit of ${defaultAiDailyRequestLimit}.`,
      tone: dailyLimitConfigured ? 'ready' : 'neutral',
      icon: Gauge,
    },
  ];

  return (
    <main className="admin-shell admin-ai" aria-labelledby="admin-ai-title">
      <section className="manager-header admin-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 id="admin-ai-title">AI Settings & Status</h1>
          <p>
            Read-only visibility for the disabled-by-default FRQ AI grading foundation. This is not
            live grading; rubric self-scoring remains the student workflow.
          </p>
        </div>
      </section>

      <section className="admin-ai__notice" aria-labelledby="admin-ai-not-live-title">
        <AlertTriangle aria-hidden="true" />
        <div>
          <h2 id="admin-ai-not-live-title">AI grading is not active</h2>
          <p>
            This page reports configuration only. The browser does not submit FRQ responses to
            Gemini, and no external grading result is shown to students.
          </p>
        </div>
      </section>

      <section className="admin-ai__status-grid" aria-label="AI configuration status">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <article className="admin-ai__status-card" data-tone={card.tone} key={card.label}>
              <div className="admin-ai__status-card-heading">
                <Icon aria-hidden="true" />
                <span>{card.label}</span>
              </div>
              <strong>{card.value}</strong>
              <small>{card.detail}</small>
            </article>
          );
        })}
      </section>

      <section className="admin-grid">
        <article className="admin-panel">
          <h2>Readiness Checks</h2>
          <ul className="admin-ai__check-list">
            <li data-tone="blocked">
              {renderStatusIcon('blocked')}
              <span>
                <strong>Student AI grading:</strong> not wired into practice, session, or review.
              </span>
            </li>
            <li data-tone={geminiConfigured ? 'ready' : 'warning'}>
              {renderStatusIcon(geminiConfigured ? 'ready' : 'warning')}
              <span>
                <strong>Gemini config:</strong>{' '}
                {geminiConfigured ? 'provider and model configured.' : 'provider or model missing.'}
              </span>
            </li>
            <li data-tone={proxyConfigured ? 'ready' : 'warning'}>
              {renderStatusIcon(proxyConfigured ? 'ready' : 'warning')}
              <span>
                <strong>Proxy endpoint:</strong>{' '}
                {proxyConfigured ? 'configured for a future backend boundary.' : 'not configured.'}
              </span>
            </li>
            <li data-tone={dailyLimitConfigured ? 'ready' : 'neutral'}>
              {renderStatusIcon(dailyLimitConfigured ? 'ready' : 'neutral')}
              <span>
                <strong>Daily request limit:</strong>{' '}
                {dailyLimitConfigured
                  ? `${config.dailyRequestLimit} requests per student per UTC day.`
                  : `defaulting to ${defaultAiDailyRequestLimit} requests per student per UTC day.`}
              </span>
            </li>
          </ul>
        </article>

        <article className="admin-panel">
          <h2>Security Boundary</h2>
          <div className="admin-ai__security-note">
            <LockKeyhole aria-hidden="true" />
            <p>
              Provider API keys are intentionally not read or displayed in browser code. Future
              Gemini calls should terminate at a server-side proxy that owns secrets, rate limits,
              and audit logging.
            </p>
          </div>
        </article>
      </section>
    </main>
  );
}
