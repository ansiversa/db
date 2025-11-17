import type { InArgs } from "@libsql/client";

import { getQuizClient } from "./client.js";
import { ensureQuizSchema } from "./schema.js";
import { QuizQuestion } from "../../types/quiz.js";

const toQuizQuestion = (row: Record<string, unknown>): QuizQuestion => ({
  id: String(row.id),
  quizId: row.quiz_id === null || row.quiz_id === undefined ? null : String(row.quiz_id),
  prompt: String(row.prompt),
  answer: String(row.answer),
  difficulty: (row.difficulty as string | null | undefined) ?? null,
  userId: (row.user_id as string | null | undefined) ?? null,
  createdAt: (row.created_at as string | undefined) ?? (row.createdAt as string | undefined),
});

export const getRandomQuestionsForUser = async (
  userId: string,
  limit: number,
): Promise<QuizQuestion[]> => {
  await ensureQuizSchema();
  const client = getQuizClient();
  const normalizedLimit = Math.max(1, Math.min(limit, 100));

  const result = await client.execute({
    sql: `
      SELECT id, quiz_id, prompt, answer, difficulty, user_id, created_at
      FROM quiz_questions
      WHERE user_id IS NULL OR user_id = ?
      ORDER BY random()
      LIMIT ?
    `,
    args: [userId, normalizedLimit],
  });

  return (result.rows ?? []).map(toQuizQuestion);
};

export interface QuizQuestionQueryOptions {
  limit?: number;
  userId?: string;
}

export const getQuestionsForQuiz = async (
  quizId: string,
  options: QuizQuestionQueryOptions = {},
): Promise<QuizQuestion[]> => {
  await ensureQuizSchema();
  const client = getQuizClient();
  const normalizedLimit = Math.max(1, Math.min(options.limit ?? 50, 200));

  const args: InArgs = [quizId];
  let userClause = "";
  if (options.userId) {
    userClause = "AND (user_id IS NULL OR user_id = ?)";
    args.push(options.userId);
  }

  args.push(normalizedLimit);

  const result = await client.execute({
    sql: `
      SELECT id, quiz_id, prompt, answer, difficulty, user_id, created_at
      FROM quiz_questions
      WHERE quiz_id = ?
      ${userClause}
      ORDER BY random()
      LIMIT ?
    `,
    args,
  });

  return (result.rows ?? []).map(toQuizQuestion);
};
