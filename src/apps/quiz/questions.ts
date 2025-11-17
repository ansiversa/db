import { getQuizClient } from "./client";
import { QuizQuestion } from "../../types/quiz";

const toQuizQuestion = (row: Record<string, unknown>): QuizQuestion => ({
  id: String(row.id),
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
  const client = getQuizClient();
  const normalizedLimit = Math.max(1, Math.min(limit, 100));

  const result = await client.execute({
    sql: `
      SELECT id, prompt, answer, difficulty, user_id, created_at
      FROM quiz_questions
      WHERE user_id IS NULL OR user_id = ?
      ORDER BY random()
      LIMIT ?
    `,
    args: [userId, normalizedLimit],
  });

  return (result.rows ?? []).map(toQuizQuestion);
};
