# Ansiversa Core DB (Parent â€“ `ansiversadb`) â€“ Tables & Methods

**Author:** Astra  
**Target DB:** `ansiversadb` (parent/core DB in Turso group `ansiversa-group`)  
**Audience:** Codex + Ansiversa Core API maintainers  

---

## 0. Architecture Clarification (Very Important)

- The **`@ansiversa/db` NPM package is used _only_ inside the Core repo**  
  (the Astro API project: `core.ansiversa.com`).
- **Web** (`ansiversa.com`) and **Admin** (`admin.ansiversa.com`) do **not** talk to the DB directly.  
  They only consume data via **HTTP API endpoints** exposed by the Core project.
- The Core project uses `@ansiversa/db` internally to:
  - Connect to `ansiversadb` (parent core DB).
  - Connect to child DBs such as `quizdb`.
  - Implement all DB reads/writes behind clean API routes.

So the picture is:

```text
[ Web / Admin / Other Apps ]
          â¬‡ HTTP (REST/API)
      [ Core API Project ]
          â¬‡ uses
      [ @ansiversa/db ]
          â¬‡ connects
[ ansiversadb (parent) + quizdb (child) ]
```

This document finalizes the **parent DB schema** (`ansiversadb`) and the **helper methods**
to be implemented inside `@ansiversa/db`, so that Core can build stable APIs on top.

---

## 1. Scope of Core DB (Phase 1)

Core DB (`ansiversadb`) will hold **global data** needed by all miniâ€‘apps:

1. `users` â€“ global Ansiversa users (one row per person).
2. `subscriptions` â€“ which plan each user is on and whether it is active.

Future tables (later phases) might include:

- `invoices` / `payments`
- `user_sessions`
- `audit_logs`
- `feature_flags` / entitlements

For this phase, Codex must focus only on `users` and `subscriptions`.

---

## 2. Tables

### 2.1 `users` table

**Purpose:**  
Global user record for all Ansiversa apps.  
This is the **source-of-truth `userId`** referenced by child DBs like `quizdb`.

**Columns:**

| Column       | Type | Notes                                           |
|--------------|------|-------------------------------------------------|
| `id`         | TEXT | Primary key, stable across all apps (e.g. UUID) |
| `email`      | TEXT | Unique email address                            |
| `name`       | TEXT | Optional display name                           |
| `created_at` | TEXT | ISO timestamp when the user was created         |
| `updated_at` | TEXT | ISO timestamp when last updated                 |

**Constraints & Indexes:**

- Primary key on `id`.
- Unique index on `email`.

**Suggested SQLite / Turso DDL:**

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

This matches the existing TypeScript type in `src/types/core.ts`:

```ts
export interface User {
  id: string;
  email: string;
  name?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
```

> âœ… `User` is already used in `src/core/users.ts`.

---

### 2.2 `subscriptions` table

**Purpose:**  
Track which plan a user is on and whether their subscription is active, canceled, etc.

**Columns:**

| Column               | Type | Notes                                                                 |
|----------------------|------|-----------------------------------------------------------------------|
| `id`                 | TEXT | Primary key (e.g. UUID or external billing ID)                        |
| `user_id`            | TEXT | FK â†’ `users.id`                                                       |
| `plan`               | TEXT | Plan identifier (e.g. `free`, `pro_monthly`, `pro_yearly`)           |
| `status`             | TEXT | `"active"`, `"canceled"`, `"trialing"`, `"past_due"`                  |
| `current_period_end` | TEXT | ISO timestamp when current billing period ends (optional)            |
| `created_at`         | TEXT | ISO timestamp when row was created                                    |
| `updated_at`         | TEXT | ISO timestamp when row was last updated                               |

**Constraints & Indexes:**

- Primary key on `id`.
- `user_id` references `users(id)` with `ON DELETE CASCADE`.
- Index on `user_id` for quick lookups by user.
- Index on `status` for admin/reporting queries.

**Suggested SQLite / Turso DDL:**

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'trialing', 'past_due')),
  current_period_end TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
```

This matches the existing TypeScript type in `src/types/core.ts`:

```ts
export type SubscriptionStatus = "active" | "canceled" | "trialing" | "past_due";

export interface Subscription {
  id: string;
  userId: string;
  plan: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: string;
}
```

> Note: `created_at` and `updated_at` can be added to the TS type later as
> optional fields (`createdAt?`, `updatedAt?`) if needed by APIs.

---

## 3. Core DB Table Definition Module (like quiz tables)

Mirror the style of `src/core/db/quiz/tables.ts`, but for core DB.

### 3.1 New file

Create:

```text
src/core/db/core/tables.ts
```

### 3.2 Types

```ts
export interface CoreTableDefinition {
  name: string;
  description: string;
  createStatement: string;
  indexes?: string[];
}

const normalize = (statement: string): string =>
  statement.trim().replace(/\s+\n/g, "\n");
