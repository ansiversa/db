export interface QuizQuestion {
    id: string;
    prompt: string;
    answer: string;
    difficulty?: string | null;
    userId?: string | null;
    createdAt?: string;
}
export interface QuizResult {
    id: string;
    userId: string;
    questionId: string;
    isCorrect: boolean;
    createdAt: string;
    metadata?: Record<string, unknown> | null;
}
export interface SaveQuizResultInput {
    userId: string;
    questionId: string;
    isCorrect: boolean;
    metadata?: Record<string, unknown> | null;
}
