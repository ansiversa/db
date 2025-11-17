const normalize = (statement) => statement.trim().replace(/\s+\n/g, "\n");
export const quizTableDefinitions = [
    {
        name: "platforms",
        description: "Root platforms (e.g., School, Medical).",
        createStatement: normalize(`
      CREATE TABLE IF NOT EXISTS platforms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `),
        operations: {
            insert: normalize(`
        INSERT INTO platforms (name, description, created_at, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, name, description, created_at, updated_at;
      `),
            update: normalize(`
        UPDATE platforms
        SET name = COALESCE(?, name),
            description = COALESCE(?, description),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING id, name, description, created_at, updated_at;
      `),
            delete: normalize(`
        DELETE FROM platforms WHERE id = ?;
      `),
        },
    },
    {
        name: "subjects",
        description: "Subjects nested under a platform.",
        createStatement: normalize(`
      CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `),
        indexes: [
            normalize(`CREATE INDEX IF NOT EXISTS idx_subjects_platform_id ON subjects(platform_id);`),
        ],
        operations: {
            insert: normalize(`
        INSERT INTO subjects (platform_id, name, description, created_at, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, platform_id, name, description, created_at, updated_at;
      `),
            update: normalize(`
        UPDATE subjects
        SET platform_id = COALESCE(?, platform_id),
            name = COALESCE(?, name),
            description = COALESCE(?, description),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING id, platform_id, name, description, created_at, updated_at;
      `),
            delete: normalize(`
        DELETE FROM subjects WHERE id = ?;
      `),
        },
    },
    {
        name: "topics",
        description: "Topics that belong to a subject.",
        createStatement: normalize(`
      CREATE TABLE IF NOT EXISTS topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `),
        indexes: [
            normalize(`CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON topics(subject_id);`),
        ],
        operations: {
            insert: normalize(`
        INSERT INTO topics (subject_id, name, description, created_at, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, subject_id, name, description, created_at, updated_at;
      `),
            update: normalize(`
        UPDATE topics
        SET subject_id = COALESCE(?, subject_id),
            name = COALESCE(?, name),
            description = COALESCE(?, description),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING id, subject_id, name, description, created_at, updated_at;
      `),
            delete: normalize(`
        DELETE FROM topics WHERE id = ?;
      `),
        },
    },
    {
        name: "levels",
        description: "Difficulty or progression levels for a topic.",
        createStatement: normalize(`
      CREATE TABLE IF NOT EXISTS levels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic_id INTEGER NOT NULL,
        level_number INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (topic_id, level_number),
        FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `),
        indexes: [
            normalize(`CREATE INDEX IF NOT EXISTS idx_levels_topic_id ON levels(topic_id);`),
        ],
        operations: {
            insert: normalize(`
        INSERT INTO levels (topic_id, level_number, name, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, topic_id, level_number, name, description, created_at, updated_at;
      `),
            update: normalize(`
        UPDATE levels
        SET topic_id = COALESCE(?, topic_id),
            level_number = COALESCE(?, level_number),
            name = COALESCE(?, name),
            description = COALESCE(?, description),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING id, topic_id, level_number, name, description, created_at, updated_at;
      `),
            delete: normalize(`
        DELETE FROM levels WHERE id = ?;
      `),
        },
    },
    {
        name: "quizzes",
        description: "Quizzes assigned to a specific level.",
        createStatement: normalize(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        metadata JSON DEFAULT (json('{}')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `),
        indexes: [
            normalize(`CREATE INDEX IF NOT EXISTS idx_quizzes_level_id ON quizzes(level_id);`),
        ],
        operations: {
            insert: normalize(`
        INSERT INTO quizzes (level_id, title, description, metadata, created_at, updated_at)
        VALUES (?, ?, ?, COALESCE(?, json('{}')), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, level_id, title, description, metadata, created_at, updated_at;
      `),
            update: normalize(`
        UPDATE quizzes
        SET level_id = COALESCE(?, level_id),
            title = COALESCE(?, title),
            description = COALESCE(?, description),
            metadata = COALESCE(?, metadata),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING id, level_id, title, description, metadata, created_at, updated_at;
      `),
            delete: normalize(`
        DELETE FROM quizzes WHERE id = ?;
      `),
        },
    },
    {
        name: "quiz_results",
        description: "Scores and attempts per user/quiz.",
        createStatement: normalize(`
      CREATE TABLE IF NOT EXISTS quiz_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        score INTEGER NOT NULL,
        metadata JSON DEFAULT (json('{}')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `),
        indexes: [
            normalize(`CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_id ON quiz_results(quiz_id);`),
            normalize(`CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);`),
        ],
        operations: {
            insert: normalize(`
        INSERT INTO quiz_results (quiz_id, user_id, score, metadata, created_at, updated_at)
        VALUES (?, ?, ?, COALESCE(?, json('{}')), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, quiz_id, user_id, score, metadata, created_at, updated_at;
      `),
            update: normalize(`
        UPDATE quiz_results
        SET quiz_id = COALESCE(?, quiz_id),
            user_id = COALESCE(?, user_id),
            score = COALESCE(?, score),
            metadata = COALESCE(?, metadata),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING id, quiz_id, user_id, score, metadata, created_at, updated_at;
      `),
            delete: normalize(`
        DELETE FROM quiz_results WHERE id = ?;
      `),
        },
    },
    {
        name: "quiz_tags",
        description: "Optional many-to-many table for tagging quizzes.",
        createStatement: normalize(`
      CREATE TABLE IF NOT EXISTS quiz_tags (
        quiz_id INTEGER NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY (quiz_id, tag),
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `),
        indexes: [
            normalize(`CREATE INDEX IF NOT EXISTS idx_quiz_tags_tag ON quiz_tags(tag);`),
        ],
        operations: {
            insert: normalize(`
        INSERT INTO quiz_tags (quiz_id, tag)
        VALUES (?, ?)
        RETURNING quiz_id, tag;
      `),
            update: normalize(`
        UPDATE quiz_tags
        SET quiz_id = COALESCE(?, quiz_id),
            tag = COALESCE(?, tag)
        WHERE quiz_id = ? AND tag = ?
        RETURNING quiz_id, tag;
      `),
            delete: normalize(`
        DELETE FROM quiz_tags WHERE quiz_id = ? AND tag = ?;
      `),
        },
    },
    {
        name: "topic_subjects",
        description: "Optional mapping table when topics span multiple subjects.",
        createStatement: normalize(`
      CREATE TABLE IF NOT EXISTS topic_subjects (
        topic_id INTEGER NOT NULL,
        subject_id INTEGER NOT NULL,
        PRIMARY KEY (topic_id, subject_id),
        FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `),
        indexes: [
            normalize(`CREATE INDEX IF NOT EXISTS idx_topic_subjects_topic_id ON topic_subjects(topic_id);`),
            normalize(`CREATE INDEX IF NOT EXISTS idx_topic_subjects_subject_id ON topic_subjects(subject_id);`),
        ],
        operations: {
            insert: normalize(`
        INSERT INTO topic_subjects (topic_id, subject_id)
        VALUES (?, ?)
        RETURNING topic_id, subject_id;
      `),
            update: normalize(`
        UPDATE topic_subjects
        SET topic_id = COALESCE(?, topic_id),
            subject_id = COALESCE(?, subject_id)
        WHERE topic_id = ? AND subject_id = ?
        RETURNING topic_id, subject_id;
      `),
            delete: normalize(`
        DELETE FROM topic_subjects WHERE topic_id = ? AND subject_id = ?;
      `),
        },
    },
];
export const quizTableStatements = quizTableDefinitions.map((definition) => definition.createStatement);
export const quizIndexStatements = quizTableDefinitions.flatMap((definition) => definition.indexes ?? []);
export const quizTableOperationMap = quizTableDefinitions.reduce((map, definition) => {
    if (definition.operations) {
        map[definition.name] = definition.operations;
    }
    return map;
}, {});
