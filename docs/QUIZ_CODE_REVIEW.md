# Quiz Module â€“ Code Review & Suggestions (Astra)

This document contains review notes, potential issues, and improvement suggestions
for the **Quiz** part of the `@ansiversa/db` repo, based on the current 6â€‘table schema
and the implementation under `src/apps/quiz` and `src/core/db/quiz/tables.ts`.

It is written for **Karthik + Codex** to refine the implementation safely.

---

## 1. Overall Summary

- The **6â€‘table schema** (`platforms`, `subjects`, `topics`, `roadmaps`, `questions`, `results`)
  is clear and consistent.
- The quiz code is nicely split into:
  - `src/apps/quiz/client.ts` â€“ quiz DB client
  - `src/apps/quiz/schema.ts` â€“ schema/init helper
  - `src/apps/quiz/questions.ts` â€“ question helpers
  - `src/apps/quiz/results.ts` â€“ result helpers
  - `src/types/quiz.ts` â€“ shared TS types
- The pattern `ensureQuizSchema() -> getQuizClient() -> execute()` is clean and easy to reuse.
- No critical bugs were found in the code paths that were reviewed.

The rest of this file focuses on **refinements** and **consistency**.

---

## 2. Schema-Level Suggestions (`src/core/db/quiz/tables.ts`)

### 2.1 Manual IDs vs AUTOINCREMENT

- `platforms.id` uses `INTEGER PRIMARY KEY AUTOINCREMENT`.
- `subjects.id`, `topics.id`, and `roadmaps.id` use `INTEGER PRIMARY KEY` **without** AUTOINCREMENT.

This is valid, but it means:

- IDs for `subjects`, `topics`, and `roadmaps` must be supplied manually (for example from seed data or imports).
- If Codex ever does plain inserts without specifying `id`, it will fail.

> **Suggestion:**  
> - Either **document clearly** in `QUIZ_REQUIREMENT.md` that these three tables use *externally managed IDs*,  
>   or switch them to `AUTOINCREMENT` if you want the DB to handle IDs.

---

### 2.2 `q_count` Columns

Several tables (`platforms`, `subjects`, `topics`, `roadmaps`) have a `q_count` column.

Right now there is no automatic trigger logic to keep `q_count` in sync when questions are inserted/updated/deleted.

> **Suggestion:** choose one strategy and document it:
> - Either:
>   - Treat `q_count` as a **denormalized field** maintained by explicit helper functions
>     (e.g. a sync script / admin action that recalculates counts), or
> - Or:
>   - Add triggers or explicit update logic in the quiz app to adjust `q_count` whenever questions change.

If you donâ€™t plan to use `q_count` soon, you can also leave it as a â€œfuture optimizationâ€ but note that in docs.

---

### 2.3 Uniqueness Constraints

Currently there are no explicit UNIQUE constraints like:

- `(platform_id, name)` in `subjects`
- `(platform_id, subject_id, name)` in `topics`
- `(platform_id, subject_id, topic_id, name)` in `roadmaps`

This means it is technically possible to create duplicate names under the same parent.

> **Suggestion:**  
> Consider adding UNIQUE constraints (or at least documenting the â€œno duplicatesâ€ rule) to prevent accidental duplication when seeding or using admin tools.

---

### 2.4 `results.user_id` Type

In `results`:

```sql
user_id TEXT NOT NULL
```

but in the Core DB your user IDs may be numbers or opaque strings depending on design.

> **Suggestion:**
> - Decide clearly what `user_id` represents:
>   - Core DB `users.id` (if numeric) or
>   - An external auth identifier (e.g. from auth provider).
> - Document this in `QUIZ_REQUIREMENT.md` and in `src/types/quiz.ts` so that apps use it consistently.

---

## 3. Type & API Consistency (`src/types/quiz.ts`)

### 3.1 IDs as `string` vs DB as `INTEGER`

