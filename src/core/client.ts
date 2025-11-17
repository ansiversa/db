import { Client, createClient } from "@libsql/client";

import { getDbConfig } from "../config";
import { DatabaseConnectionConfig } from "../config/types";

let coreClient: Client | null = null;

const buildClient = (config: DatabaseConnectionConfig): Client =>
  createClient({
    url: config.url,
    authToken: config.authToken,
  });

export const getCoreClient = (): Client => {
  if (!coreClient) {
    const { core } = getDbConfig();
    coreClient = buildClient(core);
  }
  return coreClient;
};

export const resetCoreClient = (): void => {
  coreClient = null;
};
