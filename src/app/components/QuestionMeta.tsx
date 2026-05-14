import { Calculator, Gauge, Layers3 } from 'lucide-react';

import type { Question } from '../../domain/questions/types';

type QuestionMetaProps = {
  question: Question;
};

export function QuestionMeta({ question }: QuestionMetaProps) {
  const calculatorLabel = question.calculator === 'graphing' ? 'Graphing calculator' : 'No calculator';

  return (
    <dl className="meta-grid" aria-label="Question metadata">
      <div className="meta-item">
        <Layers3 aria-hidden="true" />
        <dt>Unit</dt>
        <dd>{question.unit}</dd>
      </div>
      <div className="meta-item">
        <Gauge aria-hidden="true" />
        <dt>Difficulty</dt>
        <dd>{question.difficulty}</dd>
      </div>
      <div className="meta-item">
        <Calculator aria-hidden="true" />
        <dt>Calculator</dt>
        <dd>{calculatorLabel}</dd>
      </div>
    </dl>
  );
}
