import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { FrqAiFeedbackPlaceholder } from '../../src/app/components/FrqAiFeedbackPlaceholder';
import { FrqPractice } from '../../src/app/components/FrqPractice';
import type { AiDailyUsageSnapshot, AiGradingFeatureConfig } from '../../src/domain/ai';
import { testFrqQuestion } from '../fixtures/testQuestions';

describe('FrqAiFeedbackPlaceholder', () => {
  it('renders a disabled coming-soon action that keeps rubric self-review primary', () => {
    const markup = renderToStaticMarkup(createElement(FrqAiFeedbackPlaceholder));

    expect(markup).toContain('AI Feedback');
    expect(markup).toContain('Coming Soon');
    expect(markup).toContain('Rubric self-review stays primary');
    expect(markup).toContain('Use the rubric checklist');
    expect(markup).toContain('Not Enabled');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('Request AI Feedback');
  });

  it('reflects configured usage without enabling student requests', () => {
    const config: AiGradingFeatureConfig = {
      enabled: true,
      provider: {
        provider: 'gemini',
        model: 'gemini-2.0-flash',
      },
      dailyRequestLimit: 5,
      feedbackRetentionDays: 30,
    };
    const usage: AiDailyUsageSnapshot = {
      accountId: 'student-1',
      dateKey: '2026-05-15',
      used: 2,
      limit: 5,
      remaining: 3,
      allowed: true,
    };
    const markup = renderToStaticMarkup(
      createElement(FrqAiFeedbackPlaceholder, {
        config,
        usage,
      }),
    );

    expect(markup).toContain('Configured');
    expect(markup).toContain('3/5 requests remaining today');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('Coming Soon');
  });

  it('does not show the placeholder before the FRQ is submitted', () => {
    const markup = renderToStaticMarkup(
      createElement(FrqPractice, {
        question: testFrqQuestion,
        aiFeedback: {
          config: {
            enabled: true,
            provider: {
              provider: 'gemini',
              model: 'gemini-2.0-flash',
            },
            dailyRequestLimit: 5,
          },
        },
      }),
    );

    expect(markup).not.toContain('Request AI Feedback');
  });
});
