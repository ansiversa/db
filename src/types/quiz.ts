export interface QuizPlatform {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuizSubject {
  id: string;
  platformId: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuizTopic {
  id: string;
  subjectId: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuizLevel {
  id: string;
  topicId: string;
  levelNumber: number;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  answer: string;
  difficulty?: string | null;
  userId?: string | null;
  createdAt?: string;
  quizId?: string | null;
}

export interface QuizEntry {
  id: string;
  levelId: string;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuizResult {
  id: string;
  quizId: string;
  userId: string;
  score: number;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveQuizResultInput {
  quizId: string;
  userId: string;
  score: number;
  metadata?: Record<string, unknown> | null;
}
