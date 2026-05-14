import type { FrqQuestion, McqQuestion, QuestionSet } from '../../src/domain/questions/types';

export const testMcqQuestion: McqQuestion = {
  id: 'test-mcq-001',
  type: 'mcq',
  unit: 'Test Unit',
  topic: 'Test MCQ Topic',
  skill: 'Select the correct test choice',
  difficulty: 'intro',
  calculator: 'none',
  section: 'practice',
  tags: ['test-mcq'],
  prompt: 'Select the choice labeled correct.',
  choices: [
    {
      id: 'A',
      text: 'Correct choice',
      explanation: 'This is the intended correct test choice.',
    },
    {
      id: 'B',
      text: 'Incorrect choice',
      explanation: 'This is an intended distractor.',
    },
    {
      id: 'C',
      text: 'Another incorrect choice',
      explanation: 'This is an intended distractor.',
    },
    {
      id: 'D',
      text: 'Final incorrect choice',
      explanation: 'This is an intended distractor.',
    },
  ],
  correctChoiceId: 'A',
  explanation: {
    summary: 'The correct test choice is labeled correct.',
    steps: ['Read each choice.', 'Select the choice labeled correct.'],
    commonMistakes: ['Selecting a distractor without reading the label.'],
  },
};

export const testFrqQuestion: FrqQuestion = {
  id: 'test-frq-001',
  type: 'frq',
  unit: 'Test Unit',
  topic: 'Test FRQ Topic',
  skill: 'Complete a rubric-scored test response',
  difficulty: 'medium',
  calculator: 'none',
  section: 'practice',
  tags: ['test-frq'],
  prompt: 'Write a short response that can be scored with the test rubric.',
  parts: [
    {
      id: 'a',
      prompt: 'State the setup.',
      sampleResponse: 'A complete response states the setup.',
      expectedWork: ['State the setup.'],
      rubric: [
        {
          id: 'test-frq-001-a-setup',
          description: 'States the setup.',
          points: 1,
        },
        {
          id: 'test-frq-001-a-interpret',
          description: 'Interprets the setup.',
          points: 1,
        },
      ],
    },
    {
      id: 'b',
      prompt: 'Finish the conclusion.',
      sampleResponse: 'A complete response finishes the conclusion.',
      expectedWork: ['Write the conclusion.'],
      rubric: [
        {
          id: 'test-frq-001-b-equation',
          description: 'Writes the needed relationship.',
          points: 1,
        },
        {
          id: 'test-frq-001-b-solve',
          description: 'Uses the relationship correctly.',
          points: 1,
        },
        {
          id: 'test-frq-001-b-interpret',
          description: 'Interprets the conclusion.',
          points: 1,
        },
      ],
    },
  ],
  explanation: {
    summary: 'The test response earns points by matching rubric criteria.',
    steps: ['Address each part.', 'Check the matching rubric criteria.'],
    commonMistakes: ['Leaving a rubric criterion unsupported.'],
  },
};

export const testQuestionSet: QuestionSet = {
  version: 'test',
  questions: [testMcqQuestion, testFrqQuestion],
};
