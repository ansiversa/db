import { getQuizClient } from "./client";
const toQuizQuestion = (row) => ({
    id: String(row.id),
    prompt: String(row.prompt),
    answer: String(row.answer),
    difficulty: row.difficulty ?? null,
    userId: row.user_id ?? null,
    createdAt: row.created_at ?? row.createdAt,
});
export const getRandomQuestionsForUser = async (userId, limit) => {
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
