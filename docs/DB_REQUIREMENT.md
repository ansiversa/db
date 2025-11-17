# Ansiversa DB Repository & NPM Package Plan

> This file explains **exactly** how we want to build the dedicated DB Git repository and NPM package for Ansiversa.  
> Codex: **do not improvise the architecture** â€“ follow this document step by step.

---

## 1. Goal of this repository

We want a **separate DB repository + NPM package** that:

1. Centralizes all database access for **all Ansiversa apps** (web, admin, api, miniâ€‘apps).
2. Supports our **Turso (libSQL) multiâ€‘database setup**:
   - **Parent/Core DB** = global Ansiversa data (auth, billing, subscriptions, etc.).
   - **Child DB per miniâ€‘app** = quiz, resume builder, flash cards, etc.
3. Hides lowâ€‘level DB client details and exposes **clean, safe, serverâ€‘only functions**.
4. Can be installed via `npm install` in any project as `@ansiversa/db` (or similar).
5. Is written in **TypeScript**, with simple, predictable structure so itâ€™s easy for Codex to extend.

Astro DB in the core app currently supports only a single DB.  
This repo is our **Option B**: a standalone DB package that talks directly to Turso/libSQL and can be used from any project.

---

## 2. Highâ€‘level architecture

### 2.1. Database layout (Turso)

We use Turso (libSQL) with **one group** and multiple databases:

- **Parent/Core DB** (example name: `ansiversa_core`)
  - Stores global data:
    - Users
    - Authentication data (sessions, tokens, etc.)
    - Billing & subscriptions
    - Maybe organizations / teams in future
  - Every user has a unique `user_id` here.

- **Child DB per miniâ€‘app** (examples):
  - `ansiversa_quiz`
  - `ansiversa_resume`
  - `ansiversa_flashcards`
  - `ansiversa_pricechecker`
  - etc.

Each child DB:

- Contains **only that miniâ€‘appâ€™s domain data**.
- Stores `user_id` (from the parent DB) in its tables so we can link back to the global user.

We **never** query *quiz data* from *resume DB* or vice versa.  
We only crossâ€‘link via the **parent/core DB**.

### 2.2. Relationship between apps and DB package

All apps (projects) will **import** this NPM package instead of each one creating its own DB client logic:

- `ansiversa.com` (web app)
- `admin.ansiversa.com` (admin dashboard)
- `api.ansiversa.com` (API server / Astro API project)
- Any new miniâ€‘apps

All DB queries go through **`@ansiversa/db`**.

---

## 3. Git repository & package naming

### 3.1. Repository

Create a **new GitHub repo**:

- Suggested name: `ansiversa-db`

This repo is **only** for:

- Shared DB client
- Schema types
- Query helpers
- Migrations (optional, future)
- Seed scripts (optional, future)

### 3.2. NPM package

Package name (examples):

- Scoped: `@ansiversa/db` **(preferred)**
- Or unscoped: `ansiversa-db`

We can publish either to:

- NPM (public or private)
- Or GitHub Packages

For now, just **design it as if it will be reused by multiple repos.**

---

## 4. Project structure

Inside the `ansiversa-db` repo we want something like this:

```txt
ansiversa-db/
  package.json
  tsconfig.json
  README.md  (this file or similar)
  src/
    index.ts            # main entry â€“ reâ€‘exports all public APIs
    config/
      env.ts            # central place to read env vars (but host app must provide values)
      types.ts          # shared config types
    core/               # parent/core DB helpers
      client.ts         # create client for parent/core DB
      auth.ts           # user + auth queries
      billing.ts        # subscription / billing queries
      users.ts          # user profile queries
    apps/               # perâ€‘miniâ€‘app helper modules
      quiz/
        client.ts       # create client for quiz DB
        questions.ts    # quizâ€‘related queries
        results.ts      # results, stats, etc.
      resume/
        client.ts       # client for resume DB
        resumes.ts      # resume data queries
      # future miniâ€‘apps...
    types/
      core.ts           # core DB entities (User, Subscription, etc.)
      quiz.ts           # quiz entities
      resume.ts         # resume entities
      # etc.
  scripts/
    # optional: migration scripts, seed scripts (future)
```

Codex must follow **this modular layout**:
- `core` = parent/global.
- `apps/<mini-app>` = miniâ€‘app DB logic.
- `types` = shared TS types.
- `config` = minimal setup helpers (no hardcoded secrets).

---

## 5. Environment & configuration

### 5.1. Host app responsibility

The **host app** (web, admin, api, etc.) is responsible for supplying **actual environment values**.  
The DB package should **not** have its own `.env` file checked in with real values.

The package should **expect** something like this from the caller:

