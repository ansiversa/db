export interface QuizTableDefinition {
  name: string;
  description: string;
  createStatement: string;
  indexes?: string[];
}

const normalize = (statement: string): string => statement.trim().replace(/\s+\n/g, "\n");

export const quizTableDefinitions: QuizTableDefinition[] = [
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
  },
];

export const quizTableStatements = quizTableDefinitions.map(
  (definition) => definition.createStatement,
);

export const quizIndexStatements = quizTableDefinitions.flatMap(
  (definition) => definition.indexes ?? [],
);