```

### 3.3 Definitions

```ts
export const coreTableDefinitions: CoreTableDefinition[] = [
  {
    name: "users",
    description: "Global Ansiversa users (parent DB).",
    createStatement: normalize(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT
      );
    `),
    indexes: [
      normalize(\`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);\`),
    ],
  },
  {
    name: "subscriptions",
    description: "User subscriptions and plan status.",
    createStatement: normalize(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        plan TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('active','canceled','trialing','past_due')),
        current_period_end TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `),
    indexes: [
      normalize(\`CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);\`),
      normalize(\`CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);\`),
    ],
  },
];

export const coreTableStatements = coreTableDefinitions.map(
  (definition) => definition.createStatement,
);

export const coreIndexStatements = coreTableDefinitions.flatMap(
  (definition) => definition.indexes ?? [],
);
```

### 3.4 Optional export

In `src/index.ts`, optionally re-export as:

```ts
export * as CoreTables from "./core/db/core/tables.js";
```

This is **only for Core repo** (for migrations/tests), not for Web/Admin.

---

## 4. Core DB Schema Initialization Helper

Like `src/apps/quiz/schema.ts`, but for the parent DB.

### 4.1 New file

```text
src/core/schema.ts
```

### 4.2 Implementation

```ts
import { getCoreClient } from "./client.js";
import { coreIndexStatements, coreTableStatements } from "./db/core/tables.js";

let initialized = false;

export const ensureCoreSchema = async (): Promise<void> => {
  if (initialized) return;

  const client = getCoreClient();
  for (const statement of coreTableStatements) {
    await client.execute(statement);
  }
  for (const statement of coreIndexStatements) {
    await client.execute(statement);
  }

  initialized = true;
};

export const resetCoreSchemaCache = (): void => {
  initialized = false;
};
```

The **Core API project** can choose to:

- Call `ensureCoreSchema()` on startup, or
- Let the first DB call lazily set up the schema (good enough for dev).

---

## 5. Core Helper Methods â€“ Users (`src/core/users.ts`)

This module is already present and uses the `User` type.  
We will:

1. Ensure schema is initialized.
2. Add create helpers useful for the Core API.

### 5.1 Imports

At top of `src/core/users.ts`:

```ts
import { getCoreClient } from "./client.js";
import { ensureCoreSchema } from "./schema.js";
import { User } from "../types/core.js";
```

### 5.2 Existing mapper (keep)

```ts
const toUser = (row: Record<string, unknown>): User => ({
  id: String(row.id),
  email: String(row.email),
  name: (row.name as string | null | undefined) ?? null,
  createdAt: (row.created_at as string | undefined) ?? (row.createdAt as string | undefined),
  updatedAt: (row.updated_at as string | undefined) ?? (row.updatedAt as string | undefined),
});
```

### 5.3 Methods

```ts
export const getUserById = async (userId: string): Promise<User | null> => {
  await ensureCoreSchema();
  const client = getCoreClient();
  const result = await client.execute({
    sql: `SELECT id, email, name, created_at, updated_at FROM users WHERE id = ? LIMIT 1`,
    args: [userId],
  });
  const row = result.rows?.[0];
  return row ? toUser(row as Record<string, unknown>) : null;
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  await ensureCoreSchema();
  const client = getCoreClient();
  const result = await client.execute({
    sql: `SELECT id, email, name, created_at, updated_at FROM users WHERE email = ? LIMIT 1`,
    args: [email],
  });
  const row = result.rows?.[0];
  return row ? toUser(row as Record<string, unknown>) : null;
};

export const createUser = async (input: {
  id: string;
  email: string;
  name?: string | null;
}): Promise<User> => {
  await ensureCoreSchema();
  const client = getCoreClient();
  const result = await client.execute({
    sql: `
      INSERT INTO users (id, email, name)
      VALUES (?, ?, ?)
      RETURNING id, email, name, created_at, updated_at
    `,
    args: [input.id, input.email, input.name ?? null],
  });
  const row = result.rows?.[0];
  if (!row) {
    throw new Error("Failed to insert user.");
  }
  return toUser(row as Record<string, unknown>);
};

export const getOrCreateUserByEmail = async (email: string, name?: string | null): Promise<User> => {
  const existing = await getUserByEmail(email);
  if (existing) return existing;

  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return createUser({ id, email, name: name ?? null });
};
```

> Core API endpoints (e.g. `/auth/callback`, `/user/profile`) will use these helpers.
> Web/Admin never import `@ansiversa/db` directly.

---

## 6. Core Helper Methods â€“ Subscriptions (`src/core/subscriptions.ts`)

Create a new module for subscription logic.

### 6.1 File

```text
src/core/subscriptions.ts
```

### 6.2 Mapper

```ts
import { getCoreClient } from "./client.js";
import { ensureCoreSchema } from "./schema.js";
import { Subscription, SubscriptionStatus } from "../types/core.js";

const toSubscription = (row: Record<string, unknown>): Subscription => ({
  id: String(row.id),
  userId: String(row.user_id),
  plan: String(row.plan),
  status: row.status as SubscriptionStatus,
  currentPeriodEnd:
    (row.current_period_end as string | undefined | null) ?? undefined,
});
```

### 6.3 Methods

```ts
export const getSubscriptionsForUser = async (userId: string): Promise<Subscription[]> => {
  await ensureCoreSchema();
  const client = getCoreClient();
  const result = await client.execute({
    sql: `
      SELECT id, user_id, plan, status, current_period_end
      FROM subscriptions
      WHERE user_id = ?
      ORDER BY created_at DESC
    `,
    args: [userId],
  });

  return (result.rows ?? []).map((row) => toSubscription(row as Record<string, unknown>));
};

export const getActiveSubscriptionForUser = async (
  userId: string,
): Promise<Subscription | null> => {
  await ensureCoreSchema();
  const client = getCoreClient();
  const result = await client.execute({
    sql: `
      SELECT id, user_id, plan, status, current_period_end
      FROM subscriptions
      WHERE user_id = ?
      AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `,
    args: [userId],
  });

  const row = result.rows?.[0];
  return row ? toSubscription(row as Record<string, unknown>) : null;
};

export const createSubscription = async (input: {
  id: string;
  userId: string;
  plan: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: string;
}): Promise<Subscription> => {
  await ensureCoreSchema();
  const client = getCoreClient();
  const result = await client.execute({
    sql: `
      INSERT INTO subscriptions (id, user_id, plan, status, current_period_end)
      VALUES (?, ?, ?, ?, ?)
      RETURNING id, user_id, plan, status, current_period_end
    `,
    args: [
      input.id,
      input.userId,
      input.plan,
      input.status,
      input.currentPeriodEnd ?? null,
    ],
  });

  const row = result.rows?.[0];
  if (!row) {
    throw new Error("Failed to insert subscription.");
  }
  return toSubscription(row as Record<string, unknown>);
};

export const updateSubscriptionStatus = async (input: {
  id: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: string;
}): Promise<Subscription | null> => {
  await ensureCoreSchema();
  const client = getCoreClient();
  const result = await client.execute({
    sql: `
      UPDATE subscriptions
      SET status = ?,
          current_period_end = COALESCE(?, current_period_end),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING id, user_id, plan, status, current_period_end
    `,
    args: [input.status, input.currentPeriodEnd ?? null, input.id],
  });

  const row = result.rows?.[0];
  return row ? toSubscription(row as Record<string, unknown>) : null;
};
```

### 6.4 Export from Core Index

Update `src/core/index.ts`:

```ts
export { getCoreClient, resetCoreClient } from "./client.js";
export * as CoreUsers from "./users.js";
export * as CoreSubscriptions from "./subscriptions.js";
```

Now the **Core API project only** will use:

```ts
import { Core } from "@ansiversa/db";

const user = await Core.CoreUsers.getOrCreateUserByEmail(email);
const sub = await Core.CoreSubscriptions.getActiveSubscriptionForUser(user.id);
```

Web/Admin will just call HTTP routes that wrap this logic.

---

## 7. How Child DBs Relate to `ansiversadb`

- Child DBs like `quizdb` always store `user_id` that comes from `ansiversadb.users.id`.
- They do not manage their own separate user table.
- The Core API:
  1. Resolves the user in `ansiversadb` (using CoreUsers helpers).
  2. Checks subscription if necessary (CoreSubscriptions).
  3. Passes the core `user.id` to `Apps.Quiz` helpers (already designed).

`@ansiversa/db` is the **internal data layer** for Core.  
Web/Admin never see itâ€”they only talk to Core over HTTP.

---

## 8. Final Checklist for Codex

1. **Tables (in Turso `ansiversadb`):**
   - [ ] Create `users` + `subscriptions` with DDL above.
   - [ ] Add indexes as specified.

2. **Core Table Module:**
   - [ ] Create `src/core/db/core/tables.ts` with `coreTableDefinitions`, `coreTableStatements`, `coreIndexStatements`.
   - [ ] Optionally export as `CoreTables` from `src/index.ts`.

3. **Core Schema Helper:**
   - [ ] Create `src/core/schema.ts` with `ensureCoreSchema()` and `resetCoreSchemaCache()`.

4. **Core Users:**
   - [ ] Update `src/core/users.ts` to call `ensureCoreSchema()`.
   - [ ] Implement `createUser` and `getOrCreateUserByEmail`.

5. **Core Subscriptions:**
   - [ ] Create `src/core/subscriptions.ts` with the methods above.
   - [ ] Export `CoreSubscriptions` from `src/core/index.ts`.

6. **Core API Usage (for the Core project, not this package):**
   - Core HTTP handlers should:
     - Use these helpers to read/write from `ansiversadb`.
     - Expose clean JSON APIs for Web/Admin apps.

Once Codex completes this spec, `ansiversadb` will be **finalized for Phase 1** and ready for your Core API to serve all miniâ€‘apps cleanly.
