# Ansiversa DB Overview

This package provides shared TypeScript helpers for connecting to Ansiversa's Turso/libSQL databases. It centralizes configuration for the parent/core database and child mini-app databases (currently the quiz app), exposes typed clients for each database, and includes helpers for schema bootstrapping and common queries.

## Configuration flow
- `initAnsiversaDb(config)` stores a global `AnsiversaDbConfig` with connection info for the core DB and any mini-app DBs, while `getDbConfig`, `hasDbConfig`, and `resetDbConfig` manage the cached configuration state.
- `loadEnvConfig` builds a configuration object from environment variables, defaulting to `ANSIVERSA_CORE_DB_URL` and `TURSO_AUTH_TOKEN` for the core DB and deriving per-app URLs such as `ANSIVERSA_QUIZ_DB_URL`. Custom env-var names and per-app auth tokens are supported via options.

## Core database helpers
- `getCoreClient` lazily creates a libSQL client for the core database using the active configuration; `resetCoreClient` clears the cached client.
- `ensureCoreSchema` runs table and index creation statements for the core tables and then caches the initialization flag; `resetCoreSchemaCache` clears the flag for tests.
- User helpers: `getUserById`, `getUserByEmail`, `createUser`, and `getOrCreateUserByEmail` fetch or insert `User` records, mapping DB rows to typed objects.
- Subscription helpers: `getSubscriptionsForUser`, `getActiveSubscriptionForUser`, `createSubscription`, and `updateSubscriptionStatus` manage `Subscription` rows with status filtering and update support.
- Core schema definitions include `users` and `subscriptions` tables with associated indexes and constraints.

## Quiz mini-app
- `getQuizClient` resolves the quiz DB connection from `apps.quiz` in the configuration, throwing if missing; `resetQuizClient` clears the cache.
- `ensureQuizSchema` creates quiz tables and indexes on first use; `resetQuizSchemaCache` resets the initialization flag.
- Catalog helpers support listing and fetching platforms, subjects, topics, roadmaps, questions, and results with pagination, filtering, sorting, and type-safe mapping utilities.
- Question helpers fetch random active questions globally or by roadmap, converting stored JSON fields and difficulty codes into typed `QuizQuestion` objects.
- Result helpers insert quiz results with serialized response arrays and query results by ID or filters (including user-scoped queries).
- Quiz schema definitions cover platforms, subjects, topics, roadmaps, questions, and results tables, including standard CRUD SQL snippets for many tables.

## Types and exports
- Core types include `User` and `Subscription` (with `SubscriptionStatus` union), while quiz types cover platforms, subjects, topics, roadmaps, questions, quiz results, and related enums/inputs.
- The package entrypoint re-exports configuration helpers, core helpers (`Core` namespace), app helpers (`Apps` namespace, currently `Quiz`), schema table definitions, and all shared types.

## Usage example
Initialize the package during server startup, optionally loading configuration from environment variables, and then call the typed helpers for the desired database.

```ts
import { initAnsiversaDb, loadEnvConfig, Core, Apps } from "@ansiversa/db";

initAnsiversaDb(loadEnvConfig({ apps: ["quiz"] }));

const maybeUser = await Core.CoreUsers.getUserByEmail("user@example.com");
const questions = await Apps.Quiz.QuizQuestions.getRandomQuestionsForUser(maybeUser!.id, 5);
```
