import { getQuizClient } from "./client.js";
import { quizIndexStatements, quizTableStatements } from "../../core/db/quiz/tables.js";

let initialized = false;

export const ensureQuizSchema = async (): Promise<void> => {
  if (initialized) {
    return;
  }

  const client = getQuizClient();
  for (const statement of quizTableStatements) {
    await client.execute(statement);
  }

  for (const statement of quizIndexStatements) {
    await client.execute(statement);
  }

  initialized = true;
};

export const resetQuizSchemaCache = (): void => {
  initialized = false;
};
