import type { InArgs } from "@libsql/client";

import { getQuizClient } from "./client.js";
import { ensureQuizSchema } from "./schema.js";
import {
  QuizPlatform,
  QuizQuestion,
  QuizResult,
  QuizResultResponseItem,
  QuizRoadmap,
  QuizSubject,
  QuizTopic,
  QuizDifficulty,
} from "../../types/quiz.js";
import { quizTableOperationMap } from "../../core/db/quiz/tables.js";

type Row = Record<string, unknown>;

type PaginationOptions = {
  page?: number;
  pageSize?: number;
};

type SortOptions = {
  column?: string;
  direction?: "asc" | "desc";
};

type QueryOptions<F extends Record<string, unknown>> = PaginationOptions & {
  filters?: Partial<F>;
  sort?: SortOptions;
};

type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

type ColumnMap = Record<string, string>;

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const resolvePagination = (options: PaginationOptions = {}) => {
  const safePage = Number.isFinite(options.page) ? Number(options.page) : 1;
  const safePageSize = Number.isFinite(options.pageSize) ? Number(options.pageSize) : DEFAULT_PAGE_SIZE;
  const page = Math.max(1, Math.floor(safePage));
  const pageSize = Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(safePageSize)));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, limit: pageSize, offset };
};

const toNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value);
  return text.length ? text : null;
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }
  return false;
};

const toBooleanFlag = (value: unknown): boolean => toBoolean(value ?? false);

const toBooleanInt = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  return toBoolean(value) ? 1 : 0;
};

const parseJsonObject = (value: unknown): Record<string, unknown> => {
  if (typeof value === "string" && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }

  return {};
};

const parseResponses = (value: unknown): QuizResultResponseItem[] => {
  if (typeof value === "string" && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed as QuizResultResponseItem[];
      }
    } catch {
      return [];
    }
  }

  return Array.isArray(value) ? (value as QuizResultResponseItem[]) : [];
};

const toDifficulty = (value: unknown): QuizDifficulty => {
  const normalized = String(value ?? "E").toUpperCase();
  return normalized === "M" || normalized === "D" ? (normalized as QuizDifficulty) : "E";
};

const toPlatform = (row: Row): QuizPlatform => ({
  id: String(row.id),
  name: String(row.name),
  description: toNullableString(row.description),
  isActive: toBoolean(row.is_active),
  icon: String(row.icon ?? ""),
  type: toNullableString(row.type),
  qCount: toNumber(row.q_count),
});

const toSubject = (row: Row): QuizSubject => ({
  id: String(row.id),
  platformId: String(row.platform_id),
  name: String(row.name),
  isActive: toBoolean(row.is_active),
  qCount: toNumber(row.q_count),
});

const toTopic = (row: Row): QuizTopic => ({
  id: String(row.id),
  platformId: String(row.platform_id),
  subjectId: String(row.subject_id),
  name: String(row.name),
  isActive: toBoolean(row.is_active),
  qCount: toNumber(row.q_count),
});

const toRoadmap = (row: Row): QuizRoadmap => ({
  id: String(row.id),
  platformId: String(row.platform_id),
  subjectId: String(row.subject_id),
  topicId: String(row.topic_id),
  name: String(row.name),
  isActive: toBoolean(row.is_active),
  qCount: toNumber(row.q_count),
});

const toQuestion = (row: Row): QuizQuestion => ({
  id: String(row.id),
  platformId: String(row.platform_id),
  subjectId: String(row.subject_id),
  topicId: String(row.topic_id),
  roadmapId: String(row.roadmap_id),
  prompt: String(row.q),
  options: parseJsonObject(row.o),
  answer: String(row.a),
  explanation: toNullableString(row.e),
  difficulty: toDifficulty(row.l),
  isActive: toBooleanFlag(row.is_active),
});

const toResult = (row: Row): QuizResult => ({
  id: String(row.id),
  userId: String(row.user_id),
  platformId: String(row.platform_id),
  subjectId: String(row.subject_id),
  topicId: String(row.topic_id),
  roadmapId: String(row.roadmap_id),
  level: toDifficulty(row.level),
  responses: parseResponses(row.responses),
  mark: toNumber(row.mark),
  createdAt: String(row.created_at ?? new Date().toISOString()),
});

const runListQuery = async <T>(sql: string, args: InArgs, mapper: (row: Row) => T): Promise<T[]> => {
  await ensureQuizSchema();
  const client = getQuizClient();
  const result = await client.execute({ sql, args });
  return (result.rows ?? []).map(mapper);
};

