import { getQuizClient } from "./client";
import { QuizResult, SaveQuizResultInput } from "../../types/quiz";

const toQuizResult = (row: Record<string, unknown>): QuizResult => ({
  id: String(row.id),
  userId: String(row.user_id),
  questionId: String(row.question_id),
  isCorrect: Boolean(row.is_correct),
  createdAt: (row.created_at as string) ?? new Date().toISOString(),
  metadata: row.metadata as Record<string, unknown> | null | undefined,
});

export const saveQuizResult = async (input: SaveQuizResultInput): Promise<QuizResult> => {
  const client = getQuizClient();
  const metadata = input.metadata ? JSON.stringify(input.metadata) : null;

  const result = await client.execute({
    sql: `
      INSERT INTO quiz_results (user_id, question_id, is_correct, metadata, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      RETURNING id, user_id, question_id, is_correct, metadata, created_at
    `,
    args: [input.userId, input.questionId, input.isCorrect ? 1 : 0, metadata],
  });

  const row = result.rows?.[0];
  if (!row) {
    throw new Error("Failed to insert quiz result");
  }

  return toQuizResult(row);
};
