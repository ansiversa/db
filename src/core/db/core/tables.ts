export interface CoreTableDefinition {
  name: string;
  description: string;
  createStatement: string;
  indexes?: string[];
}

const normalize = (statement: string): string =>
  statement.trim().replace(/\s+\n/g, "\n");

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
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `),
    indexes: [
      normalize(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`),
    ],
  },
  {
    name: "subscriptions",
    description: "User subscriptions and plan status.",
    createStatement: normalize(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        plan TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('active','cancelled','expired')),
        period_start TEXT,
        period_end TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `),
    indexes: [
      normalize(`CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);`),
      normalize(`CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);`),
    ],
  },
];

export const coreTableStatements = coreTableDefinitions.map(
  (definition) => definition.createStatement,
);

export const coreIndexStatements = coreTableDefinitions.flatMap(
  (definition) => definition.indexes ?? [],
);