const extractCount = (row: Row | undefined): number => {
  if (!row) return 0;
  const possibleKeys = ["count", "total", "COUNT(*)", "COUNT"];
  for (const key of possibleKeys) {
    if (key in row) {
      const value = row[key];
      const numeric = typeof value === "number" ? value : Number(value ?? 0);
      if (Number.isFinite(numeric)) {
        return numeric;
      }
    }
  }

  const fallback = Number(Object.values(row)[0] ?? 0);
  return Number.isFinite(fallback) ? fallback : 0;
};

const runCountQuery = async (sql: string, args: InArgs): Promise<number> => {
  await ensureQuizSchema();
  const client = getQuizClient();
  const result = await client.execute({ sql, args });
  const row = result.rows?.[0] as Row | undefined;
  return extractCount(row);
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

const runReturningMutation = async <T>(
  sql: string,
  args: InArgs,
  mapper: (row: Row) => T,
  errorMessage: string,
): Promise<T> => {
  await ensureQuizSchema();
  const client = getQuizClient();
  const result = await client.execute({ sql, args });
  const row = result.rows?.[0];
  if (!row) {
    throw new Error(errorMessage);
  }
  return mapper(row as Row);
};

const runDelete = async (sql: string, args: InArgs): Promise<boolean> => {
  await ensureQuizSchema();
  const client = getQuizClient();
  const result = await client.execute({ sql, args });
  return typeof result.rowsAffected === "number" ? result.rowsAffected > 0 : true;
};

type OperationKey = "insert" | "update" | "delete";

const requireOperation = (
  table: keyof typeof quizTableOperationMap,
  operation: OperationKey,
): string => {
  const tableOperations = quizTableOperationMap[table];
  const statement = tableOperations?.[operation];
  if (!statement) {
    throw new Error(`Missing ${String(operation)} statement for ${String(table)} table.`);
  }
  return statement;
};

const toNumericId = (value: number | string): number =>
  typeof value === "number" ? value : Number(value);

const buildFilterClause = (filters: Record<string, unknown> | undefined, columnMap: ColumnMap) => {
  const clauses: string[] = [];
  const args: unknown[] = [];

  if (!filters) {
    return { where: "", args };
  }

  for (const [key, rawValue] of Object.entries(filters)) {
    if (rawValue === undefined || rawValue === null) continue;
    const column = columnMap[key];
    if (!column) continue;

    if (typeof rawValue === "string" && rawValue.includes("%")) {
      clauses.push(`${column} LIKE ?`);
      args.push(rawValue);
    } else {
      const normalizedValue = typeof rawValue === "boolean" ? (rawValue ? 1 : 0) : rawValue;
      clauses.push(`${column} = ?`);
      args.push(normalizedValue);
    }
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return { where, args };
};

const resolveSortClause = (
  sort: SortOptions | undefined,
  columnMap: ColumnMap,
  defaultColumn: string,
  defaultDirection: "asc" | "desc" = "asc",
): string => {
  const requestedColumn = sort?.column ? columnMap[sort.column] : undefined;
  const column = requestedColumn ?? defaultColumn;
  const requestedDirection = sort?.direction?.toLowerCase() === "desc" ? "DESC" : "ASC";
  const direction = sort?.direction ? requestedDirection : defaultDirection.toUpperCase();
  return `${column} ${direction}`;
};

const runPaginatedQuery = async <T, F extends Record<string, unknown>>({
  table,
  columns,
  mapper,
  options = {},
  columnMap,
  defaultSort,
}: {
  table: string;
  columns: string;
  mapper: (row: Row) => T;
  options?: QueryOptions<F>;
  columnMap: ColumnMap;
  defaultSort: { column: string; direction?: "asc" | "desc" };
}): Promise<PaginatedResult<T>> => {
  const pagination = resolvePagination(options);
  const { where, args: filterArgs } = buildFilterClause(options.filters as Record<string, unknown> | undefined, columnMap);
  const sortClause = resolveSortClause(options.sort, columnMap, defaultSort.column, defaultSort.direction ?? "asc");

  const listSql = `
    SELECT ${columns}
    FROM ${table}
    ${where}
    ORDER BY ${sortClause}
    LIMIT ?
    OFFSET ?
  `;

  const listArgs = [...filterArgs, pagination.limit, pagination.offset] as InArgs;
  const countSql = `
    SELECT COUNT(*) as count
    FROM ${table}
    ${where}
  `;

  const [items, total] = await Promise.all([
    runListQuery(listSql, listArgs, mapper),
    runCountQuery(countSql, filterArgs as InArgs),
  ]);

  return { items, total, page: pagination.page, pageSize: pagination.pageSize };
};

// Column maps for filters + sorting
const platformColumns: ColumnMap = {
  id: "id",
  name: "name",
  description: "description",
  isActive: "is_active",
  icon: "icon",
  type: "type",
  qCount: "q_count",
};

const subjectColumns: ColumnMap = {
  id: "id",
  platformId: "platform_id",
  name: "name",
  isActive: "is_active",
  qCount: "q_count",
};

const topicColumns: ColumnMap = {
  id: "id",
  platformId: "platform_id",
  subjectId: "subject_id",
  name: "name",
  isActive: "is_active",
  qCount: "q_count",
};

const roadmapColumns: ColumnMap = {
  id: "id",
  platformId: "platform_id",
  subjectId: "subject_id",
  topicId: "topic_id",
  name: "name",
  isActive: "is_active",
  qCount: "q_count",
};

const questionColumns: ColumnMap = {
  id: "id",
  platformId: "platform_id",
  subjectId: "subject_id",
  topicId: "topic_id",
  roadmapId: "roadmap_id",
  prompt: "q",
  answer: "a",
  difficulty: "l",
  isActive: "is_active",
};

const resultColumns: ColumnMap = {
  id: "id",
  userId: "user_id",
  platformId: "platform_id",
  subjectId: "subject_id",
  topicId: "topic_id",
  roadmapId: "roadmap_id",
  level: "level",
  mark: "mark",
  createdAt: "created_at",
};

// Filter shapes
export type PlatformFilter = {
  id?: string | number;
  name?: string;
  description?: string;
  isActive?: boolean;
  icon?: string;
  type?: string;
  qCount?: number;
};

export type SubjectFilter = {
  id?: string | number;
  platformId?: string | number;
  name?: string;
  isActive?: boolean;
  qCount?: number;
};

export type TopicFilter = {
  id?: string | number;
  platformId?: string | number;
  subjectId?: string | number;
  name?: string;
  isActive?: boolean;
  qCount?: number;
};

export type RoadmapFilter = {
  id?: string | number;
  platformId?: string | number;
  subjectId?: string | number;
  topicId?: string | number;
  name?: string;
  isActive?: boolean;
  qCount?: number;
};

export type QuestionFilter = {
  id?: string | number;
  platformId?: string | number;
  subjectId?: string | number;
  topicId?: string | number;
  roadmapId?: string | number;
  difficulty?: QuizDifficulty;
  isActive?: boolean;
};

export type ResultFilter = {
  id?: string | number;
  userId?: string;
  platformId?: string | number;
  subjectId?: string | number;
  topicId?: string | number;
  roadmapId?: string | number;
  level?: QuizDifficulty;
};

type WithIdentifier = { id: number | string };

export type CreatePlatformInput = {
  name: string;
  description?: string | null;
  isActive?: boolean;
  icon: string;
  type?: string | null;
  qCount?: number;
};

export type UpdatePlatformInput = Partial<CreatePlatformInput> & WithIdentifier;

export type CreateSubjectInput = {
  id: number;
  platformId: number | string;
  name: string;
  isActive?: boolean;
  qCount?: number;
};

export type UpdateSubjectInput = Partial<CreateSubjectInput> & WithIdentifier;

export type CreateTopicInput = {
  id: number;
  platformId: number | string;
  subjectId: number | string;
  name: string;
  isActive?: boolean;
  qCount?: number;
};

export type UpdateTopicInput = Partial<CreateTopicInput> & WithIdentifier;

export type CreateRoadmapInput = {
  id: number;
  platformId: number | string;
  subjectId: number | string;
  topicId: number | string;
  name: string;
  isActive?: boolean;
  qCount?: number;
};

export type UpdateRoadmapInput = Partial<CreateRoadmapInput> & WithIdentifier;

export const listPlatforms = (options: QueryOptions<PlatformFilter> = {}) =>
  runPaginatedQuery<QuizPlatform, PlatformFilter>({
    table: "platforms",
    columns: "id, name, description, is_active, icon, type, q_count",
    mapper: toPlatform,
    options,
    columnMap: platformColumns,
    defaultSort: { column: "name" },
  });

export const getPlatformById = async (platformId: string): Promise<QuizPlatform | null> =>
  fetchSingle(
    `
      SELECT id, name, description, is_active, icon, type, q_count
      FROM platforms
      WHERE id = ?
      LIMIT 1
    `,
    [platformId] as InArgs,
    toPlatform,
  );

export const createPlatform = async (input: CreatePlatformInput): Promise<QuizPlatform> =>
  runReturningMutation(
    requireOperation("platforms", "insert"),
    [
      input.name,
      input.description ?? null,
      toBooleanInt(input.isActive),
      input.icon,
      input.type ?? null,
      input.qCount ?? null,
    ] as InArgs,
    toPlatform,
    "Failed to create platform.",
  );

export const updatePlatform = async (input: UpdatePlatformInput): Promise<QuizPlatform> =>
  runReturningMutation(
    requireOperation("platforms", "update"),
    [
      input.name ?? null,
      input.description ?? null,
      toBooleanInt(input.isActive),
      input.icon ?? null,
      input.type ?? null,
      input.qCount ?? null,
      input.id,
    ] as InArgs,
    toPlatform,
    "Failed to update platform.",
  );

export const deletePlatform = async (platformId: number | string): Promise<boolean> =>
  runDelete(requireOperation("platforms", "delete"), [platformId] as InArgs);

export const listSubjects = (options: QueryOptions<SubjectFilter> = {}) =>
  runPaginatedQuery<QuizSubject, SubjectFilter>({
    table: "subjects",
    columns: "id, platform_id, name, is_active, q_count",
    mapper: toSubject,
    options,
    columnMap: subjectColumns,
    defaultSort: { column: "name" },
  });

export const getSubjectsByPlatformId = async (platformId: string): Promise<QuizSubject[]> =>
  runListQuery(
    `
      SELECT id, platform_id, name, is_active, q_count
      FROM subjects
      WHERE platform_id = ?
      ORDER BY name
    `,
    [platformId] as InArgs,
    toSubject,
  );

export const getSubjectById = async (subjectId: string): Promise<QuizSubject | null> =>
  fetchSingle(
    `
      SELECT id, platform_id, name, is_active, q_count
      FROM subjects
      WHERE id = ?
      LIMIT 1
    `,
    [subjectId] as InArgs,
    toSubject,
  );

export const createSubject = async (input: CreateSubjectInput): Promise<QuizSubject> =>
  runReturningMutation(
    requireOperation("subjects", "insert"),
    [
      toNumericId(input.id),
      toNumericId(input.platformId),
      input.name,
      toBooleanInt(input.isActive),
      input.qCount ?? null,
    ] as InArgs,
    toSubject,
    "Failed to create subject.",
  );

export const updateSubject = async (input: UpdateSubjectInput): Promise<QuizSubject> =>
  runReturningMutation(
    requireOperation("subjects", "update"),
    [
      input.platformId !== undefined ? toNumericId(input.platformId) : null,
      input.name ?? null,
      toBooleanInt(input.isActive),
      input.qCount ?? null,
      toNumericId(input.id),
    ] as InArgs,
    toSubject,
    "Failed to update subject.",
  );

export const deleteSubject = async (subjectId: number | string): Promise<boolean> =>
  runDelete(requireOperation("subjects", "delete"), [subjectId] as InArgs);

export const listTopics = (options: QueryOptions<TopicFilter> = {}) =>
  runPaginatedQuery<QuizTopic, TopicFilter>({
    table: "topics",
    columns: "id, platform_id, subject_id, name, is_active, q_count",
    mapper: toTopic,
    options,
    columnMap: topicColumns,
    defaultSort: { column: "name" },
  });

export const getTopicsBySubjectId = async (subjectId: string): Promise<QuizTopic[]> =>
  runListQuery(
    `
      SELECT id, platform_id, subject_id, name, is_active, q_count
      FROM topics
      WHERE subject_id = ?
      ORDER BY name
    `,
    [subjectId] as InArgs,
    toTopic,
  );

export const getTopicById = async (topicId: string): Promise<QuizTopic | null> =>
  fetchSingle(
    `
      SELECT id, platform_id, subject_id, name, is_active, q_count
      FROM topics
      WHERE id = ?
      LIMIT 1
    `,
    [topicId] as InArgs,
    toTopic,
  );

export const createTopic = async (input: CreateTopicInput): Promise<QuizTopic> =>
  runReturningMutation(
    requireOperation("topics", "insert"),
    [
      toNumericId(input.id),
      toNumericId(input.platformId),
      toNumericId(input.subjectId),
      input.name,
      toBooleanInt(input.isActive),
      input.qCount ?? null,
    ] as InArgs,
    toTopic,
    "Failed to create topic.",
  );

export const updateTopic = async (input: UpdateTopicInput): Promise<QuizTopic> =>
  runReturningMutation(
    requireOperation("topics", "update"),
    [
      input.platformId !== undefined ? toNumericId(input.platformId) : null,
      input.subjectId !== undefined ? toNumericId(input.subjectId) : null,
      input.name ?? null,
      toBooleanInt(input.isActive),
      input.qCount ?? null,
      toNumericId(input.id),
    ] as InArgs,
    toTopic,
    "Failed to update topic.",
  );

export const deleteTopic = async (topicId: number | string): Promise<boolean> =>
  runDelete(requireOperation("topics", "delete"), [topicId] as InArgs);

export const listRoadmaps = (options: QueryOptions<RoadmapFilter> = {}) =>
  runPaginatedQuery<QuizRoadmap, RoadmapFilter>({
    table: "roadmaps",
    columns: "id, platform_id, subject_id, topic_id, name, is_active, q_count",
    mapper: toRoadmap,
    options,
    columnMap: roadmapColumns,
    defaultSort: { column: "name" },
  });

export const getRoadmapById = async (roadmapId: string): Promise<QuizRoadmap | null> =>
  fetchSingle(
    `
      SELECT id, platform_id, subject_id, topic_id, name, is_active, q_count
      FROM roadmaps
      WHERE id = ?
      LIMIT 1
    `,
    [roadmapId] as InArgs,
    toRoadmap,
  );

export const createRoadmap = async (input: CreateRoadmapInput): Promise<QuizRoadmap> =>
  runReturningMutation(
    requireOperation("roadmaps", "insert"),
    [
      toNumericId(input.id),
      toNumericId(input.platformId),
      toNumericId(input.subjectId),
      toNumericId(input.topicId),
      input.name,
      toBooleanInt(input.isActive),
      input.qCount ?? null,
    ] as InArgs,
    toRoadmap,
    "Failed to create roadmap.",
  );

export const updateRoadmap = async (input: UpdateRoadmapInput): Promise<QuizRoadmap> =>
  runReturningMutation(
    requireOperation("roadmaps", "update"),
    [
      input.platformId !== undefined ? toNumericId(input.platformId) : null,
      input.subjectId !== undefined ? toNumericId(input.subjectId) : null,
      input.topicId !== undefined ? toNumericId(input.topicId) : null,
      input.name ?? null,
      toBooleanInt(input.isActive),
      input.qCount ?? null,
      toNumericId(input.id),
    ] as InArgs,
    toRoadmap,
    "Failed to update roadmap.",
  );

export const deleteRoadmap = async (roadmapId: number | string): Promise<boolean> =>
  runDelete(requireOperation("roadmaps", "delete"), [roadmapId] as InArgs);

export const listQuestions = (options: QueryOptions<QuestionFilter> = {}) =>
  runPaginatedQuery<QuizQuestion, QuestionFilter>({
    table: "questions",
    columns: "id, platform_id, subject_id, topic_id, roadmap_id, q, o, a, e, l, is_active",
    mapper: toQuestion,
    options,
    columnMap: questionColumns,
    defaultSort: { column: "id" },
  });

export const getQuestionById = async (questionId: string): Promise<QuizQuestion | null> =>
  fetchSingle(
    `
      SELECT id, platform_id, subject_id, topic_id, roadmap_id, q, o, a, e, l, is_active
      FROM questions
      WHERE id = ?
      LIMIT 1
    `,
    [questionId] as InArgs,
    toQuestion,
  );

export const listResults = (options: QueryOptions<ResultFilter> = {}) =>
  runPaginatedQuery<QuizResult, ResultFilter>({
    table: "results",
    columns: "id, user_id, platform_id, subject_id, topic_id, roadmap_id, level, responses, mark, created_at",
    mapper: toResult,
    options,
    columnMap: resultColumns,
    defaultSort: { column: "created_at", direction: "desc" },
  });

export const getResultById = async (resultId: string): Promise<QuizResult | null> =>
  fetchSingle(
    `
      SELECT id, user_id, platform_id, subject_id, topic_id, roadmap_id, level, responses, mark, created_at
      FROM results
      WHERE id = ?
      LIMIT 1
    `,
    [resultId] as InArgs,
    toResult,
  );
