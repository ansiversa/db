# Quiz Tables – Ansiversa DB (Current Schema)
> Source: `src/core/db/quiz/tables.ts`

This document mirrors the quiz database schema that is currently implemented in the codebase. The quiz module uses a 6-table, SQLite/libSQL-friendly layout and keeps IDs as integers in the database while exposing them as strings in TypeScript.

---

## Table Definitions

### 1. `platforms`
| Column       | Type                          | Notes                                                     |
|--------------|-------------------------------|-----------------------------------------------------------|
| `id`         | `INTEGER PRIMARY KEY AUTOINCREMENT` | Auto-generated platform identifier                        |
| `name`       | `TEXT NOT NULL`               | Platform name (e.g., School, Medical)                     |
| `description`| `TEXT`                        | Optional description                                      |
| `is_active`  | `INTEGER NOT NULL DEFAULT 1`  | 1 = active, 0 = inactive                                  |
| `icon`       | `TEXT NOT NULL`               | Icon key or URL                                           |
| `type`       | `TEXT`                        | Optional platform type/label                              |
| `q_count`    | `INTEGER NOT NULL DEFAULT 0`  | Denormalized question count (see Notes)                   |

### 2. `subjects`
| Column        | Type                    | Notes                                                                 |
|---------------|-------------------------|-----------------------------------------------------------------------|
| `id`          | `INTEGER PRIMARY KEY`   | **Externally managed** subject ID (supply on insert)                  |
| `platform_id` | `INTEGER NOT NULL`      | FK → `platforms.id` (CASCADE)                                         |
| `name`        | `TEXT NOT NULL`         | Subject name                                                          |
| `is_active`   | `INTEGER NOT NULL DEFAULT 1` | Active flag                                                      |
| `q_count`     | `INTEGER NOT NULL DEFAULT 0`  | Denormalized question count                                      |

### 3. `topics`
| Column        | Type                    | Notes                                                                 |
|---------------|-------------------------|-----------------------------------------------------------------------|
| `id`          | `INTEGER PRIMARY KEY`   | **Externally managed** topic ID (supply on insert)                    |
| `platform_id` | `INTEGER NOT NULL`      | FK → `platforms.id` (CASCADE)                                         |
| `subject_id`  | `INTEGER NOT NULL`      | FK → `subjects.id` (CASCADE)                                          |
| `name`        | `TEXT NOT NULL`         | Topic name                                                            |
| `is_active`   | `INTEGER NOT NULL DEFAULT 1` | Active flag                                                      |
| `q_count`     | `INTEGER NOT NULL DEFAULT 0`  | Denormalized question count                                      |

### 4. `roadmaps`
| Column        | Type                    | Notes                                                                 |
|---------------|-------------------------|-----------------------------------------------------------------------|
| `id`          | `INTEGER PRIMARY KEY`   | **Externally managed** roadmap ID (supply on insert)                  |
| `platform_id` | `INTEGER NOT NULL`      | FK → `platforms.id` (CASCADE)                                         |
| `subject_id`  | `INTEGER NOT NULL`      | FK → `subjects.id` (CASCADE)                                          |
| `topic_id`    | `INTEGER NOT NULL`      | FK → `topics.id` (CASCADE)                                            |
| `name`        | `TEXT NOT NULL`         | Roadmap name                                                          |
| `is_active`   | `INTEGER NOT NULL DEFAULT 1` | Active flag                                                      |
| `q_count`     | `INTEGER NOT NULL DEFAULT 0`  | Denormalized question count                                      |

### 5. `questions`
| Column        | Type                          | Notes                                                         |
|---------------|-------------------------------|---------------------------------------------------------------|
| `id`          | `INTEGER PRIMARY KEY AUTOINCREMENT` | Auto-generated question ID                                |
| `platform_id` | `INTEGER NOT NULL`            | FK → `platforms.id` (CASCADE)                                 |
| `subject_id`  | `INTEGER NOT NULL`            | FK → `subjects.id` (CASCADE)                                  |
| `topic_id`    | `INTEGER NOT NULL`            | FK → `topics.id` (CASCADE)                                    |
| `roadmap_id`  | `INTEGER NOT NULL`            | FK → `roadmaps.id` (CASCADE)                                  |
| `q`           | `TEXT NOT NULL`               | Question prompt                                               |
| `o`           | `JSON NOT NULL`               | Answer options object                                         |
| `a`           | `TEXT NOT NULL`               | Correct answer key                                            |
| `e`           | `TEXT`                        | Optional explanation                                          |
| `l`           | `TEXT NOT NULL CHECK (l IN ('E','M','D'))` | Difficulty level (E, M, D)                         |
| `is_active`   | `INTEGER NOT NULL DEFAULT 1`  | Active flag                                                   |

### 6. `results`
| Column        | Type                                     | Notes                                                                    |
|---------------|------------------------------------------|--------------------------------------------------------------------------|
| `id`          | `INTEGER PRIMARY KEY AUTOINCREMENT`      | Auto-generated result ID                                                 |
| `user_id`     | `TEXT NOT NULL`                          | User identifier                                                          |
| `platform_id` | `INTEGER NOT NULL`                       | FK → `platforms.id` (CASCADE)                                            |
| `subject_id`  | `INTEGER NOT NULL`                       | FK → `subjects.id` (CASCADE)                                             |
| `topic_id`    | `INTEGER NOT NULL`                       | FK → `topics.id` (CASCADE)                                               |
| `roadmap_id`  | `INTEGER NOT NULL`                       | FK → `roadmaps.id` (CASCADE)                                             |
| `level`       | `TEXT NOT NULL CHECK (level IN ('E','M','D'))` | Difficulty snapshot at attempt time                                 |
| `responses`   | `JSON NOT NULL`                          | Serialized `QuizResultResponseItem[]` (see below)                        |
| `mark`        | `INTEGER NOT NULL DEFAULT 0`             | Score/mark for the attempt                                               |
| `created_at`  | `TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`| Timestamp (ISO string)                                                   |

---

## Notes & Conventions
- IDs are stored as integers in the database and surfaced as strings in TypeScript APIs.
- `subjects`, `topics`, and `roadmaps` require caller-provided IDs; plan seed/import flows accordingly.
- `q_count` fields are denormalized counts. They should be updated via explicit maintenance logic or a future trigger/sync job.
- Foreign keys cascade on update/delete to keep the hierarchy consistent.
- `level` and question `l` columns are limited to `E`, `M`, `D`.
- Indexes exist on all FK columns for lookup speed.

### Result Responses Payload
Quiz attempt responses are persisted as an array with the following shape:

```ts
interface QuizResultResponseItem {
  questionId: string;
  selectedKey: string; // e.g., "A", "B", "C", "D"
  correctKey: string;  // snapshot of the correct answer at attempt time
  isCorrect: boolean;
}
```

Store this array in the `responses` column (it is JSON serialized internally).
