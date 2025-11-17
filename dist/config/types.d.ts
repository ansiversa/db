export interface DatabaseConnectionConfig {
    url: string;
    authToken: string;
}
export type AppDatabaseConfigs = Record<string, DatabaseConnectionConfig>;
export interface AnsiversaDbConfig {
    core: DatabaseConnectionConfig;
    apps?: AppDatabaseConfigs;
}
export interface LoadEnvConfigOptions {
    /**
     * Names of mini-app databases to read from environment variables.
     * For each app name, this loader will look for `ANSIVERSA_<APP>_DB_URL`
     * unless a custom mapper is provided.
     */
    apps?: string[];
    /**
     * Environment variable name for the parent/core database URL.
     * Defaults to `ANSIVERSA_CORE_DB_URL`.
     */
    coreUrlVar?: string;
    /**
     * Environment variable name for the parent/core database auth token.
     * Defaults to `TURSO_AUTH_TOKEN` so the same token can be shared across
     * databases when desired.
     */
    coreAuthTokenVar?: string;
    /**
     * Default environment variable for app auth tokens. Falls back to
     * the same value as `coreAuthTokenVar` when unspecified.
     */
    defaultAuthTokenVar?: string;
    /**
     * Override token environment variable names per app (e.g. { quiz: "QUIZ_TOKEN" }).
     */
    appAuthTokenVars?: Record<string, string>;
    /**
     * Optional mapper for deriving an app's DB URL env var name.
     */
    appUrlVar?: (appName: string) => string;
}
