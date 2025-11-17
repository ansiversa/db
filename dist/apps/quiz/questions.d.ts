import { QuizQuestion } from "../../types/quiz";
export declare const getRandomQuestionsForUser: (userId: string, limit: number) => Promise<QuizQuestion[]>;
