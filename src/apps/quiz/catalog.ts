import type { InArgs } from "@libsql/client";

import { getQuizClient } from "./client.js";
import { ensureQuizSchema } from "./schema.js";
import {
  QuizEntry,
  QuizLevel,
  QuizPlatform,
  QuizSubject,
  QuizTopic,
} from "../../types/quiz.js";

type Row = Record<string, unknown>;

const toNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
};

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

const toPlatform = (row: Row): QuizPlatform => ({
  id: String(row.id),
  name: String(row.name),
  description: toNullableString(row.description),
  createdAt: toTimestamp(row.created_at ?? row.createdAt),
  updatedAt: toTimestamp(row.updated_at ?? row.updatedAt),
});

const toSubject = (row: Row): QuizSubject => ({
  id: String(row.id),
  platformId: String(row.platform_id),
  name: String(row.name),
  description: toNullableString(row.description),
  createdAt: toTimestamp(row.created_at ?? row.createdAt),
  updatedAt: toTimestamp(row.updated_at ?? row.updatedAt),
});

const toTopic = (row: Row): QuizTopic => ({
  id: String(row.id),
  subjectId: String(row.subject_id),
  name: String(row.name),
  description: toNullableString(row.description),
  createdAt: toTimestamp(row.created_at ?? row.createdAt),
  updatedAt: toTimestamp(row.updated_at ?? row.updatedAt),
});

const toLevel = (row: Row): QuizLevel => ({
  id: String(row.id),
  topicId: String(row.topic_id),
  levelNumber: Number(row.level_number),
  name: String(row.name),
  description: toNullableString(row.description),
  createdAt: toTimestamp(row.created_at ?? row.createdAt),
  updatedAt: toTimestamp(row.updated_at ?? row.updatedAt),
});

const toQuizEntry = (row: Row): QuizEntry => ({
  id: String(row.id),
  levelId: String(row.level_id),
  title: String(row.title),
  description: toNullableString(row.description),
  metadata: parseMetadata(row.metadata),
  createdAt: toTimestamp(row.created_at ?? row.createdAt),
  updatedAt: toTimestamp(row.updated_at ?? row.updatedAt),
});

const runListQuery = async <T>(sql: string, args: InArgs, mapper: (row: Row) => T): Promise<T[]> => {
  await ensureQuizSchema();
  const client = getQuizClient();
  const result = await client.execute({ sql, args });
  return (result.rows ?? []).map(mapper);
};

const fetchSingle = async <T>(
  sql: string,
  args: InArgs,
  mapper: (row: Row) => T,
): Promise<T | null> => {
  await ensureQuizSchema();
  const client = getQuizClient();
  const result = await client.execute({ sql, args });
  const row = result.rows?.[0];
  return row ? mapper(row) : null;
};

export const listPlatforms = async (): Promise<QuizPlatform[]> =>
  runListQuery(
    `
      SELECT id, name, description, created_at, updated_at
      FROM platforms
      ORDER BY name ASC
    `,
    [] as InArgs,
    toPlatform,
  );

export const getPlatformById = async (platformId: string): Promise<QuizPlatform | null> =>
  fetchSingle(
    `
      SELECT id, name, description, created_at, updated_at
      FROM platforms
      WHERE id = ?
      LIMIT 1
    `,
    [platformId] as InArgs,
    toPlatform,
  );

export const listSubjects = async (options: { platformId?: string } = {}): Promise<QuizSubject[]> => {
  const clauses: string[] = [];
  const args: InArgs = [];

  if (options.platformId) {
    clauses.push("platform_id = ?");
    args.push(options.platformId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return runListQuery(
    `
      SELECT id, platform_id, name, description, created_at, updated_at
      FROM subjects
      ${where}
      ORDER BY name ASC
    `,
    args,
    toSubject,
  );
};

export const getSubjectById = async (subjectId: string): Promise<QuizSubject | null> =>
  fetchSingle(
    `
      SELECT id, platform_id, name, description, created_at, updated_at
      FROM subjects
      WHERE id = ?
      LIMIT 1
    `,
    [subjectId] as InArgs,
    toSubject,
  );

export const listTopics = async (options: { subjectId?: string } = {}): Promise<QuizTopic[]> => {
  const clauses: string[] = [];
  const args: InArgs = [];

  if (options.subjectId) {
    clauses.push("subject_id = ?");
    args.push(options.subjectId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return runListQuery(
    `
      SELECT id, subject_id, name, description, created_at, updated_at
      FROM topics
      ${where}
      ORDER BY name ASC
    `,
    args,
    toTopic,
  );
};

export const getTopicById = async (topicId: string): Promise<QuizTopic | null> =>
  fetchSingle(
    `
      SELECT id, subject_id, name, description, created_at, updated_at
      FROM topics
      WHERE id = ?
      LIMIT 1
    `,
    [topicId] as InArgs,
    toTopic,
  );

export const listLevels = async (options: { topicId?: string } = {}): Promise<QuizLevel[]> => {
  const clauses: string[] = [];
  const args: InArgs = [];

  if (options.topicId) {
    clauses.push("topic_id = ?");
    args.push(options.topicId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return runListQuery(
    `
      SELECT id, topic_id, level_number, name, description, created_at, updated_at
      FROM levels
      ${where}
      ORDER BY level_number ASC
    `,
    args,
    toLevel,
  );
};

export const getLevelById = async (levelId: string): Promise<QuizLevel | null> =>
  fetchSingle(
    `
      SELECT id, topic_id, level_number, name, description, created_at, updated_at
      FROM levels
      WHERE id = ?
      LIMIT 1
    `,
    [levelId] as InArgs,
    toLevel,
  );

export const listQuizzes = async (options: { levelId?: string } = {}): Promise<QuizEntry[]> => {
  const clauses: string[] = [];
  const args: InArgs = [];

  if (options.levelId) {
    clauses.push("level_id = ?");
    args.push(options.levelId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return runListQuery(
    `
      SELECT id, level_id, title, description, metadata, created_at, updated_at
      FROM quizzes
      ${where}
      ORDER BY created_at DESC
    `,
    args,
    toQuizEntry,
  );
};

export const getQuizById = async (quizId: string): Promise<QuizEntry | null> =>
  fetchSingle(
    `
      SELECT id, level_id, title, description, metadata, created_at, updated_at
      FROM quizzes
      WHERE id = ?
      LIMIT 1
    `,
    [quizId] as InArgs,
    toQuizEntry,
  );
