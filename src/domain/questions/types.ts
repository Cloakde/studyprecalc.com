export type QuestionType = 'mcq' | 'frq';

export type Difficulty = 'intro' | 'medium' | 'advanced';

export type CalculatorPolicy = 'none' | 'graphing';

export type QuestionSection = 'practice' | 'mcq-a' | 'mcq-b' | 'frq-a' | 'frq-b';

export type QuestionAsset = {
  id: string;
  type: 'image' | 'graph' | 'table';
  path: string;
  alt: string;
  caption?: string;
};

export type VideoExplanation = {
  url: string;
  thumbnailPath?: string;
  transcriptPath?: string;
  durationSeconds?: number;
};

export type Explanation = {
  summary: string;
  steps: string[];
  commonMistakes?: string[];
  video?: VideoExplanation;
  assets?: QuestionAsset[];
};

export type BaseQuestion = {
  id: string;
  type: QuestionType;
  unit: string;
  topic: string;
  skill: string;
  difficulty: Difficulty;
  calculator: CalculatorPolicy;
  section: QuestionSection;
  tags: string[];
  prompt: string;
  assets?: QuestionAsset[];
  explanation: Explanation;
};

export type McqChoice = {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
  explanation: string;
};

export type McqQuestion = BaseQuestion & {
  type: 'mcq';
  choices: McqChoice[];
  correctChoiceId: McqChoice['id'];
};

export type RubricCriterion = {
  id: string;
  description: string;
  points: number;
};

export type FrqPart = {
  id: string;
  prompt: string;
  sampleResponse: string;
  expectedWork: string[];
  rubric: RubricCriterion[];
};

export type FrqQuestion = BaseQuestion & {
  type: 'frq';
  parts: FrqPart[];
};

export type Question = McqQuestion | FrqQuestion;

export type QuestionSet = {
  version: string;
  questions: Question[];
};
