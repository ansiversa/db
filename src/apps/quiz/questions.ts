import type { InArgs } from "@libsql/client";

import { getQuizClient } from "./client.js";
import { ensureQuizSchema } from "./schema.js";
import { QuizQuestion, QuizDifficulty } from "../../types/quiz.js";

const toDifficulty = (value: unknown): QuizDifficulty => {
  const normalized = String(value ?? "E").toUpperCase();
  return normalized === "M" || normalized === "D" ? (normalized as QuizDifficulty) : "E";
};

const parseJsonObject = (value: unknown): Record<string, unknown> => {
  if (typeof value === "string" && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }

  return {};
};

const toQuizQuestion = (row: Record<string, unknown>): QuizQuestion => ({
  id: String(row.id),
  platformId: String(row.platform_id),
  subjectId: String(row.subject_id),
  topicId: String(row.topic_id),
  roadmapId: String(row.roadmap_id),
  prompt: String(row.q),
  options: parseJsonObject(row.o),
  answer: String(row.a),
  explanation: typeof row.e === "string" && row.e.trim().length ? row.e : null,
  difficulty: toDifficulty(row.l),
  isActive: Boolean(row.is_active ?? false),
});

export interface QuizQuestionQueryOptions {
  limit?: number;
  random?: boolean;
  activeOnly?: boolean;
}

const queryQuestions = async (
  whereClause: string,
  args: InArgs,
  options: QuizQuestionQueryOptions = {},
): Promise<QuizQuestion[]> => {
  await ensureQuizSchema();
  const client = getQuizClient();
  const normalizedLimit = Math.max(1, Math.min(options.limit ?? 50, 200));
  const activeClause = options.activeOnly === false ? "" : "AND is_active = 1";
  const orderClause = options.random === false ? "id DESC" : "random()";

  const preparedArgs: InArgs = Array.isArray(args) ? [...args, normalizedLimit] : ([args, normalizedLimit] as InArgs);

  const result = await client.execute({
    sql: `
      SELECT id, platform_id, subject_id, topic_id, roadmap_id, q, o, a, e, l, is_active
      FROM questions
      WHERE ${whereClause}
      ${activeClause}
      ORDER BY ${orderClause}
      LIMIT ?
    `,
    args: preparedArgs,
  });

  return (result.rows ?? []).map(toQuizQuestion);
};

// `_userId` is reserved for future personalization logic (e.g., spaced repetition or adaptive difficulty).
export const getRandomQuestionsForUser = async (
  _userId: string,
  limit: number,
): Promise<QuizQuestion[]> => queryQuestions("is_active = 1", [], { limit, random: true, activeOnly: false });

export const getQuestionsForQuiz = async (
  roadmapId: string,
  options: QuizQuestionQueryOptions = {},
): Promise<QuizQuestion[]> =>
  queryQuestions("roadmap_id = ?", [roadmapId], {
    ...options,
    activeOnly: options.activeOnly ?? true,
    random: options.random ?? true,
  });

export const getQuestionsByTopic = async (
  topicId: string,
  options: QuizQuestionQueryOptions = {},
): Promise<QuizQuestion[]> =>
  queryQuestions("topic_id = ?", [topicId], {
    ...options,
    activeOnly: options.activeOnly ?? true,
    random: options.random ?? true,
  });

export const getQuestionsByPlatform = async (
  platformId: string,
  options: QuizQuestionQueryOptions = {},
): Promise<QuizQuestion[]> =>
  queryQuestions("platform_id = ?", [platformId], {
    ...options,
    activeOnly: options.activeOnly ?? true,
    random: options.random ?? true,
  });
