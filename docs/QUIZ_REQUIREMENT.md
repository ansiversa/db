# Quiz Tables – Ansiversa DB  
> File: `core/db/quiz/tables.ts`  

## Overview  
This document outlines the table definitions for the “Quiz” module of the **Ansiversa** ecosystem. It captures the database schema for platforms, subjects, topics, quiz levels, quizzes, results, and related join tables.

---

## Table Definitions

### 1. `platforms`  
| Column       | Type              | Description                        |
|--------------|-------------------|------------------------------------|
| `id`         | `serial` or `bigserial` | Primary key – auto-generated ID |
| `name`       | `varchar`         | Name of the platform (e.g., School, Medical) |
| `description`| `text`            | Optional description of the platform |
| `created_at` | `timestamp`       | Record creation timestamp          |
| `updated_at` | `timestamp`       | Last update timestamp              |

---

### 2. `subjects`  
| Column         | Type              | Description                              |
|----------------|-------------------|------------------------------------------|
| `id`           | `serial` or `bigserial` | Primary key                        |
| `platform_id`  | `int`             | Foreign key to `platforms.id`           |
| `name`         | `varchar`         | Name of the subject                     |
| `description`  | `text`            | Optional description                     |
| `created_at`   | `timestamp`       | Record creation timestamp                |
| `updated_at`   | `timestamp`       | Last update timestamp                    |

---

### 3. `topics`  
| Column         | Type              | Description                              |
|----------------|-------------------|------------------------------------------|
| `id`           | `serial` or `bigserial` | Primary key                        |
| `subject_id`   | `int`             | Foreign key to `subjects.id`            |
| `name`         | `varchar`         | Name of the topic                       |
| `description`  | `text`            | Optional description                     |
| `created_at`   | `timestamp`       | Record creation timestamp                |
| `updated_at`   | `timestamp`       | Last update timestamp                    |

---

### 4. `levels`  
| Column         | Type              | Description                               |
|----------------|-------------------|-------------------------------------------|
| `id`           | `serial` or `bigserial` | Primary key                        |
| `topic_id`     | `int`             | Foreign key to `topics.id`               |
| `level_number` | `int`             | Numeric identifier of the level (e.g., 1, 2, 3) |
| `name`         | `varchar`         | Name or label for this level             |
| `description`  | `text`            | Optional description                      |
| `created_at`   | `timestamp`       | Record creation timestamp                 |
| `updated_at`   | `timestamp`       | Last update timestamp                     |

---

### 5. `quizzes`  
| Column         | Type              | Description                                 |
|----------------|-------------------|---------------------------------------------|
| `id`           | `serial` or `bigserial` | Primary key                            |
| `level_id`     | `int`             | Foreign key to `levels.id`                  |
| `title`        | `varchar`         | Title of the quiz                            |
| `description`  | `text`            | Optional description of the quiz              |
| `metadata`     | `jsonb` or `json` | Additional metadata (question count, time limit, etc.) |
| `created_at`   | `timestamp`       | Record creation timestamp                     |
| `updated_at`   | `timestamp`       | Last update timestamp                         |

---

### 6. `quiz_results`  
| Column         | Type              | Description                                    |
|----------------|-------------------|------------------------------------------------|
| `id`           | `serial` or `bigserial` | Primary key                               |
| `quiz_id`      | `int`             | Foreign key to `quizzes.id`                   |
| `user_id`      | `int`             | FK to users table (assuming a `users` table exists) |
| `score`        | `numeric` or `int`| Score achieved by the user                     |
| `metadata`     | `jsonb` or `json` | Additional result metadata (time taken, answers, etc.) |
| `created_at`   | `timestamp`       | Record creation timestamp                      |
| `updated_at`   | `timestamp`       | Last update timestamp                          |

---

### 7. (Optional) Join Tables  
Depending on your use-case (tags, topic-quiz mapping outside of one topic-one quiz), you might have join tables like:  
- `quiz_tags` (quiz_id → tag_id)  
- `topic_subjects` (topic_id → subject_id) — if many-to-many  
- etc.

---

## Notes & Conventions  
- IDs use auto-generated serial/bigserial primary keys.  
- All tables include `created_at` / `updated_at` timestamps for auditing.  
- Foreign keys follow the naming pattern `<referenced_table>_id`.  
- Use `jsonb`/`json` for flexible metadata storage where appropriate (e.g., in `quizzes.metadata`).  
- Ensure referential integrity via foreign key constraints (cascade or restrict based on your logic).  
- Index foreign key columns for performance.  
- For the `platforms` → `subjects` → `topics` → `levels` hierarchical flow, make sure that delete/update cascades (or protections) are well defined to avoid orphan records.

---

## Future Considerations  
- Add archival/deprecation status (e.g., `is_active`, `archived_at`).  
- Versioning of quizzes (if you will update quizzes over time and keep history).  
- Localization: multilingual support for `title`, `description`.  
- Analytics: track user performance trends, average score per quiz/level.  
- Support for subscription features or premium content within the quiz flow (given your app model).  

---

## File Reference  
```typescript
// File: core/db/quiz/tables.ts
// (Contains TypeScript/SQL-schema definitions for the above tables)