In `QuizPlatform`, `QuizSubject`, `QuizTopic`, `QuizRoadmap`, etc., IDs are typed as `string`, while the DB schema uses `INTEGER` columns.

This is fine **if the rest of the app always treats IDs as strings**, but it is easy to accidentally mix `number` and `string` across different projects.

> **Suggestion:**
> - Decide a single convention for **public API**:
>   - All IDs exposed as `string` (even if DB is integer) â€“ what you are doing now, or  
>   - Use `number` for numeric primary keys.
> - Once you decide, stick with it across web, admin, and API so Codex doesnâ€™t get confused.

### 3.2 `responses` Type

`SaveQuizResultInput.responses` and the parsed `QuizResult.responses` are typed as:

```ts
Record<string, unknown>;
```

This is very flexible but does not communicate the structure.

> **Suggestion (optional, but recommended):**

Define a dedicated type:

```ts
export interface QuizResultResponseItem {
  questionId: string;
  selectedKey: string;   // e.g. "A", "B", "C", "D"
  correctKey: string;    // snapshot of the correct answer at attempt time
  isCorrect: boolean;
}
```

and then use:

```ts
responses: QuizResultResponseItem[];
```

This will make it easier for web/admin apps and for future analytics.

---

## 4. Question Helpers (`src/apps/quiz/questions.ts`)

### 4.1 `getRandomQuestionsForUser` Ignores `userId`

The function signature:

```ts
export const getRandomQuestionsForUser = async (
  _userId: string,
  limit: number,
): Promise<QuizQuestion[]> => {
  // ...
};
```

The `_userId` parameter is currently **unused** â€“ the SQL only does a global random pick from active questions.

> **Suggestions:**
> - If you donâ€™t plan to personalize by user yet:
>   - Either remove the `userId` parameter, or
>   - Keep the name as `_userId` but clearly comment that itâ€™s reserved for future personalized selection.
> - Update README / docs so they donâ€™t imply user-based logic that doesnâ€™t exist yet.

### 4.2 `ORDER BY random()` on Large Tables

Most random selection queries do:

```sql
ORDER BY random()
LIMIT ?
```

This is simple and fine for now, but will get slower as the question table grows large.

> **Suggestion (future optimization):**
> - Keep this for Phase 1.
> - Add a note in docs that if the number of questions becomes very large, you might:
>   - Use an approximate random strategy (e.g. precompute ID ranges and sample), or
>   - Maintain a smaller subset / pool table per roadmap.

### 4.3 JSON Parsing Helpers

`parseJsonObject`:

- Safely parses JSON strings.
- If parsing fails, it falls back to `{}`.

> **Suggestion:**
> - In development, consider logging the error or at least the fact that parsing failed, so bad data is easier to catch.
> - In production, keeping the current â€œsoft failure to {}â€ behavior is okay.

---

## 5. Result Helpers (`src/apps/quiz/results.ts`)

### 5.1 Overall Structure

- Uses `ensureQuizSchema()` and `getQuizClient()` â€“ consistent with questions.
- Uses `parseJsonObject` + `toDifficulty` helpers â€“ mirrored structure, which is good.
- `listQuizResults` + `listQuizResultsForUser` provide a simple way to read history.

### 5.2 README Example vs Actual API

In `README.md`, there is a usage example (towards the end) that still shows:

```ts
await Apps.Quiz.QuizResults.saveQuizResult({
  userId: maybeUser!.id,
  questionId: firstQuestion.id,
  isCorrect: true,
});
```

But the actual `SaveQuizResultInput` is:

```ts
export interface SaveQuizResultInput {
  userId: string;
  platformId: string;
  subjectId: string;
  topicId: string;
  roadmapId: string;
  level: QuizDifficulty;
  responses: Record<string, unknown>;
  mark?: number;
}
```

> **Suggestion:**
> - **Update the README example** to match the real signature.  
>   This will avoid confusion for Codex and for future you when you copy-paste samples.

---

