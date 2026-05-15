import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AdminAiSettings } from '../../src/app/components/AdminAiSettings';
import type { AiGradingEnvironment } from '../../src/domain/ai';

describe('AdminAiSettings', () => {
  it('renders the disabled-by-default AI grading status', () => {
    const markup = renderToStaticMarkup(createElement(AdminAiSettings, { env: {} }));

    expect(markup).toContain('AI Settings &amp; Status');
    expect(markup).toContain('AI grading is not active');
    expect(markup).toContain('Live grading');
    expect(markup).toContain('Not live');
    expect(markup).toContain('Feature flag');
    expect(markup).toContain('Off');
    expect(markup).toContain('Gemini');
    expect(markup).toContain('Incomplete');
    expect(markup).toContain('Proxy');
    expect(markup).toContain('Missing');
    expect(markup).toContain('5 per student');
    expect(markup).toContain('Using the default limit of 5.');
  });

  it('shows browser-safe configured status without exposing provider secrets', () => {
    const env: AiGradingEnvironment & { VITE_AI_FRQ_GEMINI_API_KEY?: string } = {
      VITE_AI_FRQ_GRADING_ENABLED: 'true',
      VITE_AI_FRQ_PROVIDER: 'gemini',
      VITE_AI_FRQ_GEMINI_MODEL: 'gemini-2.0-flash',
      VITE_AI_FRQ_PROXY_ENDPOINT: '/api/ai/frq-grade',
      VITE_AI_FRQ_DAILY_LIMIT: '3',
      VITE_AI_FRQ_GEMINI_API_KEY: 'super-secret-provider-key',
    };

    const markup = renderToStaticMarkup(createElement(AdminAiSettings, { env }));

    expect(markup).toContain('The disabled prototype config resolves');
    expect(markup).toContain('Configured');
    expect(markup).toContain('3 per student');
    expect(markup).toContain('3 requests per student per UTC day.');
    expect(markup).toContain('Provider API keys are intentionally not read or displayed');
    expect(markup).not.toContain('/api/ai/frq-grade');
    expect(markup).not.toContain('super-secret-provider-key');
  });
});
