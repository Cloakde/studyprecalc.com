import type { AiGradingFeatureConfig, AiGradingProviderConfig } from './types';

export const defaultAiDailyRequestLimit = 5;

export type AiGradingEnvironment = Record<string, string | boolean | number | undefined>;

function readBoolean(value: string | boolean | number | undefined): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  return value === 'true' || value === '1';
}

function readPositiveInteger(
  value: string | boolean | number | undefined,
  fallback: number,
): number {
  const parsed = typeof value === 'number' ? value : Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function readGeminiProvider(env: AiGradingEnvironment): AiGradingProviderConfig | undefined {
  const provider = env.VITE_AI_FRQ_PROVIDER;

  if (provider !== 'gemini') {
    return undefined;
  }

  const model =
    typeof env.VITE_AI_FRQ_GEMINI_MODEL === 'string' ? env.VITE_AI_FRQ_GEMINI_MODEL.trim() : '';

  if (!model) {
    return undefined;
  }

  return {
    provider: 'gemini',
    model,
    apiKeyEnvVar:
      typeof env.VITE_AI_FRQ_GEMINI_API_KEY_ENV === 'string'
        ? env.VITE_AI_FRQ_GEMINI_API_KEY_ENV
        : undefined,
    proxyEndpoint:
      typeof env.VITE_AI_FRQ_PROXY_ENDPOINT === 'string'
        ? env.VITE_AI_FRQ_PROXY_ENDPOINT
        : undefined,
  };
}

export function resolveAiGradingConfig(env: AiGradingEnvironment = {}): AiGradingFeatureConfig {
  const enabled = readBoolean(env.VITE_AI_FRQ_GRADING_ENABLED);
  const provider = readGeminiProvider(env);

  return {
    enabled: enabled && provider !== undefined,
    provider,
    dailyRequestLimit: readPositiveInteger(env.VITE_AI_FRQ_DAILY_LIMIT, defaultAiDailyRequestLimit),
    feedbackRetentionDays: readPositiveInteger(env.VITE_AI_FRQ_FEEDBACK_RETENTION_DAYS, 30),
  };
}

export function isAiGradingAvailable(config: AiGradingFeatureConfig): boolean {
  return config.enabled && config.provider !== undefined && config.dailyRequestLimit > 0;
}
