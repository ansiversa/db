let activeConfig = null;
export const initAnsiversaDb = (config) => {
    activeConfig = config;
    return config;
};
export const getDbConfig = () => {
    if (!activeConfig) {
        throw new Error("Ansiversa DB has not been initialized. Call initAnsiversaDb() first.");
    }
    return activeConfig;
};
export const hasDbConfig = () => activeConfig !== null;
/**
 * Utility primarily for testing to reset any cached configuration.
 */
export const resetDbConfig = () => {
    activeConfig = null;
};
export { loadEnvConfig } from "./env";
export * from "./types";
