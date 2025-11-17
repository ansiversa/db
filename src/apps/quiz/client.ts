import { Client, createClient } from "@libsql/client";

import { getDbConfig } from "../../config";
import { DatabaseConnectionConfig } from "../../config/types";

let quizClient: Client | null = null;

const resolveQuizConfig = (): DatabaseConnectionConfig => {
  const config = getDbConfig().apps?.["quiz"];
  if (!config) {
    throw new Error("Quiz database configuration is missing. Add it under apps.quiz when initializing.");
  }
  return config;
};

const buildClient = (config: DatabaseConnectionConfig): Client =>
  createClient({
    url: config.url,
    authToken: config.authToken,
  });

export const getQuizClient = (): Client => {
  if (!quizClient) {
    quizClient = buildClient(resolveQuizConfig());
  }
  return quizClient;
};

export const resetQuizClient = (): void => {
  quizClient = null;
};
