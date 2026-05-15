import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  SessionPractice,
  sessionPracticeViewModel,
} from '../../src/app/components/SessionPractice';
import { testFrqQuestion, testMcqQuestion } from '../fixtures/testQuestions';

describe('SessionPractice', () => {
  it('renders a clear empty state when no session questions are available', () => {
    const markup = renderToStaticMarkup(
      createElement(SessionPractice, {
        questions: [],
        questionSetVersion: 'empty-test',
      }),
    );

    expect(markup).toContain('Session Mode');
    expect(markup).toContain('No published questions are available for sessions.');
    expect(markup).not.toContain('Start Session');
  });

  it('summarizes setup counts without revealing answers before the session starts', () => {
    const markup = renderToStaticMarkup(
      createElement(SessionPractice, {
        questions: [testMcqQuestion, testFrqQuestion],
        questionSetVersion: 'setup-test',
      }),
    );

    expect(markup).toContain('1 MCQ');
    expect(markup).toContain('1 FRQ');
    expect(markup).toContain('2 questions will be selected from 2 questions.');
    expect(markup).toContain('Start Session');
    expect(markup).not.toContain('Correct answer');
    expect(markup).not.toContain(testMcqQuestion.choices[0].explanation);
    expect(markup).not.toContain(testFrqQuestion.parts[0].sampleResponse);
  });

  it('separates review items from the mistakes-only retry action', () => {
    const missedMcq = {
      ...testMcqQuestion,
      id: 'test-mcq-002',
    };
    const reviewItems = sessionPracticeViewModel.getSessionReviewItems(
      [
        {
          question: testMcqQuestion,
          score: 1,
          maxScore: 1,
          answered: true,
          isCorrect: true,
        },
        {
          question: missedMcq,
          score: 0,
          maxScore: 1,
          answered: true,
          isCorrect: false,
        },
        {
          question: testFrqQuestion,
          score: 0,
          maxScore: 5,
          answered: true,
          needsManualScore: true,
        },
      ],
      'needs-review',
    );

    expect(reviewItems.map((item) => item.question.id)).toEqual([missedMcq.id, testFrqQuestion.id]);
    expect(
      sessionPracticeViewModel.getMistakePracticeAction({
        missedQuestionCount: 1,
        pendingManualScoreCount: 0,
      }),
    ).toMatchObject({
      disabled: false,
      label: 'Practice 1 Mistake',
    });
    expect(
      sessionPracticeViewModel.getMistakePracticeAction({
        missedQuestionCount: 1,
        pendingManualScoreCount: 1,
      }),
    ).toMatchObject({
      disabled: true,
      label: 'Practice Mistakes',
    });
    expect(
      sessionPracticeViewModel.getMistakePracticeAction({
        missedQuestionCount: 0,
        pendingManualScoreCount: 0,
      }),
    ).toMatchObject({
      disabled: true,
      detail: 'No scored mistakes are ready for a follow-up session.',
    });
  });
});
