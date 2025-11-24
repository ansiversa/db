# Quiz Child Database (quizdb)

## Purpose and scope
quizdb stores the quiz catalog, questions, and user result history for the Quiz mini app. All access goes through `@ansiversa/db` helpers so Core API endpoints can work without direct SQL and web/admin apps never touch the DB.

## Schema
The schema lives in `src/core/db/quiz/tables.ts` and is materialized by `ensureQuizSchema()`. Six tables exist, each with indexes and CRUD statements where appropriate:

- **platforms**: AUTOINCREMENT `id`, name, description, `is_active` (int flag), icon, optional type, `q_count`, plus INSERT/UPDATE/DELETE statements for catalog management.【F:src/core/db/quiz/tables.ts†L11-L48】
- **subjects**: numeric `id`, `platform_id` FK, name, `is_active`, `q_count`, with an index on `platform_id` and CRUD statements.【F:src/core/db/quiz/tables.ts†L49-L89】
- **topics**: numeric `id`, `platform_id` and `subject_id` FKs, name, `is_active`, `q_count`, indexes on both parents, and CRUD statements.【F:src/core/db/quiz/tables.ts†L90-L145】
- **roadmaps**: numeric `id`, `platform_id`, `subject_id`, `topic_id` FKs, name, `is_active`, `q_count`, indexed on each foreign key and fully CRUD-enabled.【F:src/core/db/quiz/tables.ts†L146-L203】
- **questions**: AUTOINCREMENT `id`, platform/subject/topic/roadmap FKs, `q` prompt, `o` JSON options, `a` answer, `e` explanation, difficulty `l` with `CHECK (E|M|D)`, `is_active` flag, indexes across hierarchy columns, and CRUD statements for authoring content.【F:src/core/db/quiz/tables.ts†L204-L264】
- **results**: AUTOINCREMENT `id`, `user_id`, platform hierarchy FKs, difficulty level check, serialized `responses` JSON, numeric `mark`, timestamp, indexes across user/hierarchy columns, and CRUD statements for inserting/updating/deleting quiz attempts.【F:src/core/db/quiz/tables.ts†L265-L336】

Table and index statements are exposed as arrays for initialization, and the operation map exposes per-table SQL for mutations.【F:src/core/db/quiz/tables.ts†L338-L349】

## Initialization flow
`ensureQuizSchema()` executes every quiz table and index statement once per process, caching completion until `resetQuizSchemaCache()` is called (used in tests). It always runs against the configured quiz client from `getQuizClient()`.【F:src/apps/quiz/schema.ts†L1-L24】

## Catalog helpers
`src/apps/quiz/catalog.ts` centralizes typed CRUD and listing utilities. Key behaviors:

- Pagination/sorting/filtering utilities normalize page sizes, translate filter keys to column names, and dynamically build WHERE/ORDER BY clauses for list endpoints.【F:src/apps/quiz/catalog.ts†L19-L358】
- Mappers translate raw rows into typed models with proper boolean/number/difficulty handling and JSON parsing for options/responses.【F:src/apps/quiz/catalog.ts†L17-L191】
- Per-table operations (platforms, subjects, topics, roadmaps) wrap the CRUD SQL from the operation map and return typed objects; deletes return booleans.【F:src/apps/quiz/catalog.ts†L360-L770】
- Question and result list/detail helpers expose filters by platform/subject/topic/roadmap/difficulty and order results by creation time by default.【F:src/apps/quiz/catalog.ts†L771-L813】

## Question utilities
`src/apps/quiz/questions.ts` provides fetchers for random or targeted question sets with active-state and hierarchy filters, using the schema initialization guard and typed mapping used in catalog queries.【F:src/apps/quiz/questions.ts†L1-L78】

## Results helpers
`src/apps/quiz/results.ts` handles inserting quiz results and retrieving them by ID or user/history filters, serializing/deserializing response arrays and using the shared result mapper.【F:src/apps/quiz/results.ts†L1-L98】

## Configuration and connections
The quiz client is resolved from the `apps.quiz` entry in the shared config; `loadEnvConfig()` loads `ANSIVERSA_QUIZ_DB_URL` (plus `TURSO_AUTH_TOKEN` by default) when `apps` includes `"quiz"`. This keeps quizdb connection details aligned with the parent database configuration pattern.【F:src/config/env.ts†L1-L44】
