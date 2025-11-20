import type { InArgs } from "@libsql/client";

import { getQuizClient } from "./client.js";
import { ensureQuizSchema } from "./schema.js";
import { QuizResult, SaveQuizResultInput, QuizDifficulty } from "../../types/quiz.js";

type Row = Record<string, unknown>;

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

const toQuizResult = (row: Row): QuizResult => ({
  id: String(row.id),
  userId: String(row.user_id),
  platformId: String(row.platform_id),
  subjectId: String(row.subject_id),
  topicId: String(row.topic_id),
  roadmapId: String(row.roadmap_id),
  level: toDifficulty(row.level),
  responses: parseJsonObject(row.responses),
  mark: typeof row.mark === "number" ? row.mark : Number(row.mark ?? 0),
  createdAt: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
});

export const saveQuizResult = async (input: SaveQuizResultInput): Promise<QuizResult> => {
  await ensureQuizSchema();
  const client = getQuizClient();
  const responses = JSON.stringify(input.responses ?? {});

  const result = await client.execute({
    sql: `
      INSERT INTO results (
        user_id,
        platform_id,
        subject_id,
        topic_id,
        roadmap_id,
        level,
        responses,
        mark
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, 0))
      RETURNING id, user_id, platform_id, subject_id, topic_id, roadmap_id, level, responses, mark, created_at
    `,
    args: [
      input.userId,
      input.platformId,
      input.subjectId,
      input.topicId,
      input.roadmapId,
      input.level,
      responses,
      input.mark ?? 0,
    ],
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
      SELECT id, user_id, platform_id, subject_id, topic_id, roadmap_id, level, responses, mark, created_at
      FROM results
      WHERE id = ?
      LIMIT 1
    `,
    args: [resultId],
  });

  const row = result.rows?.[0];
  return row ? toQuizResult(row) : null;
};

export interface QuizResultFilter {
  userId?: string;
  platformId?: string;
  subjectId?: string;
  topicId?: string;
  roadmapId?: string;
  level?: QuizDifficulty;
}

export const listQuizResults = async (filter: QuizResultFilter = {}): Promise<QuizResult[]> => {
  await ensureQuizSchema();
  const clauses: string[] = [];
  const args: InArgs = [];

  if (filter.userId) {
    clauses.push("user_id = ?");
    args.push(filter.userId);
  }

  if (filter.platformId) {
    clauses.push("platform_id = ?");
    args.push(filter.platformId);
  }

  if (filter.subjectId) {
    clauses.push("subject_id = ?");
    args.push(filter.subjectId);
  }

  if (filter.topicId) {
    clauses.push("topic_id = ?");
    args.push(filter.topicId);
  }

  if (filter.roadmapId) {
    clauses.push("roadmap_id = ?");
    args.push(filter.roadmapId);
  }

  if (filter.level) {
    clauses.push("level = ?");
    args.push(filter.level);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const client = getQuizClient();
  const result = await client.execute({
    sql: `
      SELECT id, user_id, platform_id, subject_id, topic_id, roadmap_id, level, responses, mark, created_at
      FROM results
      ${where}
      ORDER BY created_at DESC
    `,
    args,
  });

  return (result.rows ?? []).map(toQuizResult);
};

export const listQuizResultsForUser = async (userId: string): Promise<QuizResult[]> =>
  listQuizResults({ userId });
