import { AnsiversaDbConfig } from "./types.js";

let activeConfig: AnsiversaDbConfig | null = null;

export const initAnsiversaDb = (config: AnsiversaDbConfig): AnsiversaDbConfig => {
  activeConfig = config;
  return config;
};

export const getDbConfig = (): AnsiversaDbConfig => {
  if (!activeConfig) {
    throw new Error("Ansiversa DB has not been initialized. Call initAnsiversaDb() first.");
  }
  return activeConfig;
};

export const hasDbConfig = (): boolean => activeConfig !== null;

/**
 * Utility primarily for testing to reset any cached configuration.
 */
export const resetDbConfig = (): void => {
  activeConfig = null;
};

export { loadEnvConfig } from "./env.js";
export * from "./types.js";