## 6. Schema & Client Initialization (`schema.ts` / `client.ts`)

### 6.1 `ensureQuizSchema` Flag

`ensureQuizSchema` uses an `initialized` boolean to guard table/index creation:

```ts
let initialized = false;

export const ensureQuizSchema = async (): Promise<void> => {
  if (initialized) return;
  // run CREATE TABLE / CREATE INDEX statements
  initialized = true;
};
```

This is good:

- It avoids running DDL on every query.
- It ensures first use creates the schema.

> **Suggestion:**
> - This pattern is fine for now.
> - If you later move to a dedicated migration system, you can:
>   - Keep `ensureQuizSchema` only for local/dev,
>   - Or remove it and rely on migrations.

### 6.2 `getQuizClient` Error Message

`resolveQuizConfig` throws a clear error when `apps.quiz` config is missing:

```ts
throw new Error("Quiz database configuration is missing. Add it under apps.quiz when initializing.");
```

This is already excellent for DX. No changes needed, just a note of appreciation. ðŸ˜Š

---

## 7. Documentation Alignment (`docs/*.md`)

### 7.1 `docs/QUIZ_REQUIREMENT.md` is Outdated

The existing `QUIZ_REQUIREMENT.md` still talks about:

- `serial` / `bigserial` types
- Tables like `levels`, `quizzes`, `quiz_results`, etc.

This does **not** match the current actual schema under `src/core/db/quiz/tables.ts`
(6 tables using SQLite/libSQL style).

> **Suggestion (important):**
> - Rewrite `QUIZ_REQUIREMENT.md` so that:
>   - It documents **exactly** the 6 current tables and their columns.
>   - It matches the text and intent of `tables.ts`.
> - You can base the new content on the requirement doc weâ€™ve been iterating on, but remove references to extra tables that do not exist.

### 7.2 `DB_REQUIREMENT.md` & `documentation.md`

Both these files are generally aligned with the **big-picture architecture**, and look good.

> **Suggestion:**
> - After updating `QUIZ_REQUIREMENT.md`, add a small section or link in `documentation.md` under â€œQuiz Moduleâ€ so everything is tied together.

---

## 8. Nice Things That Are Already Correct

Just to highlight positives:

- âœ… Separation of **Core** vs **Apps** and then `Apps.Quiz` is very clean.
- âœ… `schema.ts` and `client.ts` are minimal and focused.
- âœ… Shared `types` layer is in place and already used by quiz helpers.
- âœ… Indexes for foreign keys are created and exported from `quizIndexStatements`.
- âœ… The whole package is ready to serve as a **single source of truth** for quiz data across web, admin, and API.

---

## 9. Actionable Toâ€‘Do List for Codex

1. **Keep 6â€‘table schema as is**, but:
   - [ ] Document manual IDs for `subjects`, `topics`, `roadmaps` (or change to AUTOINCREMENT).
   - [ ] Clarify meaning of `user_id` in `results`.

2. **Types & API:**
   - [ ] Decide on ID type (`string` vs `number`) and be consistent.
   - [ ] Optionally introduce a structured `QuizResultResponseItem[]` instead of `Record<string, unknown>`.

3. **Questions Helpers:**
   - [ ] Fix or document `getRandomQuestionsForUser`â€™s `_userId` parameter.
   - [ ] Keep `ORDER BY random()` but note potential future optimization.

4. **Results Helpers:**
   - [ ] Update README example to match `SaveQuizResultInput`.
   - [ ] Optionally add convenience helper for â€œlatest result by roadmap + levelâ€.

5. **Docs:**
   - [ ] Rewrite `docs/QUIZ_REQUIREMENT.md` to match the 6-table SQLite/libSQL schema.
   - [ ] Link quiz docs from `documentation.md`.

Once these are done, your Quiz DB package will be **very polished and futureâ€‘proof**, and both Codex and futureâ€‘you will have zero confusion when working on Quiz Institute and other miniâ€‘apps.
