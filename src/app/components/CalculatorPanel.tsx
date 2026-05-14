import { Calculator } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { CalculatorPolicy } from '../../domain/questions/types';

type CalculatorPanelProps = {
  policy: CalculatorPolicy;
};

type DesmosApi = {
  GraphingCalculator: (
    element: HTMLElement,
    options?: Record<string, unknown>,
  ) => {
    destroy: () => void;
  };
};

declare global {
  interface Window {
    Desmos?: DesmosApi;
    __precalcDesmosScript?: Promise<DesmosApi>;
  }
}

function loadDesmos(apiKey: string): Promise<DesmosApi> {
  if (window.Desmos) {
    return Promise.resolve(window.Desmos);
  }

  if (window.__precalcDesmosScript) {
    return window.__precalcDesmosScript;
  }

  window.__precalcDesmosScript = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.desmos.com/api/v1.11/calculator.js?apiKey=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.onload = () => {
      if (window.Desmos) {
        resolve(window.Desmos);
      } else {
        reject(new Error('Desmos API loaded without exposing window.Desmos.'));
      }
    };
    script.onerror = () => reject(new Error('Unable to load Desmos API.'));
    document.head.append(script);
  });

  return window.__precalcDesmosScript;
}

export function CalculatorPanel({ policy }: CalculatorPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<'idle' | 'ready' | 'unavailable' | 'error'>('idle');

  const apiKey = import.meta.env.VITE_DESMOS_API_KEY as string | undefined;
  const enabled = policy === 'graphing';

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      return;
    }

    if (!apiKey) {
      setStatus('unavailable');
      return;
    }

    let calculator: ReturnType<DesmosApi['GraphingCalculator']> | undefined;
    let disposed = false;

    void loadDesmos(apiKey)
      .then((Desmos) => {
        if (disposed || !containerRef.current) {
          return;
        }

        calculator = Desmos.GraphingCalculator(containerRef.current, {
          expressions: true,
          keypad: true,
          settingsMenu: false,
          zoomButtons: true,
          lockViewport: false,
        });
        setStatus('ready');
      })
      .catch(() => setStatus('error'));

    return () => {
      disposed = true;
      calculator?.destroy();
    };
  }, [apiKey, enabled]);

  if (!enabled) {
    return (
      <aside className="tool-panel tool-panel--muted" aria-label="Calculator status">
        <div className="tool-panel__header">
          <Calculator aria-hidden="true" />
          <h2>Calculator</h2>
        </div>
        <p>No calculator for this question.</p>
      </aside>
    );
  }

  return (
    <aside className="tool-panel" aria-label="Graphing calculator">
      <div className="tool-panel__header">
        <Calculator aria-hidden="true" />
        <h2>Graphing Calculator</h2>
      </div>
      {status === 'unavailable' ? (
        <p>Desmos is not configured in this local build.</p>
      ) : null}
      {status === 'error' ? <p>Calculator failed to load.</p> : null}
      <div className="desmos-frame" data-status={status} ref={containerRef} />
    </aside>
  );
}
