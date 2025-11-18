# Ansiversa DB Developer Guide

This document summarizes the public surface of the `@ansiversa/db` package and shows how to use each exported helper when wiring servers to the Ansiversa databases.

## Initialization and configuration

Initialize the package once at process start and share the resulting configuration across modules. The helpers live under `src/config` and are re-exported from the package root for convenience.

### `initAnsiversaDb(config: AnsiversaDbConfig): AnsiversaDbConfig`
Sets the active database configuration and returns it. Call this before any client or query helper that needs configuration. The configuration includes a required `core` connection plus optional `apps` entries keyed by app name.

```ts
import { initAnsiversaDb } from "@ansiversa/db";
import { type AnsiversaDbConfig } from "@ansiversa/db";

initAnsiversaDb({
  core: { url: process.env.ANSIVERSA_CORE_DB_URL!, authToken: process.env.TURSO_AUTH_TOKEN! },
  apps: {
    quiz: { url: process.env.ANSIVERSA_QUIZ_DB_URL!, authToken: process.env.TURSO_AUTH_TOKEN! },
  },
});
```

### `getDbConfig(): AnsiversaDbConfig`
Returns the active configuration. Throws if initialization has not happened, so call it only after `initAnsiversaDb` or guard with `hasDbConfig`.

### `hasDbConfig(): boolean`
Returns `true` when configuration has been initialized. Useful for tests or defensive checks before attempting to open clients.

### `resetDbConfig(): void`
Clears any cached configuration. Intended for tests that need isolation between cases.

### `loadEnvConfig(options?: LoadEnvConfigOptions): AnsiversaDbConfig`
Builds an `AnsiversaDbConfig` by reading environment variables. Use when you want standardized configuration names:

- Core DB URL defaults to `ANSIVERSA_CORE_DB_URL`; override with `coreUrlVar`.
- Core auth token defaults to `TURSO_AUTH_TOKEN`; override with `coreAuthTokenVar`.
- App URLs default to `ANSIVERSA_<APP>_DB_URL` (customizable via `appUrlVar`).
- App auth tokens default to the core auth token unless overridden via `defaultAuthTokenVar` or `appAuthTokenVars`.

```ts
import { initAnsiversaDb, loadEnvConfig } from "@ansiversa/db";

initAnsiversaDb(
  loadEnvConfig({
    apps: ["quiz"], // set up quiz DB connection using ANSIVERSA_QUIZ_DB_URL
    coreUrlVar: "CUSTOM_CORE_URL", // optional overrides
  }),
);
```

## Core database helpers

The `Core` namespace wraps access to the parent database.

### `getCoreClient(): Client`
Creates (lazily) and returns a shared `@libsql/client` instance using the core configuration. Subsequent calls reuse the same client, so you can call it in each helper without worrying about connection churn.

### `resetCoreClient(): void`
Clears the cached client so tests can create fresh instances after updating configuration.

### `CoreUsers.getUserById(userId: string): Promise<User | null>`
Fetches a user by ID from the core `users` table. Returns `null` when no record exists.

```ts
import { Core } from "@ansiversa/db";

const maybeUser = await Core.CoreUsers.getUserById("user-123");
if (!maybeUser) {
  // handle missing user
}
```

### `CoreUsers.getUserByEmail(email: string): Promise<User | null>`
Fetches a user by email. Returns `null` when no record is found.

```ts
const maybeUser = await Core.CoreUsers.getUserByEmail("user@example.com");
```

## Quiz mini-app helpers

The `Apps.Quiz` namespace provides a dedicated client and query helpers for the quiz mini-app database.

### `getQuizClient(): Client`
Creates (lazily) and returns the quiz database client. Throws an error if the quiz configuration was not provided under `apps.quiz` during initialization.

### `resetQuizClient(): void`
Clears the cached quiz client. Use in tests that reconfigure the database between runs.

### `QuizQuestions.getRandomQuestionsForUser(userId: string, limit: number): Promise<QuizQuestion[]>`
Returns up to `limit` random quiz questions that are either global (`user_id IS NULL`) or assigned to the provided user. The limit is clamped to the range 1–100 to avoid excessive queries.

```ts
import { Apps } from "@ansiversa/db";

const questions = await Apps.Quiz.QuizQuestions.getRandomQuestionsForUser("user-123", 5);
const [first] = questions;
```

### `QuizResults.saveQuizResult(input: SaveQuizResultInput): Promise<QuizResult>`
Inserts a quiz result row with the provided user/question IDs, correctness flag, and optional JSON metadata. Returns the inserted record as a strongly typed object. Throws if insertion fails.

```ts
const result = await Apps.Quiz.QuizResults.saveQuizResult({
  userId: "user-123",
  questionId: "question-456",
  isCorrect: true,
  metadata: { attempt: 1 },
});
```

### Quiz catalog helpers

Helpers under `Apps.Quiz.Catalog` read from the quiz catalog tables (platforms, subjects, topics, levels, quizzes). Each helper returns strongly typed objects that mirror the table columns.

- `listPlatforms(): Promise<QuizPlatform[]>`
- `getPlatformById(platformId: string): Promise<QuizPlatform | null>`
- `listSubjects(options?: { platformId?: string }): Promise<QuizSubject[]>`
- `getSubjectsByPlatformId(platformId: string): Promise<QuizSubject[]>`
- `getSubjectById(subjectId: string): Promise<QuizSubject | null>`
- `listTopics(options?: { subjectId?: string }): Promise<QuizTopic[]>`
- `getTopicsBySubjectId(subjectId: string): Promise<QuizTopic[]>`
- `getTopicById(topicId: string): Promise<QuizTopic | null>`
- `listLevels(options?: { topicId?: string }): Promise<QuizLevel[]>`
- `getLevelsByTopicId(topicId: string): Promise<QuizLevel[]>`
- `getLevelById(levelId: string): Promise<QuizLevel | null>`
- `listQuizzes(options?: { levelId?: string }): Promise<QuizEntry[]>`
- `getQuizzesByLevelId(levelId: string): Promise<QuizEntry[]>`
- `getQuizById(quizId: string): Promise<QuizEntry | null>`

```ts
import { Apps } from "@ansiversa/db";

const subjectList = await Apps.Quiz.Catalog.getSubjectsByPlatformId("platform-1");
const topicList = await Apps.Quiz.Catalog.getTopicsBySubjectId("subject-2");
const levelList = await Apps.Quiz.Catalog.getLevelsByTopicId("topic-3");
const quizList = await Apps.Quiz.Catalog.getQuizzesByLevelId("level-4");
```

## Quiz schema helpers

The `QuizTables` exports describe the schema for the quiz mini-app. These are useful for migrations or tests that need to bootstrap tables.

- `quizTableDefinitions`: Array of table definitions including the create statement, optional indexes, and optional CRUD templates.
- `quizTableStatements`: Array of normalized `CREATE TABLE IF NOT EXISTS` statements for all tables.
- `quizIndexStatements`: Array of index creation statements.
- `quizTableOperationMap`: Map keyed by table name containing SQL templates for inserts, updates, and deletes (when provided).

## Shared types

All domain types live under `src/types` and are re-exported from the package root for easy imports:

- `User`, `Subscription`, and `SubscriptionStatus` represent entities from the core database.
- `QuizQuestion`, `QuizResult`, and `SaveQuizResultInput` describe quiz domain objects.

```ts
import { User, QuizResult } from "@ansiversa/db";
```

Use these types when authoring new helpers so the compiled package stays consistent.
