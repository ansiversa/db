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
