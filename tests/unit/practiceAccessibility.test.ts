import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { FrqPractice } from '../../src/app/components/FrqPractice';
import { McqPractice } from '../../src/app/components/McqPractice';
import { QuestionPractice } from '../../src/app/components/QuestionPractice';
import { testFrqQuestion, testMcqQuestion } from '../fixtures/testQuestions';

describe('practice accessibility semantics', () => {
  it('adds keyboard instructions to MCQ choices', () => {
    const markup = renderToStaticMarkup(createElement(McqPractice, { question: testMcqQuestion }));

    expect(markup).toContain('aria-describedby="test-mcq-001-choice-help"');
    expect(markup).toContain('press A, B, C, or D');
  });

  it('labels FRQ response boxes by part', () => {
    const markup = renderToStaticMarkup(createElement(FrqPractice, { question: testFrqQuestion }));

    expect(markup).toContain('Your response for part a');
    expect(markup).toContain('Your response for part b');
    expect(markup).toContain('<section class="frq-part"');
    expect(markup).toContain('Press Ctrl+Enter or Command+Enter');
    expect(markup).toContain('aria-describedby=');
  });

  it('exposes question navigation and explanation reveal state', () => {
    const questionWithVideo = {
      ...testMcqQuestion,
      explanation: {
        ...testMcqQuestion.explanation,
        video: {
          url: 'https://videos.example.test/precalc/unit-1',
        },
      },
    };

    const markup = renderToStaticMarkup(
      createElement(QuestionPractice, {
        questions: [questionWithVideo, testFrqQuestion],
        questionSetVersion: 'test',
      }),
    );

    expect(markup).toContain('role="group"');
    expect(markup).toContain('aria-label="Filtered questions"');
    expect(markup).toContain('aria-current="true"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('2 questions match the current filters.');
  });

  it('uses FRQ-specific full explanation language before answer reveal', () => {
    const markup = renderToStaticMarkup(
      createElement(QuestionPractice, {
        questions: [testFrqQuestion],
        questionSetVersion: 'test',
      }),
    );

    expect(markup).toContain('<h2>Full Explanation</h2>');
    expect(markup).toContain('Show Full Explanation');
    expect(markup).toContain('sample responses and expected work');
  });
});