```ts
// Example config interface
export interface AnsiversaDbConfig {
  core: {
    url: string;        // full Turso URL for core DB
    authToken: string;  // auth token for core DB
  };
  apps: {
    quiz?: {
      url: string;
      authToken: string;
    };
    resume?: {
      url: string;
      authToken: string;
    };
    // ...more miniâ€‘apps
  };
}
```

The host app will read `.env` and then pass these values into an `init` function inside the DB package.

### 5.2. Suggested env variable naming (in host apps)

Example `.env` of a host app (web/admin/api):

```bash
# Turso group / auth
TURSO_GROUP_URL=...
TURSO_AUTH_TOKEN=...

# Core DB
ANSIVERSA_CORE_DB_URL=...

# Miniâ€‘apps DBs
ANSIVERSA_QUIZ_DB_URL=...
ANSIVERSA_RESUME_DB_URL=...
# more miniâ€‘apps later...
```

**Codex**: Do *not* hardcode env names inside the DB package in a way that makes it unusable.  
We can provide a helper like `fromEnv()` but the **main init** should accept config explicitly.

---

## 6. Public API design (very important)

The package should expose a **small, clear API**.

### 6.1. Initialization

We want a central `initAnsiversaDb` function:

```ts
// src/index.ts (or src/config/env.ts)
import { AnsiversaDbConfig } from "./config/types";

let currentConfig: AnsiversaDbConfig | null = null;

export function initAnsiversaDb(config: AnsiversaDbConfig) {
  currentConfig = config;
}

export function getDbConfig(): AnsiversaDbConfig {
  if (!currentConfig) {
    throw new Error("Ansiversa DB is not initialized. Call initAnsiversaDb() first.");
  }
  return currentConfig;
}
```

**Codex:** Always make the caller initialize this once at server startup (or in a shared server module).

### 6.2. Core DB helpers

We need helpers for the **parent/core DB** (users, auth, billing). Examples:

```ts
// src/core/auth.ts
export async function getUserById(userId: string) { /* ... */ }

export async function getUserByEmail(email: string) { /* ... */ }

export async function createUser(data: CreateUserInput) { /* ... */ }

// src/core/billing.ts
export async function getActiveSubscriptionForUser(userId: string) { /* ... */ }
```

We will extend this over time, but the **pattern must be**:
- One module per concern (`auth.ts`, `billing.ts`, `users.ts`, etc.).
- All use a shared core DB client factory (`core/client.ts`).

### 6.3. Perâ€‘miniâ€‘app helpers

Each miniâ€‘app folder (`apps/quiz`, `apps/resume`, etc.) will have:

- `client.ts` â€“ DB client factory for that appâ€™s DB.
- Domain modules like `questions.ts`, `results.ts`, etc.

Example:

```ts
// src/apps/quiz/questions.ts
export async function getRandomQuestionsForUser(userId: string, limit: number) { /* ... */ }

export async function saveQuizResult(payload: SaveQuizResultInput) { /* ... */ }
```

**Important:** All miniâ€‘app queries must include **`user_id`** to keep data tied to the parent user.

### 6.4. Export surface (what index.ts should export)

`src/index.ts` should reâ€‘export **only the public API**:

```ts
export { initAnsiversaDb } from "./config/env";
export * as CoreAuth from "./core/auth";
export * as CoreBilling from "./core/billing";
export * as CoreUsers from "./core/users";

export * as QuizQuestions from "./apps/quiz/questions";
export * as QuizResults from "./apps/quiz/results";

// Later, add Resume, Flashcards, etc.
```

Codex: Do **not** export internal lowâ€‘level helpers unless we explicitly need them.

---

## 7. Security rules (do NOT break these)

This is critical:

1. **DB code must only run on the server.**
2. We **never** import `@ansiversa/db` inside **Alpine stores** running in the browser.
3. We **never** expose DB clients or tokens to the client.

### Safe usage patterns

- In Astro **serverâ€‘only** modules (`src/server/db.ts`, `astro:actions`, API routes).
- In Node services on the server side.

### Unsafe usage patterns (forbidden)

- Importing `@ansiversa/db` inside code that runs in the browser (for example directly in Alpine stores).
- Passing DB client objects to the client.

**Codex:** If you are writing frontâ€‘end code, you must call **Astro server actions / API routes** that internally use this DB package. Do not call DB functions directly from client code.

---

## 8. Usage examples in host apps

These are **patterns** only â€“ Codex should adapt them to the actual project structure.

### 8.1. Web / admin app (Astro + astro:actions)

