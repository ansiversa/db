import type { InArgs } from "@libsql/client";

import { getQuizClient } from "./client.js";
import { ensureQuizSchema } from "./schema.js";
import { QuizResult, SaveQuizResultInput } from "../../types/quiz.js";

type Row = Record<string, unknown>;

const toTimestamp = (value: unknown): string => {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return new Date().toISOString();
};

const parseMetadata = (value: unknown): Record<string, unknown> | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string" && value.length > 0) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return null;
};

const toQuizResult = (row: Row): QuizResult => ({
  id: String(row.id),
  quizId: String(row.quiz_id),
  userId: String(row.user_id),
  score: Number(row.score),
  metadata: parseMetadata(row.metadata),
  createdAt: toTimestamp(row.created_at ?? row.createdAt),
  updatedAt: toTimestamp(row.updated_at ?? row.updatedAt ?? row.created_at ?? row.createdAt),
});

export const saveQuizResult = async (input: SaveQuizResultInput): Promise<QuizResult> => {
  await ensureQuizSchema();
  const client = getQuizClient();
  const metadata = input.metadata ? JSON.stringify(input.metadata) : null;

  const result = await client.execute({
    sql: `
      INSERT INTO quiz_results (quiz_id, user_id, score, metadata, created_at, updated_at)
      VALUES (?, ?, ?, COALESCE(?, json('{}')), datetime('now'), datetime('now'))
      RETURNING id, quiz_id, user_id, score, metadata, created_at, updated_at
    `,
    args: [input.quizId, input.userId, input.score, metadata],
  });

  const row = result.rows?.[0];
  if (!row) {
    throw new Error("Failed to insert quiz result");
  }

  return toQuizResult(row);
};

export const getQuizResultById = async (resultId: string): Promise<QuizResult | null> => {
  await ensureQuizSchema();
  const client = getQuizClient();
  const result = await client.execute({
    sql: `
      SELECT id, quiz_id, user_id, score, metadata, created_at, updated_at
      FROM quiz_results
      WHERE id = ?
      LIMIT 1
    `,
    args: [resultId],
  });

  const row = result.rows?.[0];
  return row ? toQuizResult(row) : null;
};

export interface QuizResultFilter {
  quizId?: string;
  userId?: string;
}

export const listQuizResults = async (filter: QuizResultFilter = {}): Promise<QuizResult[]> => {
  await ensureQuizSchema();
  const clauses: string[] = [];
  const args: InArgs = [];

  if (filter.quizId) {
    clauses.push("quiz_id = ?");
    args.push(filter.quizId);
  }

  if (filter.userId) {
    clauses.push("user_id = ?");
    args.push(filter.userId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const client = getQuizClient();
  const result = await client.execute({
    sql: `
      SELECT id, quiz_id, user_id, score, metadata, created_at, updated_at
      FROM quiz_results
      ${where}
      ORDER BY created_at DESC
    `,
    args,
  });

  return (result.rows ?? []).map(toQuizResult);
};

export const listQuizResultsForUser = async (userId: string): Promise<QuizResult[]> =>
  listQuizResults({ userId });
