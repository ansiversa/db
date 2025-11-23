export interface QuizPlatform {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  icon: string;
  type?: string | null;
  qCount: number;
}

export interface QuizSubject {
  id: string;
  platformId: string;
  name: string;
  isActive: boolean;
  qCount: number;
}

export interface QuizTopic {
  id: string;
  platformId: string;
  subjectId: string;
  name: string;
  isActive: boolean;
  qCount: number;
}

export interface QuizRoadmap {
  id: string;
  platformId: string;
  subjectId: string;
  topicId: string;
  name: string;
  isActive: boolean;
  qCount: number;
}

export type QuizDifficulty = "E" | "M" | "D";

export interface QuizQuestion {
  id: string;
  platformId: string;
  subjectId: string;
  topicId: string;
  roadmapId: string;
  prompt: string;
  options: Record<string, unknown>;
  answer: string;
  explanation?: string | null;
  difficulty: QuizDifficulty;
  isActive: boolean;
}

export interface QuizResultResponseItem {
  questionId: string;
  selectedKey: string;
  correctKey: string;
  isCorrect: boolean;
}

export interface QuizResult {
  id: string;
  userId: string;
  platformId: string;
  subjectId: string;
  topicId: string;
  roadmapId: string;
  level: QuizDifficulty;
  responses: QuizResultResponseItem[];
  mark: number;
  createdAt: string;
}

export interface SaveQuizResultInput {
  userId: string;
  platformId: string;
  subjectId: string;
  topicId: string;
  roadmapId: string;
  level: QuizDifficulty;
  responses: QuizResultResponseItem[];
  mark?: number;
}