```ts
// src/server/ansiversa-db.ts (web project)
import {
  initAnsiversaDb,
  QuizQuestions,
  CoreAuth,
} from "@ansiversa/db";

initAnsiversaDb({
  core: {
    url: process.env.ANSIVERSA_CORE_DB_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
  apps: {
    quiz: {
      url: process.env.ANSIVERSA_QUIZ_DB_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    },
  },
});

export { QuizQuestions, CoreAuth };
```

Then in an `astro:actions` file:

```ts
// src/actions/quiz.ts
import { defineAction } from "astro:actions";
import { QuizQuestions } from "../server/ansiversa-db";

export const getRandomQuestions = defineAction({
  // zod schema, etc.
  handler: async ({ userId, limit }) => {
    return await QuizQuestions.getRandomQuestionsForUser(userId, limit);
  },
});
```

**Important:** The `.astro` pages & Alpine components call the **action**, not the DB directly.

### 8.2. API project (api.ansiversa.com)

```ts
// src/server/ansiversa-db.ts
import { initAnsiversaDb } from "@ansiversa/db";

initAnsiversaDb({
  core: {
    url: process.env.ANSIVERSA_CORE_DB_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
  apps: {
    quiz: {
      url: process.env.ANSIVERSA_QUIZ_DB_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    },
    resume: {
      url: process.env.ANSIVERSA_RESUME_DB_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    },
  },
});
```

Then each API route can import the specific helpers it needs.

---

## 9. Implementation steps for Codex (checklist)

Codex: follow these steps **in order**.

1. **Create repo**
   - Initialize a new Git repo: `ansiversa-db`.
   - Add `package.json` with TypeScript, `module` type, etc.

2. **Set up TypeScript**
   - Add `tsconfig.json` for Node/ESM.
   - Target modern Node runtime compatible with our Astro projects.

3. **Add dependencies**
   - `@libsql/client` (Turso / libSQL client) or the official Turso client package.
   - Optionally add `zod` for validation later (not mandatory in phase 1).

4. **Create folder structure**
   - `src/config`, `src/core`, `src/apps`, `src/types`, `src/index.ts` as described above.

5. **Implement config & init**
   - Define `AnsiversaDbConfig` type.
   - Implement `initAnsiversaDb(config)` and `getDbConfig()`.
   - Implement a small **core DB client factory** using Turso client.
   - Implement **perâ€‘app client factories** (quiz, resume) using config.

6. **Create basic types**
   - `User`, `Subscription`, etc. in `src/types/core.ts` (just minimal fields for now).
   - `QuizQuestion`, `QuizResult`, etc. in `src/types/quiz.ts`.

7. **Implement minimal query helpers**
   - Core:
     - `getUserById`
     - `getUserByEmail`
   - Quiz app:
     - `getRandomQuestionsForUser(userId, limit)`
     - `saveQuizResult(payload)`

8. **Set up proper exports in index.ts**
   - Export `initAnsiversaDb`.
   - Export grouped namespaces (e.g. `CoreAuth`, `CoreBilling`, `QuizQuestions`, `QuizResults`).

9. **Add simple usage examples**
   - In `README.md` show how to initialize and call one helper function from a server context.

10. **Version & publish**
    - Set version to `0.0.1` for the first release.
    - Configure publishing (NPM or GitHub Packages â€“ as we decide).
    - Tag and push.

11. **Integrate into existing projects**
    - Install `@ansiversa/db` in `ansiversa` (web), `admin.ansiversa`, and `api.ansiversa` projects.
    - Replace any direct Turso/libSQL calls with calls to this package.
    - Keep Astro DB for now if needed, but **all new Turso DB work** should go through `@ansiversa/db`.

---

## 10. Future improvements (not for phase 1)

These are **niceâ€‘toâ€‘have later**, not required in the first version:

- Add a **migration system** (Drizzle, Kysely, or raw SQL migration runner).
- Add **seeding utilities** for importing large JSON/SQL question banks.
- Add **logging** (central logging for slow queries / errors).
- Add **perâ€‘user DB option** if we ever choose oneâ€‘userâ€‘perâ€‘db in Turso.
- Automatic **connection pooling** or caching strategy if needed.

For now, phase 1 should be **simple but solid**: one shared DB package, clear config, serverâ€‘only helpers, and support for parent/core DB + miniâ€‘app DBs.

---

## 11. Summary

- New repo: **`ansiversa-db`**
- New package: **`@ansiversa/db`**
- Handles:
  - Parent/core DB (users, auth, billing)
  - Child DBs per miniâ€‘app (quiz, resume, etc.)
- Must:
  - Be serverâ€‘only
  - Be initialized from host app
  - Provide clean, modular helper functions

Codex: When you implement this, use this README as the single source of truth.  
If something is unclear, assume we prefer **simple, explicit functions** over clever abstractions.