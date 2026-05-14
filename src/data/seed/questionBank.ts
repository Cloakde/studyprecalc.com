import seedQuestionSet from '../../../content/questions/seed-ap-precalc.json';
import type { Question } from '../../domain/questions/types';
import { QuestionSetSchema } from '../schemas/questionSchema';

const parsedQuestionSet = QuestionSetSchema.parse(seedQuestionSet);

export const questionBank: Question[] = parsedQuestionSet.questions;
export const questionSetVersion = parsedQuestionSet.version;
