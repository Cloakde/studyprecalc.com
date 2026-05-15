import { Bot, Sparkles } from 'lucide-react';
import { useId } from 'react';

import {
  defaultAiDailyRequestLimit,
  isAiGradingAvailable,
  type AiDailyUsageSnapshot,
  type AiGradingFeatureConfig,
} from '../../domain/ai';

export type FrqAiFeedbackPlaceholderProps = {
  config?: AiGradingFeatureConfig;
  usage?: AiDailyUsageSnapshot;
};

const disabledAiFeedbackConfig: AiGradingFeatureConfig = {
  enabled: false,
  dailyRequestLimit: defaultAiDailyRequestLimit,
};

function getUsageSummary(
  config: AiGradingFeatureConfig,
  usage: AiDailyUsageSnapshot | undefined,
  configured: boolean,
): string {
  if (usage) {
    return `${usage.remaining}/${usage.limit} requests remaining today`;
  }

  if (configured) {
    return `${config.dailyRequestLimit} requests per day when student requests open`;
  }

  return `${config.dailyRequestLimit} requests per day after setup`;
}

export function FrqAiFeedbackPlaceholder({
  config = disabledAiFeedbackConfig,
  usage,
}: FrqAiFeedbackPlaceholderProps) {
  const headingId = useId();
  const configured = isAiGradingAvailable(config);

  return (
    <aside
      className="ai-feedback-placeholder"
      data-configured={configured}
      aria-labelledby={headingId}
    >
      <div className="ai-feedback-placeholder__header">
        <Bot aria-hidden="true" />
        <div>
          <p className="eyebrow">AI Feedback</p>
          <h3 id={headingId}>Coming Soon</h3>
        </div>
        <span className="ai-feedback-placeholder__status">
          {configured ? 'Configured' : 'Not Enabled'}
        </span>
      </div>

      <p>
        Rubric self-review stays primary. After you choose rubric points, this will later offer
        optional feedback from the configured AI workflow.
      </p>

      <dl className="ai-feedback-placeholder__meta">
        <div>
          <dt>Current action</dt>
          <dd>Use the rubric checklist</dd>
        </div>
        <div>
          <dt>Usage</dt>
          <dd>{getUsageSummary(config, usage, configured)}</dd>
        </div>
      </dl>

      <button className="ghost-button" disabled type="button">
        <Sparkles aria-hidden="true" />
        Request AI Feedback
      </button>
    </aside>
  );
}
