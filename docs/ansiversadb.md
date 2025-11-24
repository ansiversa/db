# Ansiversa Parent Database (ansiversadb)

## Purpose and scope
ansiversadb is the parent database backing Core identity and subscription data. It is initialized and accessed through the shared `@ansiversa/db` package so web/admin layers do not talk to the database directly.

## Schema
The schema is defined in `src/core/db/core/tables.ts` and created by `ensureCoreSchema()`. Two tables are present:

- **users**: `id` (TEXT PK), `email` (TEXT UNIQUE NOT NULL), `name` (TEXT nullable), timestamps with `DEFAULT CURRENT_TIMESTAMP`, and an index on `email` for fast lookups.【F:src/core/db/core/tables.ts†L11-L47】
- **subscriptions**: integer `id` (AUTOINCREMENT PK), `user_id` (FK -> users with CASCADE), `plan` (TEXT NOT NULL), `status` with `CHECK (active|cancelled|expired)`, optional `period_start`/`period_end`, timestamps, plus indexes on `user_id` and `status`.【F:src/core/db/core/tables.ts†L29-L47】

All table creation and index statements are centralized so migrations run consistently across environments.【F:src/core/db/core/tables.ts†L51-L57】

## Initialization flow
`ensureCoreSchema()` runs the table and index statements once per process by caching an `initialized` flag; `resetCoreSchemaCache()` clears it for tests.【F:src/core/schema.ts†L1-L19】 Database clients come from `getCoreClient()`, which is wired via the package’s configuration bootstrap (see below).

## Data access helpers
Core helpers all enforce schema initialization before querying and return strongly typed objects defined in `src/types/core.ts`.

- **Users** (`src/core/users.ts`): `getUserById`, `getUserByEmail`, `createUser`, `getOrCreateUserByEmail`. Each maps DB rows to a `User` with normalized IDs/emails/names and timestamp fields.【F:src/core/users.ts†L1-L49】
- **Subscriptions** (`src/core/subscriptions.ts`): `getSubscriptionsForUser`, `getActiveSubscriptionForUser`, `createSubscription`, and `updateSubscriptionStatus`. Helpers enforce status typing, support optional period start/end, and preserve created/updated timestamps from the DB.【F:src/core/subscriptions.ts†L1-L76】【F:src/core/subscriptions.ts†L78-L122】

These helpers are the only supported way to read/write parent data; caller code should never compose raw SQL.

## Configuration and connection requirements
Use `loadEnvConfig()` to build the connection settings for the core database from environment variables. By default it requires `ANSIVERSA_CORE_DB_URL` and `TURSO_AUTH_TOKEN`, and it can be customized via optional parameter overrides. The same call can also hydrate child app configs (e.g., quiz) when needed.【F:src/config/env.ts†L1-L44】

Call `initAnsiversaDb(loadEnvConfig())` during service startup, then use `Core.CoreUsers` and `Core.CoreSubscriptions` helpers. Clients are cached internally so repeated calls share a single connection pool.
