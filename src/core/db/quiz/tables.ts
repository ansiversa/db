export interface QuizTableDefinition {
  name: string;
  description: string;
  createStatement: string;
  indexes?: string[];
  operations?: QuizTableOperations;
}

export interface QuizTableOperations {
  insert: string;
  update: string;
  delete: string;
}

const normalize = (statement: string): string => statement.trim().replace(/\s+\n/g, "\n");

const levelCheck = "CHECK (l IN ('E','M','D'))";
const levelResultCheck = "CHECK (level IN ('E','M','D'))";

export const quizTableDefinitions: QuizTableDefinition[] = [
  {
    name: "platforms",
    description: "Quiz platforms (e.g., School, Medical).",
    createStatement: normalize(`
      CREATE TABLE IF NOT EXISTS platforms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        icon TEXT NOT NULL,
        type TEXT,
        q_count INTEGER NOT NULL DEFAULT 0
      );
    `),
    operations: {
      insert: normalize(`
        INSERT INTO platforms (name, description, is_active, icon, type, q_count)
        VALUES (?, ?, COALESCE(?, 1), ?, ?, COALESCE(?, 0))
        RETURNING id, name, description, is_active, icon, type, q_count;
      `),
      update: normalize(`
        UPDATE platforms
        SET name = COALESCE(?, name),
            description = COALESCE(?, description),
            is_active = COALESCE(?, is_active),
            icon = COALESCE(?, icon),
            type = COALESCE(?, type),
            q_count = COALESCE(?, q_count)
        WHERE id = ?
        RETURNING id, name, description, is_active, icon, type, q_count;
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
        id INTEGER PRIMARY KEY,
        platform_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        q_count INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `),
    indexes: [
      normalize(`CREATE INDEX IF NOT EXISTS idx_subjects_platform_id ON subjects(platform_id);`),
    ],
    operations: {
      insert: normalize(`
        INSERT INTO subjects (id, platform_id, name, is_active, q_count)
        VALUES (?, ?, ?, COALESCE(?, 1), COALESCE(?, 0))
        RETURNING id, platform_id, name, is_active, q_count;
      `),
      update: normalize(`
        UPDATE subjects
        SET platform_id = COALESCE(?, platform_id),
            name = COALESCE(?, name),
            is_active = COALESCE(?, is_active),
            q_count = COALESCE(?, q_count)
        WHERE id = ?
        RETURNING id, platform_id, name, is_active, q_count;
      `),
      delete: normalize(`
        DELETE FROM subjects WHERE id = ?;
      `),
    },
  },
  {
    name: "topics",
    description: "Topics within a platform/subject.",
    createStatement: normalize(`
      CREATE TABLE IF NOT EXISTS topics (
        id INTEGER PRIMARY KEY,
        platform_id INTEGER NOT NULL,
        subject_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        q_count INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `),
    indexes: [
      normalize(`CREATE INDEX IF NOT EXISTS idx_topics_platform_id ON topics(platform_id);`),
      normalize(`CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON topics(subject_id);`),
    ],
    operations: {
      insert: normalize(`
        INSERT INTO topics (id, platform_id, subject_id, name, is_active, q_count)
        VALUES (?, ?, ?, ?, COALESCE(?, 1), COALESCE(?, 0))
        RETURNING id, platform_id, subject_id, name, is_active, q_count;
      `),
      update: normalize(`
        UPDATE topics
        SET platform_id = COALESCE(?, platform_id),
            subject_id = COALESCE(?, subject_id),
            name = COALESCE(?, name),
            is_active = COALESCE(?, is_active),
            q_count = COALESCE(?, q_count)
        WHERE id = ?
        RETURNING id, platform_id, subject_id, name, is_active, q_count;
      `),
      delete: normalize(`
        DELETE FROM topics WHERE id = ?;
      `),
    },
  },
  {
    name: "roadmaps",
    description: "Roadmap entries aligning platform/subject/topic steps.",
    createStatement: normalize(`
      CREATE TABLE IF NOT EXISTS roadmaps (
        id INTEGER PRIMARY KEY,
        platform_id INTEGER NOT NULL,
        subject_id INTEGER NOT NULL,
        topic_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        q_count INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `),
    indexes: [
      normalize(`CREATE INDEX IF NOT EXISTS idx_roadmaps_platform_id ON roadmaps(platform_id);`),
      normalize(`CREATE INDEX IF NOT EXISTS idx_roadmaps_subject_id ON roadmaps(subject_id);`),
      normalize(`CREATE INDEX IF NOT EXISTS idx_roadmaps_topic_id ON roadmaps(topic_id);`),
    ],
    operations: {
      insert: normalize(`
        INSERT INTO roadmaps (id, platform_id, subject_id, topic_id, name, is_active, q_count)
        VALUES (?, ?, ?, ?, ?, COALESCE(?, 1), COALESCE(?, 0))
        RETURNING id, platform_id, subject_id, topic_id, name, is_active, q_count;
      `),
      update: normalize(`
        UPDATE roadmaps
        SET platform_id = COALESCE(?, platform_id),
            subject_id = COALESCE(?, subject_id),
            topic_id = COALESCE(?, topic_id),
            name = COALESCE(?, name),
            is_active = COALESCE(?, is_active),
            q_count = COALESCE(?, q_count)
        WHERE id = ?
        RETURNING id, platform_id, subject_id, topic_id, name, is_active, q_count;
      `),
      delete: normalize(`
        DELETE FROM roadmaps WHERE id = ?;
      `),
    },
  },
  {
    name: "questions",
    description: "Individual quiz questions tied to a roadmap.",
    createStatement: normalize(`
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform_id INTEGER NOT NULL,
        subject_id INTEGER NOT NULL,
        topic_id INTEGER NOT NULL,
        roadmap_id INTEGER NOT NULL,
        q TEXT NOT NULL,
        o JSON NOT NULL,
        a TEXT NOT NULL,
        e TEXT,
        l TEXT NOT NULL ${levelCheck},
        is_active INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `),
    indexes: [
      normalize(`CREATE INDEX IF NOT EXISTS idx_questions_platform_id ON questions(platform_id);`),
      normalize(`CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON questions(subject_id);`),
      normalize(`CREATE INDEX IF NOT EXISTS idx_questions_topic_id ON questions(topic_id);`),
      normalize(`CREATE INDEX IF NOT EXISTS idx_questions_roadmap_id ON questions(roadmap_id);`),
    ],
    operations: {
      insert: normalize(`
        INSERT INTO questions (platform_id, subject_id, topic_id, roadmap_id, q, o, a, e, l, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 1))
        RETURNING id, platform_id, subject_id, topic_id, roadmap_id, q, o, a, e, l, is_active;
      `),
      update: normalize(`
        UPDATE questions
        SET platform_id = COALESCE(?, platform_id),
            subject_id = COALESCE(?, subject_id),
            topic_id = COALESCE(?, topic_id),
            roadmap_id = COALESCE(?, roadmap_id),
            q = COALESCE(?, q),
            o = COALESCE(?, o),
            a = COALESCE(?, a),
            e = COALESCE(?, e),
            l = COALESCE(?, l),
            is_active = COALESCE(?, is_active)
        WHERE id = ?
        RETURNING id, platform_id, subject_id, topic_id, roadmap_id, q, o, a, e, l, is_active;
      `),
      delete: normalize(`
        DELETE FROM questions WHERE id = ?;
      `),
    },
  },
  {
    name: "results",
    description: "Quiz attempt results per user/platform hierarchy.",
    createStatement: normalize(`
      CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        platform_id INTEGER NOT NULL,
        subject_id INTEGER NOT NULL,
        topic_id INTEGER NOT NULL,
        roadmap_id INTEGER NOT NULL,
        level TEXT NOT NULL ${levelResultCheck},
        responses JSON NOT NULL,
        mark INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `),
    indexes: [
      normalize(`CREATE INDEX IF NOT EXISTS idx_results_user_id ON results(user_id);`),
      normalize(`CREATE INDEX IF NOT EXISTS idx_results_platform_id ON results(platform_id);`),
      normalize(`CREATE INDEX IF NOT EXISTS idx_results_subject_id ON results(subject_id);`),
      normalize(`CREATE INDEX IF NOT EXISTS idx_results_topic_id ON results(topic_id);`),
      normalize(`CREATE INDEX IF NOT EXISTS idx_results_roadmap_id ON results(roadmap_id);`),
    ],
    operations: {
      insert: normalize(`
        INSERT INTO results (user_id, platform_id, subject_id, topic_id, roadmap_id, level, responses, mark)
        VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, 0))
        RETURNING id, user_id, platform_id, subject_id, topic_id, roadmap_id, level, responses, mark, created_at;
      `),
      update: normalize(`
        UPDATE results
        SET user_id = COALESCE(?, user_id),
            platform_id = COALESCE(?, platform_id),
            subject_id = COALESCE(?, subject_id),
            topic_id = COALESCE(?, topic_id),
            roadmap_id = COALESCE(?, roadmap_id),
            level = COALESCE(?, level),
            responses = COALESCE(?, responses),
            mark = COALESCE(?, mark)
        WHERE id = ?
        RETURNING id, user_id, platform_id, subject_id, topic_id, roadmap_id, level, responses, mark, created_at;
      `),
      delete: normalize(`
        DELETE FROM results WHERE id = ?;
      `),
    },
  },
];

export const quizTableStatements = quizTableDefinitions.map(
  (definition) => definition.createStatement,
);

export const quizIndexStatements = quizTableDefinitions.flatMap(
  (definition) => definition.indexes ?? [],
);

export const quizTableOperationMap = quizTableDefinitions.reduce(
  (map, definition) => {
    if (definition.operations) {
      map[definition.name] = definition.operations;
    }
    return map;
  },
  {} as Record<string, QuizTableOperations>,
);
