import { AnsiversaDbConfig } from "./types";
export declare const initAnsiversaDb: (config: AnsiversaDbConfig) => AnsiversaDbConfig;
export declare const getDbConfig: () => AnsiversaDbConfig;
export declare const hasDbConfig: () => boolean;
/**
 * Utility primarily for testing to reset any cached configuration.
 */
export declare const resetDbConfig: () => void;
export { loadEnvConfig } from "./env";
export * from "./types";
